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
  lens: string;
  galleryPath: string;
  notesPath: string;
  summaryPath: string;
};

export type RecordingAssetsSummary = {
  recordingsRoot: string;
  packCount: number;
  countsByType: Record<RecordingAssetType, number>;
  latestPack: RecordingAssetPack | null;
  recentPacks: RecordingAssetPack[];
  latestCandidateHandoff: RecordingCandidateHandoffSummary | null;
  indexAvailable: boolean;
  indexPath: string;
  clipIndexAvailable: boolean;
  clipIndexPath: string;
};

export type RecordingCandidateHandoffSummary = {
  id: string;
  createdAt: string;
  captureCount: number;
  summaryPath: string;
  notesPath: string;
};

const sources = [
  { type: "dream" as const, dir: "visual-checks", label: "/dream visual QA" },
  { type: "studio" as const, dir: "studio-checks", label: "/studio recording QA" },
  { type: "bridge" as const, dir: "handoff-checks", label: "/studio ↔ /dream handoff QA" },
];

export async function readRecordingAssetsSummary(recordingsRoot = process.env.RECORDINGS_DIR || "recordings"): Promise<RecordingAssetsSummary> {
  const packs = await listRecordingAssetPacks(recordingsRoot);
  const latestCandidateHandoff = await readLatestCandidateHandoff(recordingsRoot);
  const latestPack = packs[0] || null;
  const indexPath = path.join(recordingsRoot, "index.html");
  const clipIndexPath = path.join(recordingsRoot, "clip-index.md");

  return {
    recordingsRoot,
    packCount: packs.length,
    countsByType: countPacksByType(packs),
    latestPack,
    recentPacks: packs.slice(0, 3),
    latestCandidateHandoff,
    indexAvailable: existsSync(indexPath),
    indexPath,
    clipIndexAvailable: existsSync(clipIndexPath),
    clipIndexPath,
  };
}

function countPacksByType(packs: RecordingAssetPack[]): Record<RecordingAssetType, number> {
  return {
    dream: packs.filter((pack) => pack.type === "dream").length,
    studio: packs.filter((pack) => pack.type === "studio").length,
    bridge: packs.filter((pack) => pack.type === "bridge").length,
  };
}

export async function listRecordingAssetPacks(recordingsRoot = process.env.RECORDINGS_DIR || "recordings"): Promise<RecordingAssetPack[]> {
  const packs = (await Promise.all(sources.map((source) => readSource(recordingsRoot, source)))).flat();
  return packs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function readLatestCandidateHandoff(recordingsRoot: string): Promise<RecordingCandidateHandoffSummary | null> {
  const sourceRoot = path.join(recordingsRoot, "candidate-handoff-checks");
  if (!existsSync(sourceRoot)) {
    return null;
  }

  const entries = await readdir(sourceRoot);
  const runs: RecordingCandidateHandoffSummary[] = [];

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
    const captures = Array.isArray(summary.captures) ? summary.captures : [];
    runs.push({
      id: entry,
      createdAt: readString(summary.createdAt) || entry,
      captureCount: captures.length,
      summaryPath: toRecordingLink(path.join("candidate-handoff-checks", entry, "summary.json")),
      notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("candidate-handoff-checks", entry, "clip-notes.md")) : "",
    });
  }

  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
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
      lens: readDreamLens(summary),
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

  if (type === "bridge") {
    return "Studio-Dream bridge QA pack";
  }

  if (type === "dream") {
    const lens = readDreamLens(summary);
    if (lens && lens !== "auto day lens") {
      return `Dream ${lens} visual pack`;
    }
  }

  return summary.demoRoadbook === "coast" ? "Dream coastal visual pack" : "Dream Dali visual pack";
}

function buildPackDetail(type: RecordingAssetPack["type"], summary: Record<string, unknown>) {
  if (type === "studio") {
    const captures = Array.isArray(summary.captures) ? summary.captures : [];
    const names = captures.map((capture) => readString((capture as Record<string, unknown>).destination)).filter(Boolean).join(" / ");
    return names || "Dali / Coastal recording layouts";
  }

  if (type === "bridge") {
    const captures = Array.isArray(summary.captures) ? summary.captures : [];
    const names = captures.map((capture) => readString((capture as Record<string, unknown>).destination)).filter(Boolean).join(" / ");
    return names ? `${names} round trips` : "Studio ↔ Dream round trips";
  }

  const days = Array.isArray(summary.days) ? summary.days.length : 0;
  const motion = typeof summary.motion === "object" && summary.motion && "changed" in summary.motion && summary.motion.changed ? "motion verified" : "motion pending";
  const lens = readDreamLens(summary);
  const lensDetail = lens ? ` · ${lens}` : "";
  return `${readString(summary.demoRoadbook) || "dali"} · ${days} day screenshots · ${motion}${lensDetail}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readDreamLens(summary: Record<string, unknown>) {
  if (typeof summary.activeLens === "object" && summary.activeLens) {
    const proof = readString((summary.activeLens as Record<string, unknown>).proof);
    if (proof) {
      return proof;
    }
  }

  return readString(summary.directorLens);
}

function toRecordingLink(relativePath: string) {
  return relativePath.split(path.sep).join("/");
}
