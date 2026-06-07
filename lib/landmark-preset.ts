import { z } from "zod";

/**
 * LandmarkPreset — data-driven description of a procedural landmark
 * (gate, pagoda, village, deck, …) that can be interpreted by the
 * Three.js renderer in `components/dream-skyline-scene.tsx`.
 *
 * The goal is to let M3 emit a JSON-serializable preset describing the
 * landmark's geometry, materials, and lights, and have the renderer
 * translate that preset into actual Three.js meshes at runtime — so the
 * landmark is no longer hardcoded in the component.
 */

export const LANDMARK_PRESET_SCHEMA_VERSION = 1;

export const LANDMARK_PRIMITIVE_TYPES = [
  "box",
  "sphere",
  "cylinder",
  "cone",
  "plane",
  "torus",
  "group",
] as const;

export type LandmarkPrimitiveType = (typeof LANDMARK_PRIMITIVE_TYPES)[number];

export const LANDMARK_MATERIAL_SIDES = ["front", "back", "double"] as const;

export const LANDMARK_LIGHT_TYPES = ["point", "directional", "ambient"] as const;

export const LANDMARK_SOURCES = [
  "m3-generated",
  "procedural-fallback",
  "user-uploaded",
] as const;

export type LandmarkMaterialSide = (typeof LANDMARK_MATERIAL_SIDES)[number];

export type LandmarkLightType = (typeof LANDMARK_LIGHT_TYPES)[number];

export type LandmarkSource = (typeof LANDMARK_SOURCES)[number];

export type LandmarkMaterialSpec = {
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  side?: LandmarkMaterialSide;
  emissive?: string;
  emissiveIntensity?: number;
};

export type LandmarkPrimitive = {
  id: string;
  type: LandmarkPrimitiveType;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  size?: [number, number, number];
  radius?: number;
  segments?: number;
  materialId: string;
};

export type LandmarkLight = {
  type: LandmarkLightType;
  color: string;
  intensity: number;
  position?: [number, number, number];
};

export type LandmarkPreset = {
  id: string;
  name: string;
  template: string;
  mood?: string;
  source: LandmarkSource;
  createdAt?: string;
  version: number;
  materials: Record<string, LandmarkMaterialSpec>;
  primitives: LandmarkPrimitive[];
  lights?: LandmarkLight[];
  notes?: string;
  preview?: string;
  sceneDay?: number;
  symbol?: string;
};

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "expected a hex color like #b8332a");

const triple = z.tuple([z.number(), z.number(), z.number()]);

export const landmarkMaterialSpecSchema = z.object({
  color: hexColor,
  roughness: z.number().min(0).max(1).optional(),
  metalness: z.number().min(0).max(1).optional(),
  opacity: z.number().min(0).max(1).optional(),
  side: z.enum(LANDMARK_MATERIAL_SIDES).optional(),
  emissive: hexColor.optional(),
  emissiveIntensity: z.number().min(0).max(10).optional(),
});

export const landmarkPrimitiveSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(LANDMARK_PRIMITIVE_TYPES),
  position: triple,
  rotation: triple.optional(),
  scale: triple.optional(),
  size: triple.optional(),
  radius: z.number().min(0).optional(),
  segments: z.number().int().min(2).max(128).optional(),
  materialId: z.string().min(1).max(80),
});

export const landmarkLightSchema = z.object({
  type: z.enum(LANDMARK_LIGHT_TYPES),
  color: hexColor,
  intensity: z.number().min(0).max(20),
  position: triple.optional(),
});

export const landmarkPresetSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  template: z.string().min(1).max(60),
  mood: z.string().max(60).optional(),
  source: z.enum(LANDMARK_SOURCES),
  createdAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/))
    .optional(),
  version: z.number().int().min(1),
  materials: z.record(z.string().min(1).max(60), landmarkMaterialSpecSchema),
  primitives: z.array(landmarkPrimitiveSchema).min(1).max(400),
  lights: z.array(landmarkLightSchema).max(16).optional(),
  notes: z.string().max(800).optional(),
});

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Parse and validate an unknown payload into a `LandmarkPreset`.
 *
 * This is a strict validator: invalid payloads throw a `ZodError` with
 * stable, dotted-path issues (see `formatZodIssues` in
 * `lib/roadbook-validation.ts` for the canonical error shape).
 */
export function validateLandmarkPreset(preset: unknown): LandmarkPreset {
  return landmarkPresetSchema.parse(preset) as LandmarkPreset;
}

/**
 * Build a placeholder `LandmarkPreset` for a given DreamTemplate. The
 * placeholder is intentionally minimal — one default material and a
 * single ground plane primitive — so the renderer can mount a scene
 * even before M3 has produced a real preset.
 */
export function createEmptyLandmarkPreset(template: string): LandmarkPreset {
  return {
    id: `procedural-fallback-${template}-${Date.now().toString(36)}`,
    name: `${template} placeholder`,
    template,
    source: "procedural-fallback",
    createdAt: new Date().toISOString(),
    version: LANDMARK_PRESET_SCHEMA_VERSION,
    materials: {
      ground: {
        color: "#bfc8b8",
        roughness: 0.9,
        metalness: 0.0,
      },
    },
    primitives: [
      {
        id: "ground",
        type: "plane",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        size: [200, 200, 0],
        materialId: "ground",
      },
    ],
    notes: "Empty placeholder preset. Will be replaced once M3 produces a real landmark design.",
  };
}
