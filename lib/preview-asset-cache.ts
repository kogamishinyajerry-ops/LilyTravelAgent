import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PreviewAsset, PreviewAssetHistoryItem, Roadbook } from "@/lib/roadbook-types";

const CACHE_VERSION = 1;

type PreviewAssetCacheInput = {
  roadbook: Roadbook;
  activeDay: number;
  mood?: string;
  template?: string;
  model: string;
  prompt: string;
  aspectRatio: "16:9";
};

type PreviewAssetCacheMetadata = {
  version: number;
  cacheKey: string;
  historyId?: string;
  createdAt: string;
  mimeType: string;
  model: string;
  source: "minimax-image";
  prompt: string;
  aspectRatio: "16:9";
  destination: string;
  dayCount: number;
  style: {
    mood?: string;
    template?: string;
  };
};

type PreviewAssetHistoryMetadata = PreviewAssetCacheMetadata & {
  historyId: string;
  imageFile: string;
};

type PreviewAssetCoverPick = {
  cacheKey: string;
  historyId: string;
  selectedAt: string;
};

export function isPreviewAssetCacheEnabled() {
  const value = process.env.PREVIEW_ASSET_CACHE?.trim().toLowerCase();
  return !value || !["0", "false", "off", "disabled", "no"].includes(value);
}

export function buildPreviewAssetCacheKey(input: PreviewAssetCacheInput) {
  const hashInput = {
    version: CACHE_VERSION,
    destination: input.roadbook.destination,
    durationLabel: input.roadbook.durationLabel,
    dayCount: input.roadbook.days.length,
    activeDay: input.activeDay,
    style: {
      mood: input.mood || "",
      template: input.template || "",
    },
    model: input.model,
    prompt: input.prompt,
    roadbook: buildRoadbookFingerprint(input.roadbook),
  };

  return createHash("sha256").update(stableJson(hashInput)).digest("hex").slice(0, 32);
}

export async function readCachedPreviewAsset(input: PreviewAssetCacheInput): Promise<PreviewAsset | null> {
  if (!isPreviewAssetCacheEnabled()) {
    return null;
  }

  const cacheKey = buildPreviewAssetCacheKey(input);
  const metadataPath = getMetadataPath(cacheKey);

  try {
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as PreviewAssetCacheMetadata;
    if (metadata.version !== CACHE_VERSION || metadata.cacheKey !== cacheKey) {
      return null;
    }

    const imagePath = getImagePath(cacheKey, mimeTypeToExtension(metadata.mimeType));
    const image = await readFile(imagePath);
    const cachedAt = metadata.createdAt;

    return {
      status: "generated",
      source: metadata.source,
      model: metadata.model,
      prompt: metadata.prompt,
      aspectRatio: metadata.aspectRatio,
      imageDataUrl: `data:${metadata.mimeType};base64,${image.toString("base64")}`,
      message: `已从本地缓存读取 ${metadata.destination} 预览图。`,
      cacheStatus: "hit",
      cacheKey,
      cachedAt,
      historyId: metadata.historyId,
    };
  } catch {
    return null;
  }
}

export async function writeCachedPreviewAsset(
  input: PreviewAssetCacheInput,
  asset: PreviewAsset,
): Promise<PreviewAsset> {
  if (!isPreviewAssetCacheEnabled() || asset.status !== "generated" || asset.source !== "minimax-image") {
    return asset;
  }

  const parsed = parseImageDataUrl(asset.imageDataUrl);
  if (!parsed) {
    return asset;
  }

  const cacheKey = buildPreviewAssetCacheKey(input);
  const cacheDir = getPreviewAssetCacheDir();
  const createdAt = new Date().toISOString();
  const extension = mimeTypeToExtension(parsed.mimeType);
  const historyId = buildHistoryId(createdAt, parsed.buffer);
  const imagePath = getImagePath(cacheKey, extension);
  const metadataPath = getMetadataPath(cacheKey);
  const metadata: PreviewAssetCacheMetadata = {
    version: CACHE_VERSION,
    cacheKey,
    historyId,
    createdAt,
    mimeType: parsed.mimeType,
    model: asset.model,
    source: asset.source,
    prompt: asset.prompt,
    aspectRatio: asset.aspectRatio,
    destination: input.roadbook.destination,
    dayCount: input.roadbook.days.length,
    style: {
      mood: input.mood,
      template: input.template,
    },
  };

  await mkdir(cacheDir, { recursive: true });
  await atomicWriteFile(imagePath, parsed.buffer);
  await atomicWriteFile(metadataPath, Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`, "utf8"));
  await writePreviewAssetHistory(cacheKey, historyId, extension, parsed.buffer, metadata);

  return {
    ...asset,
    message: "AI 远景贴片已生成，并写入本地预览缓存。",
    cacheStatus: "stored",
    cacheKey,
    cachedAt: createdAt,
    historyId,
  };
}

export async function deleteCachedPreviewAsset(cacheKey: string) {
  if (!isPreviewAssetCacheKey(cacheKey)) {
    return false;
  }

  const deleteTargets = [
    getMetadataPath(cacheKey),
    getImagePath(cacheKey, "jpg"),
    getImagePath(cacheKey, "jpeg"),
    getImagePath(cacheKey, "png"),
    getImagePath(cacheKey, "webp"),
  ];
  const results = await Promise.all(deleteTargets.map(unlinkIfExists));

  return results.some(Boolean);
}

export function isPreviewAssetCacheKey(value: string) {
  return /^[a-f0-9]{32}$/.test(value);
}

export function isPreviewAssetHistoryId(value: string) {
  return /^[0-9]{14}-[a-f0-9]{12}$/.test(value);
}

export async function listPreviewAssetHistory(cacheKey: string, limit = 8): Promise<PreviewAssetHistoryItem[]> {
  if (!isPreviewAssetCacheEnabled() || !isPreviewAssetCacheKey(cacheKey)) {
    return [];
  }

  let filenames: string[];
  try {
    filenames = await readdir(getHistoryDir(cacheKey));
  } catch {
    return [];
  }

  const metadataFiles = filenames
    .filter((filename) => filename.endsWith(".json") && isPreviewAssetHistoryId(filename.replace(/\.json$/, "")))
    .sort()
    .reverse()
    .slice(0, limit);
  const coverPick = await readPreviewAssetCoverPick(cacheKey);
  const items = await Promise.all(metadataFiles.map((filename) => readHistoryItem(cacheKey, filename, coverPick?.historyId)));

  return items.filter((item): item is PreviewAssetHistoryItem => Boolean(item));
}

export async function readPreviewAssetCoverHistoryId(cacheKey: string) {
  const coverPick = await readPreviewAssetCoverPick(cacheKey);
  return coverPick?.historyId;
}

export async function setPreviewAssetCoverPick(cacheKey: string, historyId: string) {
  if (!isPreviewAssetCacheEnabled() || !isPreviewAssetCacheKey(cacheKey) || !isPreviewAssetHistoryId(historyId)) {
    return null;
  }

  const metadata = await readHistoryMetadata(cacheKey, historyId);
  if (!metadata) {
    return null;
  }

  const coverPick: PreviewAssetCoverPick = {
    cacheKey,
    historyId,
    selectedAt: new Date().toISOString(),
  };

  await mkdir(getHistoryDir(cacheKey), { recursive: true });
  await atomicWriteFile(getCoverPickPath(cacheKey), Buffer.from(`${JSON.stringify(coverPick, null, 2)}\n`, "utf8"));

  return coverPick;
}

export async function restorePreviewAssetHistory(cacheKey: string, historyId: string): Promise<PreviewAsset | null> {
  if (!isPreviewAssetCacheEnabled() || !isPreviewAssetCacheKey(cacheKey) || !isPreviewAssetHistoryId(historyId)) {
    return null;
  }

  const metadata = await readHistoryMetadata(cacheKey, historyId);
  if (!metadata) {
    return null;
  }

  const image = await readFile(path.join(getHistoryDir(cacheKey), metadata.imageFile));
  const extension = mimeTypeToExtension(metadata.mimeType);
  await mkdir(getPreviewAssetCacheDir(), { recursive: true });
  await atomicWriteFile(getImagePath(cacheKey, extension), image);
  await atomicWriteFile(getMetadataPath(cacheKey), Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`, "utf8"));

  return {
    status: "generated",
    source: metadata.source,
    model: metadata.model,
    prompt: metadata.prompt,
    aspectRatio: metadata.aspectRatio,
    imageDataUrl: `data:${metadata.mimeType};base64,${image.toString("base64")}`,
    message: "已从历史版本恢复为当前预览图。",
    cacheStatus: "restored",
    cacheKey,
    cachedAt: metadata.createdAt,
    historyId,
  };
}

function getPreviewAssetCacheDir() {
  return path.join(process.cwd(), ".lily-cache", "preview-assets");
}

function getMetadataPath(cacheKey: string) {
  return path.join(getPreviewAssetCacheDir(), `${cacheKey}.json`);
}

function getImagePath(cacheKey: string, extension: string) {
  return path.join(getPreviewAssetCacheDir(), `${cacheKey}.${extension}`);
}

function getHistoryDir(cacheKey: string) {
  return path.join(getPreviewAssetCacheDir(), "history", cacheKey);
}

function getHistoryMetadataPath(cacheKey: string, historyId: string) {
  return path.join(getHistoryDir(cacheKey), `${historyId}.json`);
}

function getCoverPickPath(cacheKey: string) {
  return path.join(getHistoryDir(cacheKey), "cover.json");
}

async function writePreviewAssetHistory(
  cacheKey: string,
  historyId: string,
  extension: string,
  image: Buffer,
  metadata: PreviewAssetCacheMetadata,
) {
  const historyDir = getHistoryDir(cacheKey);
  const imageFile = `${historyId}.${extension}`;
  const historyMetadata: PreviewAssetHistoryMetadata = {
    ...metadata,
    historyId,
    imageFile,
  };

  await mkdir(historyDir, { recursive: true });
  await atomicWriteFile(path.join(historyDir, imageFile), image);
  await atomicWriteFile(getHistoryMetadataPath(cacheKey, historyId), Buffer.from(`${JSON.stringify(historyMetadata, null, 2)}\n`, "utf8"));
}

async function readHistoryItem(
  cacheKey: string,
  filename: string,
  coverHistoryId?: string,
): Promise<PreviewAssetHistoryItem | null> {
  const historyId = filename.replace(/\.json$/, "");
  if (!isPreviewAssetHistoryId(historyId)) {
    return null;
  }

  const metadata = await readHistoryMetadata(cacheKey, historyId);
  if (!metadata) {
    return null;
  }

  try {
    const image = await readFile(path.join(getHistoryDir(cacheKey), metadata.imageFile));
    return {
      historyId: metadata.historyId,
      cacheKey,
      createdAt: metadata.createdAt,
      model: metadata.model,
      source: metadata.source,
      aspectRatio: metadata.aspectRatio,
      destination: metadata.destination,
      mood: metadata.style.mood,
      template: metadata.style.template,
      imageDataUrl: `data:${metadata.mimeType};base64,${image.toString("base64")}`,
      isCover: metadata.historyId === coverHistoryId,
    } satisfies PreviewAssetHistoryItem;
  } catch {
    return null;
  }
}

async function readPreviewAssetCoverPick(cacheKey: string) {
  if (!isPreviewAssetCacheKey(cacheKey)) {
    return null;
  }

  try {
    const coverPick = JSON.parse(await readFile(getCoverPickPath(cacheKey), "utf8")) as PreviewAssetCoverPick;
    if (coverPick.cacheKey !== cacheKey || !isPreviewAssetHistoryId(coverPick.historyId)) {
      return null;
    }

    return coverPick;
  } catch {
    return null;
  }
}

async function readHistoryMetadata(cacheKey: string, historyId: string) {
  if (!isPreviewAssetHistoryId(historyId)) {
    return null;
  }

  try {
    const metadata = JSON.parse(await readFile(getHistoryMetadataPath(cacheKey, historyId), "utf8")) as PreviewAssetHistoryMetadata;
    if (metadata.version !== CACHE_VERSION || metadata.cacheKey !== cacheKey || metadata.historyId !== historyId) {
      return null;
    }

    return metadata;
  } catch {
    return null;
  }
}

async function atomicWriteFile(filePath: string, data: Buffer) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, data);
  await rename(temporaryPath, filePath);
}

async function unlinkIfExists(filePath: string) {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function buildHistoryId(createdAt: string, image: Buffer) {
  const timePart = createdAt.replace(/\D/g, "").slice(0, 14);
  const imagePart = createHash("sha256").update(image).digest("hex").slice(0, 12);
  return `${timePart}-${imagePart}`;
}

function parseImageDataUrl(value?: string) {
  const match = value?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function mimeTypeToExtension(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function buildRoadbookFingerprint(roadbook: Roadbook) {
  return {
    title: roadbook.title,
    subtitle: roadbook.subtitle,
    destination: roadbook.destination,
    durationLabel: roadbook.durationLabel,
    concept: roadbook.concept,
    highlights: roadbook.highlights,
    summary: roadbook.summary,
    days: roadbook.days.map((day) => ({
      day: day.day,
      title: day.title,
      area: day.area,
      mood: day.mood,
      routeSummary: day.routeSummary,
      stops: day.stops.map((stop) => ({
        name: stop.name,
        category: stop.category,
        addressHint: stop.addressHint,
        why: stop.why,
      })),
      food: day.food,
      photoTips: day.photoTips,
    })),
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(normalizeForHash(value));
}

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForHash);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeForHash(item)]),
    );
  }

  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  return value;
}
