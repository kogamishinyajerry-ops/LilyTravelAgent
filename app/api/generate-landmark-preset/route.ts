import { NextResponse } from "next/server";
import { z } from "zod";
import type { LandmarkPreset } from "@/lib/landmark-preset";
import { generateLandmarkPreset } from "@/lib/landmark-generator";
import {
  buildLandmarkPresetCacheKey,
  createDefaultLandmarkPresetCache,
} from "@/lib/landmark-preset-cache";
import { formatZodIssues, roadbookSchema } from "@/lib/roadbook-validation";
import type { ScenicRenderDesign, ZodFieldIssue } from "@/lib/roadbook-types";

export const runtime = "nodejs";

const DREAM_TEMPLATES = [
  "monument",
  "starlake",
  "lantern",
  "snowfield",
  "neon-city",
  "island",
  "shrine",
  "desert",
] as const;

const DREAM_MOODS = ["cloud", "geometry", "dusk", "neon"] as const;

const scenicDesignSchema = z
  .object({
    status: z.enum(["generated", "fallback"]).optional(),
    source: z.enum(["minimax-m3", "local-fallback"]).optional(),
    model: z.string().max(80).optional(),
    destination: z.string().max(80).optional(),
    sceneTitle: z.string().max(80).optional(),
    terrain: z.array(z.string().max(140)).max(6).optional(),
    architecture: z.array(z.string().max(140)).max(6).optional(),
    waterAndVegetation: z.array(z.string().max(140)).max(6).optional(),
    lighting: z.string().max(200).optional(),
    camera: z.string().max(200).optional(),
    materialPalette: z.array(z.string().max(100)).max(8).optional(),
    threeJsPlan: z.array(z.string().max(160)).max(8).optional(),
    imagePrompt: z.string().max(1400).optional(),
    negativePrompt: z.array(z.string().max(140)).max(10).optional(),
    message: z.string().max(240).optional(),
    createdAt: z.string().max(80).optional(),
  })
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    // Strip undefined fields so the parsed shape matches the strict
    // `ScenicRenderDesign` type consumed by `buildLandmarkPresetCacheKey`
    // and `generateLandmarkPreset`.
    return Object.fromEntries(
      Object.entries(value).filter(([, v]) => v !== undefined),
    ) as Partial<ScenicRenderDesign>;
  });

const landmarkPresetRequestSchema = z.object({
  roadbook: roadbookSchema,
  activeDay: z.coerce.number().int().min(1).optional(),
  template: z.enum(DREAM_TEMPLATES).default("monument"),
  mood: z.enum(DREAM_MOODS).default("cloud"),
  scenicDesign: scenicDesignSchema,
});

type GenerateLandmarkPresetErrorCode =
  | "missing_minimax_key"
  | "minimax_error"
  | "parse_error"
  | "schema_error"
  | "invalid_request";

type GenerateLandmarkPresetSuccess = {
  ok: true;
  preset: LandmarkPreset;
  model: string;
  cached: boolean;
  durationMs: number;
  cacheKey?: string;
};

type GenerateLandmarkPresetFailure = {
  ok: false;
  code: GenerateLandmarkPresetErrorCode;
  message: string;
  details?: string;
  fieldIssues?: ZodFieldIssue[];
};

type GenerateLandmarkPresetResponse =
  | GenerateLandmarkPresetSuccess
  | GenerateLandmarkPresetFailure;

export async function POST(request: Request) {
  let payload: z.infer<typeof landmarkPresetRequestSchema>;

  try {
    payload = landmarkPresetRequestSchema.parse(await request.json());
  } catch (error) {
    const fieldIssues =
      error instanceof z.ZodError ? formatZodIssues(error) : undefined;
    const response: GenerateLandmarkPresetResponse = {
      ok: false,
      code: "invalid_request",
      message: "地标预设请求格式不完整，请检查 roadbook / template / mood 等字段。",
      ...(fieldIssues ? { fieldIssues } : {}),
    };
    return NextResponse.json(response, { status: 400 });
  }

  const activeDay = payload.activeDay || payload.roadbook.days[0]?.day || 1;
  const cache = createDefaultLandmarkPresetCache();
  const scenicDesign = payload.scenicDesign as ScenicRenderDesign | undefined;
  const cacheKey = buildLandmarkPresetCacheKey(
    payload.roadbook,
    activeDay,
    payload.template,
    payload.mood,
    scenicDesign,
  );

  try {
    const cachedPreset = await cache.get(cacheKey);
    if (cachedPreset) {
      const response: GenerateLandmarkPresetResponse = {
        ok: true,
        preset: cachedPreset,
        model: "minimax-m3",
        cached: true,
        durationMs: 0,
        cacheKey,
      };
      return NextResponse.json(response);
    }
  } catch {
    // Cache read failures should never break generation; fall through to
    // the live M3 call below.
  }

  if (!process.env.MINIMAX_API_KEY) {
    const response: GenerateLandmarkPresetResponse = {
      ok: false,
      code: "missing_minimax_key",
      message: "还没有配置 MINIMAX_API_KEY。请在 .env.local 中填入密钥后重启开发服务。",
    };
    return NextResponse.json(response, { status: 503 });
  }

  try {
    const result = await generateLandmarkPreset({
      roadbook: payload.roadbook,
      activeDay,
      template: payload.template,
      mood: payload.mood,
      scenicDesign,
    });

    try {
      await cache.set(cacheKey, result.preset);
    } catch {
      // Cache write failures shouldn't fail the request — the live preset
      // is still useful to the client.
    }

    const response: GenerateLandmarkPresetResponse = {
      ok: true,
      preset: result.preset,
      model: result.model,
      cached: false,
      durationMs: result.durationMs,
      cacheKey,
    };
    return NextResponse.json(response);
  } catch (error) {
    const fieldIssues =
      error instanceof z.ZodError ? formatZodIssues(error) : undefined;
    const response: GenerateLandmarkPresetResponse = {
      ok: false,
      code: classifyError(error),
      message: resolveErrorMessage(error),
      details: error instanceof Error ? error.message : undefined,
      ...(fieldIssues ? { fieldIssues } : {}),
    };
    return NextResponse.json(response, { status: 502 });
  }
}

function classifyError(
  error: unknown,
): Extract<GenerateLandmarkPresetErrorCode, "minimax_error" | "parse_error" | "schema_error"> {
  if (error instanceof z.ZodError) {
    return "schema_error";
  }

  if (error instanceof SyntaxError) {
    return "parse_error";
  }

  return "minimax_error";
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "M3 返回的内容无法通过 LandmarkPreset Schema 校验。";
  }

  if (error instanceof SyntaxError) {
    return "M3 返回内容不是可解析 JSON。请重试，或降低输入复杂度。";
  }

  if (error instanceof Error) {
    if (/missing API key/i.test(error.message)) {
      return "还没有配置 MINIMAX_API_KEY。请在 .env.local 中填入密钥后重启开发服务。";
    }

    if (/failed to parse JSON/i.test(error.message)) {
      return "M3 返回内容不是可解析 JSON。请重试，或降低输入复杂度。";
    }

    if (/LandmarkPresetSchema validation/i.test(error.message)) {
      return "M3 返回的内容无法通过 LandmarkPreset Schema 校验。";
    }

    return "生成地标预设时出现网络或服务错误。";
  }

  return "生成地标预设时出现未知错误。";
}
