import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRecordingAssetTypeLabel, getRecordingAssetUsageHint } from "./recording-asset-labels";
import {
  listRecordingAssetPacks,
  readRecordingAssetsSummary,
} from "./recording-assets";

let tempRoot = "";

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "lily-recording-assets-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

async function writeSummary(relativeDir: string, summary: Record<string, unknown>, withNotes = true) {
  const packDir = path.join(tempRoot, relativeDir);
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "summary.json"), `${JSON.stringify(summary)}\n`);
  await writeFile(path.join(packDir, "index.html"), "<html></html>");
  if (withNotes) {
    await writeFile(path.join(packDir, "clip-notes.md"), "# Notes\n");
  }
}

describe("recording assets", () => {
  it("maps pack types to creator-facing labels and usage hints", () => {
    expect(getRecordingAssetTypeLabel("dream")).toBe("Dream QA");
    expect(getRecordingAssetTypeLabel("studio")).toBe("Studio QA");
    expect(getRecordingAssetTypeLabel("bridge")).toBe("Bridge QA");
    expect(getRecordingAssetUsageHint("dream")).toBe("产品画面");
    expect(getRecordingAssetUsageHint("studio")).toBe("讲解画面");
    expect(getRecordingAssetUsageHint("bridge")).toBe("桥接验证");
  });

  it("returns an empty summary when recordings do not exist", async () => {
    const summary = await readRecordingAssetsSummary(tempRoot);

    expect(summary.packCount).toBe(0);
    expect(summary.countsByType).toEqual({ dream: 0, studio: 0, bridge: 0 });
    expect(summary.latestPack).toBeNull();
    expect(summary.latestCandidateHandoff).toBeNull();
    expect(summary.latestDreamVisualProof).toBeNull();
    expect(summary.latestRecordingIndexCheck).toBeNull();
    expect(summary.latestRecordingSuiteRun).toBeNull();
    expect(summary.indexAvailable).toBe(false);
    expect(summary.clipIndexAvailable).toBe(false);
  });

  it("lists dream, studio, and bridge packs newest first", async () => {
    await writeSummary("visual-checks/old-dali", {
      createdAt: "2026-06-13T01:00:00.000Z",
      demoRoadbook: "dali",
      days: [{ day: 1 }, { day: 2 }],
      motion: { changed: true },
    });
    await writeSummary("visual-checks/new-coast", {
      createdAt: "2026-06-13T03:00:00.000Z",
      demoRoadbook: "coast",
      activeLens: { proof: "auto day lens" },
      days: [{ day: 1 }, { day: 2 }, { day: 3 }, { day: 4 }],
      motion: { changed: true },
    });
    await writeSummary("visual-checks/skyline", {
      createdAt: "2026-06-13T03:30:00.000Z",
      demoRoadbook: "dali",
      activeLens: { proof: "low-skyline lens" },
      days: [{ day: 1 }, { day: 2 }, { day: 3 }, { day: 4 }],
      motion: { changed: true },
    });
    await writeSummary("studio-checks/mid-studio", {
      createdAt: "2026-06-13T02:00:00.000Z",
      captures: [{ destination: "云南大理" }, { destination: "三亚海岛" }],
    });
    await writeSummary("handoff-checks/latest-bridge", {
      createdAt: "2026-06-13T04:00:00.000Z",
      captures: [{ destination: "云南大理" }, { destination: "三亚海岛" }],
    });

    const packs = await listRecordingAssetPacks(tempRoot);

    expect(packs).toHaveLength(5);
    expect(packs.map((pack) => pack.title)).toEqual([
      "Studio-Dream bridge QA pack",
      "Dream low-skyline lens visual pack",
      "Dream coastal visual pack",
      "Studio 16:9 demo pack",
      "Dream Dali visual pack",
    ]);
    expect(packs[0].detail).toBe("云南大理 / 三亚海岛 round trips");
    expect(packs[1].detail).toBe("dali · 4 day screenshots · motion verified · low-skyline lens");
    expect(packs[1].lens).toBe("low-skyline lens");
    expect(packs[2].detail).toBe("coast · 4 day screenshots · motion verified · auto day lens");
    expect(packs[3].detail).toBe("云南大理 / 三亚海岛");
    expect(packs[0].notesPath).toBe("handoff-checks/latest-bridge/clip-notes.md");
  });

  it("reports index availability and latest pack", async () => {
    await writeFile(path.join(tempRoot, "index.html"), "<html></html>");
    await writeFile(path.join(tempRoot, "clip-index.md"), "# Index\n");
    await writeSummary("studio-checks/current", {
      createdAt: "2026-06-13T04:00:00.000Z",
      captures: [],
    }, false);

    const summary = await readRecordingAssetsSummary(tempRoot);

    expect(summary.packCount).toBe(1);
    expect(summary.latestPack?.id).toBe("current");
    expect(summary.latestPack?.notesPath).toBe("");
    expect(summary.indexAvailable).toBe(true);
    expect(summary.clipIndexAvailable).toBe(true);
  });

  it("reports the latest candidate handoff QA without counting it as a recording pack", async () => {
    await writeSummary("candidate-handoff-checks/old-candidate", {
      createdAt: "2026-06-13T04:00:00.000Z",
      captures: [{ id: "primary" }],
    });
    await writeSummary("candidate-handoff-checks/new-candidate", {
      createdAt: "2026-06-13T05:00:00.000Z",
      captures: [{ id: "primary" }, { id: "first-card" }, { id: "second-chip" }],
    });

    const summary = await readRecordingAssetsSummary(tempRoot);

    expect(summary.packCount).toBe(0);
    expect(summary.countsByType).toEqual({ dream: 0, studio: 0, bridge: 0 });
    expect(summary.latestCandidateHandoff).toMatchObject({
      id: "new-candidate",
      createdAt: "2026-06-13T05:00:00.000Z",
      captureCount: 3,
      summaryPath: "candidate-handoff-checks/new-candidate/summary.json",
      notesPath: "candidate-handoff-checks/new-candidate/clip-notes.md",
    });
  });

  it("reports the latest Dream visual proof playback evidence when available", async () => {
    await writeSummary("visual-checks/old-without-proof", {
      createdAt: "2026-06-13T04:00:00.000Z",
      demoRoadbook: "dali",
      days: [],
      motion: { changed: true },
    });
    await writeSummary("visual-checks/new-with-proof", {
      createdAt: "2026-06-13T05:00:00.000Z",
      demoRoadbook: "dali",
      visualProof: {
        finalActiveCue: {
          label: "Proof",
          value: "3/5 ready",
          detail: "proof stack",
          active: true,
        },
        buttonTextAfterPlayback: "播放视觉证据",
        screenshotPath: path.join(tempRoot, "visual-checks", "new-with-proof", "dream-dali-visual-proof-playback.png"),
        initialCues: [
          { label: "Terrain", value: "procedural terrain" },
          { label: "Skyline", value: "Auto" },
          { label: "AI Asset", value: "asset pending" },
          { label: "Route", value: "D1" },
          { label: "Proof", value: "3/5 ready" },
        ],
      },
      days: [],
      motion: { changed: true },
    });

    const summary = await readRecordingAssetsSummary(tempRoot);

    expect(summary.latestDreamVisualProof).toMatchObject({
      id: "new-with-proof",
      createdAt: "2026-06-13T05:00:00.000Z",
      finalCueLabel: "Proof",
      finalCueValue: "3/5 ready",
      buttonTextAfterPlayback: "播放视觉证据",
      cueLabels: ["Terrain", "Skyline", "AI Asset", "Route", "Proof"],
      screenshotPath: "visual-checks/new-with-proof/dream-dali-visual-proof-playback.png",
      summaryPath: "visual-checks/new-with-proof/summary.json",
      notesPath: "visual-checks/new-with-proof/clip-notes.md",
    });
  });

  it("reports the latest recording index QA evidence when available", async () => {
    await writeSummary("index-checks/old-index-check", {
      createdAt: "2026-06-13T04:00:00.000Z",
      proofText: "Dream Proof · Proof · 3/5 ready",
      apiIndexUrl: "http://localhost:3000/api/recording-assets/index",
      localProof: {
        finalCueLabel: "Proof",
        finalCueValue: "3/5 ready",
      },
      links: [{ id: "screenshot" }],
      screenshotPath: path.join(tempRoot, "index-checks", "old-index-check", "recording-index-dream-proof.png"),
    });
    await writeSummary("index-checks/new-index-check", {
      createdAt: "2026-06-13T05:00:00.000Z",
      proofText: "Dream Proof · Proof · 3/5 ready\nplayback screenshot\nsummary\nnotes",
      apiIndexUrl: "http://localhost:3000/api/recording-assets/index",
      localProof: {
        finalCueLabel: "Proof",
        finalCueValue: "3/5 ready",
      },
      links: [{ id: "screenshot" }, { id: "summary" }, { id: "notes" }],
      screenshotPath: path.join(tempRoot, "index-checks", "new-index-check", "recording-index-dream-proof.png"),
    });

    const summary = await readRecordingAssetsSummary(tempRoot);

    expect(summary.latestRecordingIndexCheck).toMatchObject({
      id: "new-index-check",
      createdAt: "2026-06-13T05:00:00.000Z",
      finalCueLabel: "Proof",
      finalCueValue: "3/5 ready",
      linkCount: 3,
      proofText: "Dream Proof · Proof · 3/5 ready\nplayback screenshot\nsummary\nnotes",
      apiIndexUrl: "http://localhost:3000/api/recording-assets/index",
      screenshotPath: "index-checks/new-index-check/recording-index-dream-proof.png",
      summaryPath: "index-checks/new-index-check/summary.json",
      notesPath: "index-checks/new-index-check/clip-notes.md",
    });
  });

  it("reports the latest recording suite run manifest when available", async () => {
    await writeSummary("suite-runs/old-suite", {
      status: "failed",
      createdAt: "2026-06-13T04:00:00.000Z",
      durationMs: 15000,
      stepCount: 2,
      failureMessage: "old failure",
      steps: [{ label: "Dream", status: "passed" }, { label: "Studio", status: "failed" }],
    });
    await writeSummary("suite-runs/new-suite", {
      status: "passed",
      createdAt: "2026-06-13T05:00:00.000Z",
      durationMs: 107000,
      stepCount: 7,
      failureMessage: "",
      steps: [
        { label: "Dream Dali visual QA", status: "passed" },
        { label: "Dream coastal visual QA", status: "passed" },
        { label: "Dream all director lenses visual QA", status: "passed" },
        { label: "Studio recording QA", status: "passed" },
        { label: "Studio-Dream handoff QA", status: "passed" },
        { label: "Recording asset index", status: "passed" },
        { label: "Recording index proof QA", status: "passed" },
      ],
    });

    const summary = await readRecordingAssetsSummary(tempRoot);

    expect(summary.latestRecordingSuiteRun).toMatchObject({
      id: "new-suite",
      createdAt: "2026-06-13T05:00:00.000Z",
      status: "passed",
      stepCount: 7,
      passedStepCount: 7,
      durationMs: 107000,
      failureMessage: "",
      summaryPath: "suite-runs/new-suite/summary.json",
      notesPath: "suite-runs/new-suite/clip-notes.md",
    });
  });

  it("includes only the three most recent packs in the summary", async () => {
    await writeSummary("visual-checks/pack-1", {
      createdAt: "2026-06-13T01:00:00.000Z",
      demoRoadbook: "dali",
      days: [],
      motion: { changed: false },
    });
    await writeSummary("visual-checks/pack-2", {
      createdAt: "2026-06-13T02:00:00.000Z",
      demoRoadbook: "coast",
      days: [],
      motion: { changed: false },
    });
    await writeSummary("studio-checks/pack-3", {
      createdAt: "2026-06-13T03:00:00.000Z",
      captures: [],
    });
    await writeSummary("studio-checks/pack-4", {
      createdAt: "2026-06-13T04:00:00.000Z",
      captures: [],
    });
    await writeSummary("handoff-checks/pack-5", {
      createdAt: "2026-06-13T05:00:00.000Z",
      captures: [],
    });

    const summary = await readRecordingAssetsSummary(tempRoot);

    expect(summary.packCount).toBe(5);
    expect(summary.countsByType).toEqual({ dream: 2, studio: 2, bridge: 1 });
    expect(summary.recentPacks.map((pack) => pack.id)).toEqual(["pack-5", "pack-4", "pack-3"]);
  });
});
