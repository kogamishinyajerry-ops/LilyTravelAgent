import { NextResponse } from "next/server";
import { z } from "zod";
import { buildMiniMaxImageEndpoint, readPositiveIntegerEnv, resolveMiniMaxImageModel } from "@/lib/minimax-config";
import {
  deleteCachedPreviewAsset,
  isPreviewAssetHistoryId,
  isPreviewAssetCacheKey,
  listPreviewAssetHistory,
  readCachedPreviewAsset,
  readPreviewAssetCoverHistoryId,
  restorePreviewAssetHistory,
  setPreviewAssetCoverPick,
  writeCachedPreviewAsset,
} from "@/lib/preview-asset-cache";
import { buildCinematicPreviewPrompt, buildPromptOnlyPreviewAsset } from "@/lib/preview-asset";
import type {
  DeletePreviewAssetCacheResponse,
  GeneratePreviewAssetResponse,
  PreviewAsset,
  PreviewAssetHistoryResponse,
  RestorePreviewAssetHistoryResponse,
  SetPreviewAssetCoverResponse,
} from "@/lib/roadbook-types";
import { roadbookSchema } from "@/lib/roadbook-validation";

export const runtime = "nodejs";

const previewAssetRequestSchema = z.object({
  roadbook: roadbookSchema,
  activeDay: z.coerce.number().int().min(1).optional(),
  mood: z.string().max(40).optional(),
  template: z.string().max(40).optional(),
  directorLens: z.string().max(40).optional(),
  directorLensLabel: z.string().max(60).optional(),
  directorLensPrompt: z.string().max(220).optional(),
  scenicDesign: z
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
    .optional(),
  forceRegenerate: z.boolean().optional().default(false),
});

const deletePreviewAssetCacheSchema = z.object({
  cacheKey: z.string().refine(isPreviewAssetCacheKey),
});

const restorePreviewAssetHistorySchema = z.object({
  cacheKey: z.string().refine(isPreviewAssetCacheKey),
  historyId: z.string().refine(isPreviewAssetHistoryId),
});

const setPreviewAssetCoverSchema = restorePreviewAssetHistorySchema;

type MiniMaxImageResponse = {
  id?: string;
  data?: {
    image_base64?: string[] | string;
    image_urls?: string[] | string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

export async function POST(request: Request) {
  let payload: z.infer<typeof previewAssetRequestSchema>;

  try {
    payload = previewAssetRequestSchema.parse(await request.json());
  } catch {
    const response: GeneratePreviewAssetResponse = {
      ok: false,
      code: "invalid_request",
      message: "预览资产请求格式不完整，缺少 roadbook。",
    };
    return NextResponse.json(response, { status: 400 });
  }

  const apiKey = process.env.MINIMAX_IMAGE_API_KEY || process.env.MINIMAX_API_KEY;
  const model = resolveMiniMaxImageModel();
  const activeDay = payload.activeDay || payload.roadbook.days[0]?.day || 1;
  const prompt = buildCinematicPreviewPrompt(payload.roadbook, { ...payload, activeDay });
  const cacheInput = {
    roadbook: payload.roadbook,
    activeDay,
    mood: payload.mood,
    template: payload.template,
    directorLens: payload.directorLens,
    model,
    prompt,
    aspectRatio: "16:9" as const,
  };
  const cachedAsset = payload.forceRegenerate ? null : await readCachedPreviewAsset(cacheInput);

  if (cachedAsset) {
    const response: GeneratePreviewAssetResponse = {
      ok: true,
      asset: cachedAsset,
    };
    return NextResponse.json(response);
  }

  if (!apiKey) {
    const response: GeneratePreviewAssetResponse = {
      ok: false,
      code: "missing_minimax_key",
      message: "还没有配置 MINIMAX_API_KEY 或 MINIMAX_IMAGE_API_KEY，当前使用 Three.js 程序化预览兜底。",
      asset: buildPromptOnlyPreviewAsset(payload.roadbook, payload, "缺少图片生成密钥，已使用程序化 3D 预览兜底。"),
    };
    return NextResponse.json(response, { status: 503 });
  }

  try {
    const timeoutMs = readPositiveIntegerEnv("MINIMAX_IMAGE_TIMEOUT_MS", 120_000);
    const response = await fetch(buildMiniMaxImageEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        aspect_ratio: "16:9",
        response_format: "base64",
        n: 1,
        prompt_optimizer: true,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await response.json()) as MiniMaxImageResponse;

    if (!response.ok || data.base_resp?.status_code) {
      const result: GeneratePreviewAssetResponse = {
        ok: false,
        code: "minimax_error",
        message: "MiniMax 图片生成失败，当前使用 Three.js 程序化预览兜底。",
        details: data.base_resp?.status_msg,
        asset: buildPromptOnlyPreviewAsset(payload.roadbook, payload, "图片生成失败，已回退到程序化 3D 预览。"),
      };
      return NextResponse.json(result, { status: response.ok ? 502 : response.status });
    }

    const imageBase64 = firstString(data.data?.image_base64);
    const imageUrl = firstString(data.data?.image_urls);
    if (!imageBase64 && !imageUrl) {
      const result: GeneratePreviewAssetResponse = {
        ok: false,
        code: "minimax_error",
        message: "MiniMax 图片返回为空，当前使用 Three.js 程序化预览兜底。",
        asset: buildPromptOnlyPreviewAsset(payload.roadbook, payload, "图片返回为空，已回退到程序化 3D 预览。"),
      };
      return NextResponse.json(result, { status: 502 });
    }

    const asset: PreviewAsset = {
      status: "generated",
      source: "minimax-image",
      model,
      prompt,
      aspectRatio: "16:9",
      imageDataUrl: imageBase64 ? `data:image/jpeg;base64,${stripDataUrlPrefix(imageBase64)}` : undefined,
      imageUrl,
    };
    const cachedAsset = await writePreviewAssetCacheSafely(cacheInput, asset);
    const result: GeneratePreviewAssetResponse = {
      ok: true,
      asset: cachedAsset,
    };
    return NextResponse.json(result);
  } catch (error) {
    const result: GeneratePreviewAssetResponse = {
      ok: false,
      code: "minimax_error",
      message: "生成预览资产时出现网络或服务错误，当前使用 Three.js 程序化预览兜底。",
      details: error instanceof Error ? error.message : undefined,
      asset: buildPromptOnlyPreviewAsset(payload.roadbook, payload, "图片生成网络错误，已回退到程序化 3D 预览。"),
    };
    return NextResponse.json(result, { status: 502 });
  }
}

export async function GET(request: Request) {
  const cacheKey = new URL(request.url).searchParams.get("cacheKey") || "";
  if (!isPreviewAssetCacheKey(cacheKey)) {
    const response: PreviewAssetHistoryResponse = {
      ok: false,
      code: "invalid_request",
      message: "历史资产请求缺少有效 cacheKey。",
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const items = await listPreviewAssetHistory(cacheKey);
    const coverHistoryId = await readPreviewAssetCoverHistoryId(cacheKey);
    const response: PreviewAssetHistoryResponse = {
      ok: true,
      cacheKey,
      coverHistoryId,
      items,
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: PreviewAssetHistoryResponse = {
      ok: false,
      code: "history_error",
      message: "读取预览资产历史失败。",
      details: error instanceof Error ? error.message : undefined,
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let payload: z.infer<typeof setPreviewAssetCoverSchema>;

  try {
    payload = setPreviewAssetCoverSchema.parse(await request.json());
  } catch {
    const response: SetPreviewAssetCoverResponse = {
      ok: false,
      code: "invalid_request",
      message: "设置封面请求格式不正确。",
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const asset = await restorePreviewAssetHistory(payload.cacheKey, payload.historyId);
    if (!asset) {
      const response: SetPreviewAssetCoverResponse = {
        ok: false,
        code: "not_found",
        message: "没有找到可设置为封面的历史版本。",
      };
      return NextResponse.json(response, { status: 404 });
    }
    const coverPick = await setPreviewAssetCoverPick(payload.cacheKey, payload.historyId);
    if (!coverPick) {
      const response: SetPreviewAssetCoverResponse = {
        ok: false,
        code: "not_found",
        message: "没有找到可设置为封面的历史版本。",
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: SetPreviewAssetCoverResponse = {
      ok: true,
      cacheKey: payload.cacheKey,
      historyId: payload.historyId,
      selectedAt: coverPick.selectedAt,
      asset: {
        ...asset,
        cacheStatus: "cover",
        message: "已设为最终封面，并同步为当前预览图。",
      },
      message: "已设为最终封面。",
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: SetPreviewAssetCoverResponse = {
      ok: false,
      code: "cover_error",
      message: "设置最终封面失败。",
      details: error instanceof Error ? error.message : undefined,
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let payload: z.infer<typeof restorePreviewAssetHistorySchema>;

  try {
    payload = restorePreviewAssetHistorySchema.parse(await request.json());
  } catch {
    const response: RestorePreviewAssetHistoryResponse = {
      ok: false,
      code: "invalid_request",
      message: "恢复历史版本请求格式不正确。",
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const asset = await restorePreviewAssetHistory(payload.cacheKey, payload.historyId);
    if (!asset) {
      const response: RestorePreviewAssetHistoryResponse = {
        ok: false,
        code: "not_found",
        message: "没有找到对应的历史版本。",
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: RestorePreviewAssetHistoryResponse = {
      ok: true,
      asset,
      message: "历史版本已恢复为当前预览图。",
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: RestorePreviewAssetHistoryResponse = {
      ok: false,
      code: "history_error",
      message: "恢复历史版本失败。",
      details: error instanceof Error ? error.message : undefined,
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let payload: z.infer<typeof deletePreviewAssetCacheSchema>;

  try {
    payload = deletePreviewAssetCacheSchema.parse(await request.json());
  } catch {
    const response: DeletePreviewAssetCacheResponse = {
      ok: false,
      code: "invalid_request",
      message: "缓存清理请求格式不正确，缺少有效 cacheKey。",
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const deleted = await deleteCachedPreviewAsset(payload.cacheKey);
    const response: DeletePreviewAssetCacheResponse = {
      ok: true,
      cacheKey: payload.cacheKey,
      deleted,
      message: deleted ? "当前预览资产缓存已清除。" : "没有找到对应的本地缓存文件。",
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: DeletePreviewAssetCacheResponse = {
      ok: false,
      code: "cache_error",
      message: "清除预览资产缓存失败。",
      details: error instanceof Error ? error.message : undefined,
    };
    return NextResponse.json(response, { status: 500 });
  }
}

async function writePreviewAssetCacheSafely(
  cacheInput: Parameters<typeof writeCachedPreviewAsset>[0],
  asset: PreviewAsset,
) {
  try {
    return await writeCachedPreviewAsset(cacheInput, asset);
  } catch {
    return {
      ...asset,
      message: "AI 远景贴片已生成，但本地缓存写入失败。",
    };
  }
}

function firstString(value: string[] | string | undefined) {
  if (Array.isArray(value)) {
    return value.find((item) => item.trim());
  }

  return value?.trim() || undefined;
}

function stripDataUrlPrefix(value: string) {
  return value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}
