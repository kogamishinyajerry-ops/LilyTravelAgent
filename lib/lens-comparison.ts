import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { buildDirectorLensSceneTuning, directorLenses, resolveDirectorLens, type DirectorLensId } from "./director-lens";

export type LensComparisonDay = {
  day: number;
  label: string;
  cue: string;
  screenshotPath: string;
  screenshotUrl: string;
  sceneScreenshotPath: string;
  sceneScreenshotUrl: string;
  hasSceneCrop: boolean;
  tuneCue: string;
  compositionProof: string;
  lit: number;
  varied: number;
  checksum: number;
};

export type LensComparisonSceneDiff = {
  state: "changed" | "subtle" | "missing";
  label: string;
  detail: string;
  score: number;
  checksumDelta: number;
  litDelta: number;
  variedDelta: number;
};

export type LensRecordingCandidate = {
  rank: number;
  lensId: DirectorLensId;
  lensLabel: string;
  day: number;
  dayLabel: string;
  cue: string;
  demoRoadbook: string;
  dreamUrl: string;
  sceneScreenshotPath: string;
  sceneScreenshotUrl: string;
  diff: LensComparisonSceneDiff;
};

export type LensComparisonPack = {
  id: string;
  createdAt: string;
  demoRoadbook: string;
  lensId: DirectorLensId;
  lensLabel: string;
  lensProof: string;
  tuningCue: string;
  galleryPath: string;
  summaryPath: string;
  notesPath: string;
  dayCount: number;
  motionVerified: boolean;
  sourcePackCount: number;
  days: LensComparisonDay[];
  checklist: Array<{
    label: string;
    state: "ready" | "needs-review";
    detail: string;
  }>;
};

export type LensComparisonBatch = {
  id: string;
  createdAt: string;
  packCount: number;
  complete: boolean;
  lensIds: DirectorLensId[];
  missingLensIds: DirectorLensId[];
  sceneCropCount: number;
  packs: LensComparisonPack[];
};

export type LensComparisonDashboard = {
  recordingsRoot: string;
  createdAt: string;
  totalDreamPacks: number;
  comparedLensCount: number;
  batchCount: number;
  completeBatchCount: number;
  sceneCropCount: number;
  missingLensIds: DirectorLensId[];
  currentBatch: LensComparisonBatch | null;
  previousBatch: LensComparisonBatch | null;
  bestRecordingCandidates: LensRecordingCandidate[];
  packs: LensComparisonPack[];
};

type DreamVisualSummary = {
  id: string;
  packDir: string;
  createdAt: string;
  raw: Record<string, unknown>;
};

const dreamVisualDir = "visual-checks";

export async function readLensComparisonDashboard(recordingsRoot = process.env.RECORDINGS_DIR || "recordings"): Promise<LensComparisonDashboard> {
  const summaries = await listDreamVisualSummaries(recordingsRoot);
  return buildLensComparisonDashboard(recordingsRoot, summaries);
}

export async function listDreamVisualSummaries(recordingsRoot = process.env.RECORDINGS_DIR || "recordings"): Promise<DreamVisualSummary[]> {
  const sourceRoot = path.join(recordingsRoot, dreamVisualDir);
  if (!existsSync(sourceRoot)) {
    return [];
  }

  const entries = await readdir(sourceRoot);
  const summaries: DreamVisualSummary[] = [];

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

    const raw = JSON.parse(await readFile(summaryPath, "utf8")) as Record<string, unknown>;
    summaries.push({
      id: entry,
      packDir,
      createdAt: readString(raw.createdAt) || entry,
      raw,
    });
  }

  return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function compareLensSceneStats(
  current: Pick<LensComparisonDay, "hasSceneCrop" | "checksum" | "lit" | "varied">,
  previous?: Pick<LensComparisonDay, "hasSceneCrop" | "checksum" | "lit" | "varied">,
): LensComparisonSceneDiff {
  if (!previous) {
    return {
      state: "missing",
      label: "Missing",
      detail: "No previous scene crop",
      score: 0,
      checksumDelta: 0,
      litDelta: 0,
      variedDelta: 0,
    };
  }

  if (!current.hasSceneCrop || !previous.hasSceneCrop) {
    return {
      state: "missing",
      label: "Missing",
      detail: "Needs two pure scene crops",
      score: 0,
      checksumDelta: 0,
      litDelta: 0,
      variedDelta: 0,
    };
  }

  const checksumDelta = Math.abs(current.checksum - previous.checksum);
  const litDelta = Math.abs(current.lit - previous.lit);
  const variedDelta = Math.abs(current.varied - previous.varied);
  const score = checksumDelta + litDelta * 10_000 + variedDelta * 250_000;
  const changed = checksumDelta >= 1_000_000 || litDelta >= 80 || variedDelta >= 4;

  return {
    state: changed ? "changed" : "subtle",
    label: changed ? "Changed" : "Subtle",
    detail: `checksum ${formatCompactDelta(checksumDelta)} / lit ${litDelta} / varied ${variedDelta}`,
    score,
    checksumDelta,
    litDelta,
    variedDelta,
  };
}

export function buildLensComparisonDashboard(recordingsRoot: string, summaries: DreamVisualSummary[]): LensComparisonDashboard {
  const newestByLens = new Map<DirectorLensId, DreamVisualSummary>();
  const countsByLens = new Map<DirectorLensId, number>();

  for (const summary of summaries) {
    const lensId = readLensId(summary.raw);
    countsByLens.set(lensId, (countsByLens.get(lensId) || 0) + 1);
    if (!newestByLens.has(lensId)) {
      newestByLens.set(lensId, summary);
    }
  }

  const packs = directorLenses
    .map((lens) => {
      const summary = newestByLens.get(lens.id);
      return summary ? buildLensComparisonPack(recordingsRoot, summary, countsByLens.get(lens.id) || 1) : null;
    })
    .filter((pack): pack is LensComparisonPack => Boolean(pack));
  const batches = buildLensComparisonBatches(recordingsRoot, summaries, countsByLens);
  const completeBatches = batches.filter((batch) => batch.complete);
  const currentBatch = completeBatches[0] || batches[0] || null;
  const previousBatch =
    completeBatches.find((batch) => batch.id !== currentBatch?.id) ||
    batches.find((batch) => batch.id !== currentBatch?.id) ||
    null;
  const bestRecordingCandidates = buildBestRecordingCandidates(currentBatch, previousBatch);

  return {
    recordingsRoot,
    createdAt: new Date().toISOString(),
    totalDreamPacks: summaries.length,
    comparedLensCount: packs.length,
    batchCount: batches.length,
    completeBatchCount: completeBatches.length,
    sceneCropCount: packs.reduce((total, pack) => total + pack.days.filter((day) => day.hasSceneCrop).length, 0),
    missingLensIds: directorLenses.map((lens) => lens.id).filter((lensId) => !newestByLens.has(lensId)),
    currentBatch,
    previousBatch,
    bestRecordingCandidates,
    packs,
  };
}

function buildBestRecordingCandidates(
  currentBatch: LensComparisonBatch | null,
  previousBatch: LensComparisonBatch | null,
): LensRecordingCandidate[] {
  if (!currentBatch || !previousBatch) {
    return [];
  }

  const previousPacksByLens = new Map(previousBatch.packs.map((pack) => [pack.lensId, pack]));
  const candidates = currentBatch.packs.flatMap((pack) => {
    const previousPack = previousPacksByLens.get(pack.lensId);
    const previousDaysByDay = new Map((previousPack?.days || []).map((day) => [day.day, day]));

    return pack.days
      .map((day) => {
        const previousDay = previousDaysByDay.get(day.day);
        const diff = compareLensSceneStats(day, previousDay);
        return {
          lensId: pack.lensId,
          lensLabel: pack.lensLabel,
          day: day.day,
          dayLabel: day.label,
          cue: day.cue || day.compositionProof,
          demoRoadbook: pack.demoRoadbook,
          dreamUrl: `/dream?demo=${encodeURIComponent(pack.demoRoadbook)}&lens=${encodeURIComponent(pack.lensId)}`,
          sceneScreenshotPath: day.sceneScreenshotPath,
          sceneScreenshotUrl: day.sceneScreenshotUrl,
          diff,
        };
      })
      .filter((candidate) => candidate.diff.state === "changed");
  });

  return candidates
    .sort(
      (a, b) =>
        b.diff.score - a.diff.score ||
        directorLenses.findIndex((lens) => lens.id === a.lensId) - directorLenses.findIndex((lens) => lens.id === b.lensId) ||
        a.day - b.day,
    )
    .slice(0, 4)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function buildLensComparisonBatches(
  recordingsRoot: string,
  summaries: DreamVisualSummary[],
  countsByLens: Map<DirectorLensId, number>,
): LensComparisonBatch[] {
  const grouped = new Map<string, DreamVisualSummary[]>();

  for (const summary of summaries) {
    const batchId = readLensBatchId(summary);
    if (!batchId) {
      continue;
    }

    const current = grouped.get(batchId) || [];
    current.push(summary);
    grouped.set(batchId, current);
  }

  return [...grouped.entries()]
    .map(([id, batchSummaries]) => {
      const newestByLens = new Map<DirectorLensId, DreamVisualSummary>();
      const sortedSummaries = [...batchSummaries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      for (const summary of sortedSummaries) {
        const lensId = readLensId(summary.raw);
        if (!newestByLens.has(lensId)) {
          newestByLens.set(lensId, summary);
        }
      }

      const packs = directorLenses
        .map((lens) => {
          const summary = newestByLens.get(lens.id);
          return summary ? buildLensComparisonPack(recordingsRoot, summary, countsByLens.get(lens.id) || 1) : null;
        })
        .filter((pack): pack is LensComparisonPack => Boolean(pack));
      const missingLensIds = directorLenses.map((lens) => lens.id).filter((lensId) => !newestByLens.has(lensId));

      return {
        id,
        createdAt: sortedSummaries[0]?.createdAt || id,
        packCount: packs.length,
        complete: missingLensIds.length === 0,
        lensIds: packs.map((pack) => pack.lensId),
        missingLensIds,
        sceneCropCount: packs.reduce((total, pack) => total + pack.days.filter((day) => day.hasSceneCrop).length, 0),
        packs,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

function buildLensComparisonPack(recordingsRoot: string, summary: DreamVisualSummary, sourcePackCount: number): LensComparisonPack {
  const lens = resolveDirectorLens(readLensId(summary.raw));
  const days = readDays(recordingsRoot, summary);
  const tuningCue = days.find((day) => day.tuneCue)?.tuneCue || formatDirectorLensSceneCue(lens.id);
  const motionVerified = readBoolean(readRecord(summary.raw.motion)?.changed);
  const demoRoadbook = readString(summary.raw.demoRoadbook) || "dali";
  const sceneCropCount = days.filter((day) => day.hasSceneCrop).length;

  return {
    id: summary.id,
    createdAt: summary.createdAt,
    demoRoadbook,
    lensId: lens.id,
    lensLabel: lens.shortLabel,
    lensProof: readLensProof(summary.raw) || lens.proofLabel,
    tuningCue,
    galleryPath: toRecordingLink(path.join(dreamVisualDir, summary.id, "index.html")),
    summaryPath: toRecordingLink(path.join(dreamVisualDir, summary.id, "summary.json")),
    notesPath: existsSync(path.join(summary.packDir, "clip-notes.md")) ? toRecordingLink(path.join(dreamVisualDir, summary.id, "clip-notes.md")) : "",
    dayCount: days.length,
    motionVerified,
    sourcePackCount,
    days,
    checklist: [
      {
        label: "D1-D4",
        state: days.length === 4 ? "ready" : "needs-review",
        detail: days.length === 4 ? "4 shots" : `${days.length} shots`,
      },
      {
        label: "Tune",
        state: tuningCue ? "ready" : "needs-review",
        detail: tuningCue || "missing cue",
      },
      {
        label: "3D crop",
        state: sceneCropCount === days.length && days.length > 0 ? "ready" : "needs-review",
        detail: sceneCropCount === days.length && days.length > 0 ? "scene frames" : `${sceneCropCount}/${days.length} crops`,
      },
      {
        label: "Motion",
        state: motionVerified ? "ready" : "needs-review",
        detail: motionVerified ? "micro-motion verified" : "motion pending",
      },
    ],
  };
}

function readDays(recordingsRoot: string, summary: DreamVisualSummary): LensComparisonDay[] {
  const rawDays = Array.isArray(summary.raw.days) ? summary.raw.days : [];

  return rawDays
    .map((item) => readRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => {
      const day = readNumber(item.day);
      const timeline = readTimelineItem(item, day);
      const inspectorGrid = readGrid(item.inspectorGrid);
      const proofStack = readGrid(item.proofStack);
      const canvasStats = readRecord(item.canvasStats) || {};
      const screenshotPath = readScreenshotPath(recordingsRoot, summary.packDir, item, day, summary.raw);
      const sceneScreenshotPath = readSceneScreenshotPath(recordingsRoot, item, screenshotPath);
      const hasSceneCrop = sceneScreenshotPath !== screenshotPath;

      return {
        day,
        label: timeline.label || `D${day}`,
        cue: timeline.cue,
        screenshotPath,
        screenshotUrl: buildRecordingFileUrl(screenshotPath),
        sceneScreenshotPath,
        sceneScreenshotUrl: buildRecordingFileUrl(sceneScreenshotPath),
        hasSceneCrop,
        tuneCue: readGridValue(inspectorGrid, "Tune"),
        compositionProof: readGridValue(proofStack, "Composition"),
        lit: readNumber(canvasStats.lit),
        varied: readNumber(canvasStats.varied),
        checksum: readNumber(canvasStats.checksum),
      };
    })
    .filter((day) => day.day > 0)
    .sort((a, b) => a.day - b.day);
}

function readTimelineItem(dayRecord: Record<string, unknown>, day: number) {
  const timeline = Array.isArray(dayRecord.timeline) ? dayRecord.timeline : [];
  const active = timeline.map((item) => readRecord(item)).find((item) => readBoolean(item?.active));
  const fallback = timeline.map((item) => readRecord(item)).find((item) => readNumber(item?.day) === day);

  return {
    label: readString(active?.label) || readString(fallback?.label),
    cue: readString(active?.cue) || readString(fallback?.cue),
  };
}

function readScreenshotPath(
  recordingsRoot: string,
  packDir: string,
  dayRecord: Record<string, unknown>,
  day: number,
  summary: Record<string, unknown>,
) {
  const rawPath = readString(dayRecord.screenshotPath);
  if (rawPath) {
    return toRecordingRelativePath(recordingsRoot, rawPath);
  }

  const demoRoadbook = readString(summary.demoRoadbook) || "dali";
  return toRecordingRelativePath(recordingsRoot, path.join(packDir, `dream-${demoRoadbook}-d${day}.png`));
}

function readSceneScreenshotPath(recordingsRoot: string, dayRecord: Record<string, unknown>, screenshotPath: string) {
  const rawPath = readString(dayRecord.sceneScreenshotPath);
  return rawPath ? toRecordingRelativePath(recordingsRoot, rawPath) : screenshotPath;
}

function toRecordingRelativePath(recordingsRoot: string, assetPath: string) {
  const rootAbsolute = path.resolve(recordingsRoot);
  const assetAbsolute = path.isAbsolute(assetPath) ? path.resolve(assetPath) : path.resolve(assetPath);

  if (assetAbsolute === rootAbsolute || assetAbsolute.startsWith(`${rootAbsolute}${path.sep}`)) {
    return toRecordingLink(path.relative(rootAbsolute, assetAbsolute));
  }

  const normalized = toRecordingLink(path.normalize(assetPath));
  const marker = `recordings/`;
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + marker.length);
  }

  return normalized;
}

export function buildRecordingFileUrl(relativePath: string) {
  return `/api/recording-assets/file?path=${encodeURIComponent(relativePath)}`;
}

export function resolveRecordingAssetFile(recordingsRoot: string, relativePath: string) {
  if (!relativePath || relativePath.includes("\0")) {
    return null;
  }

  const rootAbsolute = path.resolve(recordingsRoot);
  const target = path.resolve(rootAbsolute, relativePath);
  const insideRoot = target === rootAbsolute || target.startsWith(`${rootAbsolute}${path.sep}`);
  const allowed = [".png", ".jpg", ".jpeg", ".webp"].includes(path.extname(target).toLowerCase());
  return insideRoot && allowed ? target : null;
}

function readLensId(summary: Record<string, unknown>): DirectorLensId {
  const activeLens = readRecord(summary.activeLens);
  const activeId = readString(activeLens?.id);
  if (directorLenses.some((lens) => lens.id === activeId)) {
    return activeId as DirectorLensId;
  }

  const directorLens = readString(summary.directorLens);
  if (directorLenses.some((lens) => lens.id === directorLens)) {
    return directorLens as DirectorLensId;
  }

  const proof = readLensProof(summary);
  const byProof = directorLenses.find((lens) => lens.proofLabel === proof);
  return byProof?.id || "auto";
}

function readLensBatchId(summary: DreamVisualSummary) {
  const lensId = readLensId(summary.raw);
  const suffix = `-lens-${lensId}`;
  return summary.id.endsWith(suffix) ? summary.id.slice(0, -suffix.length) : "";
}

function formatCompactDelta(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K`;
  }

  return `${value}`;
}

function readLensProof(summary: Record<string, unknown>) {
  const activeLens = readRecord(summary.activeLens);
  return readString(activeLens?.proof) || readString(summary.directorLens);
}

function formatDirectorLensSceneCue(id: DirectorLensId) {
  const tuning = buildDirectorLensSceneTuning(id);
  return `skyline ${tuning.skylineHeightScale.toFixed(2)}x / water ${tuning.waterDepthScale.toFixed(2)}x / route ${tuning.routeOpacityScale.toFixed(2)}x`;
}

function readGrid(value: unknown) {
  return Array.isArray(value) ? value.map((item) => readRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item)) : [];
}

function readGridValue(grid: Record<string, unknown>[], label: string) {
  return readString(grid.find((item) => readString(item.label) === label)?.value);
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(value: unknown) {
  return value === true;
}

function toRecordingLink(relativePath: string) {
  return relativePath.split(path.sep).join("/");
}
