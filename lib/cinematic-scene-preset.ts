import type { Roadbook } from "@/lib/roadbook-types";

export type CinematicSceneFocus = {
  day: number;
  label: string;
  anchorKind: "old-town" | "erhai" | "village" | "return";
  visualCue: string;
  x: number;
  z: number;
};

export type CinematicScenePreset = {
  id: "dali-cangshan-erhai";
  destination: string;
  heroLabel: string;
  matchers: string[];
  mountainBands: Array<{
    id: string;
    z: number;
    baseY: number;
    height: number;
    color: string;
    opacity: number;
    phase: number;
  }>;
  shorelines: Array<{
    id: string;
    z: number;
    amplitude: number;
    opacity: number;
  }>;
  focusByDay: CinematicSceneFocus[];
};

export type ResolvedCinematicScenePreset = {
  preset: CinematicScenePreset;
  focus: CinematicSceneFocus;
};

export type CinematicCameraPose = {
  fov: number;
  camera: [number, number, number];
  lookAt: [number, number, number];
  parallaxWeight: number;
};

export type CinematicRouteRail = {
  points: Array<{
    day: number;
    label: string;
    x: number;
    z: number;
    isActive: boolean;
  }>;
  activeIndex: number;
};

export type CinematicLandmarkKind =
  | "old-town-gate"
  | "erhai-sail"
  | "bai-courtyard-arch"
  | "return-cafe";

export type CinematicLandmarkSilhouette = {
  id: string;
  day: number;
  label: string;
  kind: CinematicLandmarkKind;
  x: number;
  z: number;
  scale: number;
  isActive: boolean;
  cue: string;
};

export type CinematicLandmarkSilhouetteLayer = {
  markers: CinematicLandmarkSilhouette[];
  activeMarker: CinematicLandmarkSilhouette;
};

export type CinematicAtmosphereProfile = {
  id: "old-town-dusk" | "erhai-sunset" | "xizhou-morning" | "return-amber" | "generic-soft";
  label: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  sunDiscPosition: [number, number, number];
  sunDiscOpacity: number;
  hazeColor: string;
  hazeOpacity: number;
  foregroundHazeOpacity: number;
  waterColor: string;
  waterOpacity: number;
  toneMappingExposure: number;
  ribbonOpacityScale: number;
};

export type CinematicMotionProfile = {
  id: "old-town-breath" | "erhai-glide" | "xizhou-stillness" | "return-glow" | "generic-drift";
  label: string;
  waterSpeed: number;
  waterAmplitude: number;
  hazeDrift: number;
  hazeSpeed: number;
  focusPulse: number;
  focusPulseSpeed: number;
  landmarkBreath: number;
  landmarkBreathSpeed: number;
};

export type CinematicSceneInspector = {
  status: "active" | "fallback";
  presetId: CinematicScenePreset["id"] | "generic";
  destination: string;
  heroLabel: string;
  shotLabel: string;
  visualCue: string;
  routeProgress: string;
  routePointCount: number;
  cameraFov: number;
  cameraX: number;
  parallaxWeight: number;
};

export const DALI_CINEMATIC_SCENE_PRESET: CinematicScenePreset = {
  id: "dali-cangshan-erhai",
  destination: "云南大理",
  heroLabel: "苍山 / 洱海 / 白族院落",
  matchers: ["大理", "洱海", "苍山", "喜洲", "才村", "双廊", "古城", "白族"],
  mountainBands: [
    { id: "cangshan-back", z: -6.2, baseY: 0.58, height: 3.9, color: "#7d8fa1", opacity: 0.52, phase: 0.2 },
    { id: "cangshan-mid", z: -5.45, baseY: 0.42, height: 3.05, color: "#91a2a8", opacity: 0.42, phase: 1.45 },
    { id: "cangshan-front", z: -4.7, baseY: 0.22, height: 2.1, color: "#a9b8af", opacity: 0.34, phase: 2.1 },
  ],
  shorelines: [
    { id: "erhai-west-bank", z: 1.55, amplitude: 0.18, opacity: 0.22 },
    { id: "erhai-s-curve", z: 2.35, amplitude: 0.34, opacity: 0.28 },
    { id: "erhai-far-glint", z: 3.25, amplitude: 0.12, opacity: 0.18 },
  ],
  focusByDay: [
    { day: 1, label: "古城南门", anchorKind: "old-town", visualCue: "城门 / 石板路 / 暮色", x: -1.8, z: 1.25 },
    { day: 2, label: "洱海西线", anchorKind: "erhai", visualCue: "水面 / S 湾 / 日落", x: 3.6, z: 2.85 },
    { day: 3, label: "喜洲村落", anchorKind: "village", visualCue: "白墙青瓦 / 院落", x: -3.55, z: 2.15 },
    { day: 4, label: "古城收尾", anchorKind: "return", visualCue: "咖啡 / 伴手礼 / 返程", x: 0.85, z: 1.7 },
  ],
};

const CINEMATIC_SCENE_PRESETS = [DALI_CINEMATIC_SCENE_PRESET] as const;

export function resolveCinematicScenePreset(
  roadbook: Roadbook,
  activeDay: number,
): ResolvedCinematicScenePreset | null {
  const searchText = buildRoadbookSearchText(roadbook);
  const preset = CINEMATIC_SCENE_PRESETS.find((candidate) => matchesPreset(candidate, searchText));
  if (!preset) {
    return null;
  }

  return {
    preset,
    focus: getCinematicDayFocus(preset, activeDay),
  };
}

export function getCinematicDayFocus(
  preset: CinematicScenePreset,
  activeDay: number,
): CinematicSceneFocus {
  return (
    preset.focusByDay.find((focus) => focus.day === activeDay) ??
    preset.focusByDay[0] ??
    { day: activeDay, label: preset.destination, anchorKind: "old-town", visualCue: preset.heroLabel, x: 0, z: 1.8 }
  );
}

export function buildCinematicCameraPose(focus?: CinematicSceneFocus | null): CinematicCameraPose {
  if (!focus) {
    return {
      fov: 38,
      camera: [0.55, 5.2, 12.15],
      lookAt: [0, 1.08, 0],
      parallaxWeight: 1,
    };
  }

  const xBias = clamp(focus.x * 0.09, -0.46, 0.46);
  const zBias = clamp((focus.z - 1.8) * 0.2, -0.18, 0.26);
  const focusDepth = focus.anchorKind === "erhai" ? 0.16 : focus.anchorKind === "village" ? 0.08 : 0;

  return {
    fov: focus.anchorKind === "erhai" ? 39 : focus.anchorKind === "village" ? 37 : 38,
    camera: [0.55 + xBias, 5.15 + focusDepth, 12.08 - zBias],
    lookAt: [clamp(focus.x * 0.14, -0.62, 0.62), 1.08, clamp(focus.z * 0.16, 0.16, 0.54)],
    parallaxWeight: focus.anchorKind === "erhai" ? 1.24 : focus.anchorKind === "village" ? 1.12 : 1,
  };
}

export function buildCinematicRouteRail(
  preset: CinematicScenePreset,
  activeDay: number,
): CinematicRouteRail {
  const points = [...preset.focusByDay]
    .sort((left, right) => left.day - right.day)
    .map((focus) => ({
      day: focus.day,
      label: focus.label,
      x: focus.x,
      z: focus.z,
      isActive: focus.day === activeDay,
    }));

  const activeIndex = Math.max(0, points.findIndex((point) => point.day === activeDay));

  return {
    points,
    activeIndex,
  };
}

export function buildCinematicLandmarkSilhouettes(
  preset: CinematicScenePreset,
  activeDay: number,
): CinematicLandmarkSilhouetteLayer {
  const activeFocus = getCinematicDayFocus(preset, activeDay);
  const activeKind = getLandmarkKindForFocus(activeFocus.anchorKind);
  const fallbackMarker: CinematicLandmarkSilhouette = {
    id: `${preset.id}-d${activeFocus.day}-${activeKind}`,
    day: activeFocus.day,
    label: activeFocus.label,
    kind: activeKind,
    x: activeFocus.x,
    z: activeFocus.z,
    scale: 1.16,
    isActive: true,
    cue: getLandmarkCue(activeKind),
  };
  const markers = [...preset.focusByDay]
    .sort((left, right) => left.day - right.day)
    .map((focus) => {
      const kind = getLandmarkKindForFocus(focus.anchorKind);
      return {
        id: `${preset.id}-d${focus.day}-${kind}`,
        day: focus.day,
        label: focus.label,
        kind,
        x: focus.x,
        z: focus.z,
        scale: focus.day === activeFocus.day ? 1.16 : 0.86,
        isActive: focus.day === activeFocus.day,
        cue: getLandmarkCue(kind),
      };
    });

  return {
    markers,
    activeMarker: markers.find((marker) => marker.day === activeFocus.day) ?? markers[0] ?? fallbackMarker,
  };
}

export function buildCinematicAtmosphereProfile(
  focus?: CinematicSceneFocus | null,
): CinematicAtmosphereProfile {
  if (!focus) {
    return {
      id: "generic-soft",
      label: "Soft procedural haze",
      fogColor: "#d7ded8",
      fogNear: 12,
      fogFar: 26,
      sunColor: "#ffe0a8",
      sunIntensity: 3.4,
      sunPosition: [-5.5, 8, 7],
      sunDiscPosition: [-5.9, 5.7, -6.35],
      sunDiscOpacity: 0.48,
      hazeColor: "#d7ded8",
      hazeOpacity: 0.34,
      foregroundHazeOpacity: 0.18,
      waterColor: "#8cc9cb",
      waterOpacity: 0.68,
      toneMappingExposure: 1,
      ribbonOpacityScale: 1,
    };
  }

  if (focus.anchorKind === "erhai") {
    return {
      id: "erhai-sunset",
      label: "Erhai water sunset",
      fogColor: "#c8e2e6",
      fogNear: 10,
      fogFar: 29,
      sunColor: "#ffd8a3",
      sunIntensity: 4.2,
      sunPosition: [-7.2, 6.4, 6.8],
      sunDiscPosition: [4.8, 4.85, -6.1],
      sunDiscOpacity: 0.58,
      hazeColor: "#b8dce1",
      hazeOpacity: 0.42,
      foregroundHazeOpacity: 0.15,
      waterColor: "#78c5cf",
      waterOpacity: 0.76,
      toneMappingExposure: 1.07,
      ribbonOpacityScale: 1.36,
    };
  }

  if (focus.anchorKind === "village") {
    return {
      id: "xizhou-morning",
      label: "Xizhou courtyard morning",
      fogColor: "#dce1d3",
      fogNear: 11,
      fogFar: 24,
      sunColor: "#f6e3b5",
      sunIntensity: 3.65,
      sunPosition: [-3.6, 8.8, 5.2],
      sunDiscPosition: [-4.2, 5.25, -6.2],
      sunDiscOpacity: 0.38,
      hazeColor: "#dfe5d8",
      hazeOpacity: 0.28,
      foregroundHazeOpacity: 0.14,
      waterColor: "#92c4bf",
      waterOpacity: 0.64,
      toneMappingExposure: 0.98,
      ribbonOpacityScale: 0.88,
    };
  }

  if (focus.anchorKind === "return") {
    return {
      id: "return-amber",
      label: "Amber return hour",
      fogColor: "#ead3c2",
      fogNear: 9.5,
      fogFar: 25,
      sunColor: "#f4a56d",
      sunIntensity: 4.55,
      sunPosition: [-4.6, 7.2, 7.6],
      sunDiscPosition: [-2.8, 4.8, -6.05],
      sunDiscOpacity: 0.54,
      hazeColor: "#efcdb6",
      hazeOpacity: 0.4,
      foregroundHazeOpacity: 0.22,
      waterColor: "#9fc9bd",
      waterOpacity: 0.7,
      toneMappingExposure: 1.04,
      ribbonOpacityScale: 1.12,
    };
  }

  return {
    id: "old-town-dusk",
    label: "Old town dusk",
    fogColor: "#d8d0bd",
    fogNear: 11,
    fogFar: 25,
    sunColor: "#ffc582",
    sunIntensity: 3.9,
    sunPosition: [-5.8, 7.7, 7.2],
    sunDiscPosition: [-5.7, 5.55, -6.3],
    sunDiscOpacity: 0.5,
    hazeColor: "#dcc8ad",
    hazeOpacity: 0.36,
    foregroundHazeOpacity: 0.19,
    waterColor: "#91c8c3",
    waterOpacity: 0.68,
    toneMappingExposure: 1.02,
    ribbonOpacityScale: 1,
  };
}

export function buildCinematicMotionProfile(focus?: CinematicSceneFocus | null): CinematicMotionProfile {
  if (!focus) {
    return {
      id: "generic-drift",
      label: "Soft scene drift",
      waterSpeed: 1,
      waterAmplitude: 1,
      hazeDrift: 0.06,
      hazeSpeed: 0.11,
      focusPulse: 0.06,
      focusPulseSpeed: 0.8,
      landmarkBreath: 0.025,
      landmarkBreathSpeed: 0.72,
    };
  }

  if (focus.anchorKind === "erhai") {
    return {
      id: "erhai-glide",
      label: "Erhai water glide",
      waterSpeed: 1.28,
      waterAmplitude: 1.18,
      hazeDrift: 0.11,
      hazeSpeed: 0.14,
      focusPulse: 0.08,
      focusPulseSpeed: 0.66,
      landmarkBreath: 0.03,
      landmarkBreathSpeed: 0.58,
    };
  }

  if (focus.anchorKind === "village") {
    return {
      id: "xizhou-stillness",
      label: "Xizhou still air",
      waterSpeed: 0.82,
      waterAmplitude: 0.78,
      hazeDrift: 0.035,
      hazeSpeed: 0.08,
      focusPulse: 0.045,
      focusPulseSpeed: 0.54,
      landmarkBreath: 0.018,
      landmarkBreathSpeed: 0.48,
    };
  }

  if (focus.anchorKind === "return") {
    return {
      id: "return-glow",
      label: "Warm closing glow",
      waterSpeed: 0.94,
      waterAmplitude: 0.96,
      hazeDrift: 0.08,
      hazeSpeed: 0.1,
      focusPulse: 0.09,
      focusPulseSpeed: 0.76,
      landmarkBreath: 0.034,
      landmarkBreathSpeed: 0.68,
    };
  }

  return {
    id: "old-town-breath",
    label: "Old town slow breath",
    waterSpeed: 0.92,
    waterAmplitude: 0.9,
    hazeDrift: 0.055,
    hazeSpeed: 0.1,
    focusPulse: 0.065,
    focusPulseSpeed: 0.7,
    landmarkBreath: 0.024,
    landmarkBreathSpeed: 0.62,
  };
}

export function buildCinematicSceneInspector(roadbook: Roadbook, activeDay: number): CinematicSceneInspector {
  const resolved = resolveCinematicScenePreset(roadbook, activeDay);
  const pose = buildCinematicCameraPose(resolved?.focus);

  if (!resolved) {
    return {
      status: "fallback",
      presetId: "generic",
      destination: roadbook.destination || "Custom destination",
      heroLabel: "Procedural Skyline",
      shotLabel: `D${activeDay}`,
      visualCue: "通用体块 / 动态水面 / 远景贴片",
      routeProgress: "Default path",
      routePointCount: 0,
      cameraFov: pose.fov,
      cameraX: roundCameraValue(pose.camera[0]),
      parallaxWeight: pose.parallaxWeight,
    };
  }

  const rail = buildCinematicRouteRail(resolved.preset, resolved.focus.day);
  const activeRoutePoints = rail.points.slice(0, rail.activeIndex + 1);
  const routeProgress =
    activeRoutePoints.length > 0
      ? activeRoutePoints.map((point) => `D${point.day}`).join("-")
      : `D${resolved.focus.day}`;

  return {
    status: "active",
    presetId: resolved.preset.id,
    destination: resolved.preset.destination,
    heroLabel: resolved.preset.heroLabel,
    shotLabel: `D${resolved.focus.day} · ${resolved.focus.label}`,
    visualCue: resolved.focus.visualCue,
    routeProgress,
    routePointCount: rail.points.length,
    cameraFov: pose.fov,
    cameraX: roundCameraValue(pose.camera[0]),
    parallaxWeight: pose.parallaxWeight,
  };
}

function matchesPreset(preset: CinematicScenePreset, searchText: string) {
  const matchCount = preset.matchers.reduce((count, matcher) => {
    return searchText.includes(matcher) ? count + 1 : count;
  }, 0);

  if (preset.id === "dali-cangshan-erhai") {
    return /大理/.test(searchText) && matchCount >= 2;
  }

  return matchCount >= 2;
}

function getLandmarkKindForFocus(anchorKind: CinematicSceneFocus["anchorKind"]): CinematicLandmarkKind {
  if (anchorKind === "erhai") {
    return "erhai-sail";
  }

  if (anchorKind === "village") {
    return "bai-courtyard-arch";
  }

  if (anchorKind === "return") {
    return "return-cafe";
  }

  return "old-town-gate";
}

function getLandmarkCue(kind: CinematicLandmarkKind) {
  if (kind === "erhai-sail") {
    return "水线 / 帆影 / 码头";
  }

  if (kind === "bai-courtyard-arch") {
    return "白墙 / 拱门 / 青瓦";
  }

  if (kind === "return-cafe") {
    return "咖啡 / 灯牌 / 返程";
  }

  return "城门 / 屋檐 / 石路";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundCameraValue(value: number) {
  return Math.round(value * 100) / 100;
}

function buildRoadbookSearchText(roadbook: Roadbook) {
  return [
    roadbook.destination,
    roadbook.title,
    roadbook.subtitle,
    roadbook.concept,
    roadbook.summary.routeTheme,
    roadbook.summary.stayArea,
    roadbook.highlights.join(" "),
    roadbook.days
      .map((day) => [
        day.title,
        day.area,
        day.mood,
        day.routeSummary,
        day.stops.map((stop) => `${stop.name} ${stop.addressHint}`).join(" "),
      ].join(" "))
      .join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}
