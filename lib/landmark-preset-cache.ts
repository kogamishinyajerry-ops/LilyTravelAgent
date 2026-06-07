import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LandmarkPreset } from "@/lib/landmark-preset";
import type { Roadbook, ScenicRenderDesign } from "@/lib/roadbook-types";

const LANDMARK_PRESET_CACHE_VERSION = 1;
const DEFAULT_ROOT_DIR = path.join(".lily-cache", "landmark-presets");

type CacheFileShape = {
  version: number;
  cacheKey: string;
  preset: LandmarkPreset;
  cachedAt: string;
};

function stableJson(value: unknown): string {
  return JSON.stringify(normalizeForHash(value));
}

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForHash);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeForHash(item)]),
    );
  }

  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  return value;
}

function buildScenicDesignFingerprint(design: ScenicRenderDesign | undefined) {
  if (!design) {
    return { createdAt: "", imagePrompt: "" };
  }

  return {
    createdAt: design.createdAt ?? "",
    imagePrompt: design.imagePrompt ?? "",
  };
}

export function buildLandmarkPresetCacheKey(
  roadbook: Roadbook,
  activeDay: number,
  template: string,
  mood: string,
  scenicDesign?: ScenicRenderDesign,
): string {
  const hashInput = {
    version: LANDMARK_PRESET_CACHE_VERSION,
    title: roadbook.title,
    activeDay,
    template,
    mood,
    design: buildScenicDesignFingerprint(scenicDesign),
  };

  return createHash("sha256").update(stableJson(hashInput)).digest("hex").slice(0, 32);
}

export class LandmarkPresetCache {
  public readonly rootDir: string;

  constructor(opts: { rootDir?: string } = {}) {
    this.rootDir = opts.rootDir ?? path.join(process.cwd(), DEFAULT_ROOT_DIR);
  }

  async get(key: string): Promise<LandmarkPreset | null> {
    if (!isLandmarkPresetCacheKey(key)) {
      return null;
    }

    try {
      const raw = JSON.parse(await readFile(this.getEntryPath(key), "utf8")) as CacheFileShape;
      if (raw.version !== LANDMARK_PRESET_CACHE_VERSION || raw.cacheKey !== key) {
        return null;
      }

      return raw.preset;
    } catch {
      return null;
    }
  }

  async set(key: string, preset: LandmarkPreset): Promise<void> {
    if (!isLandmarkPresetCacheKey(key)) {
      throw new Error(`Invalid landmark preset cache key: ${key}`);
    }

    const payload: CacheFileShape = {
      version: LANDMARK_PRESET_CACHE_VERSION,
      cacheKey: key,
      preset,
      cachedAt: new Date().toISOString(),
    };

    await mkdir(this.rootDir, { recursive: true });
    await atomicWriteFile(
      this.getEntryPath(key),
      Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8"),
    );
  }

  async clear(key: string): Promise<void> {
    if (!isLandmarkPresetCacheKey(key)) {
      return;
    }

    await unlinkIfExists(this.getEntryPath(key));
  }

  private getEntryPath(key: string): string {
    return path.join(this.rootDir, `${key}.json`);
  }
}

export function createDefaultLandmarkPresetCache(): LandmarkPresetCache {
  return new LandmarkPresetCache();
}

export function isLandmarkPresetCacheKey(value: string): boolean {
  return /^[a-f0-9]{32}$/.test(value);
}

async function atomicWriteFile(filePath: string, data: Buffer): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, data);
  await rename(temporaryPath, filePath);
}

async function unlinkIfExists(filePath: string): Promise<boolean> {
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
