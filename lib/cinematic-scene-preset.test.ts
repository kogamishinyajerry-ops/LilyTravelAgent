import { describe, expect, it } from "vitest";
import { sampleRoadbook } from "./sample-roadbook";
import type { Roadbook } from "./roadbook-types";
import {
  buildCinematicAtmosphereProfile,
  buildCinematicCameraPose,
  buildCinematicLandmarkSilhouettes,
  buildCinematicRouteRail,
  buildCinematicSceneInspector,
  DALI_CINEMATIC_SCENE_PRESET,
  getCinematicDayFocus,
  resolveCinematicScenePreset,
} from "./cinematic-scene-preset";

const cityRoadbook: Roadbook = {
  ...sampleRoadbook,
  title: "上海 3 天城市路书",
  subtitle: "外滩、街区和城市天际线。",
  destination: "上海",
  concept: "城市 skyline 与街区步行。",
  highlights: ["外滩", "武康路", "陆家嘴"],
  summary: {
    routeTheme: "城市街区 + skyline",
    transportPlan: "地铁 + 步行",
    stayArea: "静安寺附近",
    rhythm: "紧凑但可执行",
  },
  days: sampleRoadbook.days.map((day) => ({
    ...day,
    title: "城市街区日",
    area: "上海市区",
    mood: "城市、步行、建筑",
    routeSummary: "城市街区移动。",
    stops: day.stops.map((stop) => ({
      ...stop,
      name: stop.name.replace(/大理|洱海|喜洲|才村|古城|五华楼/g, "上海"),
      addressHint: "上海市区",
    })),
  })),
};

describe("resolveCinematicScenePreset", () => {
  it("resolves the Dali preset for the default Dali sample roadbook", () => {
    const result = resolveCinematicScenePreset(sampleRoadbook, 1);

    expect(result?.preset.id).toBe("dali-cangshan-erhai");
    expect(result?.preset.heroLabel).toBe("苍山 / 洱海 / 白族院落");
    expect(result?.focus.label).toBe("古城南门");
  });

  it("switches Dali focus by active day", () => {
    expect(resolveCinematicScenePreset(sampleRoadbook, 2)?.focus.anchorKind).toBe("erhai");
    expect(resolveCinematicScenePreset(sampleRoadbook, 3)?.focus.anchorKind).toBe("village");
    expect(resolveCinematicScenePreset(sampleRoadbook, 4)?.focus.anchorKind).toBe("return");
  });

  it("does not resolve Dali assets for a non-Dali city roadbook", () => {
    expect(resolveCinematicScenePreset(cityRoadbook, 1)).toBeNull();
  });
});

describe("getCinematicDayFocus", () => {
  it("falls back to day 1 when an unknown day is requested", () => {
    expect(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 99).label).toBe("古城南门");
  });

  it("keeps all Dali focus anchors inside the visible procedural scene bounds", () => {
    for (const focus of DALI_CINEMATIC_SCENE_PRESET.focusByDay) {
      expect(Math.abs(focus.x)).toBeLessThanOrEqual(6);
      expect(focus.z).toBeGreaterThanOrEqual(0.8);
      expect(focus.z).toBeLessThanOrEqual(3.4);
    }
  });
});

describe("buildCinematicCameraPose", () => {
  it("returns the stable default pose when no cinematic focus is available", () => {
    expect(buildCinematicCameraPose()).toEqual({
      fov: 38,
      camera: [0.55, 5.2, 12.15],
      lookAt: [0, 1.08, 0],
      parallaxWeight: 1,
    });
  });

  it("opens the lens slightly for the Erhai water day", () => {
    const erhai = getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 2);
    const pose = buildCinematicCameraPose(erhai);

    expect(pose.fov).toBe(39);
    expect(pose.camera[0]).toBeGreaterThan(0.55);
    expect(pose.parallaxWeight).toBeGreaterThan(1);
  });

  it("frames the Xizhou village day toward the left-side courtyard cluster", () => {
    const village = getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 3);
    const pose = buildCinematicCameraPose(village);

    expect(pose.fov).toBe(37);
    expect(pose.camera[0]).toBeLessThan(0.55);
    expect(pose.lookAt[0]).toBeLessThan(0);
  });
});

describe("buildCinematicRouteRail", () => {
  it("returns Dali focus points ordered by day", () => {
    const rail = buildCinematicRouteRail(DALI_CINEMATIC_SCENE_PRESET, 1);

    expect(rail.points.map((point) => point.day)).toEqual([1, 2, 3, 4]);
    expect(rail.points.map((point) => point.label)).toEqual([
      "古城南门",
      "洱海西线",
      "喜洲村落",
      "古城收尾",
    ]);
  });

  it("marks the active day and active route index", () => {
    const rail = buildCinematicRouteRail(DALI_CINEMATIC_SCENE_PRESET, 3);

    expect(rail.activeIndex).toBe(2);
    expect(rail.points.filter((point) => point.isActive).map((point) => point.day)).toEqual([3]);
  });

  it("falls back to the first segment when active day is unknown", () => {
    const rail = buildCinematicRouteRail(DALI_CINEMATIC_SCENE_PRESET, 99);

    expect(rail.activeIndex).toBe(0);
    expect(rail.points.some((point) => point.isActive)).toBe(false);
  });
});

describe("buildCinematicSceneInspector", () => {
  it("summarizes the active Dali scene preset for recording", () => {
    const inspector = buildCinematicSceneInspector(sampleRoadbook, 2);

    expect(inspector).toMatchObject({
      status: "active",
      presetId: "dali-cangshan-erhai",
      destination: "云南大理",
      heroLabel: "苍山 / 洱海 / 白族院落",
      shotLabel: "D2 · 洱海西线",
      visualCue: "水面 / S 湾 / 日落",
      routeProgress: "D1-D2",
      routePointCount: 4,
      cameraFov: 39,
    });
    expect(inspector.parallaxWeight).toBeGreaterThan(1);
  });

  it("advances route progress through the selected Dali day", () => {
    const inspector = buildCinematicSceneInspector(sampleRoadbook, 3);

    expect(inspector.shotLabel).toBe("D3 · 喜洲村落");
    expect(inspector.routeProgress).toBe("D1-D2-D3");
    expect(inspector.cameraX).toBeLessThan(0.55);
  });

  it("returns a transparent fallback inspector for unsupported destinations", () => {
    const inspector = buildCinematicSceneInspector(cityRoadbook, 1);

    expect(inspector).toMatchObject({
      status: "fallback",
      presetId: "generic",
      destination: "上海",
      heroLabel: "Procedural Skyline",
      shotLabel: "D1",
      routeProgress: "Default path",
      routePointCount: 0,
      cameraFov: 38,
    });
  });
});

describe("buildCinematicLandmarkSilhouettes", () => {
  it("creates one recognizable Dali silhouette marker per day", () => {
    const layer = buildCinematicLandmarkSilhouettes(DALI_CINEMATIC_SCENE_PRESET, 1);

    expect(layer.markers.map((marker) => marker.day)).toEqual([1, 2, 3, 4]);
    expect(layer.markers.map((marker) => marker.kind)).toEqual([
      "old-town-gate",
      "erhai-sail",
      "bai-courtyard-arch",
      "return-cafe",
    ]);
    expect(layer.markers.map((marker) => marker.cue)).toContain("水线 / 帆影 / 码头");
  });

  it("emphasizes the active day marker without changing the marker order", () => {
    const layer = buildCinematicLandmarkSilhouettes(DALI_CINEMATIC_SCENE_PRESET, 3);

    expect(layer.activeMarker.day).toBe(3);
    expect(layer.activeMarker.kind).toBe("bai-courtyard-arch");
    expect(layer.markers.filter((marker) => marker.isActive).map((marker) => marker.day)).toEqual([3]);
    expect(layer.activeMarker.scale).toBeGreaterThan(layer.markers[0].scale);
  });

  it("falls back to day 1 when an unknown active day is requested", () => {
    const layer = buildCinematicLandmarkSilhouettes(DALI_CINEMATIC_SCENE_PRESET, 99);

    expect(layer.activeMarker.day).toBe(1);
    expect(layer.activeMarker.kind).toBe("old-town-gate");
  });
});

describe("buildCinematicAtmosphereProfile", () => {
  it("returns a stable soft profile when no cinematic focus is available", () => {
    expect(buildCinematicAtmosphereProfile()).toMatchObject({
      id: "generic-soft",
      label: "Soft procedural haze",
      fogNear: 12,
      fogFar: 26,
      waterColor: "#8cc9cb",
      ribbonOpacityScale: 1,
    });
  });

  it("directs the Erhai day toward brighter water and stronger glints", () => {
    const profile = buildCinematicAtmosphereProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 2));

    expect(profile.id).toBe("erhai-sunset");
    expect(profile.sunIntensity).toBeGreaterThan(4);
    expect(profile.waterOpacity).toBeGreaterThan(0.7);
    expect(profile.ribbonOpacityScale).toBeGreaterThan(1.2);
    expect(profile.sunDiscPosition[0]).toBeGreaterThan(0);
  });

  it("keeps the Xizhou village day calmer than the Erhai water day", () => {
    const village = buildCinematicAtmosphereProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 3));
    const erhai = buildCinematicAtmosphereProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 2));

    expect(village.id).toBe("xizhou-morning");
    expect(village.hazeOpacity).toBeLessThan(erhai.hazeOpacity);
    expect(village.ribbonOpacityScale).toBeLessThan(erhai.ribbonOpacityScale);
  });

  it("warms the return day for a closing-hour feel", () => {
    const profile = buildCinematicAtmosphereProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 4));

    expect(profile.id).toBe("return-amber");
    expect(profile.sunColor).toBe("#f4a56d");
    expect(profile.foregroundHazeOpacity).toBeGreaterThan(0.2);
  });
});
