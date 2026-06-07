// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { LandmarkBlueprintCard } from "./landmark-blueprint-card";
import type { LandmarkPreset } from "@/lib/landmark-preset";

function makePreset(overrides: Partial<LandmarkPreset> = {}): LandmarkPreset {
  return {
    id: "preset-test",
    name: "三塔照壁",
    template: "monument",
    source: "m3-generated",
    version: 1,
    materials: {
      stone: { color: "#bfc8b8" },
    },
    primitives: [
      { id: "ground", type: "plane", position: [0, 0, 0], size: [200, 200, 0], materialId: "stone" },
      { id: "tower-1", type: "box", position: [-3, 2, 0], size: [2, 4, 2], materialId: "stone" },
      { id: "tower-2", type: "box", position: [0, 2, 0], size: [2, 4, 2], materialId: "stone" },
      { id: "tower-3", type: "box", position: [3, 2, 0], size: [2, 4, 2], materialId: "stone" },
    ],
    lights: [
      { type: "point", color: "#fff3c4", intensity: 0.8 },
      { type: "ambient", color: "#fff3c4", intensity: 0.2 },
    ],
    ...overrides,
  };
}

describe("LandmarkBlueprintCard", () => {
  it("renders the preset name and counts primitives and lights", () => {
    render(<LandmarkBlueprintCard preset={makePreset()} />);
    expect(screen.getByText("三塔照壁")).toBeTruthy();
    expect(screen.getByText("4 几何体")).toBeTruthy();
    expect(screen.getByText("2 灯光")).toBeTruthy();
    expect(screen.getByText("模板 monument")).toBeTruthy();
  });

  it("shows the M3 source badge with the m3 tone for m3-generated presets", () => {
    const { container } = render(
      <LandmarkBlueprintCard preset={makePreset({ source: "m3-generated" })} />,
    );
    const card = container.querySelector(".dream-landmark-blueprint");
    expect(card?.getAttribute("data-source-tone")).toBe("m3");
    expect(screen.getByText("已用 M3 生成")).toBeTruthy();
    const badge = container.querySelector(".dream-landmark-blueprint-badge-m3");
    expect(badge).toBeTruthy();
  });

  it("shows the procedural fallback badge with the fallback tone for procedural-fallback presets", () => {
    const { container } = render(
      <LandmarkBlueprintCard
        preset={makePreset({ source: "procedural-fallback", name: "本地兜底" })}
      />,
    );
    const card = container.querySelector(".dream-landmark-blueprint");
    expect(card?.getAttribute("data-source-tone")).toBe("fallback");
    expect(screen.getByText("程序化兜底")).toBeTruthy();
    const badge = container.querySelector(".dream-landmark-blueprint-badge-fallback");
    expect(badge).toBeTruthy();
  });

  it("falls back to a neutral badge for any other source value", () => {
    const { container } = render(
      <LandmarkBlueprintCard
        preset={makePreset({ source: "user-uploaded" as LandmarkPreset["source"], name: "用户传入" })}
      />,
    );
    const card = container.querySelector(".dream-landmark-blueprint");
    expect(card?.getAttribute("data-source-tone")).toBe("neutral");
  });

  it("renders 0 lights chip when lights is omitted", () => {
    const preset = makePreset();
    // Cast through Partial to model the lights-absent case.
    const noLights: LandmarkPreset = { ...preset, lights: undefined };
    render(<LandmarkBlueprintCard preset={noLights} />);
    expect(screen.getByText("0 灯光")).toBeTruthy();
  });

  it("invokes onActivateScene with sceneDay when the user clicks the name", () => {
    const onActivate = vi.fn();
    render(
      <LandmarkBlueprintCard
        preset={makePreset({ sceneDay: 3 })}
        currentSceneDay={1}
        onActivateScene={onActivate}
      />,
    );
    const nameButton = screen.getByRole("button", { name: /跳转到第 3 天场景/ });
    fireEvent.click(nameButton);
    expect(onActivate).toHaveBeenCalledWith(3);
  });

  it("does not invoke onActivateScene when the current scene already matches sceneDay (no-op)", () => {
    const onActivate = vi.fn();
    render(
      <LandmarkBlueprintCard
        preset={makePreset({ sceneDay: 2 })}
        currentSceneDay={2}
        onActivateScene={onActivate}
      />,
    );
    const nameButton = screen.getByRole("button", { name: /三塔照壁/ });
    expect((nameButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(nameButton);
    expect(onActivate).not.toHaveBeenCalled();
    // Current-scene hint is visible
    expect(screen.getByText(/D2 · 当前场景/)).toBeTruthy();
  });

  it("does not invoke onActivateScene when the preset has no sceneDay", () => {
    const onActivate = vi.fn();
    render(
      <LandmarkBlueprintCard
        preset={makePreset({ sceneDay: undefined })}
        currentSceneDay={1}
        onActivateScene={onActivate}
      />,
    );
    const nameButton = screen.getByRole("button", { name: "三塔照壁" });
    expect((nameButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(nameButton);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("renders a preview thumbnail with the preset.preview url as background image", () => {
    const { container } = render(
      <LandmarkBlueprintCard
        preset={makePreset({ preview: "data:image/png;base64,AAA" })}
      />,
    );
    const thumb = container.querySelector<HTMLElement>(".dream-landmark-blueprint-thumb");
    expect(thumb).toBeTruthy();
    expect(thumb?.getAttribute("aria-label")).toContain("三塔照壁 预览缩略图");
    expect(thumb?.style.backgroundImage).toContain("data:image/png;base64,AAA");
  });

  it("omits the preview thumbnail when preset.preview is absent", () => {
    const { container } = render(<LandmarkBlueprintCard preset={makePreset()} />);
    const thumb = container.querySelector(".dream-landmark-blueprint-thumb");
    expect(thumb).toBeNull();
  });

  it("renders the model id when provided", () => {
    render(<LandmarkBlueprintCard preset={makePreset()} model="MiniMax-M3" />);
    expect(screen.getByText("MiniMax-M3")).toBeTruthy();
  });

  it("uses preset.symbol when present and falls back to a generic glyph otherwise", () => {
    const { container, rerender } = render(
      <LandmarkBlueprintCard preset={makePreset({ symbol: "🏛️" })} />,
    );
    expect(container.querySelector(".dream-landmark-blueprint-symbol")?.textContent).toBe("🏛️");
    rerender(<LandmarkBlueprintCard preset={makePreset({ symbol: undefined })} />);
    expect(container.querySelector(".dream-landmark-blueprint-symbol")?.textContent).toBe("🗿");
  });
});
