import { NextResponse } from "next/server";
import { z } from "zod";
import { extractJsonObject } from "@/lib/json-extract";
import { applyMiniMaxThinking, buildMiniMaxChatEndpoint, readPositiveIntegerEnv, resolveMiniMaxModel } from "@/lib/minimax-config";
import { normalizeRoadbook } from "@/lib/roadbook-normalize";
import type { DayPlan, GenerateRoadbookResponse, ItineraryStop, Roadbook } from "@/lib/roadbook-types";
import { roadbookSchema, travelBriefSchema } from "@/lib/roadbook-validation";

export const runtime = "nodejs";

const stopCategorySchema = z
  .enum(["view", "food", "coffee", "hotel", "transport", "culture", "shopping", "other"])
  .catch("view");

const previewStopSchema = z.object({
  name: z.string().min(1).max(60),
  time: z.string().min(1).max(40).catch("留白"),
  category: stopCategorySchema,
});

const previewDaySchema = z.object({
  day: z.coerce.number().int().min(1),
  title: z.string().min(1).max(40),
  area: z.string().min(1).max(40),
  mood: z.string().min(1).max(80),
  routeSummary: z.string().min(1).max(120),
  stops: z.array(previewStopSchema).min(1).max(3),
  food: z.array(z.string().min(1).max(40)).min(1).max(3).catch(["在地小吃"]),
  photoTip: z.string().min(1).max(80).catch("留意光影和留白构图"),
});

const dreamPreviewSchema = z.object({
  title: z.string().min(1).max(40),
  subtitle: z.string().min(1).max(60),
  destination: z.string().min(1).max(80),
  concept: z.string().min(1).max(120),
  highlights: z.array(z.string().min(1).max(40)).min(1).max(4),
  days: z.array(previewDaySchema).min(1).max(10),
});

function buildPreviewPrompt(brief: ReturnType<typeof travelBriefSchema.parse>) {
  return `你是一个旅游路书 Agent 的第一阶段生成器。请先生成“可立即展示的极简梦境路书骨架”，用于动态网页预览。

只输出 JSON 对象，不要 Markdown，不要解释。

用户需求：
- 目的地：${brief.destination}
- 城市：${brief.city}
- 天数：${brief.days}
- 月份：${brief.travelMonth}
- 兴趣：${brief.interests.join("、")}
- 避免：${brief.mustAvoid}
- 偏好：${brief.specialRequests}
- 语气：${brief.tone}

JSON 结构：
{
  "title": "最多 8 个汉字",
  "subtitle": "最多 12 个汉字，梦境感",
  "destination": "string",
  "concept": "最多 24 个汉字",
  "highlights": ["最多 8 个汉字", "最多 8 个汉字", "最多 8 个汉字"],
  "days": [
    {
      "day": 1,
      "title": "最多 8 个汉字",
      "area": "最多 8 个汉字",
      "mood": "用 3 个短词，用顿号分隔",
      "routeSummary": "最多 20 个汉字",
      "stops": [
        { "name": "真实地点名", "time": "上午", "category": "view|food|coffee|hotel|transport|culture|shopping|other" },
        { "name": "真实地点名", "time": "下午", "category": "view|food|coffee|hotel|transport|culture|shopping|other" }
      ],
      "food": ["一个在地食物或咖啡"],
      "photoTip": "最多 20 个汉字"
    }
  ]
}

内容约束：
- days 数量必须等于 ${brief.days}。
- 每天只要 2 个 stops。
- 文字极简，优先画面感，不要长句。
- 总输出尽量控制在 1200 个中文字符以内。
- 不要输出 why、tip、duration、budget、packing、reminders。
- 地点尽量真实，但不要承诺营业时间、票价、预约状态。`;
}

function ensureItems(values: string[], minCount: number, fallbacks: string[]) {
  const items = values.map((value) => value.trim()).filter(Boolean);

  for (const fallback of fallbacks) {
    if (items.length >= minCount) break;
    items.push(fallback);
  }

  return items.slice(0, Math.max(minCount, items.length));
}

function buildFallbackDay(day: number, city: string): z.infer<typeof previewDaySchema> {
  return {
    day,
    title: `梦境 D${day}`,
    area: city,
    mood: "慢游、光影、留白",
    routeSummary: "先留出画面骨架",
    stops: [
      { name: `${city}核心区`, time: "上午", category: "view" },
      { name: `${city}咖啡停留`, time: "下午", category: "coffee" },
    ],
    food: ["在地小吃"],
    photoTip: "留意光影和留白",
  };
}

function buildPreviewDays(days: Array<z.infer<typeof previewDaySchema>>, count: number, city: string) {
  return Array.from({ length: count }, (_, index) => {
    const fallback = buildFallbackDay(index + 1, city);
    return {
      ...fallback,
      ...(days[index] || {}),
      day: index + 1,
    };
  });
}

function expandPreviewToRoadbook(
  preview: z.infer<typeof dreamPreviewSchema>,
  brief: ReturnType<typeof travelBriefSchema.parse>,
) {
  const days: DayPlan[] = buildPreviewDays(preview.days, brief.days, brief.city).map((day) => {
    const stops: ItineraryStop[] = Array.from({ length: 2 }, (_, index) => {
      const source = day.stops[index] || day.stops[0] || buildFallbackDay(day.day, brief.city).stops[index];
      return {
        id: `day-${day.day}-stop-${index + 1}`,
        name: source.name,
        time: source.time,
        category: source.category,
        addressHint: `${brief.city} ${source.name}`,
        why: `${day.mood}的关键场景`,
        duration: index === 0 ? "1.5-2 小时" : "1-1.5 小时",
        tip: day.photoTip,
      };
    });

    return {
      day: day.day,
      title: day.title,
      area: day.area,
      mood: day.mood,
      routeSummary: day.routeSummary,
      commuteNote: "预览版先展示动线，完整交通细节稍后补充。",
      budgetNote: "预览版先不细分预算，完整预算稍后补充。",
      stops,
      food: ensureItems(day.food, 1, ["在地小吃"]).slice(0, 2),
      photoTips: [day.photoTip],
    };
  });

  const roadbook: Roadbook = {
    title: preview.title,
    subtitle: preview.subtitle,
    destination: preview.destination || brief.destination,
    durationLabel: `${brief.days} 天`,
    travelerLabel: brief.travelers,
    budgetLabel: brief.budget,
    concept: preview.concept,
    bestFor: ensureItems([brief.travelers, ...brief.interests.slice(0, 2)], 2, ["视觉化路书", "慢旅行"]),
    highlights: ensureItems(preview.highlights, 3, ["梦境路线", "轻量动线", "出片场景"]).slice(0, 4),
    summary: {
      routeTheme: preview.concept,
      transportPlan: "先生成梦境预览，完整交通细节后台补充。",
      stayArea: `${brief.city}核心区`,
      rhythm: "先看画面，再补细节。",
    },
    days,
    budget: [
      { label: "住宿", amount: "稍后补充", note: "完整路书会补充住宿建议。" },
      { label: "餐饮", amount: "稍后补充", note: "完整路书会补充餐饮预算。" },
      { label: "交通", amount: "稍后补充", note: "完整路书会补充交通预算。" },
    ],
    packing: ["舒适鞋", "防晒用品", "轻便外套"],
    reminders: ["预览版先用于选方向", "完整细节生成后再核对", "出发前核验实时信息"],
    disclaimer: "AI 生成的旅行建议仅用于规划参考。出发前请核验营业时间、票价、预约、交通、天气与安全信息。",
  };

  return normalizeRoadbook(roadbookSchema.parse(roadbook));
}

export async function POST(request: Request) {
  let brief: ReturnType<typeof travelBriefSchema.parse>;

  try {
    brief = travelBriefSchema.parse(await request.json());
  } catch {
    const payload: GenerateRoadbookResponse = {
      ok: false,
      code: "invalid_request",
      message: "旅行需求格式不完整，请检查输入项。",
    };
    return NextResponse.json(payload, { status: 400 });
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  const model = resolveMiniMaxModel("speed");
  const maxCompletionTokens = readPositiveIntegerEnv("MINIMAX_PREVIEW_MAX_COMPLETION_TOKENS", 1800);
  const timeoutMs = readPositiveIntegerEnv("MINIMAX_PREVIEW_TIMEOUT_MS", 60_000);

  if (!apiKey) {
    const payload: GenerateRoadbookResponse = {
      ok: false,
      code: "missing_minimax_key",
      message: "还没有配置 MINIMAX_API_KEY。请在 .env.local 中填入密钥后重启开发服务。",
    };
    return NextResponse.json(payload, { status: 503 });
  }

  try {
    const requestBody = applyMiniMaxThinking({
      model,
      messages: [
        {
          role: "system" as const,
          content: "你只返回可解析 JSON。不要输出 Markdown，不要输出额外解释。",
        },
        {
          role: "user" as const,
          content: buildPreviewPrompt(brief),
        },
      ],
      temperature: 0.55,
      top_p: 0.85,
      max_completion_tokens: maxCompletionTokens,
    });

    const response = await fetch(buildMiniMaxChatEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = await response.json();
    if (!response.ok) {
      const payload: GenerateRoadbookResponse = {
        ok: false,
        code: "minimax_error",
        message: "MiniMax 预览生成失败，请检查密钥、模型名或账户额度。",
        details: typeof data?.base_resp?.status_msg === "string" ? data.base_resp.status_msg : undefined,
      };
      return NextResponse.json(payload, { status: response.status });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      const payload: GenerateRoadbookResponse = {
        ok: false,
        code: "parse_error",
        message: "MiniMax 预览返回内容为空，无法生成路书。",
      };
      return NextResponse.json(payload, { status: 502 });
    }

    const preview = dreamPreviewSchema.parse(extractJsonObject(content));
    const payload: GenerateRoadbookResponse = {
      ok: true,
      roadbook: expandPreviewToRoadbook(preview, brief),
      model,
      generationMode: "speed",
      phase: "preview",
    };
    return NextResponse.json(payload);
  } catch (error) {
    const payload: GenerateRoadbookResponse = {
      ok: false,
      code: error instanceof SyntaxError ? "parse_error" : "minimax_error",
      message:
        error instanceof SyntaxError
          ? "MiniMax 预览返回内容不是可解析 JSON。请重试。"
          : "生成梦境预览时出现网络或服务错误。",
      details: error instanceof Error ? error.message : undefined,
    };
    return NextResponse.json(payload, { status: 502 });
  }
}
