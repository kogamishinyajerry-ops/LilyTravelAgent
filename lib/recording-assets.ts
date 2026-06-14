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
  visualProof: RecordingDreamVisualProofSummary | null;
  studioProof: RecordingStudioProofPlaybackSummary | null;
};

export type RecordingAssetsSummary = {
  recordingsRoot: string;
  packCount: number;
  countsByType: Record<RecordingAssetType, number>;
  latestPack: RecordingAssetPack | null;
  recentPacks: RecordingAssetPack[];
  latestCandidateHandoff: RecordingCandidateHandoffSummary | null;
  latestDreamVisualProof: RecordingDreamVisualProofSummary | null;
  latestRecordingIndexCheck: RecordingIndexCheckSummary | null;
  latestRecordingSuiteRun: RecordingSuiteRunSummary | null;
  latestStudioProofPlayback: RecordingStudioProofPlaybackSummary | null;
  proofStoryProductionAssets: RecordingProofStoryProductionAssetsSummary;
  indexAvailable: boolean;
  indexPath: string;
  clipIndexAvailable: boolean;
  clipIndexPath: string;
};

export type RecordingProofStoryProductionAssetsSummary = {
  scriptMaterialReady: boolean;
  htmlIndexReady: boolean;
  clipIndexReady: boolean;
  ready: boolean;
};

export type RecordingCandidateHandoffSummary = {
  id: string;
  createdAt: string;
  captureCount: number;
  summaryPath: string;
  notesPath: string;
};

export type RecordingDreamVisualProofSummary = {
  id: string;
  createdAt: string;
  finalCueLabel: string;
  finalCueValue: string;
  buttonTextAfterPlayback: string;
  cueLabels: string[];
  screenshotPath: string;
  summaryPath: string;
  notesPath: string;
};

export type RecordingIndexCheckSummary = {
  id: string;
  createdAt: string;
  finalCueLabel: string;
  finalCueValue: string;
  linkCount: number;
  proofChecks: RecordingIndexProofCheckSummary[];
  scriptMaterialCheck: RecordingIndexScriptMaterialCheckSummary | null;
  proofStoryDeliveryLine: string;
  proofStoryCompleteLine: string;
  proofStoryCompleteBundleLine: string;
  proofText: string;
  apiIndexUrl: string;
  screenshotPath: string;
  summaryPath: string;
  notesPath: string;
};

export type RecordingIndexProofCheckSummary = {
  proofId: string;
  label: string;
  checkedLinkCount: number;
  expectedLinkCount: number;
  screenshotPath: string;
};

export type RecordingIndexScriptMaterialCheckSummary = {
  proofId: string;
  label: string;
  checkedLinkCount: number;
  expectedLinkCount: number;
  screenshotPath: string;
  summaryPath: string;
};

export type RecordingSuiteRunSummary = {
  id: string;
  createdAt: string;
  status: "passed" | "failed";
  stepCount: number;
  passedStepCount: number;
  durationMs: number;
  failureMessage: string;
  summaryPath: string;
  notesPath: string;
};

export type RecordingStudioProofPlaybackSummary = {
  id: string;
  createdAt: string;
  finalCueLabel: string;
  finalCueState: string;
  finalCueDetail: string;
  buttonTextAfterPlayback: string;
  cueLabels: string[];
  screenshotPath: string;
  summaryPath: string;
  notesPath: string;
  scriptMaterial: RecordingStudioScriptMaterialSummary | null;
};

export type RecordingStudioScriptMaterialSummary = {
  visible: boolean;
  scriptPath: string;
  cue: string;
  buttonText: string;
  handoffPreview: string;
  handoffCopyState: string;
  completeLine?: string;
  completeBundleLine?: string;
  completeBundleCopyState?: string;
  bundleChainLine?: string;
  bundleChainCopyState?: string;
  screenshotPath: string;
};

const sources = [
  { type: "dream" as const, dir: "visual-checks", label: "/dream visual QA" },
  { type: "studio" as const, dir: "studio-checks", label: "/studio recording QA" },
  { type: "bridge" as const, dir: "handoff-checks", label: "/studio ↔ /dream handoff QA" },
];

export async function readRecordingAssetsSummary(recordingsRoot = process.env.RECORDINGS_DIR || "recordings"): Promise<RecordingAssetsSummary> {
  const packs = await listRecordingAssetPacks(recordingsRoot);
  const latestCandidateHandoff = await readLatestCandidateHandoff(recordingsRoot);
  const latestDreamVisualProof = await readLatestDreamVisualProof(recordingsRoot);
  const latestRecordingIndexCheck = await readLatestRecordingIndexCheck(recordingsRoot);
  const latestRecordingSuiteRun = await readLatestRecordingSuiteRun(recordingsRoot);
  const latestStudioProofPlayback = await readLatestStudioProofPlayback(recordingsRoot);
  const latestPack = packs[0] || null;
  const indexPath = path.join(recordingsRoot, "index.html");
  const clipIndexPath = path.join(recordingsRoot, "clip-index.md");
  const proofStoryProductionAssets = await readProofStoryProductionAssets(indexPath, clipIndexPath, latestStudioProofPlayback);

  return {
    recordingsRoot,
    packCount: packs.length,
    countsByType: countPacksByType(packs),
    latestPack,
    recentPacks: packs.slice(0, 3),
    latestCandidateHandoff,
    latestDreamVisualProof,
    latestRecordingIndexCheck,
    latestRecordingSuiteRun,
    latestStudioProofPlayback,
    proofStoryProductionAssets,
    indexAvailable: existsSync(indexPath),
    indexPath,
    clipIndexAvailable: existsSync(clipIndexPath),
    clipIndexPath,
  };
}

async function readProofStoryProductionAssets(
  indexPath: string,
  clipIndexPath: string,
  latestStudioProofPlayback: RecordingStudioProofPlaybackSummary | null,
): Promise<RecordingProofStoryProductionAssetsSummary> {
  const scriptMaterialReady = Boolean(latestStudioProofPlayback?.scriptMaterial);
  const htmlIndexReady = await fileIncludes(indexPath, "Proof Story Production Assets");
  const clipIndexReady = await fileIncludes(clipIndexPath, "Proof Story Production Assets");

  return {
    scriptMaterialReady,
    htmlIndexReady,
    clipIndexReady,
    ready: scriptMaterialReady && htmlIndexReady && clipIndexReady,
  };
}

async function fileIncludes(filePath: string, text: string) {
  if (!existsSync(filePath)) {
    return false;
  }

  return (await readFile(filePath, "utf8")).includes(text);
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

async function readLatestStudioProofPlayback(recordingsRoot: string): Promise<RecordingStudioProofPlaybackSummary | null> {
  const sourceRoot = path.join(recordingsRoot, "studio-checks");
  if (!existsSync(sourceRoot)) {
    return null;
  }

  const entries = await readdir(sourceRoot);
  const runs: RecordingStudioProofPlaybackSummary[] = [];

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
    const proofPlayback = readStudioProofPlaybackFromSummary(entry, packDir, summary);
    if (!proofPlayback) {
      continue;
    }

    runs.push(proofPlayback);
  }

  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}

async function readLatestRecordingSuiteRun(recordingsRoot: string): Promise<RecordingSuiteRunSummary | null> {
  const sourceRoot = path.join(recordingsRoot, "suite-runs");
  if (!existsSync(sourceRoot)) {
    return null;
  }

  const entries = await readdir(sourceRoot);
  const runs: RecordingSuiteRunSummary[] = [];

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
    const steps = Array.isArray(summary.steps) ? summary.steps : [];
    runs.push({
      id: entry,
      createdAt: readString(summary.createdAt) || readString(summary.finishedAt) || entry,
      status: readString(summary.status) === "failed" ? "failed" : "passed",
      stepCount: readNumber(summary.stepCount) || steps.length,
      passedStepCount: steps.filter((step) => readString((step as Record<string, unknown>).status) === "passed").length,
      durationMs: readNumber(summary.durationMs),
      failureMessage: readString(summary.failureMessage),
      summaryPath: toRecordingLink(path.join("suite-runs", entry, "summary.json")),
      notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("suite-runs", entry, "clip-notes.md")) : "",
    });
  }

  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}

async function readLatestRecordingIndexCheck(recordingsRoot: string): Promise<RecordingIndexCheckSummary | null> {
  const sourceRoot = path.join(recordingsRoot, "index-checks");
  if (!existsSync(sourceRoot)) {
    return null;
  }

  const entries = await readdir(sourceRoot);
  const runs: RecordingIndexCheckSummary[] = [];

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
    const localProof = typeof summary.localProof === "object" && summary.localProof
      ? summary.localProof as Record<string, unknown>
      : null;
    const screenshotFile = path.basename(readString(summary.screenshotPath));
    const links = Array.isArray(summary.links) ? summary.links : [];
    const proofChecks = readRecordingIndexProofChecks(summary, entry);
    const scriptMaterialCheck = readRecordingIndexScriptMaterialCheck(summary, entry);
    const notesFilePath = path.join(packDir, "clip-notes.md");
    const notesPath = existsSync(notesFilePath) ? toRecordingLink(path.join("index-checks", entry, "clip-notes.md")) : "";
    const proofStoryDeliveryLine = notesPath ? await readProofStoryDeliveryLine(notesFilePath) : "";
    const proofStoryCompleteLine = await readProofStoryCompleteLine(notesPath ? notesFilePath : "", summary);
    const proofStoryCompleteBundleLine = await readProofStoryCompleteBundleLine(notesPath ? notesFilePath : "", summary);

    runs.push({
      id: entry,
      createdAt: readString(summary.createdAt) || entry,
      finalCueLabel: readString(localProof?.finalCueLabel),
      finalCueValue: readString(localProof?.finalCueValue),
      linkCount: links.length,
      proofChecks,
      scriptMaterialCheck,
      proofStoryDeliveryLine,
      proofStoryCompleteLine,
      proofStoryCompleteBundleLine,
      proofText: readString(summary.proofText),
      apiIndexUrl: readString(summary.apiIndexUrl),
      screenshotPath: screenshotFile ? toRecordingLink(path.join("index-checks", entry, screenshotFile)) : "",
      summaryPath: toRecordingLink(path.join("index-checks", entry, "summary.json")),
      notesPath,
    });
  }

  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}

async function readProofStoryDeliveryLine(notesPath: string) {
  const notes = await readFile(notesPath, "utf8").catch(() => "");
  const line = readProofStoryLine(notes, "Proof Story Delivery ·");

  return line || "";
}

async function readProofStoryCompleteLine(notesPath: string, summary: Record<string, unknown>) {
  const notes = notesPath ? await readFile(notesPath, "utf8").catch(() => "") : "";
  const notesLine = readProofStoryLine(notes, "Proof Story Complete ·");
  if (notesLine) {
    return notesLine;
  }

  const scriptMaterialCheck = typeof summary.scriptMaterialCheck === "object" && summary.scriptMaterialCheck
    ? summary.scriptMaterialCheck as Record<string, unknown>
    : null;
  const proofTextLine = readProofStoryLine(readString(scriptMaterialCheck?.proofText), "Proof Story Complete ·");
  if (proofTextLine) {
    return proofTextLine;
  }

  const localStudioProof = typeof summary.localStudioProof === "object" && summary.localStudioProof
    ? summary.localStudioProof as Record<string, unknown>
    : null;
  const scriptMaterial = typeof localStudioProof?.scriptMaterial === "object" && localStudioProof.scriptMaterial
    ? localStudioProof.scriptMaterial as Record<string, unknown>
    : null;

  return readString(scriptMaterial?.completeLine);
}

async function readProofStoryCompleteBundleLine(notesPath: string, summary: Record<string, unknown>) {
  const notes = notesPath ? await readFile(notesPath, "utf8").catch(() => "") : "";
  const notesLine = readProofStoryLine(notes, "Proof Story Complete Bundle ·");
  if (notesLine) {
    return notesLine;
  }

  const scriptMaterialCheck = typeof summary.scriptMaterialCheck === "object" && summary.scriptMaterialCheck
    ? summary.scriptMaterialCheck as Record<string, unknown>
    : null;
  const proofTextLine = readProofStoryLine(readString(scriptMaterialCheck?.proofText), "Proof Story Complete Bundle ·");
  if (proofTextLine) {
    return proofTextLine;
  }

  const localStudioProof = typeof summary.localStudioProof === "object" && summary.localStudioProof
    ? summary.localStudioProof as Record<string, unknown>
    : null;
  const scriptMaterial = typeof localStudioProof?.scriptMaterial === "object" && localStudioProof.scriptMaterial
    ? localStudioProof.scriptMaterial as Record<string, unknown>
    : null;

  return readString(scriptMaterial?.completeBundleLine);
}

function readProofStoryLine(text: string, prefix: string) {
  return text
    .split(/\r?\n/)
    .map((item) => item.trim().replace(/^-\s*/, ""))
    .find((item) => item.startsWith(prefix)) || "";
}

function readRecordingIndexScriptMaterialCheck(summary: Record<string, unknown>, entry: string): RecordingIndexScriptMaterialCheckSummary | null {
  const scriptMaterialCheck = typeof summary.scriptMaterialCheck === "object" && summary.scriptMaterialCheck
    ? summary.scriptMaterialCheck as Record<string, unknown>
    : null;
  if (!scriptMaterialCheck) {
    return null;
  }

  const links = Array.isArray(scriptMaterialCheck.links) ? scriptMaterialCheck.links : [];
  const screenshotFile = path.basename(readString(scriptMaterialCheck.screenshotPath));
  return {
    proofId: readString(scriptMaterialCheck.proofId),
    label: readString(scriptMaterialCheck.label),
    checkedLinkCount: links.length,
    expectedLinkCount: 3,
    screenshotPath: screenshotFile ? toRecordingLink(path.join("index-checks", entry, screenshotFile)) : "",
    summaryPath: toRecordingLink(path.join("index-checks", entry, "summary.json")),
  };
}

function readRecordingIndexProofChecks(summary: Record<string, unknown>, entry: string): RecordingIndexProofCheckSummary[] {
  const proofChecks = Array.isArray(summary.proofChecks) ? summary.proofChecks : [];

  return proofChecks
    .map((item) => {
      const proofCheck = typeof item === "object" && item ? item as Record<string, unknown> : null;
      if (!proofCheck) {
        return null;
      }

      const links = Array.isArray(proofCheck.links) ? proofCheck.links : [];
      const screenshotFile = path.basename(readString(proofCheck.screenshotPath));
      return {
        proofId: readString(proofCheck.proofId),
        label: readString(proofCheck.label),
        checkedLinkCount: links.length,
        expectedLinkCount: 3,
        screenshotPath: screenshotFile ? toRecordingLink(path.join("index-checks", entry, screenshotFile)) : "",
      };
    })
    .filter((item): item is RecordingIndexProofCheckSummary => Boolean(item?.proofId && item.label));
}

async function readLatestDreamVisualProof(recordingsRoot: string): Promise<RecordingDreamVisualProofSummary | null> {
  const sourceRoot = path.join(recordingsRoot, "visual-checks");
  if (!existsSync(sourceRoot)) {
    return null;
  }

  const entries = await readdir(sourceRoot);
  const runs: RecordingDreamVisualProofSummary[] = [];

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
    const visualProof = readDreamVisualProofFromSummary(entry, packDir, summary);
    if (!visualProof) {
      continue;
    }

    runs.push(visualProof);
  }

  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}

function readDreamVisualProofFromSummary(entry: string, packDir: string, summary: Record<string, unknown>): RecordingDreamVisualProofSummary | null {
  const visualProof = typeof summary.visualProof === "object" && summary.visualProof ? summary.visualProof as Record<string, unknown> : null;
  const finalCue = typeof visualProof?.finalActiveCue === "object" && visualProof.finalActiveCue
    ? visualProof.finalActiveCue as Record<string, unknown>
    : null;
  if (!visualProof || !finalCue) {
    return null;
  }

  const initialCues = Array.isArray(visualProof.initialCues) ? visualProof.initialCues : [];
  const screenshotFile = path.basename(readString(visualProof.screenshotPath));
  return {
    id: entry,
    createdAt: readString(summary.createdAt) || entry,
    finalCueLabel: readString(finalCue.label),
    finalCueValue: readString(finalCue.value),
    buttonTextAfterPlayback: readString(visualProof.buttonTextAfterPlayback),
    cueLabels: initialCues
      .map((item) => readString((item as Record<string, unknown>).label))
      .filter(Boolean),
    screenshotPath: screenshotFile ? toRecordingLink(path.join("visual-checks", entry, screenshotFile)) : "",
    summaryPath: toRecordingLink(path.join("visual-checks", entry, "summary.json")),
    notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("visual-checks", entry, "clip-notes.md")) : "",
  };
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
      visualProof: source.type === "dream" ? readDreamVisualProofFromSummary(entry, packDir, summary) : null,
      studioProof: source.type === "studio" ? readStudioProofPlaybackFromSummary(entry, packDir, summary) : null,
    });
  }

  return packs;
}

function readStudioProofPlaybackFromSummary(entry: string, packDir: string, summary: Record<string, unknown>): RecordingStudioProofPlaybackSummary | null {
  const proofPlayback = typeof summary.proofPlayback === "object" && summary.proofPlayback
    ? summary.proofPlayback as Record<string, unknown>
    : null;
  const finalCue = typeof proofPlayback?.finalActiveCue === "object" && proofPlayback.finalActiveCue
    ? proofPlayback.finalActiveCue as Record<string, unknown>
    : null;
  if (!proofPlayback || !finalCue) {
    return null;
  }

  const initialCues = Array.isArray(proofPlayback.initialCues) ? proofPlayback.initialCues : [];
  const screenshotFile = path.basename(readString(proofPlayback.screenshotPath));
  return {
    id: entry,
    createdAt: readString(summary.createdAt) || entry,
    finalCueLabel: readString(finalCue.label),
    finalCueState: readString(finalCue.state),
    finalCueDetail: readString(finalCue.detail),
    buttonTextAfterPlayback: readString(proofPlayback.buttonTextAfterPlayback),
    cueLabels: initialCues
      .map((item) => readString((item as Record<string, unknown>).label))
      .filter(Boolean),
    screenshotPath: screenshotFile ? toRecordingLink(path.join("studio-checks", entry, screenshotFile)) : "",
    summaryPath: toRecordingLink(path.join("studio-checks", entry, "summary.json")),
    notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("studio-checks", entry, "clip-notes.md")) : "",
    scriptMaterial: readStudioScriptMaterialFromSummary(entry, summary),
  };
}

function readStudioScriptMaterialFromSummary(entry: string, summary: Record<string, unknown>): RecordingStudioScriptMaterialSummary | null {
  const scriptMaterial = typeof summary.scriptMaterial === "object" && summary.scriptMaterial
    ? summary.scriptMaterial as Record<string, unknown>
    : null;
  if (!scriptMaterial) {
    return null;
  }

  const screenshotFile = path.basename(readString(scriptMaterial.screenshotPath));
  const completeLine = readString(scriptMaterial.completeLine);
  const completeBundleLine = readString(scriptMaterial.completeBundleLine);
  const completeBundleCopyState = readString(scriptMaterial.completeBundleCopyState);
  const bundleChainLine = readString(scriptMaterial.bundleChainLine);
  const bundleChainCopyState = readString(scriptMaterial.bundleChainCopyState);
  return {
    visible: Boolean(scriptMaterial.visible),
    scriptPath: readString(scriptMaterial.scriptPath),
    cue: readString(scriptMaterial.cue),
    buttonText: readString(scriptMaterial.buttonText),
    handoffPreview: readString(scriptMaterial.handoffPreview),
    handoffCopyState: readString(scriptMaterial.handoffCopyState),
    ...(completeLine ? { completeLine } : {}),
    ...(completeBundleLine ? { completeBundleLine } : {}),
    ...(completeBundleCopyState ? { completeBundleCopyState } : {}),
    ...(bundleChainLine ? { bundleChainLine } : {}),
    ...(bundleChainCopyState ? { bundleChainCopyState } : {}),
    screenshotPath: screenshotFile ? toRecordingLink(path.join("studio-checks", entry, screenshotFile)) : "",
  };
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

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
