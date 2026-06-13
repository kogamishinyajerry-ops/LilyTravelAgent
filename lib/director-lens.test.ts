import { describe, expect, it } from "vitest";
import {
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
});
