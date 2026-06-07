import { describe, it, expect } from "vitest";
import {
  LANDMARK_PRESET_SCHEMA_VERSION,
  validateLandmarkPreset,
  createEmptyLandmarkPreset,
} from "./landmark-preset";

// ---------------------------------------------------------------------------
// validateLandmarkPreset
// ---------------------------------------------------------------------------

describe("validateLandmarkPreset", () => {
  const validPreset = {
    id: "test-preset-01",
    name: "测试地标",
    template: "lantern",
    source: "m3-generated",
    version: 1,
    materials: {
      stone: { color: "#e4d7c4", roughness: 0.7 },
    },
    primitives: [
      {
        id: "base",
        type: "box",
        position: [0, 0, 0],
        size: [1, 1, 1],
        materialId: "stone",
      },
    ],
  };

  it("returns a LandmarkPreset on a valid input", () => {
    const result = validateLandmarkPreset(validPreset);
    expect(result.id).toBe("test-preset-01");
    expect(result.name).toBe("测试地标");
    expect(result.source).toBe("m3-generated");
  });

  it("throws on a missing required field", () => {
    // @ts-expect-error — deliberately passing an invalid shape
    expect(() => validateLandmarkPreset({ id: "only-id" })).toThrow();
  });

  it("throws on an invalid hex color", () => {
    const bad = {
      ...validPreset,
      materials: {
        bad: { color: "not-a-hex" },
      },
    };
    expect(() => validateLandmarkPreset(bad)).toThrow();
  });

  it("throws on primitives exceeding the maximum count of 400", () => {
    const tooMany = {
      ...validPreset,
      primitives: Array.from({ length: 401 }, (_, i) => ({
        id: `p-${i}`,
        type: "box" as const,
        position: [0, 0, 0],
        size: [1, 1, 1],
        materialId: "stone",
      })),
    };
    expect(() => validateLandmarkPreset(tooMany)).toThrow();
  });

  it("throws on lights exceeding 16", () => {
    const tooManyLights = {
      ...validPreset,
      lights: Array.from({ length: 17 }, (_, i) => ({
        type: "point" as const,
        color: "#ffffff",
        intensity: 1,
        position: [0, i, 0] as [number, number, number],
      })),
    };
    expect(() => validateLandmarkPreset(tooManyLights)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// createEmptyLandmarkPreset
// ---------------------------------------------------------------------------

describe("createEmptyLandmarkPreset", () => {
  it("returns a preset with source set to procedural-fallback", () => {
    const preset = createEmptyLandmarkPreset("island");
    expect(preset.source).toBe("procedural-fallback");
  });

  it("uses the template string in id, name, and template fields", () => {
    const preset = createEmptyLandmarkPreset("shrine");
    expect(preset.template).toBe("shrine");
    expect(preset.name).toBe("shrine placeholder");
    expect(preset.id).toContain("shrine");
    expect(preset.id).toContain("procedural-fallback");
  });

  it("sets version to LANDMARK_PRESET_SCHEMA_VERSION", () => {
    const preset = createEmptyLandmarkPreset("island");
    expect(preset.version).toBe(LANDMARK_PRESET_SCHEMA_VERSION);
  });

  it("includes a ground plane primitive", () => {
    const preset = createEmptyLandmarkPreset("lantern");
    expect(preset.primitives).toHaveLength(1);
    expect(preset.primitives[0].type).toBe("plane");
    expect(preset.primitives[0].id).toBe("ground");
    expect(preset.primitives[0].materialId).toBe("ground");
  });

  it("includes a ground material with the correct defaults", () => {
    const preset = createEmptyLandmarkPreset("desert");
    expect(preset.materials.ground).toEqual({
      color: "#bfc8b8",
      roughness: 0.9,
      metalness: 0.0,
    });
  });

  it("sets createdAt to a valid ISO datetime string", () => {
    const preset = createEmptyLandmarkPreset("island");
    expect(preset.createdAt).toBeDefined();
    expect(() => new Date(preset.createdAt!)).not.toThrow();
  });

  it("sets notes describing the placeholder state", () => {
    const preset = createEmptyLandmarkPreset("mountain");
    expect(preset.notes).toContain("placeholder");
    expect(preset.notes).toContain("M3");
  });

  it("generates unique ids for different templates", () => {
    const a = createEmptyLandmarkPreset("shrine");
    const b = createEmptyLandmarkPreset("lantern");
    expect(a.id).not.toBe(b.id);
  });
});
