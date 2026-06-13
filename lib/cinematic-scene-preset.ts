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

function matchesPreset(preset: CinematicScenePreset, searchText: string) {
  const matchCount = preset.matchers.reduce((count, matcher) => {
    return searchText.includes(matcher) ? count + 1 : count;
  }, 0);

  if (preset.id === "dali-cangshan-erhai") {
    return /大理/.test(searchText) && matchCount >= 2;
  }

  return matchCount >= 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
