import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { RecordingAssetType } from "./recording-asset-labels";

export type RecordingAssetPack = {
  type: RecordingAssetType;
  label: string;
  id: string;
  createdAt: string;
  title: string;
  detail: string;
  galleryPath: string;
  notesPath: string;
  summaryPath: string;
};

export type RecordingAssetsSummary = {
  recordingsRoot: string;
  packCount: number;
  latestPack: RecordingAssetPack | null;
  recentPacks: RecordingAssetPack[];
  indexAvailable: boolean;
  indexPath: string;
  clipIndexAvailable: boolean;
  clipIndexPath: string;
};

const sources = [
  { type: "dream" as const, dir: "visual-checks", label: "/dream visual QA" },
  { type: "studio" as const, dir: "studio-checks", label: "/studio recording QA" },
];

export async function readRecordingAssetsSummary(recordingsRoot = process.env.RECORDINGS_DIR || "recordings"): Promise<RecordingAssetsSummary> {
  const packs = await listRecordingAssetPacks(recordingsRoot);
  const latestPack = packs[0] || null;
  const indexPath = path.join(recordingsRoot, "index.html");
  const clipIndexPath = path.join(recordingsRoot, "clip-index.md");

  return {
    recordingsRoot,
    packCount: packs.length,
    latestPack,
    recentPacks: packs.slice(0, 3),
    indexAvailable: existsSync(indexPath),
    indexPath,
    clipIndexAvailable: existsSync(clipIndexPath),
    clipIndexPath,
  };
}

export async function listRecordingAssetPacks(recordingsRoot = process.env.RECORDINGS_DIR || "recordings"): Promise<RecordingAssetPack[]> {
  const packs = (await Promise.all(sources.map((source) => readSource(recordingsRoot, source)))).flat();
  return packs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function readSource(recordingsRoot: string, source: (typeof sources)[number]) {
  const sourceRoot = path.join(recordingsRoot, source.dir);
  if (!existsSync(sourceRoot)) {
    return [];
  }

  const entries = await readdir(sourceRoot);
  const packs: RecordingAssetPack[] = [];

  for (const entry of entries) {
    const packDir = path.join(sourceRoot, entry);
    const info = await stat(packDir).catch(() => null);
    if (!info?.isDirectory()) {
      continue;
    }

    const summaryPath = path.join(packDir, "summary.json");
    if (!existsSync(summaryPath)) {
      continue;
    }

    const summary = JSON.parse(await readFile(summaryPath, "utf8")) as Record<string, unknown>;
    packs.push({
      type: source.type,
      label: source.label,
      id: entry,
      createdAt: readString(summary.createdAt) || entry,
      title: buildPackTitle(source.type, summary),
      detail: buildPackDetail(source.type, summary),
      galleryPath: toRecordingLink(path.join(source.dir, entry, "index.html")),
      notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join(source.dir, entry, "clip-notes.md")) : "",
      summaryPath: toRecordingLink(path.join(source.dir, entry, "summary.json")),
    });
  }

  return packs;
}

function buildPackTitle(type: RecordingAssetPack["type"], summary: Record<string, unknown>) {
  if (type === "studio") {
    return "Studio 16:9 demo pack";
  }

  return summary.demoRoadbook === "coast" ? "Dream coastal visual pack" : "Dream Dali visual pack";
}

function buildPackDetail(type: RecordingAssetPack["type"], summary: Record<string, unknown>) {
  if (type === "studio") {
    const captures = Array.isArray(summary.captures) ? summary.captures : [];
    const names = captures.map((capture) => readString((capture as Record<string, unknown>).destination)).filter(Boolean).join(" / ");
    return names || "Dali / Coastal recording layouts";
  }

  const days = Array.isArray(summary.days) ? summary.days.length : 0;
  const motion = typeof summary.motion === "object" && summary.motion && "changed" in summary.motion && summary.motion.changed ? "motion verified" : "motion pending";
  return `${readString(summary.demoRoadbook) || "dali"} · ${days} day screenshots · ${motion}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toRecordingLink(relativePath: string) {
  return relativePath.split(path.sep).join("/");
}
