import { NextResponse } from "next/server";
import { z } from "zod";
import { extractJsonObject } from "@/lib/json-extract";
import {
  buildMiniMaxScenicChatEndpoint,
  readPositiveIntegerEnv,
  resolveMiniMaxScenicModel,
} from "@/lib/minimax-config";
import { callM3Chat, type M3ChatRequest, type M3EndpointResolver } from "@/lib/m3-client";
import { classifyM3Error, getM3ErrorMessage } from "@/lib/m3-error-classifier";
import {
  buildFallbackScenicRenderDesign,
  buildScenicRenderDesignPrompt,
  normalizeScenicRenderDesign,
  type ScenicRenderSkillInput,
} from "@/lib/scenic-render-skill";
import { formatZodIssues } from "@/lib/roadbook-validation";
import type { GenerateScenicRenderDesignResponse } from "@/lib/roadbook-types";

export const runtime = "nodejs";

const scenicRenderRequestSchema = z.object({
  imageDataUrl: z.string().optional(),
  destination: z.string().min(1).max(80).catch("目的地"),
  mood: z.string().max(40).optional(),
  template: z.string().max(40).optional(),
  roadbookTitle: z.string().max(120).optional(),
  activeDayTitle: z.string().max(80).optional(),
  activeArea: z.string().max(80).optional(),
});

const imageDataUrlPattern = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\s]+$/i;

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
  let payload: z.infer<typeof scenicRenderRequestSchema>;

  try {
    payload = scenicRenderRequestSchema.parse(await request.json());
  } catch (error) {
    const fieldIssues =
      error instanceof z.ZodError ? formatZodIssues(error) : undefined;
    const response: GenerateScenicRenderDesignResponse = {
      ok: false,
      code: "invalid_request",
      message: "Scenic Render Skill 请求格式不完整。",
      ...(fieldIssues ? { fieldIssues } : {}),
    };
    return NextResponse.json(response, { status: 400 });
  }

  const input: ScenicRenderSkillInput = {
    destination: payload.destination,
    mood: payload.mood,
    template: payload.template,
    roadbookTitle: payload.roadbookTitle,
    activeDayTitle: payload.activeDayTitle,
    activeArea: payload.activeArea,
  };
  const model = resolveMiniMaxScenicModel();
  const imageDataUrl = normalizeImageDataUrl(payload.imageDataUrl || "");
  const maxImageBytes = readPositiveIntegerEnv("MINIMAX_SCENIC_MAX_IMAGE_BYTES", 6 * 1024 * 1024);

  if (!imageDataUrl) {
    const response: GenerateScenicRenderDesignResponse = {
      ok: false,
      code: "invalid_request",
      message: "请先上传一张 PNG、JPG 或 WebP 风景照片。",
    };
    return NextResponse.json(response, { status: 400 });
  }

  if (Buffer.byteLength(imageDataUrl, "utf8") > maxImageBytes) {
    const response: GenerateScenicRenderDesignResponse = {
      ok: false,
      code: "invalid_request",
      message: "图片太大，请压缩到 6MB 以内再上传。",
    };
    return NextResponse.json(response, { status: 413 });
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    const response: GenerateScenicRenderDesignResponse = {
      ok: false,
      code: "missing_minimax_key",
      message: "还没有配置 MINIMAX_API_KEY，已使用本地建模蓝图兜底。",
      design: buildFallbackScenicRenderDesign(input, "缺少 MiniMax-M3 密钥，当前使用本地建模蓝图兜底。", model),
    };
    return NextResponse.json(response, { status: 503 });
  }

  const prompt = buildScenicRenderDesignPrompt(input);
  const maxCompletionTokens = readPositiveIntegerEnv("MINIMAX_SCENIC_MAX_COMPLETION_TOKENS", 2200);
  const timeoutMs = readPositiveIntegerEnv("MINIMAX_SCENIC_TIMEOUT_MS", 120_000);
  const endpointResolver: M3EndpointResolver = () => buildMiniMaxScenicChatEndpoint();

  const m3Request: M3ChatRequest = {
    model,
    messages: [
      {
        role: "system",
        content: "你只返回可解析 JSON。不要输出 Markdown，不要输出额外解释。",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
            },
          },
        ],
      },
    ],
    temperature: 0.35,
    top_p: 0.86,
    max_completion_tokens: maxCompletionTokens,
  };

  try {
    const result = await callM3Chat(m3Request, {
      apiKey,
      timeoutMs,
      endpointResolver,
    });

    if (!result.ok) {
      const classified = result.error;
      const message = getM3ErrorMessage(classified);
      const fallbackMessage = "M3 读图接口暂不可用，当前使用本地建模蓝图兜底。";
      const response: GenerateScenicRenderDesignResponse = {
        ok: false,
        code: codeFromM3Category(classified.category),
        category: classified.category,
        message,
        ...(classified.details ? { details: classified.details } : {}),
        design: buildFallbackScenicRenderDesign(input, fallbackMessage, model),
      };
      return NextResponse.json(response, {
        status: classified.statusCode ?? 502,
      });
    }

    const content = result.data.content;
    if (!content) {
      const classified = classifyM3Error(new Error("empty content from M3"));
      const response: GenerateScenicRenderDesignResponse = {
        ok: false,
        code: "parse_error",
        category: classified.category,
        message: "MiniMax-M3 返回内容为空，已使用本地建模蓝图兜底。",
        design: buildFallbackScenicRenderDesign(input, "M3 返回为空，当前使用本地建模蓝图兜底。", model),
      };
      return NextResponse.json(response, { status: 502 });
    }

    const parsed = extractJsonObject(content);
    const design = normalizeScenicRenderDesign(parsed, input, model);
    const response: GenerateScenicRenderDesignResponse = {
      ok: true,
      design,
    };
    return NextResponse.json(response);
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
        ? "MiniMax-M3 返回内容不是可解析 JSON，已使用本地建模蓝图兜底。"
        : getM3ErrorMessage(classified);
    const response: GenerateScenicRenderDesignResponse = {
      ok: false,
      code,
      category: classified.category,
      message,
      details: error instanceof Error ? error.message : undefined,
      ...(fieldIssues ? { fieldIssues } : {}),
      design: buildFallbackScenicRenderDesign(input, "M3 读图设计失败，当前使用本地建模蓝图兜底。", model),
    };
    return NextResponse.json(response, { status: classified.statusCode ?? 502 });
  }
}

function normalizeImageDataUrl(value: string) {
  const trimmed = value.trim();
  if (!imageDataUrlPattern.test(trimmed)) {
    return "";
  }

  const [header, body] = trimmed.split(",", 2);
  return `${header},${body.replace(/\s+/g, "")}`;
}
