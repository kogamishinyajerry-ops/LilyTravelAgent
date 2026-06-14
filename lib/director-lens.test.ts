import { describe, expect, it } from "vitest";
import {
  buildDirectorLensSceneTuning,
  directorLenses,
  formatDirectorLensPrompt,
  resolveDirectorLens,
} from "./director-lens";

describe("director-lens", () => {
  it("exports the five supported Director Lens modes in display order", () => {
    expect(directorLenses.map((lens) => lens.id)).toEqual([
      "auto",
      "wide-water",
      "low-skyline",
      "isometric-atlas",
      "close-detail",
    ]);
  });

  it("falls back to Auto Director for missing or unknown ids", () => {
    expect(resolveDirectorLens().id).toBe("auto");
    expect(resolveDirectorLens("unknown").id).toBe("auto");
  });

  it("defines useful camera offsets for every non-auto lens", () => {
    for (const lens of directorLenses.filter((item) => item.id !== "auto")) {
      expect(lens.promptCue.length).toBeGreaterThan(12);
      expect(lens.cameraCue.length).toBeGreaterThan(8);
      expect(lens.proofLabel).toContain("lens");
      expect(Math.abs(lens.fovDelta)).toBeGreaterThan(0);
      expect(lens.cameraOffset.some((value) => value !== 0)).toBe(true);
      expect(lens.parallaxScale).toBeGreaterThan(0.8);
      expect(lens.parallaxScale).toBeLessThan(1.25);
    }
  });

  it("formats prompt text for generation contracts", () => {
    const lens = resolveDirectorLens("wide-water");

    expect(formatDirectorLensPrompt(lens)).toBe(
      "Wide Water: wide waterline, horizon depth, reflective foreground; camera=wider lens toward horizon and water",
    );
  });

  it("keeps auto scene tuning neutral", () => {
    expect(buildDirectorLensSceneTuning("auto")).toEqual({
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
    });
  });

  it("makes low-skyline visibly taller, lower, and more cinematic", () => {
    const tuning = buildDirectorLensSceneTuning("low-skyline");

    expect(tuning.rootPitchOffset).toBeLessThan(0);
    expect(tuning.skylineHeightScale).toBeGreaterThan(1.3);
    expect(tuning.skylineDepthScale).toBeLessThan(0.9);
    expect(tuning.skylineLift).toBeGreaterThan(0.1);
    expect(tuning.ribbonOpacityScale).toBeGreaterThan(1.3);
    expect(tuning.routeOpacityScale).toBeGreaterThan(1);
  });
});
