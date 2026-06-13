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

function recordingAssetsResponse(packCount: number, title = "Studio 16:9 demo pack") {
  return {
    ok: true,
    packCount,
    indexAvailable: true,
    indexUrl: "/api/recording-assets/index",
    recentPacks: [
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
    ],
    latestPack: {
      title,
      createdAt: "2026-06-13T05:46:30.958Z",
      label: "/studio recording QA",
    },
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
    expect(screen.getByLabelText("最近素材包")).toBeTruthy();
    expect(screen.getByText("Studio QA")).toBeTruthy();
    expect(screen.getByText("Dream QA")).toBeTruthy();
    expect(screen.getByText("讲解画面")).toBeTruthy();
    expect(screen.getByText("产品画面")).toBeTruthy();
    expect(screen.getAllByText("Dream coastal visual pack")[0]).toBeTruthy();
    expect(screen.getByRole("link", { name: /打开总索引/ }).getAttribute("href")).toBe("/api/recording-assets/index");
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
});
