// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { StudioMode } from "./studio-mode";

const readyProofStoryDeliveryLine =
  "Proof Story Delivery · Proof Story · 脚本路径: 就绪 · Studio QA: 已捕获 · 索引入库: 已入库 · Index QA: 已验证 · Production Assets · HTML + Clip 已入库 · QA receipt: index-checks/index-check-latest/clip-notes.md";
const proofStoryHandoffCaption = "Vibe Coding 不是只生成页面，而是把路书、QA 证据和后期素材交付打成闭环。";
const readyProofStoryHandoffLine =
  `Proof Story Handoff · ${readyProofStoryDeliveryLine} · QA notes: index-checks/index-check-latest/clip-notes.md · Caption: ${proofStoryHandoffCaption}`;
const readyProofStoryCompleteLine =
  "Proof Story Complete · Delivery 已入库 · Handoff 已复制 · QA 收据就绪";

function recordingAssetsResponse(
  packCount: number,
  title = "Studio 16:9 demo pack",
  indexAvailable = true,
  options: {
    indexLinkCount?: number;
    productionAssets?: {
      scriptMaterialReady?: boolean;
      htmlIndexReady?: boolean;
      clipIndexReady?: boolean;
      ready?: boolean;
    };
    omitIndexNotes?: boolean;
    proofStoryDeliveryLine?: string;
    omitHandoffQa?: boolean;
    handoffCopyState?: string;
    omitCompleteQa?: boolean;
    completeLine?: string;
    omitIndexCompleteQa?: boolean;
    indexCompleteLine?: string;
  } = {},
) {
  const indexLinkCount = options.indexLinkCount ?? 6;
  const defaultProofStoryDeliveryLine = packCount && indexLinkCount >= 6 && !options.omitIndexNotes ? readyProofStoryDeliveryLine : "";
  const defaultProofStoryCompleteLine =
    packCount && indexLinkCount >= 6 && !options.omitIndexCompleteQa ? options.indexCompleteLine || readyProofStoryCompleteLine : "";
  const defaultProductionAssets = {
    scriptMaterialReady: Boolean(packCount),
    htmlIndexReady: Boolean(packCount && indexAvailable),
    clipIndexReady: Boolean(packCount && indexAvailable),
    ready: Boolean(packCount && indexAvailable),
  };
  return {
    ok: true,
    packCount,
    countsByType: packCount ? { dream: 12, studio: 3, bridge: 1 } : { dream: 0, studio: 0, bridge: 0 },
    indexAvailable,
    indexUrl: indexAvailable ? "/api/recording-assets/index" : "",
    lensComparisonUrl: "/api/recording-assets/lens-comparison",
    latestCandidateHandoff: packCount
      ? {
          id: "candidate-latest",
          createdAt: "2026-06-13T05:47:00.000Z",
          captureCount: 3,
          summaryPath: "candidate-handoff-checks/candidate-latest/summary.json",
          notesPath: "candidate-handoff-checks/candidate-latest/clip-notes.md",
        }
      : null,
    latestDreamVisualProof: packCount
      ? {
          id: "dream-proof-latest",
          createdAt: "2026-06-13T05:48:00.000Z",
          finalCueLabel: "Proof",
          finalCueValue: "3/5 ready",
          buttonTextAfterPlayback: "播放视觉证据",
          cueLabels: ["Terrain", "Skyline", "AI Asset", "Route", "Proof"],
          screenshotPath: "visual-checks/dream-proof-latest/dream-dali-visual-proof-playback.png",
          summaryPath: "visual-checks/dream-proof-latest/summary.json",
          notesPath: "visual-checks/dream-proof-latest/clip-notes.md",
        }
      : null,
    latestRecordingIndexCheck: packCount
      ? {
          id: "index-check-latest",
          createdAt: "2026-06-13T05:49:00.000Z",
          finalCueLabel: "Proof",
          finalCueValue: "3/5 ready",
          linkCount: indexLinkCount,
          proofChecks:
            indexLinkCount >= 6
              ? [
                  {
                    proofId: "dream",
                    label: "Dream Proof",
                    checkedLinkCount: 3,
                    expectedLinkCount: 3,
                    screenshotPath: "index-checks/index-check-latest/recording-index-dream-proof.png",
                  },
                  {
                    proofId: "studio",
                    label: "Studio Proof",
                    checkedLinkCount: 3,
                    expectedLinkCount: 3,
                    screenshotPath: "index-checks/index-check-latest/recording-index-studio-proof.png",
                  },
                ]
              : [],
          proofText:
            indexLinkCount >= 6
              ? "Dream Proof · Proof · 3/5 ready\nStudio Proof · Suite Run · 7 步 · 7 通过"
              : "Dream Proof · Proof · 3/5 ready",
          apiIndexUrl: "http://localhost:3000/api/recording-assets/index",
          screenshotPath: "index-checks/index-check-latest/recording-index-dream-proof.png",
          scriptMaterialCheck:
            indexLinkCount >= 6
              ? {
                  proofId: "script-material",
                  label: "Proof Story Script Material",
                  checkedLinkCount: 3,
                  expectedLinkCount: 3,
                  screenshotPath: "index-checks/index-check-latest/recording-index-script-material-proof.png",
                  summaryPath: "index-checks/index-check-latest/summary.json",
                }
              : null,
          proofStoryDeliveryLine: options.proofStoryDeliveryLine ?? defaultProofStoryDeliveryLine,
          proofStoryCompleteLine: defaultProofStoryCompleteLine,
          summaryPath: "index-checks/index-check-latest/summary.json",
          notesPath: options.omitIndexNotes ? undefined : "index-checks/index-check-latest/clip-notes.md",
        }
      : null,
    latestRecordingSuiteRun: packCount
      ? {
          id: "suite-run-latest",
          createdAt: "2026-06-13T05:50:00.000Z",
          status: "passed",
          stepCount: 7,
          passedStepCount: 7,
          durationMs: 107000,
          failureMessage: "",
          summaryPath: "suite-runs/suite-run-latest/summary.json",
          notesPath: "suite-runs/suite-run-latest/clip-notes.md",
        }
      : null,
    latestStudioProofPlayback: packCount
      ? {
          id: "studio-proof-latest",
          createdAt: "2026-06-13T05:51:00.000Z",
          finalCueLabel: "Suite Run",
          finalCueState: "已通过",
          finalCueDetail: "7 步 · 7 通过",
          buttonTextAfterPlayback: "播放证据线",
          cueLabels: ["Bridge QA", "Candidate QA", "Lens Compare", "Asset Index", "Index QA", "Suite Run"],
          screenshotPath: "studio-checks/studio-proof-latest/studio-suite-run-proof.png",
          summaryPath: "studio-checks/studio-proof-latest/summary.json",
          notesPath: "studio-checks/studio-proof-latest/clip-notes.md",
          scriptMaterial: {
            visible: true,
            scriptPath: "docs/recording/proof-story-demo-script.md",
            cue: "证据时间线 → 四行讲解稿预览 → 复制讲解稿",
            buttonText: "复制脚本路径",
            ...(options.omitHandoffQa
              ? {}
              : {
                  handoffPreview: readyProofStoryHandoffLine,
                  handoffCopyState: options.handoffCopyState || "Handoff 已复制",
                }),
            ...(options.omitCompleteQa
              ? {}
              : {
                  completeLine: options.completeLine || readyProofStoryCompleteLine,
                }),
            screenshotPath: "studio-checks/studio-proof-latest/studio-proof-story-script-material.png",
          },
        }
      : null,
    proofStoryProductionAssets: {
      ...defaultProductionAssets,
      ...options.productionAssets,
    },
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
            type: "bridge",
            id: "bridge-latest",
            title: "Studio-Dream bridge QA pack",
            createdAt: "2026-06-13T05:46:25.000Z",
            label: "/studio ↔ /dream handoff QA",
            detail: "云南大理 / 三亚海岛 round trips",
          },
          {
            type: "dream",
            id: "dream-coast",
            title: "Dream low-skyline lens visual pack",
            createdAt: "2026-06-13T05:46:20.615Z",
            label: "/dream visual QA",
            detail: "dali · 4 day screenshots · motion verified · low-skyline lens",
            lens: "low-skyline lens",
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
  vi.useRealTimers();
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
    expect(screen.getByText("Bridge 1")).toBeTruthy();
    expect(screen.getByLabelText("素材剪辑标签").textContent).toContain("产品画面 · 12");
    expect(screen.getByLabelText("素材剪辑标签").textContent).toContain("讲解画面 · 3");
    expect(screen.getByLabelText("素材剪辑标签").textContent).toContain("桥接验证 · 1");
    const evidenceTimeline = screen.getByLabelText("录屏证据时间线");
    const evidenceTimelineText = evidenceTimeline.textContent || "";
    const evidenceTimelineSteps = Array.from(evidenceTimeline.children).map((element) => element.textContent || "");
    expect(evidenceTimelineSteps[0]).toContain("Dream Proof");
    expect(evidenceTimelineSteps[1]).toContain("Studio Proof");
    expect(evidenceTimelineSteps[2]).toContain("Index QA");
    expect(evidenceTimelineSteps[3]).toContain("Suite Run");
    expect(evidenceTimelineText).toContain("Proof · 3/5 ready");
    expect(evidenceTimelineText).toContain("Suite Run · 7 步 · 7 通过");
    expect(evidenceTimelineText).toContain("Dream + Studio 双证据 · 6 条链接");
    expect(evidenceTimelineText).toContain("7 步 · 7 通过");
    const storyPreview = screen.getByLabelText("证据讲解稿预览");
    expect(storyPreview.textContent).toContain("01. Dream Proof: 已验证 · Proof · 3/5 ready");
    expect(storyPreview.textContent).toContain("02. Studio Proof: 已捕获 · Suite Run · 7 步 · 7 通过");
    expect(storyPreview.textContent).toContain("03. Index QA: 已验证 · Dream + Studio 双证据 · 6 条链接");
    expect(storyPreview.textContent).toContain("04. Suite Run: 已通过 · 7 步 · 7 通过");
    const scriptCard = screen.getByLabelText("Proof Story 脚本素材");
    expect(scriptCard.textContent).toContain("docs/recording/proof-story-demo-script.md");
    expect(scriptCard.textContent).toContain("证据时间线 → 四行讲解稿预览 → 复制讲解稿");
    expect(scriptCard.textContent).toContain("QA 已捕获 · 复制脚本路径");
    expect(scriptCard.textContent).toContain("Index QA 已验证脚本素材 · 3/3");
    expect(screen.getByLabelText("Proof Story Production Assets 状态").textContent).toBe("Production Assets · HTML + Clip 已入库");
    expect(screen.getByLabelText("Proof Story Delivery 预览").textContent).toBe(readyProofStoryDeliveryLine);
    expect(screen.getByLabelText("Proof Story Delivery QA notes 状态").textContent).toBe("Delivery 已入库");
    expect(screen.getByLabelText("Proof Story Handoff 预览").textContent).toBe(readyProofStoryHandoffLine);
    expect(screen.getByLabelText("Proof Story Handoff QA 状态").textContent).toBe("Handoff 已复制");
    expect(screen.getByLabelText("Proof Story Complete 状态").textContent).toContain(
      "Proof Story Complete · Delivery 已入库 · Handoff 已复制 · QA 收据就绪",
    );
    expect(screen.getByLabelText("Proof Story Complete QA notes 状态").textContent).toBe("Complete 已入库");
    expect(screen.getByLabelText("Proof Story Index Complete 状态").textContent).toBe("Index Complete 已验证");
    expect(screen.getByLabelText("Proof Story Complete Bundle 预览").textContent).toContain("Proof Story Complete Bundle");
    expect(screen.getByLabelText("Proof Story Complete Bundle 预览").textContent).toContain("Index Complete: Index Complete 已验证");
    expect(within(scriptCard).getByRole("link", { name: "Production Assets QA 收据" }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=index-checks%2Findex-check-latest%2Fclip-notes.md",
    );
    expect(within(scriptCard).getByRole("link", { name: "QA 已捕获 · 复制脚本路径" }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=studio-checks%2Fstudio-proof-latest%2Fstudio-proof-story-script-material.png",
    );
    expect(within(scriptCard).getByRole("link", { name: "Index QA 已验证脚本素材 · 3/3" }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=index-checks%2Findex-check-latest%2Frecording-index-script-material-proof.png",
    );
    const closeout = screen.getByLabelText("Proof Story 收口清单");
    expect(closeout.textContent).toContain("脚本路径就绪");
    expect(closeout.textContent).toContain("Studio QA已捕获");
    expect(closeout.textContent).toContain("索引入库已入库");
    expect(closeout.textContent).toContain("Index QA已验证");
    expect(screen.getByLabelText("Proof Story 收口状态预览").textContent).toBe(
      "Proof Story · 脚本路径: 就绪 · Studio QA: 已捕获 · 索引入库: 已入库 · Index QA: 已验证",
    );
    expect(within(evidenceTimeline).getByRole("link", { name: /Dream Proof/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=visual-checks%2Fdream-proof-latest%2Fsummary.json",
    );
    expect(within(evidenceTimeline).getByRole("link", { name: /Studio Proof/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=studio-checks%2Fstudio-proof-latest%2Fsummary.json",
    );
    expect(within(evidenceTimeline).getByRole("link", { name: /Index QA/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=index-checks%2Findex-check-latest%2Fsummary.json",
    );
    expect(evidenceTimeline.children[3].getAttribute("href")).toBe(
      "/api/recording-assets/file?path=suite-runs%2Fsuite-run-latest%2Fsummary.json",
    );
    expect(screen.getByLabelText("最近素材包")).toBeTruthy();
    expect(screen.getAllByText("Studio QA").length).toBeGreaterThan(0);
    expect(screen.getByText("Bridge QA")).toBeTruthy();
    expect(screen.getByText("Dream QA")).toBeTruthy();
    expect(screen.getByText("讲解画面")).toBeTruthy();
    expect(screen.getByText("桥接验证")).toBeTruthy();
    expect(screen.getByText("产品画面")).toBeTruthy();
    expect(screen.getByText("Studio-Dream bridge QA pack")).toBeTruthy();
    expect(screen.getByLabelText("最新素材包摘要").textContent).toContain("最新素材");
    expect(screen.getByLabelText("最新素材包摘要").textContent).toContain("Studio 16:9 demo pack");
    expect(screen.getByLabelText("最新素材包摘要").textContent).toContain("/studio recording QA");
    expect(screen.getByLabelText("候选点击 QA 状态").textContent).toContain("候选跳转已验证");
    expect(screen.getByLabelText("候选点击 QA 状态").textContent).toContain("3 个入口");
    expect(screen.getByLabelText("候选点击 QA 状态").textContent).toContain("candidate-handoff-checks/candidate-latest/summary.json");
    expect(screen.getByLabelText("Dream visual proof QA 状态").textContent).toContain("视觉证据线已验证");
    expect(screen.getByLabelText("Dream visual proof QA 状态").textContent).toContain("Proof · 3/5 ready");
    expect(screen.getByLabelText("Dream visual proof QA 状态").textContent).toContain("visual-checks/dream-proof-latest/dream-dali-visual-proof-playback.png");
    expect(within(screen.getByLabelText("Dream visual proof QA 状态")).getByRole("link", { name: /播放截图/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=visual-checks%2Fdream-proof-latest%2Fdream-dali-visual-proof-playback.png",
    );
    expect(within(screen.getByLabelText("Dream visual proof QA 状态")).getByRole("link", { name: /summary/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=visual-checks%2Fdream-proof-latest%2Fsummary.json",
    );
    expect(within(screen.getByLabelText("Dream visual proof QA 状态")).getByRole("link", { name: /notes/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=visual-checks%2Fdream-proof-latest%2Fclip-notes.md",
    );
    expect(screen.getByLabelText("Recording Index QA 状态").textContent).toContain("素材总索引已验证");
    expect(screen.getByLabelText("Recording Index QA 状态").textContent).toContain("Dream + Studio 双证据 · Proof · 3/5 ready · 6 条证据链接");
    expect(within(screen.getByLabelText("Recording Index QA 状态")).getByLabelText("Index QA proof checks").textContent).toContain("Dream 3/3");
    expect(within(screen.getByLabelText("Recording Index QA 状态")).getByLabelText("Index QA proof checks").textContent).toContain("Studio 3/3");
    expect(screen.getByLabelText("Recording Index QA 状态").textContent).toContain("Index QA");
    expect(within(screen.getByLabelText("Recording Index QA 状态")).getByRole("link", { name: /索引截图/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=index-checks%2Findex-check-latest%2Frecording-index-dream-proof.png",
    );
    expect(within(screen.getByLabelText("Recording Index QA 状态")).getByRole("link", { name: /summary/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=index-checks%2Findex-check-latest%2Fsummary.json",
    );
    expect(within(screen.getByLabelText("Recording Index QA 状态")).getByRole("link", { name: /notes/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=index-checks%2Findex-check-latest%2Fclip-notes.md",
    );
    expect(screen.getByLabelText("Recording Suite 状态").textContent).toContain("Full suite 已通过");
    expect(screen.getByLabelText("Recording Suite 状态").textContent).toContain("7 步 · 7 通过 · 1m 47s");
    expect(within(screen.getByLabelText("Recording Suite 状态")).getByRole("link", { name: /suite summary/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=suite-runs%2Fsuite-run-latest%2Fsummary.json",
    );
    expect(within(screen.getByLabelText("Recording Suite 状态")).getByRole("link", { name: /notes/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=suite-runs%2Fsuite-run-latest%2Fclip-notes.md",
    );
    expect(screen.getByLabelText("Studio proof playback QA 状态").textContent).toContain("证据播放已捕获");
    expect(screen.getByLabelText("Studio proof playback QA 状态").textContent).toContain("Suite Run · 7 步 · 7 通过");
    expect(screen.getByLabelText("Studio proof playback QA 状态").textContent).toContain("studio-checks/studio-proof-latest/studio-suite-run-proof.png");
    expect(within(screen.getByLabelText("Studio proof playback QA 状态")).getByRole("link", { name: /播放截图/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=studio-checks%2Fstudio-proof-latest%2Fstudio-suite-run-proof.png",
    );
    expect(within(screen.getByLabelText("Studio proof playback QA 状态")).getByRole("link", { name: /summary/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=studio-checks%2Fstudio-proof-latest%2Fsummary.json",
    );
    expect(within(screen.getByLabelText("Studio proof playback QA 状态")).getByRole("link", { name: /notes/ }).getAttribute("href")).toBe(
      "/api/recording-assets/file?path=studio-checks%2Fstudio-proof-latest%2Fclip-notes.md",
    );
    expect(screen.getAllByText("Dream low-skyline lens visual pack")[0]).toBeTruthy();
    expect(screen.getAllByText("low-skyline lens").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "复制命令" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "复制候选 QA" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /梦境路书/ }).getAttribute("href")).toBe("/dream?demo=dali");
    expect(screen.getByLabelText("Demo Bridge").textContent).toContain("云南大理 → Dream");
    expect(screen.getByLabelText("Demo Bridge").textContent).toContain("Recording suite 已覆盖");
    expect(within(screen.getByLabelText("Demo Bridge")).getByRole("link", { name: /打开同款梦境预览/ }).getAttribute("href")).toBe("/dream?demo=dali");
    const workflow = screen.getByLabelText("录屏素材流程");
    expect(workflow).toBeTruthy();
    expect(workflow.textContent).toContain("复制命令");
    expect(workflow.textContent).toContain("运行 QA");
    expect(workflow.textContent).toContain("刷新素材");
    expect(workflow.textContent).toContain("打开索引");
    expect(workflow.textContent).toContain("候选 QA");
    expect(workflow.textContent).toContain("验证 Top shots 是否带着 rank / day / lens 进入 Dream。");
    expect(workflow.textContent).toContain("桥接证据");
    expect(workflow.textContent).toContain("用 Bridge QA 状态卡证明页面闭环。");
    expect(screen.getByRole("link", { name: /打开总索引/ }).getAttribute("href")).toBe("/api/recording-assets/index");
    expect(screen.getByRole("link", { name: /镜头对比/ }).getAttribute("href")).toBe("/api/recording-assets/lens-comparison");
    expect(screen.queryByLabelText("录屏讲解轨道")).toBeNull();
    expect(screen.queryByLabelText("当前镜头建议")).toBeNull();
    expect(screen.queryByLabelText("系列章节提示")).toBeNull();
    expect(screen.queryByLabelText("录屏证据清单")).toBeNull();
    expect(screen.queryByText("讲解轨道已打开")).toBeNull();
  });

  it("shows which Production Assets index is still pending in the Proof Story card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () =>
          recordingAssetsResponse(15, "Studio 16:9 demo pack", true, {
            productionAssets: {
              scriptMaterialReady: true,
              htmlIndexReady: true,
              clipIndexReady: false,
              ready: false,
            },
          }),
      })) as unknown as typeof fetch,
    );

    render(<StudioMode />);

    expect((await screen.findByLabelText("Proof Story Production Assets 状态")).textContent).toBe(
      "Production Assets · HTML 已入库 · Clip 待入库",
    );
    expect(screen.queryByRole("link", { name: "Production Assets QA 收据" })).toBeNull();
    expect(screen.queryByRole("button", { name: "复制 Production Assets QA 收据路径" })).toBeNull();
  });

  it("hides the Production Assets QA receipt link when the latest index check has no clip notes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () =>
          recordingAssetsResponse(15, "Studio 16:9 demo pack", true, {
            omitIndexNotes: true,
          }),
      })) as unknown as typeof fetch,
    );

    render(<StudioMode />);

    expect(await screen.findByLabelText("Proof Story Production Assets 状态")).toBeTruthy();
    expect(screen.getByLabelText("Proof Story Delivery 预览").textContent).toContain("QA receipt: 待生成");
    expect(screen.getByLabelText("Proof Story Handoff 预览").textContent).toContain("QA notes: 待生成");
    expect(screen.getByLabelText("Proof Story Delivery QA notes 状态").textContent).toBe("Delivery 待入库");
    expect(screen.queryByRole("link", { name: "Production Assets QA 收据" })).toBeNull();
    expect(screen.queryByRole("button", { name: "复制 Production Assets QA 收据路径" })).toBeNull();
  });

  it("shows a pending Delivery notes state when the latest QA notes lack the Delivery line", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () =>
          recordingAssetsResponse(15, "Studio 16:9 demo pack", true, {
            proofStoryDeliveryLine: "",
          }),
      })) as unknown as typeof fetch,
    );

    render(<StudioMode />);

    expect((await screen.findByLabelText("Proof Story Delivery 预览")).textContent).toBe(readyProofStoryDeliveryLine);
    expect(screen.getByLabelText("Proof Story Delivery QA notes 状态").textContent).toBe("Delivery 待入库");
  });

  it("shows a pending Handoff QA state for older Studio QA packs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () =>
          recordingAssetsResponse(15, "Studio 16:9 demo pack", true, {
            omitHandoffQa: true,
          }),
      })) as unknown as typeof fetch,
    );

    render(<StudioMode />);

    expect(await screen.findByLabelText("Proof Story Handoff 预览")).toBeTruthy();
    expect(screen.getByLabelText("Proof Story Handoff QA 状态").textContent).toBe("Handoff 待验证");
  });

  it("shows a pending Proof Story Complete strip when final proof pieces are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () =>
          recordingAssetsResponse(15, "Studio 16:9 demo pack", true, {
            omitIndexNotes: true,
            omitHandoffQa: true,
          }),
      })) as unknown as typeof fetch,
    );

    render(<StudioMode />);

    const completeStrip = await screen.findByLabelText("Proof Story Complete 状态");
    expect(completeStrip.textContent).toContain("Proof Story Pending");
    expect(completeStrip.textContent).toContain("Delivery 待入库");
    expect(completeStrip.textContent).toContain("Handoff 待验证");
    expect(completeStrip.textContent).toContain("QA 收据待生成");
    expect(screen.getByLabelText("Proof Story Complete QA notes 状态").textContent).toBe("Complete 待同步");
    expect(screen.getByLabelText("Proof Story Index Complete 状态").textContent).toBe("Index Complete 待同步");
  });

  it("shows a pending Complete archive state for older Studio QA packs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () =>
          recordingAssetsResponse(15, "Studio 16:9 demo pack", true, {
            omitCompleteQa: true,
          }),
      })) as unknown as typeof fetch,
    );

    render(<StudioMode />);

    expect(await screen.findByLabelText("Proof Story Complete 状态")).toBeTruthy();
    expect(screen.getByLabelText("Proof Story Complete QA notes 状态").textContent).toBe("Complete 待入库");
    expect(screen.getByLabelText("Proof Story Index Complete 状态").textContent).toBe("Index Complete 已验证");
  });

  it("shows a pending Index Complete state for older index QA packs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () =>
          recordingAssetsResponse(15, "Studio 16:9 demo pack", true, {
            omitIndexCompleteQa: true,
          }),
      })) as unknown as typeof fetch,
    );

    render(<StudioMode />);

    expect(await screen.findByLabelText("Proof Story Complete 状态")).toBeTruthy();
    expect(screen.getByLabelText("Proof Story Complete QA notes 状态").textContent).toBe("Complete 已入库");
    expect(screen.getByLabelText("Proof Story Index Complete 状态").textContent).toBe("Index Complete 待验证");
  });

  it("keeps legacy Dream-only wording for older 3-link recording index checks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => recordingAssetsResponse(15, "Studio 16:9 demo pack", true, { indexLinkCount: 3 }),
      })) as unknown as typeof fetch,
    );

    render(<StudioMode />);

    const indexCard = await screen.findByLabelText("Recording Index QA 状态");
    expect(indexCard.textContent).toContain("Dream 单证据 · Proof · 3/5 ready · 3 条证据链接");
    expect(indexCard.textContent).not.toContain("Dream + Studio 双证据");
    expect(within(indexCard).queryByLabelText("Index QA proof checks")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /脚本模式/ }));
    const proofChecklist = await screen.findByLabelText("录屏证据清单");
    expect(proofChecklist.textContent).toContain("Dream 单证据 · 3 条证据链接");
    expect(proofChecklist.textContent).not.toContain("Dream + Studio 双证据 · 6 条链接");
    expect(within(proofChecklist).getByRole("link", { name: /Dream 单证据 · 3 条证据链接/ }).getAttribute("href")).toBe(
      "index-checks/index-check-latest/summary.json",
    );
  });

  it("switches the 16:9 recording view to the coastal demo roadbook", async () => {
    render(<StudioMode />);

    fireEvent.click(screen.getByRole("button", { name: /海岸/ }));

    expect(screen.getByText("三亚海岛 本地演示")).toBeTruthy();
    expect(screen.getByText("三亚海岸 4 天梦境路书")).toBeTruthy();
    expect(screen.getByDisplayValue("三亚海岛")).toBeTruthy();
    expect(screen.getByDisplayValue("三亚")).toBeTruthy();
    expect(screen.getByRole("link", { name: /梦境路书/ }).getAttribute("href")).toBe("/dream?demo=coast");
    expect(screen.getByLabelText("Demo Bridge").textContent).toContain("三亚海岛 → Dream");
    expect(within(screen.getByLabelText("Demo Bridge")).getByRole("link", { name: /打开同款梦境预览/ }).getAttribute("href")).toBe("/dream?demo=coast");
    expect(await screen.findByText("15 个素材包")).toBeTruthy();
  });

  it("can initialize directly into the coastal demo from the dream handoff", async () => {
    render(<StudioMode initialDemo="coast" />);

    expect(screen.getByText("三亚海岛 本地演示")).toBeTruthy();
    expect(screen.getByText("三亚海岸 4 天梦境路书")).toBeTruthy();
    expect(screen.getByDisplayValue("三亚海岛")).toBeTruthy();
    expect(screen.getByRole("link", { name: /梦境路书/ }).getAttribute("href")).toBe("/dream?demo=coast");
    expect(await screen.findByText("15 个素材包")).toBeTruthy();
  });

  it("falls back to the Dali demo for unknown dream handoff values", async () => {
    render(<StudioMode initialDemo="unknown" />);

    expect(screen.getByText("云南大理 本地演示")).toBeTruthy();
    expect(screen.getByDisplayValue("云南大理")).toBeTruthy();
    expect(screen.getByRole("link", { name: /梦境路书/ }).getAttribute("href")).toBe("/dream?demo=dali");
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
    expect(screen.getByLabelText("候选点击 QA 状态").textContent).toContain("等待候选点击 QA");
    expect(screen.getByLabelText("候选点击 QA 状态").textContent).toContain("npm run check:lens-candidate-handoff");
    expect(screen.getByLabelText("Dream visual proof QA 状态").textContent).toContain("等待视觉证据 QA");
    expect(screen.getByLabelText("Dream visual proof QA 状态").textContent).toContain("npm run check:dream-visuals");
    expect(screen.getByLabelText("Recording Index QA 状态").textContent).toContain("等待素材索引 QA");
    expect(screen.getByLabelText("Recording Index QA 状态").textContent).toContain("npm run check:recording-index");
    expect(screen.getByLabelText("Recording Suite 状态").textContent).toContain("等待 full suite");
    expect(screen.getByLabelText("Recording Suite 状态").textContent).toContain("npm run check:recording-suite");
    expect(screen.getByLabelText("Studio proof playback QA 状态").textContent).toContain("等待 Studio QA 捕获");
    expect(screen.getByLabelText("Studio proof playback QA 状态").textContent).toContain("npm run check:studio-visuals");
    expect(screen.getByLabelText("录屏证据时间线").textContent).toContain("npm run check:dream-visuals");
    expect(screen.getByLabelText("录屏证据时间线").textContent).toContain("npm run check:studio-visuals");
    expect(screen.getByLabelText("录屏证据时间线").textContent).toContain("npm run check:recording-index");
    expect(screen.getByLabelText("录屏证据时间线").textContent).toContain("npm run check:recording-suite");
    expect(screen.getByLabelText("证据讲解稿预览").textContent).toContain("01. Dream Proof: 待运行 · npm run check:dream-visuals");
    expect(screen.getByLabelText("证据讲解稿预览").textContent).toContain("02. Studio Proof: 待运行 · npm run check:studio-visuals");
    expect(screen.getByLabelText("证据讲解稿预览").textContent).toContain("03. Index QA: 待运行 · npm run check:recording-index");
    expect(screen.getByLabelText("证据讲解稿预览").textContent).toContain("04. Suite Run: 待运行 · npm run check:recording-suite");
    expect(screen.getByLabelText("Proof Story 脚本素材").textContent).toContain("QA 待捕获 · npm run check:studio-visuals");
    expect(screen.getByLabelText("Proof Story 脚本素材").textContent).toContain("Index QA 待验证脚本素材 · npm run check:recording-index");
    expect(screen.getByLabelText("Proof Story Production Assets 状态").textContent).toBe("Production Assets · 等待脚本素材");
    expect(screen.queryByRole("link", { name: "Production Assets QA 收据" })).toBeNull();
    expect(screen.queryByRole("button", { name: "复制 Production Assets QA 收据路径" })).toBeNull();
    const closeout = screen.getByLabelText("Proof Story 收口清单");
    expect(closeout.textContent).toContain("脚本路径就绪");
    expect(closeout.textContent).toContain("Studio QA待捕获");
    expect(closeout.textContent).toContain("索引入库待入库");
    expect(closeout.textContent).toContain("Index QA待验证");
    expect(screen.getByLabelText("Proof Story 收口状态预览").textContent).toBe(
      "Proof Story · 脚本路径: 就绪 · Studio QA: 待捕获 · 索引入库: 待入库 · Index QA: 待验证",
    );
    expect(screen.getByText("Dream 0")).toBeTruthy();
    expect(screen.getByText("Studio 0")).toBeTruthy();
    expect(screen.getByText("生成本地素材索引")).toBeTruthy();
    expect(screen.getAllByText("npm run check:recording-suite").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "刷新" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /打开总索引/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /脚本模式/ }));
    const proofChecklist = await screen.findByLabelText("录屏证据清单");
    expect(proofChecklist.textContent).toContain("Suite Run");
    expect(proofChecklist.textContent).toContain("npm run check:recording-suite");
  });

  it("toggles a compact recording script track for walkthrough capture", async () => {
    render(<StudioMode />);

    fireEvent.click(screen.getByRole("button", { name: /脚本模式/ }));

    expect(await screen.findByLabelText("录屏讲解轨道")).toBeTruthy();
    expect(screen.getByLabelText("当前镜头建议").textContent).toContain("输入区 → 路书预览 → 素材资产 → 桥接证据");
    expect(screen.getByLabelText("当前镜头建议").textContent).toContain("可复用的 Agent 素材流水线和页面闭环证据");
    expect(screen.getByLabelText("系列章节提示").textContent).toContain("01 · 录屏台成型");
    expect(screen.getByLabelText("系列章节提示").textContent).toContain("02 · 素材管线可视化");
    expect(screen.getByLabelText("系列章节提示").textContent).toContain("03 · Agent 产品化");
    expect(screen.getByLabelText("系列章节提示").textContent).toContain("04 · 桥接证据");
    expect(screen.getByText("输入需求")).toBeTruthy();
    expect(screen.getByText("生成路书")).toBeTruthy();
    expect(screen.getByText("沉淀素材")).toBeTruthy();
    expect(screen.getAllByText("桥接证据").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("指向 Bridge QA 卡片，说明 Studio 和 Dream 的闭环已验证。")).toBeTruthy();
    expect(screen.getByLabelText("Bridge QA 证据状态").textContent).toContain("1 个桥接素材");
    expect(screen.getByLabelText("Bridge QA 证据状态").textContent).toContain("Studio-Dream 闭环已验证");
    const proofChecklist = screen.getByLabelText("录屏证据清单");
    expect(proofChecklist.textContent).toContain("Proof Stack");
    expect(proofChecklist.textContent).toContain("录屏证据清单");
    expect(proofChecklist.textContent).toContain("Bridge QA");
    expect(proofChecklist.textContent).toContain("1 个桥接素材");
    expect(proofChecklist.textContent).toContain("Candidate QA");
    expect(proofChecklist.textContent).toContain("3 个入口");
    expect(proofChecklist.textContent).toContain("Lens Compare");
    expect(proofChecklist.textContent).toContain("镜头候选对比");
    expect(proofChecklist.textContent).toContain("Asset Index");
    expect(proofChecklist.textContent).toContain("15 个素材包");
    expect(proofChecklist.textContent).toContain("Index QA");
    expect(proofChecklist.textContent).toContain("Dream + Studio 双证据 · 6 条链接");
    expect(proofChecklist.textContent).toContain("Suite Run");
    expect(proofChecklist.textContent).toContain("7 步 · 7 通过");
    expect(within(proofChecklist).getByRole("button", { name: "播放证据线" })).toBeTruthy();
    expect(within(proofChecklist).getByText("先证明 Studio 和 Dream 能互相跳转。")).toBeTruthy();
    expect(within(proofChecklist).getByRole("link", { name: /3 个入口/ }).getAttribute("href")).toBe("candidate-handoff-checks/candidate-latest/summary.json");
    expect(within(proofChecklist).getByRole("link", { name: /镜头候选对比/ }).getAttribute("href")).toBe("/api/recording-assets/lens-comparison");
    expect(within(proofChecklist).getByRole("link", { name: /15 个素材包/ }).getAttribute("href")).toBe("/api/recording-assets/index");
    expect(within(proofChecklist).getByRole("link", { name: /Dream \+ Studio 双证据 · 6 条链接/ }).getAttribute("href")).toBe("index-checks/index-check-latest/summary.json");
    expect(within(proofChecklist).getByRole("link", { name: /7 步 · 7 通过/ }).getAttribute("href")).toBe("suite-runs/suite-run-latest/summary.json");
    expect(screen.getByText("讲解轨道已打开")).toBeTruthy();
    expect(screen.getByRole("button", { name: /脚本模式/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("plays the proof checklist cue sequence for screen recording", async () => {
    render(<StudioMode />);

    fireEvent.click(screen.getByRole("button", { name: /脚本模式/ }));

    const proofChecklist = await screen.findByLabelText("录屏证据清单");
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("Bridge QA");

    vi.useFakeTimers();
    fireEvent.click(within(proofChecklist).getByRole("button", { name: "播放证据线" }));
    expect(within(proofChecklist).getByRole("button", { name: "讲解中" }).getAttribute("aria-pressed")).toBe("true");
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("先证明 Studio 和 Dream 能互相跳转。");

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("Candidate QA");
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("再证明候选镜头点击后上下文不会丢。");

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("Lens Compare");

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("Asset Index");
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("最后进入素材库，挑录屏片段。");
    expect(within(proofChecklist).getByRole("button", { name: "讲解中" }).getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("Index QA");
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("确认总索引同时验收 Dream 和 Studio 两条证据链。");
    expect(within(proofChecklist).getByRole("button", { name: "讲解中" }).getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("Suite Run");
    expect(proofChecklist.querySelector('[aria-current="step"]')?.textContent).toContain("用 full suite 总收据为整条证据链收口。");
    expect(within(proofChecklist).getByRole("button", { name: "播放证据线" }).getAttribute("aria-pressed")).toBe("false");
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

  it("copies the lens candidate handoff QA command from the Studio asset panel", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "复制候选 QA" }));

    expect(writeText).toHaveBeenCalledWith("npm run check:lens-candidate-handoff");
    expect(await screen.findByText("候选 QA 命令已复制")).toBeTruthy();
    expect(screen.getByRole("button", { name: "已复制候选 QA" })).toBeTruthy();
  });

  it("copies a four-line proof story from the Studio evidence timeline", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    const previewLines = Array.from(screen.getByLabelText("证据讲解稿预览").querySelectorAll("p")).map((line) => line.textContent || "");
    fireEvent.click(screen.getByRole("button", { name: "复制讲解稿" }));

    expect(writeText).toHaveBeenCalledWith(previewLines.join("\n"));
    expect(await screen.findByText("证据讲解稿已复制")).toBeTruthy();
    expect(screen.getByRole("button", { name: "讲解稿已复制" })).toBeTruthy();
  });

  it("copies the Proof Story script path without changing the proof-story copy action", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "复制脚本路径" }));

    expect(writeText).toHaveBeenCalledWith("docs/recording/proof-story-demo-script.md");
    expect(await screen.findByText("脚本路径已复制")).toBeTruthy();
    expect(screen.getByRole("button", { name: "复制讲解稿" })).toBeTruthy();
  });

  it("copies the one-line Proof Story closeout status", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    const closeoutPreview = screen.getByLabelText("Proof Story 收口状态预览").textContent || "";
    fireEvent.click(screen.getByRole("button", { name: "复制收口状态" }));

    expect(writeText).toHaveBeenCalledWith(closeoutPreview);
    expect(await screen.findByText("收口状态已复制")).toBeTruthy();
    expect(screen.getByRole("button", { name: "复制脚本路径" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "复制讲解稿" })).toBeTruthy();
  });

  it("copies the Production Assets QA receipt path", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    const copyButton = screen.getByRole("button", { name: "复制 Production Assets QA 收据路径" });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledWith("index-checks/index-check-latest/clip-notes.md");
    expect(copyButton.textContent).toContain("已复制");
  });

  it("copies the one-line Proof Story Delivery summary", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    const deliveryPreview = screen.getByLabelText("Proof Story Delivery 预览").textContent || "";
    const copyButton = screen.getByRole("button", { name: "复制 Proof Story Delivery" });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledWith(deliveryPreview);
    expect(copyButton.textContent).toContain("已复制");
  });

  it("copies the one-line Proof Story handoff summary", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    const handoffPreview = screen.getByLabelText("Proof Story Handoff 预览").textContent || "";
    const copyButton = screen.getByRole("button", { name: "复制 Proof Story Handoff" });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledWith(handoffPreview);
    expect(copyButton.textContent).toContain("已复制");
  });

  it("copies the one-line Proof Story Complete bundle", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    const bundlePreview = screen.getByLabelText("Proof Story Complete Bundle 预览").textContent || "";
    const copyButton = screen.getByRole("button", { name: "复制 Proof Story Complete Bundle" });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(bundlePreview).toContain("Proof Story Complete Bundle");
    expect(writeText).toHaveBeenCalledWith(bundlePreview);
    expect(copyButton.textContent).toContain("已复制");
  });

  it("shows a closeout copy fallback when clipboard access fails", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("clipboard denied");
    });
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "复制收口状态" }));

    expect(await screen.findByText("手动复制收口状态")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith("Proof Story · 脚本路径: 就绪 · Studio QA: 已捕获 · 索引入库: 已入库 · Index QA: 已验证");
  });

  it("shows a handoff copy fallback when clipboard access fails", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("clipboard denied");
    });
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    const handoffPreview = screen.getByLabelText("Proof Story Handoff 预览").textContent || "";
    fireEvent.click(screen.getByRole("button", { name: "复制 Proof Story Handoff" }));

    expect(await screen.findByText("手动")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(handoffPreview);
  });

  it("shows a Complete bundle copy fallback when clipboard access fails", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("clipboard denied");
    });
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    const bundlePreview = screen.getByLabelText("Proof Story Complete Bundle 预览").textContent || "";
    fireEvent.click(screen.getByRole("button", { name: "复制 Proof Story Complete Bundle" }));

    expect(await screen.findByText("手动")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(bundlePreview);
  });

  it("shows a proof story copy fallback when clipboard access fails", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("clipboard denied");
    });
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<StudioMode />);

    expect(await screen.findByText("15 个素材包")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "复制讲解稿" }));

    expect(await screen.findByText("浏览器不允许自动复制讲解稿")).toBeTruthy();
    expect(screen.getByRole("button", { name: "手动复制讲解稿" })).toBeTruthy();
  });
});
