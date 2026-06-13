import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listRecordingAssetPacks, readRecordingAssetsSummary } from "./recording-assets";

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
  it("returns an empty summary when recordings do not exist", async () => {
    const summary = await readRecordingAssetsSummary(tempRoot);

    expect(summary.packCount).toBe(0);
    expect(summary.latestPack).toBeNull();
    expect(summary.indexAvailable).toBe(false);
    expect(summary.clipIndexAvailable).toBe(false);
  });

  it("lists dream and studio packs newest first", async () => {
    await writeSummary("visual-checks/old-dali", {
      createdAt: "2026-06-13T01:00:00.000Z",
      demoRoadbook: "dali",
      days: [{ day: 1 }, { day: 2 }],
      motion: { changed: true },
    });
    await writeSummary("visual-checks/new-coast", {
      createdAt: "2026-06-13T03:00:00.000Z",
      demoRoadbook: "coast",
      days: [{ day: 1 }, { day: 2 }, { day: 3 }, { day: 4 }],
      motion: { changed: true },
    });
    await writeSummary("studio-checks/mid-studio", {
      createdAt: "2026-06-13T02:00:00.000Z",
      captures: [{ destination: "云南大理" }, { destination: "三亚海岛" }],
    });

    const packs = await listRecordingAssetPacks(tempRoot);

    expect(packs).toHaveLength(3);
    expect(packs.map((pack) => pack.title)).toEqual([
      "Dream coastal visual pack",
      "Studio 16:9 demo pack",
      "Dream Dali visual pack",
    ]);
    expect(packs[0].detail).toBe("coast · 4 day screenshots · motion verified");
    expect(packs[1].detail).toBe("云南大理 / 三亚海岛");
    expect(packs[0].notesPath).toBe("visual-checks/new-coast/clip-notes.md");
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

    const summary = await readRecordingAssetsSummary(tempRoot);

    expect(summary.packCount).toBe(4);
    expect(summary.recentPacks.map((pack) => pack.id)).toEqual(["pack-4", "pack-3", "pack-2"]);
  });
});
