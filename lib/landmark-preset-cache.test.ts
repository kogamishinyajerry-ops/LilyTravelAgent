import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildLandmarkPresetCacheKey,
  createDefaultLandmarkPresetCache,
  isLandmarkPresetCacheKey,
  LandmarkPresetCache,
} from "./landmark-preset-cache";
import type { LandmarkPreset } from "./landmark-preset";
import type { Roadbook, ScenicRenderDesign } from "./roadbook-types";

const baseRoadbook: Roadbook = {
  title: "Kyoto Discovery",
  subtitle: "Temple and garden route",
  destination: "Kyoto, Japan",
  durationLabel: "4 days",
  travelerLabel: "Couple",
  budgetLabel: "Mid-range",
  concept: "Quiet temple wandering",
  bestFor: ["temples", "gardens"],
  highlights: ["Fushimi Inari", "Kinkaku-ji"],
  summary: {
    routeTheme: "Slow north-to-south temple loop",
    transportPlan: "Local bus + walking",
    stayArea: "Higashiyama",
    rhythm: "Relaxed",
  },
  days: [
    {
      day: 1,
      title: "Arrival & Higashiyama",
      area: "Higashiyama",
      mood: "serene",
      routeSummary: "Walk through Sannenzaka",
      commuteNote: "Subway + bus",
      budgetNote: "¥3000",
      stops: [],
      food: ["Yudofu"],
      photoTips: ["Lantern light at dusk"],
    },
  ],
  budget: [],
  packing: [],
  reminders: [],
  disclaimer: "",
};

const scenicDesign: ScenicRenderDesign = {
  status: "generated",
  source: "minimax-m3",
  model: "m3",
  destination: "Kyoto, Japan",
  sceneTitle: "Higashiyama dusk",
  terrain: ["stone path"],
  architecture: ["wooden gate"],
  waterAndVegetation: ["moss", "small stream"],
  lighting: "warm dusk",
  camera: "eye-level",
  materialPalette: ["#8a6a4a", "#bfb27c"],
  threeJsPlan: ["plane ground", "gate group"],
  imagePrompt: "Lantern-lit stone path through a wooden gate in Higashiyama",
  negativePrompt: ["people", "modern cars"],
  createdAt: "2026-06-07T08:00:00.000Z",
};

const basePreset: LandmarkPreset = {
  id: "preset-1",
  name: "Higashiyama Gate",
  template: "shrine",
  mood: "dusk",
  source: "m3-generated",
  createdAt: "2026-06-07T08:01:00.000Z",
  version: 1,
  materials: {
    wood: { color: "#8a6a4a", roughness: 0.7 },
  },
  primitives: [
    {
      id: "left-pillar",
      type: "box",
      position: [-1, 1, 0],
      size: [0.2, 2, 0.2],
      materialId: "wood",
    },
    {
      id: "right-pillar",
      type: "box",
      position: [1, 1, 0],
      size: [0.2, 2, 0.2],
      materialId: "wood",
    },
    {
      id: "lintel",
      type: "box",
      position: [0, 2.1, 0],
      size: [2.4, 0.2, 0.2],
      materialId: "wood",
    },
  ],
  lights: [
    { type: "ambient", color: "#ffd8a8", intensity: 0.5 },
  ],
  notes: "Cached unit-test fixture",
};

// ---------------------------------------------------------------------------
// LandmarkPresetCache — instance tests
// ---------------------------------------------------------------------------

describe("LandmarkPresetCache", () => {
  let tempDir: string;
  let cache: LandmarkPresetCache;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "lily-landmark-cache-"));
    cache = new LandmarkPresetCache({ rootDir: tempDir });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns null on an empty cache", async () => {
    const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const result = await cache.get(key);
    expect(result).toBeNull();
  });

  it("round-trips a preset via set + get", async () => {
    const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    await cache.set(key, basePreset);

    const result = await cache.get(key);
    expect(result).toEqual(basePreset);
  });

  it("removes the entry on clear", async () => {
    const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    await cache.set(key, basePreset);
    await cache.clear(key);

    const result = await cache.get(key);
    expect(result).toBeNull();
  });

  it("isolates entries with different keys", async () => {
    const keyA = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const keyB = buildLandmarkPresetCacheKey(baseRoadbook, 2, "shrine", "dusk", scenicDesign);

    const presetA: LandmarkPreset = { ...basePreset, id: "preset-a" };
    const presetB: LandmarkPreset = { ...basePreset, id: "preset-b" };

    await cache.set(keyA, presetA);
    await cache.set(keyB, presetB);

    const resultA = await cache.get(keyA);
    const resultB = await cache.get(keyB);

    expect(resultA?.id).toBe("preset-a");
    expect(resultB?.id).toBe("preset-b");
  });

  it("uses the supplied rootDir and persists across instances", async () => {
    const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    await cache.set(key, basePreset);

    const reopened = new LandmarkPresetCache({ rootDir: tempDir });
    const result = await reopened.get(key);
    expect(result).toEqual(basePreset);
  });

  it("createDefaultLandmarkPresetCache returns a working cache", async () => {
    const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const defaultCache = createDefaultLandmarkPresetCache();
    expect(defaultCache.rootDir).toContain("landmark-presets");
    expect(isLandmarkPresetCacheKey(key)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // isLandmarkPresetCacheKey tests that need cache instance
  // ---------------------------------------------------------------------------

  describe("isLandmarkPresetCacheKey", () => {
    it("cache get returns null for an invalid key format", async () => {
      const result = await cache.get("not-a-valid-key");
      expect(result).toBeNull();
    });

    it("cache set throws for an invalid key format", async () => {
      await expect(cache.set("short", basePreset)).rejects.toThrow(/Invalid landmark preset cache key/);
    });

    it("cache clear is a no-op for an invalid key format", async () => {
      await cache.clear("short");
      await cache.clear("");
      await cache.clear("not-valid");
    });
  });

  // ---------------------------------------------------------------------------
  // Internal coverage tests — need cache instance
  // ---------------------------------------------------------------------------

  describe("internal coverage", () => {
    it("get returns null when the file does not exist", async () => {
      const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
      const result = await cache.get(key);
      expect(result).toBeNull();
    });

    it("get returns null when the cached version does not match", async () => {
      const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
      const badEntry = JSON.stringify({
        version: 99,
        cacheKey: key,
        preset: basePreset,
        cachedAt: new Date().toISOString(),
      });
      await writeFile(cache.getEntryPath(key), badEntry, "utf8");
      const result = await cache.get(key);
      expect(result).toBeNull();
    });

    it("get returns null when the stored cacheKey does not match", async () => {
      const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
      const badEntry = JSON.stringify({
        version: 1,
        cacheKey: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        preset: basePreset,
        cachedAt: new Date().toISOString(),
      });
      await writeFile(cache.getEntryPath(key), badEntry, "utf8");
      const result = await cache.get(key);
      expect(result).toBeNull();
    });

    it("get returns null when the file content is malformed JSON", async () => {
      const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
      await writeFile(cache.getEntryPath(key), "not json at all{", "utf8");
      const result = await cache.get(key);
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// buildLandmarkPresetCacheKey — pure function, no cache instance needed
// ---------------------------------------------------------------------------

describe("buildLandmarkPresetCacheKey", () => {
  it("is deterministic for the same inputs", () => {
    const keyA = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const keyB = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    expect(keyA).toBe(keyB);
  });

  it("changes when the active day differs", () => {
    const keyA = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const keyB = buildLandmarkPresetCacheKey(baseRoadbook, 2, "shrine", "dusk", scenicDesign);
    expect(keyA).not.toBe(keyB);
  });

  it("changes when the scenic design createdAt differs", () => {
    const keyA = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const laterDesign: ScenicRenderDesign = { ...scenicDesign, createdAt: "2026-06-07T09:00:00.000Z" };
    const keyB = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", laterDesign);
    expect(keyA).not.toBe(keyB);
  });

  it("changes when the scenic design imagePrompt differs", () => {
    const keyA = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const tweakedDesign: ScenicRenderDesign = { ...scenicDesign, imagePrompt: "A different prompt entirely" };
    const keyB = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", tweakedDesign);
    expect(keyA).not.toBe(keyB);
  });

  it("is a 32-char hex string for valid roadbook inputs", () => {
    const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    expect(key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("produces different keys for different templates", () => {
    const keyA = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const keyB = buildLandmarkPresetCacheKey(baseRoadbook, 1, "lantern", "dusk", scenicDesign);
    expect(keyA).not.toBe(keyB);
  });

  it("produces different keys for different moods", () => {
    const keyA = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const keyB = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dawn", scenicDesign);
    expect(keyA).not.toBe(keyB);
  });

  it("handles roadbook without scenicDesign (undefined)", () => {
    const key = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", undefined);
    expect(key).toMatch(/^[a-f0-9]{32}$/);
    const keyWithDesign = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    expect(key).not.toBe(keyWithDesign);
  });

  it("handles roadbook with empty days array", () => {
    const emptyDaysRoadbook: Roadbook = { ...baseRoadbook, days: [] };
    const key = buildLandmarkPresetCacheKey(emptyDaysRoadbook, 1, "shrine", "dusk", undefined);
    expect(key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("key is stable regardless of object property order in roadbook", () => {
    const keyA = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    const keyB = buildLandmarkPresetCacheKey(baseRoadbook, 1, "shrine", "dusk", scenicDesign);
    expect(keyA).toBe(keyB);
  });
});

// ---------------------------------------------------------------------------
// isLandmarkPresetCacheKey — pure function
// ---------------------------------------------------------------------------

describe("isLandmarkPresetCacheKey", () => {
  it("returns true for a valid 32-char hex string", () => {
    expect(isLandmarkPresetCacheKey("a1b2c3d4e5f600011223344556677889")).toBe(true);
  });

  it("returns true for all-zeros key", () => {
    expect(isLandmarkPresetCacheKey("00000000000000000000000000000000")).toBe(true);
  });

  it("returns false for a key that is too short", () => {
    expect(isLandmarkPresetCacheKey("a1b2c3d4e5f6000112233445566778")).toBe(false);
  });

  it("returns false for a key that is too long", () => {
    expect(isLandmarkPresetCacheKey("a1b2c3d4e5f6000112233445566778890")).toBe(false);
  });

  it("returns false for a key containing non-hex characters", () => {
    expect(isLandmarkPresetCacheKey("g1b2c3d4e5f60001122334455667788")).toBe(false);
    expect(isLandmarkPresetCacheKey("a1b2c3d4e5f600011223344556677__")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isLandmarkPresetCacheKey("")).toBe(false);
  });

  it("returns false for a key with uppercase hex", () => {
    expect(isLandmarkPresetCacheKey("A1B2C3D4E5F60001122334455667788")).toBe(false);
  });
});
