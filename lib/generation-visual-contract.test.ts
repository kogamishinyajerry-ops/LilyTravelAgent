import { describe, expect, it } from "vitest";
import { formatVisualGenerationContract } from "./generation-visual-contract";

describe("formatVisualGenerationContract", () => {
  it("formats template, render strategy and Director Lens into stable prompt lines", () => {
    expect(
      formatVisualGenerationContract({
        visualTemplate: "starlake",
        visualTemplateLabel: "星湖",
        renderStrategy: {
          lens: "wide waterline",
          surface: "lake / glint / island",
          motion: "water glide",
        },
        directorLens: "wide-water",
        directorLensLabel: "Wide Water",
        directorLensPrompt: "Wide Water: wide waterline; camera=horizon",
      }),
    ).toBe(
      [
        "视觉模板：星湖",
        "渲染策略：lens=wide waterline; surface=lake / glint / island; motion=water glide",
        "导演镜头：Wide Water",
        "镜头提示：Wide Water: wide waterline; camera=horizon",
      ].join("\n"),
    );
  });

  it("keeps a useful fallback when optional visual fields are omitted", () => {
    expect(formatVisualGenerationContract({})).toContain("导演镜头：Auto Director");
    expect(formatVisualGenerationContract({})).toContain("跟随当前天数和目的地预设");
  });
});
