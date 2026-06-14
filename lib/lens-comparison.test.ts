import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildRecordingFileUrl,
  readLensComparisonDashboard,
  resolveRecordingAssetFile,
} from "./lens-comparison";

let tempRoot = "";

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "lily-lens-comparison-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

async function writeDreamPack(id: string, summary: Record<string, unknown>) {
  const packDir = path.join(tempRoot, "visual-checks", id);
  await mkdir(packDir, { recursive: true });
  for (const day of [1, 2, 3, 4]) {
    await writeFile(path.join(packDir, `dream-dali-d${day}.png`), "image");
  }
  await writeFile(path.join(packDir, "index.html"), "<html></html>");
  await writeFile(path.join(packDir, "clip-notes.md"), "# Notes\n");
  await writeFile(path.join(packDir, "summary.json"), `${JSON.stringify(summary)}\n`);
}

function makeSummary(lensId: string, createdAt: string, tuneCue = "skyline 1.00x / water 1.00x / route 1.00x") {
  return {
    createdAt,
    demoRoadbook: "dali",
    directorLens: lensId,
    activeLens: { id: lensId, proof: `${lensId} lens` },
    motion: { changed: true },
    days: [1, 2, 3, 4].map((day) => ({
      day,
      timeline: [
        { day, label: `D${day} label`, cue: `D${day} cue`, active: true },
      ],
      inspectorGrid: [{ label: "Tune", value: tuneCue }],
      proofStack: [{ label: "Composition", value: `D${day} composition` }],
      canvasStats: { lit: 2000 + day, varied: 50 + day, checksum: 100 + day },
      screenshotPath: path.join(tempRoot, "visual-checks", `${createdAt}-lens-${lensId}`, `dream-dali-d${day}.png`),
      sceneScreenshotPath: path.join(tempRoot, "visual-checks", `${createdAt}-lens-${lensId}`, `dream-dali-d${day}-scene.png`),
    })),
  };
}

describe("lens comparison dashboard", () => {
  it("groups Dream QA packs by Director Lens and keeps the newest pack per lens", async () => {
    await writeDreamPack("old-auto", makeSummary("auto", "2026-06-13T01:00:00.000Z"));
    await writeDreamPack("new-auto", makeSummary("auto", "2026-06-13T02:00:00.000Z"));
    await writeDreamPack("wide", makeSummary("wide-water", "2026-06-13T03:00:00.000Z", "skyline 0.90x / water 1.36x / route 0.82x"));
    await writeDreamPack("skyline", makeSummary("low-skyline", "2026-06-13T04:00:00.000Z", "skyline 1.34x / water 1.08x / route 1.18x"));
    await writeDreamPack("atlas", makeSummary("isometric-atlas", "2026-06-13T05:00:00.000Z", "skyline 0.72x / water 0.82x / route 1.42x"));

    const dashboard = await readLensComparisonDashboard(tempRoot);

    expect(dashboard.totalDreamPacks).toBe(5);
    expect(dashboard.comparedLensCount).toBe(4);
    expect(dashboard.sceneCropCount).toBe(16);
    expect(dashboard.missingLensIds).toEqual(["close-detail"]);
    expect(dashboard.packs.map((pack) => pack.lensId)).toEqual(["auto", "wide-water", "low-skyline", "isometric-atlas"]);
    expect(dashboard.packs[0].id).toBe("new-auto");
    expect(dashboard.packs[0].sourcePackCount).toBe(2);
    expect(dashboard.packs[1].tuningCue).toBe("skyline 0.90x / water 1.36x / route 0.82x");
    expect(dashboard.packs[2].days).toHaveLength(4);
    expect(dashboard.packs[2].days[0]).toMatchObject({
      day: 1,
      label: "D1 label",
      cue: "D1 cue",
      compositionProof: "D1 composition",
      lit: 2001,
      varied: 51,
      checksum: 101,
    });
    expect(dashboard.packs[2].days[0].screenshotPath).toBe("visual-checks/2026-06-13T04:00:00.000Z-lens-low-skyline/dream-dali-d1.png");
    expect(dashboard.packs[2].days[0].screenshotUrl).toBe(
      buildRecordingFileUrl("visual-checks/2026-06-13T04:00:00.000Z-lens-low-skyline/dream-dali-d1.png"),
    );
    expect(dashboard.packs[2].days[0].sceneScreenshotPath).toBe("visual-checks/2026-06-13T04:00:00.000Z-lens-low-skyline/dream-dali-d1-scene.png");
    expect(dashboard.packs[2].days[0].sceneScreenshotUrl).toBe(
      buildRecordingFileUrl("visual-checks/2026-06-13T04:00:00.000Z-lens-low-skyline/dream-dali-d1-scene.png"),
    );
    expect(dashboard.packs[2].days[0].hasSceneCrop).toBe(true);
    expect(dashboard.packs[2].checklist.map((item) => item.state)).toEqual(["ready", "ready", "ready", "ready"]);
  });

  it("uses lens tuning fallback and checklist warnings when a pack is incomplete", async () => {
    await writeDreamPack("detail", {
      createdAt: "2026-06-13T05:00:00.000Z",
      demoRoadbook: "dali",
      activeLens: { id: "close-detail", proof: "close-detail lens" },
      motion: { changed: false },
      days: [{ day: 1, timeline: [], inspectorGrid: [], proofStack: [], canvasStats: {}, screenshotPath: "recordings/visual-checks/detail/dream-dali-d1.png" }],
    });

    const dashboard = await readLensComparisonDashboard(tempRoot);
    const detail = dashboard.packs[0];

    expect(dashboard.sceneCropCount).toBe(0);
    expect(detail.lensId).toBe("close-detail");
    expect(detail.tuningCue).toBe("skyline 1.18x / water 0.72x / route 0.78x");
    expect(detail.checklist).toEqual([
      { label: "D1-D4", state: "needs-review", detail: "1 shots" },
      { label: "Tune", state: "ready", detail: "skyline 1.18x / water 0.72x / route 0.78x" },
      { label: "3D crop", state: "needs-review", detail: "0/1 crops" },
      { label: "Motion", state: "needs-review", detail: "motion pending" },
    ]);
  });

  it("resolves only image files inside the recordings root", () => {
    expect(resolveRecordingAssetFile(tempRoot, "visual-checks/run/dream-dali-d1.png")).toBe(path.join(tempRoot, "visual-checks/run/dream-dali-d1.png"));
    expect(resolveRecordingAssetFile(tempRoot, "../.env.local")).toBeNull();
    expect(resolveRecordingAssetFile(tempRoot, "visual-checks/run/summary.json")).toBeNull();
    expect(resolveRecordingAssetFile(tempRoot, "")).toBeNull();
  });
});
