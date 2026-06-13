import { describe, expect, it } from "vitest";
import { sampleRoadbook } from "./sample-roadbook";
import type { Roadbook } from "./roadbook-types";
import {
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
