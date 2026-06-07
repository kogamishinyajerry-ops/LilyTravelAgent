import { describe, it, expect } from "vitest";
import {
  FALLBACK_PRESETS,
  getFallbackPreset,
  getFallbackPresetForTemplate,
} from "./landmark-preset-fallbacks";
import { landmarkPresetSchema } from "./landmark-preset";

const EXPECTED_IDS = [
  "island-classic",
  "shrine-classic",
  "desert-classic",
  "neon-city-tower",
  "ancient-gate",
  "pagoda",
  "village-pier",
  "observation-deck",
] as const;

describe("FALLBACK_PRESETS registry", () => {
  it("contains exactly 8 entries with the expected ids", () => {
    expect(Object.keys(FALLBACK_PRESETS).sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it.each(EXPECTED_IDS)("exposes a preset for '%s'", (id) => {
    expect(FALLBACK_PRESETS[id]).toBeDefined();
  });

  it("all fallbacks share source='procedural-fallback' and version=1", () => {
    for (const id of EXPECTED_IDS) {
      const preset = FALLBACK_PRESETS[id];
      expect(preset.source).toBe("procedural-fallback");
      expect(preset.version).toBe(1);
    }
  });

  it("all fallbacks validate against landmarkPresetSchema", () => {
    for (const id of EXPECTED_IDS) {
      const result = landmarkPresetSchema.safeParse(FALLBACK_PRESETS[id]);
      expect(result.success, `preset ${id} failed schema: ${JSON.stringify(result.error)}`).toBe(true);
    }
  });

  it("every primitive references a materialId that exists on its preset", () => {
    for (const id of EXPECTED_IDS) {
      const preset = FALLBACK_PRESETS[id];
      const materialIds = new Set(Object.keys(preset.materials));
      for (const primitive of preset.primitives) {
        expect(
          materialIds.has(primitive.materialId),
          `primitive ${primitive.id} in preset ${id} references missing material ${primitive.materialId}`,
        ).toBe(true);
      }
    }
  });

  it("every preset has a non-empty Chinese notes field", () => {
    for (const id of EXPECTED_IDS) {
      const preset = FALLBACK_PRESETS[id];
      expect(preset.notes, `preset ${id} should have a notes description`).toBeTruthy();
      expect(preset.notes!.length).toBeGreaterThan(10);
    }
  });
});

describe("getFallbackPreset", () => {
  it("returns the matching preset for a known id", () => {
    expect(getFallbackPreset("island-classic")?.id).toBe("island-classic");
    expect(getFallbackPreset("shrine-classic")?.id).toBe("shrine-classic");
    expect(getFallbackPreset("neon-city-tower")?.id).toBe("neon-city-tower");
    expect(getFallbackPreset("observation-deck")?.id).toBe("observation-deck");
  });

  it("returns undefined for an unknown id", () => {
    expect(getFallbackPreset("does-not-exist")).toBeUndefined();
    expect(getFallbackPreset("")).toBeUndefined();
  });

  it("returned preset validates against the schema", () => {
    for (const id of EXPECTED_IDS) {
      const preset = getFallbackPreset(id);
      expect(landmarkPresetSchema.safeParse(preset).success).toBe(true);
    }
  });
});

describe("getFallbackPresetForTemplate", () => {
  it("maps DreamTemplate to the most aesthetic fallback for that template", () => {
    expect(getFallbackPresetForTemplate("island").id).toBe("island-classic");
    expect(getFallbackPresetForTemplate("shrine").id).toBe("shrine-classic");
    expect(getFallbackPresetForTemplate("desert").id).toBe("desert-classic");
    expect(getFallbackPresetForTemplate("neon-city").id).toBe("neon-city-tower");
    expect(getFallbackPresetForTemplate("monument").id).toBe("ancient-gate");
    expect(getFallbackPresetForTemplate("starlake").id).toBe("observation-deck");
    expect(getFallbackPresetForTemplate("lantern").id).toBe("pagoda");
    expect(getFallbackPresetForTemplate("snowfield").id).toBe("village-pier");
  });

  it("falls back to observation-deck for unknown templates", () => {
    expect(getFallbackPresetForTemplate("totally-made-up").id).toBe("observation-deck");
    expect(getFallbackPresetForTemplate("").id).toBe("observation-deck");
  });
});
