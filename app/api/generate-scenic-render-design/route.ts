import { NextResponse } from "next/server";
import { z } from "zod";
import { extractJsonObject } from "@/lib/json-extract";
import {
  applyMiniMaxThinking,
  buildMiniMaxScenicChatEndpoint,
  readPositiveIntegerEnv,
  resolveMiniMaxScenicModel,
} from "@/lib/minimax-config";
import {
  buildFallbackScenicRenderDesign,
  buildScenicRenderDesignPrompt,
  normalizeScenicRenderDesign,
  type ScenicRenderSkillInput,
} from "@/lib/scenic-render-skill";
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

type MiniMaxScenicMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | {
            type: "image_url";
            image_url: {
              url: string;
            };
          }
      >;
    };

type MiniMaxScenicResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
      reasoning_content?: string;
    };
  }>;
  reply?: unknown;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

const imageDataUrlPattern = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\s]+$/i;

export async function POST(request: Request) {
  let payload: z.infer<typeof scenicRenderRequestSchema>;

  try {
    payload = scenicRenderRequestSchema.parse(await request.json());
  } catch {
    const response: GenerateScenicRenderDesignResponse = {
      ok: false,
      code: "invalid_request",
      message: "Scenic Render Skill 请求格式不完整。",
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

  try {
    const requestBody = applyMiniMaxThinking<{
      model: string;
      messages: MiniMaxScenicMessage[];
      temperature: number;
      top_p: number;
      max_completion_tokens: number;
      thinking?: { type: string };
    }>({
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
    });

    const response = await fetch(buildMiniMaxScenicChatEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const rawText = await response.text();
    const data = parseJsonSafely(rawText) as MiniMaxScenicResponse | null;
    const baseStatus = data?.base_resp?.status_code;

    if (!response.ok || (typeof baseStatus === "number" && baseStatus !== 0)) {
      const result: GenerateScenicRenderDesignResponse = {
        ok: false,
        code: "minimax_error",
        message: "MiniMax-M3 读图设计失败，已使用本地建模蓝图兜底。",
        details: data?.base_resp?.status_msg || trimDetails(rawText),
        design: buildFallbackScenicRenderDesign(input, "M3 读图接口暂不可用，当前使用本地建模蓝图兜底。", model),
      };
      return NextResponse.json(result, { status: response.ok ? 502 : response.status });
    }

    const content = extractMiniMaxContent(data);
    if (!content) {
      const result: GenerateScenicRenderDesignResponse = {
        ok: false,
        code: "parse_error",
        message: "MiniMax-M3 返回内容为空，已使用本地建模蓝图兜底。",
        design: buildFallbackScenicRenderDesign(input, "M3 返回为空，当前使用本地建模蓝图兜底。", model),
      };
      return NextResponse.json(result, { status: 502 });
    }

    const parsed = extractJsonObject(content);
    const design = normalizeScenicRenderDesign(parsed, input, model);
    const result: GenerateScenicRenderDesignResponse = {
      ok: true,
      design,
    };
    return NextResponse.json(result);
  } catch (error) {
    const result: GenerateScenicRenderDesignResponse = {
      ok: false,
      code: error instanceof SyntaxError ? "parse_error" : "minimax_error",
      message:
        error instanceof SyntaxError
          ? "MiniMax-M3 返回内容不是可解析 JSON，已使用本地建模蓝图兜底。"
          : "生成建模蓝图时出现网络或服务错误，已使用本地建模蓝图兜底。",
      details: error instanceof Error ? error.message : undefined,
      design: buildFallbackScenicRenderDesign(input, "M3 读图设计失败，当前使用本地建模蓝图兜底。", model),
    };
    return NextResponse.json(result, { status: 502 });
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

function extractMiniMaxContent(data: MiniMaxScenicResponse | null) {
  const content = data?.choices?.[0]?.message?.content ?? data?.reply;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function parseJsonSafely(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function trimDetails(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, 280) : undefined;
}
