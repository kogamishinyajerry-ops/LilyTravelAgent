import type { PreviewAsset, Roadbook, ScenicRenderDesign } from "@/lib/roadbook-types";
import { resolveDirectorLens } from "@/lib/director-lens";
import {
  buildCinematicAtmosphereProfile,
  buildCinematicLandmarkSilhouettes,
  resolveCinematicScenePreset,
} from "@/lib/cinematic-scene-preset";

type ScenicRenderPromptDesign = Partial<
  Pick<
    ScenicRenderDesign,
    | "sceneTitle"
    | "terrain"
    | "architecture"
    | "waterAndVegetation"
    | "lighting"
    | "camera"
    | "materialPalette"
    | "imagePrompt"
    | "negativePrompt"
  >
>;

type PreviewAssetOptions = {
  activeDay?: number;
  mood?: string;
  template?: string;
  directorLens?: string;
  directorLensPrompt?: string;
  scenicDesign?: ScenicRenderPromptDesign;
};

export function buildCinematicPreviewPrompt(roadbook: Roadbook, options: PreviewAssetOptions = {}) {
  const activeDay = options.activeDay || roadbook.days[0]?.day || 1;
  const plan = roadbook.days.find((day) => day.day === activeDay) || roadbook.days[0];
  const stopNames = (plan?.stops || []).map((stop) => stop.name).slice(0, 4);
  const foodAndPhoto = [...(plan?.photoTips || []), ...(plan?.food || [])].slice(0, 4);
  const locationLine = [roadbook.destination, plan?.area, ...stopNames].filter(Boolean).join(", ");
  const conceptLine = [roadbook.concept, roadbook.summary.routeTheme, plan?.mood, plan?.routeSummary]
    .filter(Boolean)
    .join(", ");
  const visualStyle = buildVisualStyle(options.mood, options.template);
  const directorLensLine = buildDirectorLensLine(options);
  const scenicRenderLine = buildScenicRenderLine(options.scenicDesign);
  const scenePresetLine = buildCinematicScenePromptLine(roadbook, activeDay);

  return compactPrompt(`Cinematic travel destination preview for a custom AI roadbook.
Location and landmarks: ${locationLine}.
Scene concept: ${conceptLine}.
3D scene direction: ${scenePresetLine}.
Director Lens: ${directorLensLine}.
Visual details: ${foodAndPhoto.join(", ")}.
Reference photo render blueprint: ${scenicRenderLine}.
Render a breathtaking pre-trip hero image: real-world inspired terrain, recognizable local architecture, atmospheric landscape, foreground depth, realistic lighting, premium travel magazine composition, ${visualStyle}.
Camera: wide 16:9 establishing shot, ${directorLensLine}, immersive depth, natural haze, detailed water/terrain/skyline when relevant.
Strict negative constraints: no text, no captions, no UI, no logos, no watermark, no map pins, no people close-up, no distorted architecture.`);
}

export function buildPromptOnlyPreviewAsset(roadbook: Roadbook, options: PreviewAssetOptions, message: string): PreviewAsset {
  return {
    status: "fallback",
    source: "prompt-only",
    model: "prompt-only",
    prompt: buildCinematicPreviewPrompt(roadbook, options),
    aspectRatio: "16:9",
    message,
  };
}

export function buildCinematicScenePromptLine(roadbook: Roadbook, activeDay: number) {
  const resolved = resolveCinematicScenePreset(roadbook, activeDay);
  if (!resolved) {
    return "no destination-specific 3D preset; use the roadbook location, route, local terrain, and architecture as the visual source of truth";
  }

  const landmarkLayer = buildCinematicLandmarkSilhouettes(resolved.preset, resolved.focus.day);
  const atmosphere = buildCinematicAtmosphereProfile(resolved.focus);

  return [
    `preset ${resolved.preset.id}`,
    `destination ${resolved.preset.destination}`,
    `hero ${resolved.preset.heroLabel}`,
    `active shot D${resolved.focus.day} ${resolved.focus.label}`,
    `visual cue ${resolved.focus.visualCue}`,
    `landmark ${landmarkLayer.activeMarker.kind} (${landmarkLayer.activeMarker.cue})`,
    `atmosphere ${atmosphere.id} (${atmosphere.label})`,
    `water ${atmosphere.waterColor}`,
    `sun ${atmosphere.sunColor}`,
  ].join("; ");
}

function buildVisualStyle(mood?: string, template?: string) {
  const moodText =
    mood === "dusk"
      ? "warm dusk light, soft amber reflections"
      : mood === "geometry"
        ? "precise architectural composition, clean cinematic geometry"
        : mood === "neon"
          ? "electric neon glow, deep blue-violet sky, wet asphalt reflections"
          : "soft morning light, airy clouds, calm premium palette";
  const templateText =
    template === "starlake"
      ? "lake reflections and luminous horizon"
      : template === "lantern"
        ? "lantern-like warm city glow and evening atmosphere"
        : template === "snowfield"
          ? "minimal snowy negative space and crisp air"
          : template === "neon-city"
            ? "towering cyberpunk megacity with holographic billboards, neon signs, and rain-slick streets"
            : template === "island"
              ? "floating sky islands with misty green-blue atmosphere, ethereal weightless composition"
              : template === "shrine"
                ? "serene Japanese shrine path with stone lanterns, vermilion torii, morning fog"
                : template === "desert"
                  ? "vast sand dunes with distant caravan, oasis palm trees, golden hour haze"
                  : "monumental scenic composition with layered terrain";

  return `${moodText}, ${templateText}, photorealistic cinematic render, high detail, elegant color grading`;
}

function buildDirectorLensLine(options: PreviewAssetOptions) {
  if (options.directorLensPrompt) {
    return options.directorLensPrompt;
  }

  const lens = resolveDirectorLens(options.directorLens);
  return `${lens.label}: ${lens.promptCue}; camera=${lens.cameraCue}`;
}

function buildScenicRenderLine(design?: ScenicRenderPromptDesign) {
  if (!design) {
    return "none";
  }

  const fragments = [
    design.sceneTitle,
    design.imagePrompt,
    `terrain: ${(design.terrain || []).slice(0, 3).join(", ")}`,
    `architecture: ${(design.architecture || []).slice(0, 3).join(", ")}`,
    `water and vegetation: ${(design.waterAndVegetation || []).slice(0, 2).join(", ")}`,
    `lighting: ${design.lighting}`,
    `camera: ${design.camera}`,
    `materials: ${(design.materialPalette || []).slice(0, 4).join(", ")}`,
    `negative: ${(design.negativePrompt || []).slice(0, 5).join(", ")}`,
  ];

  return fragments.filter(Boolean).join(". ");
}

function compactPrompt(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim().slice(0, 2200);
}
