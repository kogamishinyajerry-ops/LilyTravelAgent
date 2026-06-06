import { describe, it, expect } from "vitest";
import {
  createRecordingController,
  getTotalCombinations,
  summarizeBuildingHeightSources,
  formatHeightSourceStats,
  EMPTY_HEIGHT_SOURCE_STATS,
  HEIGHT_SOURCE_BUCKETS,
  type RecordingConfig,
  type RecordingController,
} from "./recording-helper";
import {
  dreamMoods,
  dreamTemplates,
  type DreamMood,
  type DreamTemplate,
} from "./dream-design-skill";
import type { Building } from "./buildings-source";

const ALL_TEMPLATES: DreamTemplate[] = dreamTemplates.map((t) => t.id);
const ALL_MOODS: DreamMood[] = dreamMoods.map((m) => m.id);

function makeController(
  overrides: Partial<RecordingConfig> = {},
): RecordingController {
  return createRecordingController({
    mode: "manual",
    stepIntervalMs: 1000,
    ...overrides,
  });
}

describe("createRecordingController", () => {
  it("starts at the first template and first mood", () => {
    const c = makeController({ mode: "cycle-both" });
    expect(c.state.currentTemplateIndex).toBe(0);
    expect(c.state.currentMoodIndex).toBe(0);
    expect(c.state.totalSteps).toBe(0);
  });

  it("cycle-templates advances template on each tick and never changes mood", () => {
    const c = makeController({ mode: "cycle-templates" });
    const r1 = c.tick(1000);
    expect(r1).toEqual({
      templateChanged: true,
      moodChanged: false,
      finished: false,
    });
    expect(c.state.currentTemplateIndex).toBe(1);
    expect(c.state.currentMoodIndex).toBe(0);

    const r2 = c.tick(2000);
    expect(r2.templateChanged).toBe(true);
    expect(c.state.currentTemplateIndex).toBe(2);
  });

  it("cycle-templates wraps back to the first template", () => {
    const c = makeController({ mode: "cycle-templates" });
    // 5 templates, 5 advances should wrap to 0.
    for (let i = 0; i < ALL_TEMPLATES.length; i += 1) {
      c.tick((i + 1) * 1000);
    }
    expect(c.state.currentTemplateIndex).toBe(0);
  });

  it("cycle-moods advances mood on each tick and never changes template", () => {
    const c = makeController({ mode: "cycle-moods" });
    const r1 = c.tick(1000);
    expect(r1).toEqual({
      templateChanged: false,
      moodChanged: true,
      finished: false,
    });
    expect(c.state.currentTemplateIndex).toBe(0);
    expect(c.state.currentMoodIndex).toBe(1);

    c.tick(2000);
    expect(c.state.currentMoodIndex).toBe(2);
  });

  it("cycle-both cycles templates in the inner loop, moods in the outer loop", () => {
    const c = makeController({ mode: "cycle-both" });

    // First advance: template 0 -> 1, mood stays 0.
    let r = c.tick(1000);
    expect(r).toEqual({
      templateChanged: true,
      moodChanged: false,
      finished: false,
    });
    expect(c.state.currentTemplateIndex).toBe(1);
    expect(c.state.currentMoodIndex).toBe(0);

    // Advance until we wrap templates back to 0 (4 more steps for 5 templates).
    c.tick(2000); // template 2
    c.tick(3000); // template 3
    c.tick(4000); // template 4
    r = c.tick(5000); // template wraps to 0, mood should now advance to 1
    expect(r.templateChanged).toBe(true);
    expect(r.moodChanged).toBe(true);
    expect(c.state.currentTemplateIndex).toBe(0);
    expect(c.state.currentMoodIndex).toBe(1);
  });

  it("finished becomes true after all combinations in cycle-both (default 5x4 = 20)", () => {
    const c = makeController({ mode: "cycle-both" });
    const total = ALL_TEMPLATES.length * ALL_MOODS.length;
    expect(total).toBe(20);

    let lastResult;
    for (let i = 1; i <= total; i += 1) {
      lastResult = c.tick(i * 1000);
    }
    expect(lastResult?.finished).toBe(true);
    // After completion we settle on the first combination.
    expect(c.state.currentTemplateIndex).toBe(0);
    expect(c.state.currentMoodIndex).toBe(0);
  });

  it("finished becomes true after all combinations in cycle-both with a custom subset", () => {
    const c = makeController({
      mode: "cycle-both",
      templates: ["monument", "lantern"],
      moods: ["cloud", "dusk"],
    });
    const total = 2 * 2;
    let lastResult;
    for (let i = 1; i <= total; i += 1) {
      lastResult = c.tick(i * 1000);
    }
    expect(lastResult?.finished).toBe(true);
  });

  it("stepIntervalMs is respected: returns no change if interval not elapsed", () => {
    const c = makeController({ mode: "cycle-templates", stepIntervalMs: 4000 });
    // First tick at t=4000 is exactly the interval -> should advance.
    const r1 = c.tick(4000);
    expect(r1.templateChanged).toBe(true);
    expect(c.state.currentTemplateIndex).toBe(1);

    // A second tick at t=5000 (1000ms later, well under 4000ms) must not advance.
    const r2 = c.tick(5000);
    expect(r2).toEqual({
      templateChanged: false,
      moodChanged: false,
      finished: false,
    });
    expect(c.state.currentTemplateIndex).toBe(1);
  });

  it("reset() returns the controller to its initial state", () => {
    const c = makeController({ mode: "cycle-both" });
    c.tick(1000);
    c.tick(2000);
    c.tick(3000);
    expect(c.state.currentTemplateIndex).not.toBe(0);
    expect(c.state.totalSteps).toBeGreaterThan(0);

    c.reset();

    expect(c.state.currentTemplateIndex).toBe(0);
    expect(c.state.currentMoodIndex).toBe(0);
    expect(c.state.currentStepStartMs).toBe(0);
    expect(c.state.totalSteps).toBe(0);
  });

  it("manual mode never auto-advances and never finishes", () => {
    const c = makeController({ mode: "manual" });
    for (let i = 1; i <= 50; i += 1) {
      const r = c.tick(i * 1000);
      expect(r).toEqual({
        templateChanged: false,
        moodChanged: false,
        finished: false,
      });
    }
    expect(c.state.currentTemplateIndex).toBe(0);
    expect(c.state.currentMoodIndex).toBe(0);
  });

  it("getTotalCombinations counts all defaults and respects overrides", () => {
    expect(getTotalCombinations({})).toBe(
      ALL_TEMPLATES.length * ALL_MOODS.length,
    );
    expect(
      getTotalCombinations({ templates: ["monument", "starlake"] }),
    ).toBe(2 * ALL_MOODS.length);
    expect(
      getTotalCombinations({ moods: ["cloud", "geometry", "dusk"] }),
    ).toBe(ALL_TEMPLATES.length * 3);
  });
});

describe("summarizeBuildingHeightSources", () => {
  function makeBuilding(
    id: string,
    heightSource: Building["heightSource"],
  ): Building {
    return {
      id,
      lng: 100.1,
      lat: 25.5,
      heightMeters: 12,
      footprint: [],
      tags: {},
      heightSource,
    };
  }

  it("returns all-zero stats for an empty / nullish input", () => {
    expect(summarizeBuildingHeightSources(undefined)).toEqual(
      EMPTY_HEIGHT_SOURCE_STATS,
    );
    expect(summarizeBuildingHeightSources(null)).toEqual(
      EMPTY_HEIGHT_SOURCE_STATS,
    );
    expect(summarizeBuildingHeightSources([])).toEqual(EMPTY_HEIGHT_SOURCE_STATS);
  });

  it("counts buildings per height source bucket", () => {
    const buildings: Building[] = [
      makeBuilding("a", "osm"),
      makeBuilding("b", "osm"),
      makeBuilding("c", "gaode-extensions"),
      makeBuilding("d", "heuristic"),
      makeBuilding("e", "default"),
    ];
    expect(summarizeBuildingHeightSources(buildings)).toEqual({
      osm: 2,
      "gaode-extensions": 1,
      heuristic: 1,
      default: 1,
      total: 5,
    });
  });

  it("treats buildings without a heightSource as default", () => {
    const legacy: Building = {
      id: "legacy",
      lng: 0,
      lat: 0,
      heightMeters: 8,
      footprint: [],
      tags: {},
    };
    const stats = summarizeBuildingHeightSources([legacy]);
    expect(stats).toEqual({
      osm: 0,
      "gaode-extensions": 0,
      heuristic: 0,
      default: 1,
      total: 1,
    });
  });

  it("always returns every HEIGHT_SOURCE_BUCKETS key", () => {
    const stats = summarizeBuildingHeightSources([]);
    for (const key of HEIGHT_SOURCE_BUCKETS) {
      expect(typeof stats[key]).toBe("number");
    }
    expect(typeof stats.total).toBe("number");
  });
});

describe("formatHeightSourceStats", () => {
  it("renders zero stats in the expected compact format", () => {
    expect(formatHeightSourceStats(EMPTY_HEIGHT_SOURCE_STATS)).toBe(
      "Buildings: 0 (osm: 0, gaode: 0, heuristic: 0, default: 0)",
    );
  });

  it("renders a non-empty distribution in a stable order", () => {
    expect(
      formatHeightSourceStats({
        osm: 891,
        "gaode-extensions": 234,
        heuristic: 122,
        default: 0,
        total: 1247,
      }),
    ).toBe(
      "Buildings: 1247 (osm: 891, gaode: 234, heuristic: 122, default: 0)",
    );
  });
});
