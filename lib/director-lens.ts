export type DirectorLensId =
  | "auto"
  | "wide-water"
  | "low-skyline"
  | "isometric-atlas"
  | "close-detail";

export type DirectorLens = {
  id: DirectorLensId;
  label: string;
  shortLabel: string;
  promptCue: string;
  cameraCue: string;
  proofLabel: string;
  fovDelta: number;
  cameraOffset: [number, number, number];
  lookAtOffset: [number, number, number];
  parallaxScale: number;
};

export type DirectorLensSceneTuning = {
  rootPitchOffset: number;
  skylineHeightScale: number;
  skylineDepthScale: number;
  skylineLift: number;
  waterDepthScale: number;
  waterZOffset: number;
  ribbonOpacityScale: number;
  routeOpacityScale: number;
  routeYOffset: number;
  routeZOffset: number;
};

export const directorLenses: DirectorLens[] = [
  {
    id: "auto",
    label: "Auto Director",
    shortLabel: "Auto",
    promptCue: "follow the active day and destination preset",
    cameraCue: "scene preset default",
    proofLabel: "auto day lens",
    fovDelta: 0,
    cameraOffset: [0, 0, 0],
    lookAtOffset: [0, 0, 0],
    parallaxScale: 1,
  },
  {
    id: "wide-water",
    label: "Wide Water",
    shortLabel: "Water",
    promptCue: "wide waterline, horizon depth, reflective foreground",
    cameraCue: "wider lens toward horizon and water",
    proofLabel: "wide-water lens",
    fovDelta: 3,
    cameraOffset: [0.16, 0.2, 0.42],
    lookAtOffset: [0, -0.04, 0.2],
    parallaxScale: 1.14,
  },
  {
    id: "low-skyline",
    label: "Low Skyline",
    shortLabel: "Skyline",
    promptCue: "low angle skyline, taller silhouettes, stronger foreground scale",
    cameraCue: "lower camera with skyline lift",
    proofLabel: "low-skyline lens",
    fovDelta: 1,
    cameraOffset: [0.2, -0.52, -0.12],
    lookAtOffset: [0.06, 0.22, 0.12],
    parallaxScale: 1.2,
  },
  {
    id: "isometric-atlas",
    label: "Isometric Atlas",
    shortLabel: "Atlas",
    promptCue: "isometric route map, clean geometry, visible path hierarchy",
    cameraCue: "higher atlas view with calm parallax",
    proofLabel: "isometric-atlas lens",
    fovDelta: -2,
    cameraOffset: [0, 0.62, 0.58],
    lookAtOffset: [0, 0.08, -0.08],
    parallaxScale: 0.86,
  },
  {
    id: "close-detail",
    label: "Close Detail",
    shortLabel: "Detail",
    promptCue: "closer hero landmark, tactile detail, shallow depth feeling",
    cameraCue: "closer landmark framing",
    proofLabel: "close-detail lens",
    fovDelta: -3,
    cameraOffset: [-0.18, -0.16, -1.16],
    lookAtOffset: [0.02, 0.14, 0.1],
    parallaxScale: 1.08,
  },
];

export function resolveDirectorLens(id?: string | null): DirectorLens {
  return directorLenses.find((lens) => lens.id === id) ?? directorLenses[0];
}

export function formatDirectorLensPrompt(lens: DirectorLens): string {
  return `${lens.label}: ${lens.promptCue}; camera=${lens.cameraCue}`;
}

export function buildDirectorLensSceneTuning(id?: string | null): DirectorLensSceneTuning {
  const lens = resolveDirectorLens(id);
  const base: DirectorLensSceneTuning = {
    rootPitchOffset: 0,
    skylineHeightScale: 1,
    skylineDepthScale: 1,
    skylineLift: 0,
    waterDepthScale: 1,
    waterZOffset: 0,
    ribbonOpacityScale: 1,
    routeOpacityScale: 1,
    routeYOffset: 0,
    routeZOffset: 0,
  };

  if (lens.id === "wide-water") {
    return {
      ...base,
      rootPitchOffset: 0.012,
      waterDepthScale: 1.2,
      waterZOffset: 0.28,
      ribbonOpacityScale: 1.28,
      routeOpacityScale: 0.9,
      routeZOffset: 0.18,
    };
  }

  if (lens.id === "low-skyline") {
    return {
      ...base,
      rootPitchOffset: -0.028,
      skylineHeightScale: 1.34,
      skylineDepthScale: 0.86,
      skylineLift: 0.13,
      waterDepthScale: 1.08,
      waterZOffset: -0.18,
      ribbonOpacityScale: 1.42,
      routeOpacityScale: 1.18,
      routeYOffset: 0.035,
      routeZOffset: -0.12,
    };
  }

  if (lens.id === "isometric-atlas") {
    return {
      ...base,
      rootPitchOffset: 0.03,
      skylineHeightScale: 0.84,
      skylineDepthScale: 1.08,
      waterDepthScale: 0.9,
      routeOpacityScale: 1.24,
      routeYOffset: 0.04,
    };
  }

  if (lens.id === "close-detail") {
    return {
      ...base,
      rootPitchOffset: -0.012,
      skylineHeightScale: 1.12,
      skylineDepthScale: 0.92,
      skylineLift: 0.05,
      waterDepthScale: 0.86,
      waterZOffset: -0.24,
      ribbonOpacityScale: 0.82,
      routeOpacityScale: 0.86,
      routeYOffset: 0.02,
      routeZOffset: -0.2,
    };
  }

  return base;
}
