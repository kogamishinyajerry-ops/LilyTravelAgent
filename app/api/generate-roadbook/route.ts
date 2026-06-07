import { NextResponse } from "next/server";
import { z } from "zod";
import { extractJsonObject } from "@/lib/json-extract";
import { readPositiveIntegerEnv, readGenerationMode, resolveMiniMaxModel } from "@/lib/minimax-config";
import { callM3Chat, type M3ChatRequest } from "@/lib/m3-client";
import { classifyM3Error, getM3ErrorMessage } from "@/lib/m3-error-classifier";
import { normalizeRoadbook } from "@/lib/roadbook-normalize";
import type { GenerateRoadbookResponse, GenerationMode } from "@/lib/roadbook-types";
import { formatZodIssues, roadbookSchema, travelBriefSchema } from "@/lib/roadbook-validation";

export const runtime = "nodejs";

function buildPrompt(brief: ReturnType<typeof travelBriefSchema.parse>) {
  return `你是一个专门制作漂亮旅行路书的 AI Agent。请根据用户旅行需求生成一本中文网页路书。

要求：
- 只输出 JSON 对象，不要 Markdown，不要解释。
- 目的地：${brief.destination}
- 城市/高德 geocode city：${brief.city}
- 天数：${brief.days}
- 出行月份：${brief.travelMonth}
- 旅行者：${brief.travelers}
- 预算：${brief.budget}
- 节奏：${brief.pace}
- 兴趣：${brief.interests.join("、")}
- 避免：${brief.mustAvoid}
- 特殊要求：${brief.specialRequests}
- 语气：${brief.tone}

JSON 结构必须完全使用这些字段：
{
  "title": "string",
  "subtitle": "string",
  "destination": "string",
  "durationLabel": "string",
  "travelerLabel": "string",
  "budgetLabel": "string",
  "concept": "string",
  "bestFor": ["string"],
  "highlights": ["string"],
  "summary": {
    "routeTheme": "string",
    "transportPlan": "string",
    "stayArea": "string",
    "rhythm": "string"
  },
  "days": [
    {
      "day": 1,
      "title": "string",
      "area": "string",
      "mood": "string",
      "routeSummary": "string",
      "commuteNote": "string",
      "budgetNote": "string",
      "stops": [
        {
          "id": "day-1-stop-1",
          "name": "string",
          "time": "string",
          "category": "view|food|coffee|hotel|transport|culture|shopping|other",
          "addressHint": "用于高德地理编码的地点+城市线索",
          "why": "string",
          "duration": "string",
          "tip": "string"
        }
      ],
      "food": ["string"],
      "photoTips": ["string"]
    }
  ],
  "budget": [
    { "label": "string", "amount": "string", "note": "string" }
  ],
  "packing": ["string"],
  "reminders": ["string"],
  "disclaimer": "AI 生成的旅行建议仅用于规划参考。出发前请核验营业时间、票价、预约、交通、天气与安全信息。"
}

内容约束：
- days 数量必须等于 ${brief.days}。
- 每天 3-5 个 stops，地点尽量真实且便于高德定位。
- 不要编造已核验事实，不要承诺营业时间/票价/预约状态一定正确。
- 风格要像高级旅行杂志，但信息要能真的帮助出行。`;
}

/**
 * Map an M3 error category onto the response `code` field expected by
 * existing clients. Falls back to `minimax_error` for unrecognised
 * categories.
 */
function codeFromM3Category(
  category: ReturnType<typeof classifyM3Error>["category"],
): "minimax_error" | "parse_error" {
  if (category === "parse" || category === "schema") return "parse_error";
  return "minimax_error";
}

export async function POST(request: Request) {
  let brief: ReturnType<typeof travelBriefSchema.parse>;
  let generationMode: GenerationMode = "speed";

  try {
    const requestBody = await request.json();
    brief = travelBriefSchema.parse(requestBody);
    generationMode = readGenerationMode(requestBody?.generationMode);
  } catch (error) {
    const fieldIssues =
      error instanceof z.ZodError ? formatZodIssues(error) : undefined;
    const payload: GenerateRoadbookResponse = {
      ok: false,
      code: "invalid_request",
      message: "旅行需求格式不完整，请检查输入项。",
      ...(fieldIssues ? { fieldIssues } : {}),
    };
    return NextResponse.json(payload, { status: 400 });
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  const model = resolveMiniMaxModel(generationMode);
  const maxCompletionTokens = readPositiveIntegerEnv("MINIMAX_MAX_COMPLETION_TOKENS", 5000);
  const timeoutMs = readPositiveIntegerEnv("MINIMAX_TIMEOUT_MS", 180_000);

  if (!apiKey) {
    const payload: GenerateRoadbookResponse = {
      ok: false,
      code: "missing_minimax_key",
      message: "还没有配置 MINIMAX_API_KEY。请在 .env.local 中填入密钥后重启开发服务。",
    };
    return NextResponse.json(payload, { status: 503 });
  }

  const m3Request: M3ChatRequest = {
    model,
    messages: [
      {
        role: "system",
        content: "你只返回可解析 JSON。不要输出 Markdown，不要输出额外解释。",
      },
      {
        role: "user",
        content: buildPrompt(brief),
      },
    ],
    temperature: 0.7,
    top_p: 0.9,
    max_completion_tokens: maxCompletionTokens,
  };

  try {
    const result = await callM3Chat(m3Request, {
      apiKey,
      timeoutMs,
    });

    if (!result.ok) {
      const classified = result.error;
      const message = getM3ErrorMessage(classified);
      const payload: GenerateRoadbookResponse = {
        ok: false,
        code: codeFromM3Category(classified.category),
        category: classified.category,
        message,
        ...(classified.details ? { details: classified.details } : {}),
      };
      return NextResponse.json(payload, {
        status: classified.statusCode ?? 502,
      });
    }

    const content = result.data.content;
    if (!content) {
      const classified = classifyM3Error(new Error("empty content from M3"));
      const payload: GenerateRoadbookResponse = {
        ok: false,
        code: "parse_error",
        category: classified.category,
        message: "MiniMax 返回内容为空，无法生成路书。",
      };
      return NextResponse.json(payload, { status: 502 });
    }

    const parsed = extractJsonObject(content);
    const roadbook = normalizeRoadbook(roadbookSchema.parse(parsed));
    const payload: GenerateRoadbookResponse = {
      ok: true,
      roadbook,
      model,
      generationMode,
      phase: "full",
    };
    return NextResponse.json(payload);
  } catch (error) {
    const fieldIssues =
      error instanceof z.ZodError ? formatZodIssues(error) : undefined;
    const classified = classifyM3Error(error);
    const code: "parse_error" | "minimax_error" =
      classified.category === "parse" || classified.category === "schema"
        ? "parse_error"
        : "minimax_error";
    const message =
      classified.category === "parse" || classified.category === "schema"
        ? "MiniMax 返回内容不是可解析 JSON。请重试，或降低输入复杂度。"
        : getM3ErrorMessage(classified);
    const payload: GenerateRoadbookResponse = {
      ok: false,
      code,
      category: classified.category,
      message,
      details: error instanceof Error ? error.message : undefined,
      ...(fieldIssues ? { fieldIssues } : {}),
    };
    return NextResponse.json(payload, { status: classified.statusCode ?? 502 });
  }
}
