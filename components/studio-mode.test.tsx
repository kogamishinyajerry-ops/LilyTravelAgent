// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { StudioMode } from "./studio-mode";

function recordingAssetsResponse(packCount: number, title = "Studio 16:9 demo pack", indexAvailable = true) {
  return {
    ok: true,
    packCount,
    countsByType: packCount ? { dream: 12, studio: 3 } : { dream: 0, studio: 0 },
    indexAvailable,
    indexUrl: indexAvailable ? "/api/recording-assets/index" : "",
    recentPacks: packCount
      ? [
          {
            type: "studio",
            id: "latest",
            title,
            createdAt: "2026-06-13T05:46:30.958Z",
            label: "/studio recording QA",
            detail: "云南大理 / 三亚海岛",
          },
          {
            type: "dream",
            id: "dream-coast",
            title: "Dream coastal visual pack",
            createdAt: "2026-06-13T05:46:20.615Z",
            label: "/dream visual QA",
            detail: "coast · 4 day screenshots · motion verified",
          },
        ]
      : [],
    latestPack: packCount
      ? {
          title,
          createdAt: "2026-06-13T05:46:30.958Z",
          label: "/studio recording QA",
        }
      : null,
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => recordingAssetsResponse(15),
    })) as unknown as typeof fetch,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("StudioMode demo roadbooks", () => {
  it("starts in the Dali local demo state", async () => {
    render(<StudioMode />);

    expect(screen.getByText("云南大理 本地演示")).toBeTruthy();
    expect(screen.getByText("大理 4 天松弛路书")).toBeTruthy();
    expect(screen.getByDisplayValue("云南大理")).toBeTruthy();
    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    expect(screen.getByLabelText("录屏素材状态").textContent).toContain("素材已准备");
    expect(screen.getByLabelText("录屏素材状态").textContent).toContain("可以直接打开索引挑选片段");
    expect(screen.getByLabelText("素材包类型统计")).toBeTruthy();
    expect(screen.getByText("Dream 12")).toBeTruthy();
    expect(screen.getByText("Studio 3")).toBeTruthy();
    expect(screen.getByLabelText("素材剪辑标签").textContent).toContain("产品画面 · 12");
    expect(screen.getByLabelText("素材剪辑标签").textContent).toContain("讲解画面 · 3");
    expect(screen.getByLabelText("最近素材包")).toBeTruthy();
    expect(screen.getByText("Studio QA")).toBeTruthy();
    expect(screen.getByText("Dream QA")).toBeTruthy();
    expect(screen.getByText("讲解画面")).toBeTruthy();
    expect(screen.getByText("产品画面")).toBeTruthy();
    expect(screen.getByLabelText("最新素材包摘要").textContent).toContain("最新素材");
    expect(screen.getByLabelText("最新素材包摘要").textContent).toContain("Studio 16:9 demo pack");
    expect(screen.getByLabelText("最新素材包摘要").textContent).toContain("/studio recording QA");
    expect(screen.getAllByText("Dream coastal visual pack")[0]).toBeTruthy();
    expect(screen.getByRole("button", { name: "复制命令" })).toBeTruthy();
    const workflow = screen.getByLabelText("录屏素材流程");
    expect(workflow).toBeTruthy();
    expect(workflow.textContent).toContain("复制命令");
    expect(workflow.textContent).toContain("运行 QA");
    expect(workflow.textContent).toContain("刷新素材");
    expect(workflow.textContent).toContain("打开索引");
    expect(screen.getByRole("link", { name: /打开总索引/ }).getAttribute("href")).toBe("/api/recording-assets/index");
    expect(screen.queryByLabelText("录屏讲解轨道")).toBeNull();
    expect(screen.queryByLabelText("当前镜头建议")).toBeNull();
    expect(screen.queryByLabelText("系列章节提示")).toBeNull();
    expect(screen.queryByText("讲解轨道已打开")).toBeNull();
  });

  it("switches the 16:9 recording view to the coastal demo roadbook", async () => {
    render(<StudioMode />);

    fireEvent.click(screen.getByRole("button", { name: /海岸/ }));

    expect(screen.getByText("三亚海岛 本地演示")).toBeTruthy();
    expect(screen.getByText("三亚海岸 4 天梦境路书")).toBeTruthy();
    expect(screen.getByDisplayValue("三亚海岛")).toBeTruthy();
    expect(screen.getByDisplayValue("三亚")).toBeTruthy();
    expect(await screen.findByText("15 个素材包")).toBeTruthy();
  });

  it("refreshes the local recording asset summary without reloading Studio", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => recordingAssetsResponse(15),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => recordingAssetsResponse(16, "Dream coastal visual pack"),
      });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));

    expect(await screen.findByText("16 个素材包")).toBeTruthy();
    expect(screen.getAllByText("Dream coastal visual pack").length).toBeGreaterThan(0);
    expect(screen.getByText("云南大理 / 三亚海岛")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows the exact recording suite command when the local index is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => recordingAssetsResponse(0, "Studio 16:9 demo pack", false),
      })) as unknown as typeof fetch,
    );

    render(<StudioMode />);

    expect(await screen.findByText("0 个素材包")).toBeTruthy();
    expect(screen.getByLabelText("录屏素材状态").textContent).toContain("等待生成索引");
    expect(screen.getByLabelText("录屏素材状态").textContent).toContain("先跑 recording suite");
    expect(screen.getByLabelText("最新素材包摘要").textContent).toContain("暂无最新素材");
    expect(screen.getByLabelText("最新素材包摘要").textContent).toContain("先运行 recording suite");
    expect(screen.getByText("Dream 0")).toBeTruthy();
    expect(screen.getByText("Studio 0")).toBeTruthy();
    expect(screen.getByText("生成本地素材索引")).toBeTruthy();
    expect(screen.getByText("npm run check:recording-suite")).toBeTruthy();
    expect(screen.getByRole("button", { name: "刷新" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /打开总索引/ })).toBeNull();
  });

  it("toggles a compact recording script track for walkthrough capture", async () => {
    render(<StudioMode />);

    fireEvent.click(screen.getByRole("button", { name: /脚本模式/ }));

    expect(await screen.findByLabelText("录屏讲解轨道")).toBeTruthy();
    expect(screen.getByLabelText("当前镜头建议").textContent).toContain("输入区 → 路书预览 → 素材资产");
    expect(screen.getByLabelText("当前镜头建议").textContent).toContain("可复用的 Agent 素材流水线");
    expect(screen.getByLabelText("系列章节提示").textContent).toContain("01 · 录屏台成型");
    expect(screen.getByLabelText("系列章节提示").textContent).toContain("02 · 素材管线可视化");
    expect(screen.getByLabelText("系列章节提示").textContent).toContain("03 · Agent 产品化");
    expect(screen.getByText("输入需求")).toBeTruthy();
    expect(screen.getByText("生成路书")).toBeTruthy();
    expect(screen.getByText("沉淀素材")).toBeTruthy();
    expect(screen.getByText("讲解轨道已打开")).toBeTruthy();
    expect(screen.getByRole("button", { name: /脚本模式/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("copies the local recording suite command for screen-recorded workflow demos", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "复制命令" }));

    expect(writeText).toHaveBeenCalledWith("npm run check:recording-suite");
    expect(await screen.findByText("录屏套件命令已复制")).toBeTruthy();
    expect(screen.getByRole("button", { name: "已复制" })).toBeTruthy();
  });
});
