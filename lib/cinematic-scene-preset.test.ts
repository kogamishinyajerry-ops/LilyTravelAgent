import { describe, expect, it } from "vitest";
import { sampleRoadbook } from "./sample-roadbook";
import type { Roadbook } from "./roadbook-types";
import {
  buildCinematicAtmosphereProfile,
  buildCinematicCameraPose,
  buildCinematicCompositionProfile,
  buildCinematicLandmarkSilhouettes,
  buildCinematicMotionProfile,
  buildCinematicRouteRail,
  buildCinematicSceneInspector,
  buildCinematicSceneTimeline,
  COASTAL_CINEMATIC_SCENE_PRESET,
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

const coastalRoadbook: Roadbook = {
  ...sampleRoadbook,
  title: "三亚海岛 4 天梦境路书",
  subtitle: "海湾、灯塔、港口和日落。",
  destination: "三亚海岛",
  concept: "海岛度假、海边骑行、港口街区和日落观景。",
  highlights: ["海岸灯塔", "蓝色海湾", "港口码头", "日落栈道"],
  summary: {
    routeTheme: "海岸线 + 海湾 + 港口",
    transportPlan: "租车 + 步行",
    stayArea: "海边度假区",
    rhythm: "轻松但有画面感",
  },
  days: sampleRoadbook.days.map((day, index) => ({
    ...day,
    title: ["灯塔抵达", "蓝色海湾", "港口街区", "日落返程"][index] || "海边日",
    area: ["海岸灯塔", "蓝色海湾", "港口街区", "日落观景台"][index] || "海边",
    mood: ["海风、白沙、抵达", "浅海、帆影、日落", "码头、拱廊、城市线", "落日、栈道、返程"][index] || "海边",
    routeSummary: "沿海岸线移动，串联海湾、沙滩、港口和日落观景点。",
    stops: day.stops.map((stop, stopIndex) => ({
      ...stop,
      name: ["海岸灯塔", "白沙海滩", "蓝色海湾", "帆船码头"][stopIndex] || "海边咖啡",
      addressHint: "三亚海边",
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

  it("resolves the coastal preset for a coast or island roadbook", () => {
    const result = resolveCinematicScenePreset(coastalRoadbook, 2);

    expect(result?.preset.id).toBe("coast-island-bay");
    expect(result?.preset.heroLabel).toBe("海湾 / 灯塔 / 港口天际线");
    expect(result?.focus.label).toBe("蓝色海湾");
    expect(result?.focus.anchorKind).toBe("bay");
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

  it("keeps all coastal focus anchors inside the visible procedural scene bounds", () => {
    for (const focus of COASTAL_CINEMATIC_SCENE_PRESET.focusByDay) {
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

  it("applies the wide-water Director Lens without changing the original auto pose contract", () => {
    const erhai = getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 2);
    const autoPose = buildCinematicCameraPose(erhai);
    const lensPose = buildCinematicCameraPose(erhai, "wide-water");

    expect(autoPose.fov).toBe(39);
    expect(lensPose.fov).toBe(42);
    expect(lensPose.camera[2]).toBeGreaterThan(autoPose.camera[2]);
    expect(lensPose.lookAt[2]).toBeGreaterThan(autoPose.lookAt[2]);
    expect(lensPose.parallaxWeight).toBeGreaterThan(autoPose.parallaxWeight);
  });

  it("applies low skyline and isometric Director Lens camera intents", () => {
    const harbor = getCinematicDayFocus(COASTAL_CINEMATIC_SCENE_PRESET, 3);
    const autoPose = buildCinematicCameraPose(harbor);
    const lowSkyline = buildCinematicCameraPose(harbor, "low-skyline");
    const isometric = buildCinematicCameraPose(harbor, "isometric-atlas");

    expect(lowSkyline.camera[1]).toBeLessThan(autoPose.camera[1]);
    expect(lowSkyline.lookAt[1]).toBeGreaterThan(autoPose.lookAt[1]);
    expect(isometric.camera[1]).toBeGreaterThan(autoPose.camera[1]);
    expect(isometric.fov).toBeLessThan(autoPose.fov);
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
    expect(inspector.directorLens).toMatchObject({
      id: "auto",
      label: "Auto Director",
      proofLabel: "auto day lens",
    });
  });

  it("advances route progress through the selected Dali day", () => {
    const inspector = buildCinematicSceneInspector(sampleRoadbook, 3);

    expect(inspector.shotLabel).toBe("D3 · 喜洲村落");
    expect(inspector.routeProgress).toBe("D1-D2-D3");
    expect(inspector.cameraX).toBeLessThan(0.55);
    expect(inspector.composition).toMatchObject({
      id: "xizhou-courtyard-focus",
      lensLabel: "quiet focus lens",
      proofLabel: "D3 village detail",
    });
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
    expect(inspector.composition).toMatchObject({
      id: "generic-layered-preview",
      layerLabel: "terrain / skyline / asset",
    });
  });

  it("summarizes the active coastal scene preset for recording", () => {
    const inspector = buildCinematicSceneInspector(coastalRoadbook, 3);

    expect(inspector).toMatchObject({
      status: "active",
      presetId: "coast-island-bay",
      destination: "海岸海岛",
      heroLabel: "海湾 / 灯塔 / 港口天际线",
      shotLabel: "D3 · 港口街区",
      visualCue: "码头 / 拱廊 / 城市线",
      routeProgress: "D1-D2-D3",
      routePointCount: 4,
    });
    expect(inspector.composition).toMatchObject({
      id: "harbor-skyline-frame",
      proofLabel: "D3 harbor skyline",
    });
  });

  it("summarizes a selected Director Lens for recording", () => {
    const inspector = buildCinematicSceneInspector(coastalRoadbook, 3, "low-skyline");

    expect(inspector.directorLens).toMatchObject({
      id: "low-skyline",
      label: "Low Skyline",
      proofLabel: "low-skyline lens",
    });
    expect(inspector.cameraFov).toBe(39);
    expect(inspector.parallaxWeight).toBeGreaterThan(1);
  });
});

describe("buildCinematicCompositionProfile", () => {
  it("turns the Dali water day into a layered water-depth shot", () => {
    const profile = buildCinematicCompositionProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 2));

    expect(profile).toEqual({
      id: "erhai-water-depth",
      lensLabel: "wide water lens",
      depthLabel: "mountain-water-town",
      layerLabel: "Cangshan / Erhai / sail",
      motionLabel: "water glide",
      proofLabel: "D2 water hero",
    });
  });

  it("turns the coastal harbor day into a skyline proof shot", () => {
    const profile = buildCinematicCompositionProfile(getCinematicDayFocus(COASTAL_CINEMATIC_SCENE_PRESET, 3));

    expect(profile.id).toBe("harbor-skyline-frame");
    expect(profile.lensLabel).toBe("street skyline lens");
    expect(profile.layerLabel).toBe("water / arcade / skyline");
  });
});

describe("buildCinematicSceneTimeline", () => {
  it("builds a D1-D4 director timeline for the Dali preset", () => {
    const timeline = buildCinematicSceneTimeline(sampleRoadbook, 2);

    expect(timeline).toMatchObject({
      status: "active",
      presetId: "dali-cangshan-erhai",
      destination: "云南大理",
    });
    expect(timeline.items.map((item) => item.label)).toEqual(["古城南门", "洱海西线", "喜洲村落", "古城收尾"]);
    expect(timeline.items.find((item) => item.isActive)).toMatchObject({
      day: 2,
      landmarkKind: "erhai-sail",
      visualCue: "水面 / S 湾 / 日落",
    });
  });

  it("builds a coastal director timeline with coastal landmark kinds", () => {
    const timeline = buildCinematicSceneTimeline(coastalRoadbook, 4);

    expect(timeline.items.map((item) => item.landmarkKind)).toEqual([
      "coast-lighthouse",
      "bay-sail",
      "harbor-arcade",
      "sunset-deck",
    ]);
    expect(timeline.items.find((item) => item.isActive)).toMatchObject({
      day: 4,
      label: "日落观景台",
      visualCue: "落日 / 木栈道 / 返程",
    });
  });

  it("returns an empty fallback timeline for unsupported destinations", () => {
    const timeline = buildCinematicSceneTimeline(cityRoadbook, 1);

    expect(timeline).toMatchObject({
      status: "fallback",
      presetId: "generic",
      destination: "上海",
      items: [],
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

  it("creates one recognizable coastal silhouette marker per day", () => {
    const layer = buildCinematicLandmarkSilhouettes(COASTAL_CINEMATIC_SCENE_PRESET, 2);

    expect(layer.markers.map((marker) => marker.day)).toEqual([1, 2, 3, 4]);
    expect(layer.markers.map((marker) => marker.kind)).toEqual([
      "coast-lighthouse",
      "bay-sail",
      "harbor-arcade",
      "sunset-deck",
    ]);
    expect(layer.activeMarker.kind).toBe("bay-sail");
    expect(layer.activeMarker.cue).toBe("浅海 / 帆影 / 玻璃水");
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

  it("directs the coastal bay day toward turquoise water", () => {
    const profile = buildCinematicAtmosphereProfile(getCinematicDayFocus(COASTAL_CINEMATIC_SCENE_PRESET, 2));

    expect(profile.id).toBe("bay-turquoise");
    expect(profile.waterColor).toBe("#62cbd4");
    expect(profile.ribbonOpacityScale).toBeGreaterThan(1.3);
  });

  it("warms the coastal return day with a rose closing hour", () => {
    const profile = buildCinematicAtmosphereProfile(getCinematicDayFocus(COASTAL_CINEMATIC_SCENE_PRESET, 4));

    expect(profile.id).toBe("coast-return-rose");
    expect(profile.sunColor).toBe("#f49b74");
    expect(profile.foregroundHazeOpacity).toBeGreaterThan(0.2);
  });
});

describe("buildCinematicMotionProfile", () => {
  it("returns a stable generic drift profile when no focus is available", () => {
    expect(buildCinematicMotionProfile()).toMatchObject({
      id: "generic-drift",
      waterSpeed: 1,
      waterAmplitude: 1,
      label: "Soft scene drift",
    });
  });

  it("makes the Erhai water day more fluid than the old-town day", () => {
    const oldTown = buildCinematicMotionProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 1));
    const erhai = buildCinematicMotionProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 2));

    expect(erhai.id).toBe("erhai-glide");
    expect(erhai.waterSpeed).toBeGreaterThan(oldTown.waterSpeed);
    expect(erhai.waterAmplitude).toBeGreaterThan(oldTown.waterAmplitude);
    expect(erhai.hazeDrift).toBeGreaterThan(oldTown.hazeDrift);
  });

  it("keeps the Xizhou village day calmer than the water day", () => {
    const village = buildCinematicMotionProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 3));
    const erhai = buildCinematicMotionProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 2));

    expect(village.id).toBe("xizhou-stillness");
    expect(village.waterSpeed).toBeLessThan(erhai.waterSpeed);
    expect(village.landmarkBreath).toBeLessThan(erhai.landmarkBreath);
  });

  it("gives the return day the strongest focus pulse", () => {
    const returnDay = buildCinematicMotionProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 4));
    const village = buildCinematicMotionProfile(getCinematicDayFocus(DALI_CINEMATIC_SCENE_PRESET, 3));

    expect(returnDay.id).toBe("return-glow");
    expect(returnDay.focusPulse).toBeGreaterThan(village.focusPulse);
  });

  it("makes the coastal bay day more fluid than the harbor day", () => {
    const bay = buildCinematicMotionProfile(getCinematicDayFocus(COASTAL_CINEMATIC_SCENE_PRESET, 2));
    const harbor = buildCinematicMotionProfile(getCinematicDayFocus(COASTAL_CINEMATIC_SCENE_PRESET, 3));

    expect(bay.id).toBe("bay-current");
    expect(harbor.id).toBe("harbor-drift");
    expect(bay.waterSpeed).toBeGreaterThan(harbor.waterSpeed);
    expect(bay.waterAmplitude).toBeGreaterThan(harbor.waterAmplitude);
  });
});
