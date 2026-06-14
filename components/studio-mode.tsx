"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Archive,
  BookOpen,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  ListChecks,
  Loader2,
  Mic2,
  MonitorPlay,
  Route,
  RotateCcw,
  Sparkles,
  Video,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { defaultBrief } from "@/lib/default-brief";
import { getRecordingAssetTypeLabel, getRecordingAssetUsageHint, type RecordingAssetType } from "@/lib/recording-asset-labels";
import { coastalSampleRoadbook, sampleRoadbook } from "@/lib/sample-roadbook";
import type { GenerateRoadbookResponse, GeocodePlace, GeocodePlacesResponse, GeocodePoint, Roadbook, TravelBrief } from "@/lib/roadbook-types";
import { clipBlueprints, creatorMilestones, vibeCodingLessons } from "@/lib/vibe-coding-content";

type StudioStage = "demo" | "generating" | "geocoding" | "ready" | "error";
type StudioDemoRoadbookId = "dali" | "coast";
type StudioModeProps = {
  initialDemo?: string;
};
type RecordingAssetsState =
  | { status: "loading" }
  | {
      status: "ready";
      packCount: number;
      countsByType: Record<RecordingAssetType, number>;
      indexAvailable: boolean;
      indexUrl: string;
      lensComparisonUrl: string;
      recentPacks: RecordingAssetSummaryPack[];
      latestPack: {
        title: string;
        createdAt: string;
        label: string;
      } | null;
      latestCandidateHandoff: RecordingCandidateHandoffSummary | null;
      latestDreamVisualProof: RecordingDreamVisualProofSummary | null;
      latestRecordingIndexCheck: RecordingIndexCheckSummary | null;
      latestRecordingSuiteRun: RecordingSuiteRunSummary | null;
      latestStudioProofPlayback: RecordingStudioProofPlaybackSummary | null;
    }
  | { status: "error"; message: string };

type RecordingCandidateHandoffSummary = {
  id: string;
  createdAt: string;
  captureCount: number;
  summaryPath: string;
  notesPath?: string;
};

type RecordingDreamVisualProofSummary = {
  id: string;
  createdAt: string;
  finalCueLabel: string;
  finalCueValue: string;
  buttonTextAfterPlayback: string;
  cueLabels: string[];
  screenshotPath: string;
  summaryPath: string;
  notesPath?: string;
};

type RecordingIndexCheckSummary = {
  id: string;
  createdAt: string;
  finalCueLabel: string;
  finalCueValue: string;
  linkCount: number;
  proofChecks?: RecordingIndexProofCheckSummary[];
  proofText: string;
  apiIndexUrl: string;
  screenshotPath: string;
  summaryPath: string;
  notesPath?: string;
};

type RecordingIndexProofCheckSummary = {
  proofId: string;
  label: string;
  checkedLinkCount: number;
  expectedLinkCount: number;
  screenshotPath?: string;
};

type RecordingSuiteRunSummary = {
  id: string;
  createdAt: string;
  status: "passed" | "failed";
  stepCount: number;
  passedStepCount: number;
  durationMs: number;
  failureMessage: string;
  summaryPath: string;
  notesPath?: string;
};

type RecordingStudioProofPlaybackSummary = {
  id: string;
  createdAt: string;
  finalCueLabel: string;
  finalCueState: string;
  finalCueDetail: string;
  buttonTextAfterPlayback: string;
  cueLabels: string[];
  screenshotPath: string;
  summaryPath: string;
  notesPath?: string;
};

type RecordingAssetSummaryPack = {
  type: RecordingAssetType;
  id: string;
  title: string;
  createdAt: string;
  label: string;
  detail: string;
  lens?: string;
};

type RecordingAssetsApiResponse = {
  ok?: boolean;
  packCount?: number;
  countsByType?: Record<RecordingAssetType, number>;
  indexAvailable?: boolean;
  indexUrl?: string;
  lensComparisonUrl?: string;
  recentPacks?: RecordingAssetSummaryPack[];
  latestPack?: {
    title: string;
    createdAt: string;
    label: string;
  } | null;
  latestCandidateHandoff?: RecordingCandidateHandoffSummary | null;
  latestDreamVisualProof?: RecordingDreamVisualProofSummary | null;
  latestRecordingIndexCheck?: RecordingIndexCheckSummary | null;
  latestRecordingSuiteRun?: RecordingSuiteRunSummary | null;
  latestStudioProofPlayback?: RecordingStudioProofPlaybackSummary | null;
  message?: string;
};

const studioCoastalBrief: TravelBrief = {
  ...defaultBrief,
  destination: "三亚海岛",
  city: "三亚",
  interests: ["海岸灯塔", "蓝色海湾", "港口", "日落", "咖啡"],
  specialRequests: "文字极简，适合 16:9 录屏，重点展示海岸 preset 的灯塔、海湾、港口和日落。",
  tone: "极简、梦境、海岸电影感、动态网页",
};

const studioDemoRoadbooks: Array<{
  id: StudioDemoRoadbookId;
  label: string;
  note: string;
  roadbook: Roadbook;
  brief: TravelBrief;
}> = [
  {
    id: "dali",
    label: "大理",
    note: "苍山洱海",
    roadbook: sampleRoadbook,
    brief: defaultBrief,
  },
  {
    id: "coast",
    label: "海岸",
    note: "灯塔海湾",
    roadbook: coastalSampleRoadbook,
    brief: studioCoastalBrief,
  },
];

function normalizeStudioDemoRoadbookId(value?: string): StudioDemoRoadbookId {
  return value === "coast" ? "coast" : "dali";
}

function getStudioDemoRoadbook(value?: string) {
  const demoId = normalizeStudioDemoRoadbookId(value);
  return studioDemoRoadbooks.find((option) => option.id === demoId) || studioDemoRoadbooks[0];
}

const localDemoModelLabel = "Local Demo";
const recordingSuiteCommand = "npm run check:recording-suite";
const candidateHandoffCommand = "npm run check:lens-candidate-handoff";
const recordingIndexCommand = "npm run check:recording-index";
const dreamVisualProofCommand = "npm run check:dream-visuals";
const studioVisualProofCommand = "npm run check:studio-visuals";
const proofStoryScriptPath = "docs/recording/proof-story-demo-script.md";
const proofStoryScriptCue = "证据时间线 → 四行讲解稿预览 → 复制讲解稿";
const recordingWorkflowSteps = [
  {
    step: "1",
    title: "复制命令",
    cue: "从 Studio 带走本地 QA 指令。",
  },
  {
    step: "2",
    title: "运行 QA",
    cue: "生成 Dream / Studio 截图与 notes。",
  },
  {
    step: "3",
    title: "刷新素材",
    cue: "回到面板读取最新素材包。",
  },
  {
    step: "4",
    title: "打开索引",
    cue: "进入完整素材库挑选剪辑素材。",
  },
  {
    step: "5",
    title: "候选 QA",
    cue: "验证 Top shots 是否带着 rank / day / lens 进入 Dream。",
  },
  {
    step: "6",
    title: "桥接证据",
    cue: "用 Bridge QA 状态卡证明页面闭环。",
  },
];
const studioScriptSteps = [
  {
    step: "01",
    title: "输入需求",
    cue: "目的地、天数、风格和成品要求先结构化。",
  },
  {
    step: "02",
    title: "生成路书",
    cue: "MiniMax 输出路书，地图和梦境画面接管表达。",
  },
  {
    step: "03",
    title: "沉淀素材",
    cue: "Recording suite 生成截图、notes 和本地索引。",
  },
  {
    step: "04",
    title: "桥接证据",
    cue: "指向 Bridge QA 卡片，说明 Studio 和 Dream 的闭环已验证。",
  },
];
const studioShotCue = {
  title: "当前镜头建议",
  primary: "输入区 → 路书预览 → 素材资产 → 桥接证据",
  note: "讲：这不是只生成攻略，而是在沉淀可复用的 Agent 素材流水线和页面闭环证据。",
};
const studioSeriesChapters = [
  "录屏台成型",
  "素材管线可视化",
  "Agent 产品化",
  "桥接证据",
];

function buildPlaces(roadbook: Roadbook): GeocodePlace[] {
  return roadbook.days.flatMap((day) =>
    day.stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      addressHint: stop.addressHint,
      day: day.day,
      category: stop.category,
    })),
  );
}

function studioStageText(stage: StudioStage) {
  if (stage === "generating") return "MiniMax 出稿中";
  if (stage === "geocoding") return "高德定位中";
  if (stage === "ready") return "真实路书已生成";
  if (stage === "error") return "配置提示可录";
  return "示例脚本模式";
}

function formatRecordingAssetTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildRecordingEvidenceUrl(relativePath?: string) {
  return relativePath ? `/api/recording-assets/file?path=${encodeURIComponent(relativePath)}` : "";
}

function formatDurationMs(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "0s";
  }

  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function getRecordingAssetReadiness(summary: Extract<RecordingAssetsState, { status: "ready" }>) {
  if (!summary.indexAvailable) {
    return {
      state: "missing",
      title: "等待生成索引",
      detail: "先跑 recording suite，再刷新这里。",
    };
  }

  if (summary.packCount === 0) {
    return {
      state: "empty",
      title: "素材待补充",
      detail: "索引已存在，继续生成 QA 素材。",
    };
  }

  return {
    state: "ready",
    title: "素材已准备",
    detail: "可以直接打开索引挑选片段。",
  };
}

function getBridgeEvidenceCue(recordingAssets: RecordingAssetsState) {
  if (recordingAssets.status !== "ready") {
    return {
      state: "pending",
      title: "Bridge QA 读取中",
      detail: "等待素材面板读取本地桥接证据。",
    };
  }

  const bridgeCount = recordingAssets.countsByType.bridge;
  if (bridgeCount > 0) {
    return {
      state: "ready",
      title: `${bridgeCount} 个桥接素材`,
      detail: "Studio-Dream 闭环已验证，可以作为讲解证据。",
    };
  }

  return {
    state: "missing",
    title: "等待 Bridge QA",
    detail: "运行 recording suite 后会生成桥接截图素材。",
  };
}

function getRecordingIndexCheckCoverage(indexCheck: RecordingIndexCheckSummary) {
  const isDoubleProof = indexCheck.linkCount >= 6;
  const label = isDoubleProof ? "Dream + Studio 双证据" : "Dream 单证据";
  const linkUnit = isDoubleProof ? "条链接" : "条证据链接";

  return {
    isDoubleProof,
    label,
    checklistDetail: `${label} · ${indexCheck.linkCount} ${linkUnit}`,
    cardDetail: `${label} · ${indexCheck.finalCueLabel} · ${indexCheck.finalCueValue} · ${indexCheck.linkCount} 条证据链接`,
    cue: isDoubleProof ? "确认总索引同时验收 Dream 和 Studio 两条证据链。" : "确认素材总索引本身也有自动验收。",
  };
}

function getRecordingIndexProofCheckLabel(proofCheck: RecordingIndexProofCheckSummary) {
  if (proofCheck.proofId === "dream") {
    return "Dream";
  }
  if (proofCheck.proofId === "studio") {
    return "Studio";
  }
  return proofCheck.label.replace(/\s+Proof$/, "") || proofCheck.proofId;
}

function getRecordingEvidenceTimeline(recordingAssets: RecordingAssetsState) {
  if (recordingAssets.status !== "ready") {
    return [];
  }

  const indexCoverage = recordingAssets.latestRecordingIndexCheck
    ? getRecordingIndexCheckCoverage(recordingAssets.latestRecordingIndexCheck)
    : null;

  return [
    {
      label: "Dream Proof",
      state: recordingAssets.latestDreamVisualProof ? "已验证" : "待运行",
      detail: recordingAssets.latestDreamVisualProof
        ? `${recordingAssets.latestDreamVisualProof.finalCueLabel} · ${recordingAssets.latestDreamVisualProof.finalCueValue}`
        : dreamVisualProofCommand,
      href: recordingAssets.latestDreamVisualProof?.summaryPath || "",
      tone: recordingAssets.latestDreamVisualProof ? "ready" : "missing",
    },
    {
      label: "Studio Proof",
      state: recordingAssets.latestStudioProofPlayback ? "已捕获" : "待运行",
      detail: recordingAssets.latestStudioProofPlayback
        ? `${recordingAssets.latestStudioProofPlayback.finalCueLabel} · ${recordingAssets.latestStudioProofPlayback.finalCueDetail}`
        : studioVisualProofCommand,
      href: recordingAssets.latestStudioProofPlayback?.summaryPath || "",
      tone: recordingAssets.latestStudioProofPlayback ? "ready" : "missing",
    },
    {
      label: "Index QA",
      state: recordingAssets.latestRecordingIndexCheck ? "已验证" : "待运行",
      detail: indexCoverage ? indexCoverage.checklistDetail : recordingIndexCommand,
      href: recordingAssets.latestRecordingIndexCheck?.summaryPath || "",
      tone: recordingAssets.latestRecordingIndexCheck ? "ready" : "missing",
    },
    {
      label: "Suite Run",
      state: recordingAssets.latestRecordingSuiteRun
        ? recordingAssets.latestRecordingSuiteRun.status === "passed"
          ? "已通过"
          : "失败"
        : "待运行",
      detail: recordingAssets.latestRecordingSuiteRun
        ? `${recordingAssets.latestRecordingSuiteRun.stepCount} 步 · ${recordingAssets.latestRecordingSuiteRun.passedStepCount} 通过`
        : recordingSuiteCommand,
      href: recordingAssets.latestRecordingSuiteRun?.summaryPath || "",
      tone: recordingAssets.latestRecordingSuiteRun
        ? recordingAssets.latestRecordingSuiteRun.status === "passed"
          ? "ready"
          : "failed"
        : "missing",
    },
  ];
}

function buildProofStoryLines(timeline: ReturnType<typeof getRecordingEvidenceTimeline>) {
  return timeline.map((item, index) => `${String(index + 1).padStart(2, "0")}. ${item.label}: ${item.state} · ${item.detail}`);
}

function getRecordingProofChecklist(recordingAssets: RecordingAssetsState) {
  if (recordingAssets.status !== "ready") {
    return [
      { label: "Bridge QA", state: "等待读取", detail: "读取本地桥接素材。", href: "", cue: "先证明 Studio 和 Dream 能互相跳转。" },
      { label: "Candidate QA", state: "等待读取", detail: "读取候选点击 QA。", href: "", cue: "再证明候选镜头点击后上下文不会丢。" },
      { label: "Lens Compare", state: "等待读取", detail: "读取镜头对比入口。", href: "", cue: "接着比较不同视觉镜头的成片差异。" },
      { label: "Asset Index", state: "等待读取", detail: "读取总素材索引。", href: "", cue: "最后进入素材库，挑录屏片段。" },
      { label: "Index QA", state: "等待读取", detail: "读取索引 QA 证据。", href: "", cue: "确认素材总索引本身也有自动验收。" },
      { label: "Suite Run", state: "等待读取", detail: "读取 full suite 总收据。", href: "", cue: "用 full suite 总收据为整条证据链收口。" },
    ];
  }

  const bridgeCount = recordingAssets.countsByType.bridge;
  const indexCoverage = recordingAssets.latestRecordingIndexCheck
    ? getRecordingIndexCheckCoverage(recordingAssets.latestRecordingIndexCheck)
    : null;
  return [
    {
      label: "Bridge QA",
      state: bridgeCount > 0 ? "已验证" : "待生成",
      detail: bridgeCount > 0 ? `${bridgeCount} 个桥接素材` : "运行 recording suite",
      href: "",
      cue: "先证明 Studio 和 Dream 能互相跳转。",
    },
    {
      label: "Candidate QA",
      state: recordingAssets.latestCandidateHandoff ? "已验证" : "待运行",
      detail: recordingAssets.latestCandidateHandoff
        ? `${recordingAssets.latestCandidateHandoff.captureCount} 个入口`
        : candidateHandoffCommand,
      href: recordingAssets.latestCandidateHandoff?.summaryPath || "",
      cue: "再证明候选镜头点击后上下文不会丢。",
    },
    {
      label: "Lens Compare",
      state: recordingAssets.lensComparisonUrl ? "可打开" : "待生成",
      detail: "镜头候选对比",
      href: recordingAssets.lensComparisonUrl,
      cue: "接着比较不同视觉镜头的成片差异。",
    },
    {
      label: "Asset Index",
      state: recordingAssets.indexAvailable ? "可打开" : "待生成",
      detail: recordingAssets.indexAvailable ? `${recordingAssets.packCount} 个素材包` : recordingSuiteCommand,
      href: recordingAssets.indexAvailable ? recordingAssets.indexUrl : "",
      cue: "最后进入素材库，挑录屏片段。",
    },
    {
      label: "Index QA",
      state: recordingAssets.latestRecordingIndexCheck ? "已验证" : "待运行",
      detail: indexCoverage ? indexCoverage.checklistDetail : recordingIndexCommand,
      href: recordingAssets.latestRecordingIndexCheck?.summaryPath || "",
      cue: indexCoverage ? indexCoverage.cue : "确认素材总索引本身也有自动验收。",
    },
    {
      label: "Suite Run",
      state: recordingAssets.latestRecordingSuiteRun
        ? recordingAssets.latestRecordingSuiteRun.status === "passed"
          ? "已通过"
          : "失败"
        : "待运行",
      detail: recordingAssets.latestRecordingSuiteRun
        ? `${recordingAssets.latestRecordingSuiteRun.stepCount} 步 · ${recordingAssets.latestRecordingSuiteRun.passedStepCount} 通过`
        : recordingSuiteCommand,
      href: recordingAssets.latestRecordingSuiteRun?.summaryPath || "",
      cue: "用 full suite 总收据为整条证据链收口。",
    },
  ];
}

export function StudioMode({ initialDemo = "dali" }: StudioModeProps = {}) {
  const initialDemoRoadbook = getStudioDemoRoadbook(initialDemo);
  const [brief, setBrief] = useState<TravelBrief>(initialDemoRoadbook.brief);
  const [demoRoadbookId, setDemoRoadbookId] = useState<StudioDemoRoadbookId | null>(initialDemoRoadbook.id);
  const [roadbook, setRoadbook] = useState<Roadbook>(initialDemoRoadbook.roadbook);
  const [points, setPoints] = useState<GeocodePoint[]>([]);
  const [stage, setStage] = useState<StudioStage>("demo");
  const [error, setError] = useState("");
  const [model, setModel] = useState(localDemoModelLabel);
  const [recordingAssets, setRecordingAssets] = useState<RecordingAssetsState>({ status: "loading" });
  const [recordingAssetsReadAt, setRecordingAssetsReadAt] = useState("");
  const [recordingAssetsRefreshing, setRecordingAssetsRefreshing] = useState(false);
  const [scriptMode, setScriptMode] = useState(false);
  const [recordingCommandCopyState, setRecordingCommandCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [candidateCommandCopyState, setCandidateCommandCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [proofStoryCopyState, setProofStoryCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [proofScriptCopyState, setProofScriptCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [proofCueIndex, setProofCueIndex] = useState(0);
  const [proofCuePlaying, setProofCuePlaying] = useState(false);

  const locatedCount = useMemo(() => points.filter((point) => point.status === "ok").length, [points]);
  const topStops = roadbook.days.flatMap((day) => day.stops.slice(0, 2)).slice(0, 8);
  const dreamHandoffHref = demoRoadbookId ? `/dream?demo=${demoRoadbookId}` : "/dream";
  const recordingProofChecklist = useMemo(() => getRecordingProofChecklist(recordingAssets), [recordingAssets]);
  const recordingIndexCoverage =
    recordingAssets.status === "ready" && recordingAssets.latestRecordingIndexCheck
      ? getRecordingIndexCheckCoverage(recordingAssets.latestRecordingIndexCheck)
      : null;
  const recordingEvidenceTimeline = useMemo(() => getRecordingEvidenceTimeline(recordingAssets), [recordingAssets]);
  const proofStoryLines = useMemo(() => buildProofStoryLines(recordingEvidenceTimeline), [recordingEvidenceTimeline]);

  const loadRecordingAssets = useCallback(
    async ({ markRefreshing = true, isActive = () => true }: { markRefreshing?: boolean; isActive?: () => boolean } = {}) => {
      if (markRefreshing) {
        setRecordingAssetsRefreshing(true);
      }

      try {
        const response = await fetch("/api/recording-assets", { cache: "no-store" });
        const data = (await response.json()) as RecordingAssetsApiResponse;
        if (!response.ok || !data.ok) {
          throw new Error(data.message || "录屏素材状态读取失败。");
        }
        if (!isActive()) return;
        setRecordingAssets({
          status: "ready",
          packCount: data.packCount || 0,
          countsByType: data.countsByType || { dream: 0, studio: 0, bridge: 0 },
          indexAvailable: Boolean(data.indexAvailable),
          indexUrl: data.indexUrl || "",
          lensComparisonUrl: data.lensComparisonUrl || "/api/recording-assets/lens-comparison",
          recentPacks: data.recentPacks || [],
          latestPack: data.latestPack || null,
          latestCandidateHandoff: data.latestCandidateHandoff || null,
          latestDreamVisualProof: data.latestDreamVisualProof || null,
          latestRecordingIndexCheck: data.latestRecordingIndexCheck || null,
          latestRecordingSuiteRun: data.latestRecordingSuiteRun || null,
          latestStudioProofPlayback: data.latestStudioProofPlayback || null,
        });
        setRecordingAssetsReadAt(new Date().toISOString());
      } catch (caught) {
        if (!isActive()) return;
        setRecordingAssets({
          status: "error",
          message: caught instanceof Error ? caught.message : "录屏素材状态读取失败。",
        });
      } finally {
        if (isActive()) {
          setRecordingAssetsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => loadRecordingAssets({ markRefreshing: false, isActive: () => active }));
    return () => {
      active = false;
    };
  }, [loadRecordingAssets]);

  useEffect(() => {
    if (!scriptMode || !proofCuePlaying) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextIndex = Math.min(proofCueIndex + 1, recordingProofChecklist.length - 1);
      setProofCueIndex(nextIndex);
      if (nextIndex >= recordingProofChecklist.length - 1) {
        setProofCuePlaying(false);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [proofCueIndex, proofCuePlaying, recordingProofChecklist.length, scriptMode]);

  function updateBrief<K extends keyof TravelBrief>(key: K, value: TravelBrief[K]) {
    setBrief((current) => ({ ...current, [key]: value }));
  }

  async function geocodeRoadbook(nextRoadbook: Roadbook) {
    setStage("geocoding");
    const response = await fetch("/api/geocode-places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: brief.city,
        places: buildPlaces(nextRoadbook),
      }),
    });
    const data = (await response.json()) as GeocodePlacesResponse;
    if (data.ok) {
      setPoints(data.points);
    }
    setStage("ready");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStage("generating");
    setDemoRoadbookId(null);
    setError("");
    setPoints([]);

    try {
      const response = await fetch("/api/generate-roadbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      const data = (await response.json()) as GenerateRoadbookResponse;
      if (!data.ok) {
        setError(data.message);
        setStage("error");
        return;
      }
      setRoadbook(data.roadbook);
      setModel(data.model);
      await geocodeRoadbook(data.roadbook);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "录屏模式生成时出现未知错误。");
      setStage("error");
    }
  }

  function resetDemo(nextDemoRoadbookId: StudioDemoRoadbookId = "dali") {
    const nextDemo = studioDemoRoadbooks.find((option) => option.id === nextDemoRoadbookId) || studioDemoRoadbooks[0];
    setDemoRoadbookId(nextDemo.id);
    setBrief(nextDemo.brief);
    setRoadbook(nextDemo.roadbook);
    setPoints([]);
    setError("");
    setModel(localDemoModelLabel);
    setStage("demo");
  }

  async function copyRecordingSuiteCommand() {
    try {
      await navigator.clipboard.writeText(recordingSuiteCommand);
      setRecordingCommandCopyState("copied");
    } catch {
      setRecordingCommandCopyState("error");
    }
  }

  async function copyCandidateHandoffCommand() {
    try {
      await navigator.clipboard.writeText(candidateHandoffCommand);
      setCandidateCommandCopyState("copied");
    } catch {
      setCandidateCommandCopyState("error");
    }
  }

  async function copyProofStory() {
    try {
      await navigator.clipboard.writeText(proofStoryLines.join("\n"));
      setProofStoryCopyState("copied");
    } catch {
      setProofStoryCopyState("error");
    }
  }

  async function copyProofStoryScriptPath() {
    try {
      await navigator.clipboard.writeText(proofStoryScriptPath);
      setProofScriptCopyState("copied");
    } catch {
      setProofScriptCopyState("error");
    }
  }

  function playProofCueSequence() {
    setProofCueIndex(0);
    setProofCuePlaying(true);
  }

  function toggleScriptMode() {
    if (scriptMode) {
      setProofCuePlaying(false);
      setProofCueIndex(0);
    }
    setScriptMode((current) => !current);
  }

  return (
    <main id="main-content" tabIndex={-1} className="studio-page">
      <section className="studio-stage">
        <header className="studio-topbar">
          <div className="studio-brand">
            <div className="brand-mark">
              <MonitorPlay size={22} />
            </div>
            <div>
              <p className="eyebrow">Studio Mode / 16:9</p>
              <h1>旅游路书 Agent 录屏台</h1>
            </div>
          </div>
          <div className="studio-top-actions">
            <span>{demoRoadbookId ? `${roadbook.destination} 本地演示` : roadbook.destination}</span>
            <span>{studioStageText(stage)}</span>
            {scriptMode ? <span className="studio-presenter-cue">讲解轨道已打开</span> : null}
            <button
              type="button"
              className={`studio-mode-toggle ${scriptMode ? "active" : ""}`}
              aria-pressed={scriptMode}
              onClick={toggleScriptMode}
            >
              <ListChecks size={16} />
              脚本模式
            </button>
            <Link href="/" className="ghost-link">
              <ArrowLeft size={16} />
              返回工具页
            </Link>
            <Link href={dreamHandoffHref} className="ghost-link">
              <Sparkles size={16} />
              梦境路书
            </Link>
          </div>
        </header>

        <div className="studio-grid">
          <aside className="studio-input-panel">
            <div className="studio-panel-heading">
              <p className="eyebrow">Input</p>
              <h2>镜头里的输入区</h2>
            </div>
            <form onSubmit={handleSubmit} className="studio-form">
              <label>
                <span>目的地</span>
                <input value={brief.destination} onChange={(event) => updateBrief("destination", event.target.value)} />
              </label>
              <div className="studio-form-row">
                <label>
                  <span>城市</span>
                  <input value={brief.city} onChange={(event) => updateBrief("city", event.target.value)} />
                </label>
                <label>
                  <span>天数</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={brief.days}
                    onChange={(event) => updateBrief("days", Number(event.target.value))}
                  />
                </label>
              </div>
              <label>
                <span>旅行者</span>
                <input value={brief.travelers} onChange={(event) => updateBrief("travelers", event.target.value)} />
              </label>
              <label>
                <span>成品要求</span>
                <textarea value={brief.specialRequests} onChange={(event) => updateBrief("specialRequests", event.target.value)} />
              </label>
              <button className="primary-action" type="submit" disabled={stage === "generating" || stage === "geocoding"}>
                {stage === "generating" || stage === "geocoding" ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                现场生成
              </button>
              <div className="studio-demo-switch" aria-label="本地演示路书">
                {studioDemoRoadbooks.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={demoRoadbookId === option.id ? "active" : ""}
                    onClick={() => resetDemo(option.id)}
                    aria-pressed={demoRoadbookId === option.id}
                  >
                    <strong>{option.label}</strong>
                    <small>{option.note}</small>
                  </button>
                ))}
              </div>
            </form>

            {error ? (
              <div className="studio-error">
                <AlertTriangle size={17} />
                <p>{error}</p>
              </div>
            ) : null}

            <div className="studio-script-card">
              <Video size={18} />
              <div>
                <strong>旁白提示</strong>
                <p>这一屏要讲清楚：先给 AI 明确输入，再让它输出可渲染的路书结构。</p>
              </div>
            </div>
          </aside>

          <section className="studio-roadbook-panel">
            <div className="studio-cover">
              <p className="eyebrow">Roadbook Preview</p>
              <h2>{roadbook.title}</h2>
              <p>{roadbook.subtitle}</p>
              <div className="studio-metrics">
                <span>{roadbook.durationLabel}</span>
                <span>{model}</span>
                <span>{locatedCount ? `${locatedCount} 个点位` : "地图待定位"}</span>
              </div>
            </div>

            <div className="studio-summary">
              <div>
                <p className="eyebrow">Concept</p>
                <h3>{roadbook.concept}</h3>
              </div>
              <div className="studio-highlight-list">
                {roadbook.highlights.slice(0, 5).map((highlight) => (
                  <span key={highlight}>
                    <CheckCircle2 size={14} />
                    {highlight}
                  </span>
                ))}
              </div>
            </div>

            <div className="studio-route-list">
              {roadbook.days.map((day) => (
                <div className="studio-day-card" key={day.day}>
                  <span>D{day.day}</span>
                  <strong>{day.title}</strong>
                  <p>{day.routeSummary}</p>
                </div>
              ))}
            </div>

            <div className="studio-stop-strip">
              {topStops.map((stop) => (
                <div key={stop.id}>
                  <Route size={14} />
                  <span>{stop.name}</span>
                </div>
              ))}
            </div>
          </section>

          <aside className="studio-creator-panel">
            <div className="studio-panel-heading">
              <p className="eyebrow">Creator Track</p>
              <h2>边开发边讲清楚</h2>
            </div>

            <div className="studio-demo-bridge" aria-label="Demo Bridge">
              <span>Demo Bridge</span>
              <strong>{roadbook.destination} → Dream</strong>
              <p>{demoRoadbookId ? "当前本地演示会带入同款梦境预览。" : "真实生成后可进入梦境预览继续录制。"}</p>
              <small className="studio-demo-bridge-badge">Recording suite 已覆盖</small>
              <Link href={dreamHandoffHref}>
                打开同款梦境预览
                <ExternalLink size={13} />
              </Link>
            </div>

            {scriptMode ? (
              <>
                <div className="studio-script-track" aria-label="录屏讲解轨道">
                  {studioScriptSteps.map((item) => (
                    <div key={item.step}>
                      <span>{item.step}</span>
                      <strong>{item.title}</strong>
                      <p>{item.cue}</p>
                    </div>
                  ))}
                </div>
                {(() => {
                  const bridgeEvidence = getBridgeEvidenceCue(recordingAssets);
                  return (
                    <div className={`studio-bridge-evidence ${bridgeEvidence.state}`} aria-label="Bridge QA 证据状态">
                      <span>Bridge QA 证据</span>
                      <strong>{bridgeEvidence.title}</strong>
                      <p>{bridgeEvidence.detail}</p>
                    </div>
                  );
                })()}
                <div className="studio-proof-checklist" aria-label="录屏证据清单">
                  <div className="studio-proof-checklist-heading">
                    <div>
                      <span>Proof Stack</span>
                      <strong>录屏证据清单</strong>
                    </div>
                    <button type="button" onClick={playProofCueSequence} aria-pressed={proofCuePlaying}>
                      {proofCuePlaying ? "讲解中" : "播放证据线"}
                    </button>
                  </div>
                  {recordingProofChecklist.map((item, index) => (
                    <div
                      className={`studio-proof-checklist-item ${index === proofCueIndex ? "active" : ""}`}
                      key={item.label}
                      aria-current={index === proofCueIndex ? "step" : undefined}
                    >
                      <span>{item.label}</span>
                      <strong>{item.state}</strong>
                      {item.href ? (
                        <a href={item.href} target="_blank" rel="noreferrer">
                          {item.detail}
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <p>{item.detail}</p>
                      )}
                      {index === proofCueIndex ? <em>{item.cue}</em> : null}
                    </div>
                  ))}
                </div>
                <div className="studio-shot-cue" aria-label="当前镜头建议">
                  <span>{studioShotCue.title}</span>
                  <strong>{studioShotCue.primary}</strong>
                  <p>{studioShotCue.note}</p>
                </div>
                <div className="studio-series-cues" aria-label="系列章节提示">
                  {studioSeriesChapters.map((chapter, index) => (
                    <span key={chapter}>{String(index + 1).padStart(2, "0")} · {chapter}</span>
                  ))}
                </div>
              </>
            ) : null}

            <div className="studio-recording-assets">
              <div className="section-kicker">
                <Archive size={16} />
                <span>素材资产</span>
              </div>
              {recordingAssets.status === "loading" ? (
                <p>读取本地 QA 素材中</p>
              ) : null}
              {recordingAssets.status === "error" ? (
                <p>{recordingAssets.message}</p>
              ) : null}
              {recordingAssets.status === "ready" ? (
                <>
                  {(() => {
                    const readiness = getRecordingAssetReadiness(recordingAssets);
                    return (
                      <div className={`studio-recording-readiness ${readiness.state}`} aria-label="录屏素材状态">
                        <span>{readiness.title}</span>
                        <p>{readiness.detail}</p>
                      </div>
                    );
                  })()}
                  <strong>{recordingAssets.packCount} 个素材包</strong>
                  <div className="studio-recording-counts" aria-label="素材包类型统计">
                    <span>Dream {recordingAssets.countsByType.dream}</span>
                    <span>Studio {recordingAssets.countsByType.studio}</span>
                    <span>Bridge {recordingAssets.countsByType.bridge}</span>
                  </div>
                  <div className="studio-recording-edit-tags" aria-label="素材剪辑标签">
                    <span>{getRecordingAssetUsageHint("dream")} · {recordingAssets.countsByType.dream}</span>
                    <span>{getRecordingAssetUsageHint("studio")} · {recordingAssets.countsByType.studio}</span>
                    <span>{getRecordingAssetUsageHint("bridge")} · {recordingAssets.countsByType.bridge}</span>
                  </div>
                  {recordingEvidenceTimeline.length ? (
                    <>
                      <div className="studio-evidence-timeline" aria-label="录屏证据时间线">
                        {recordingEvidenceTimeline.map((item, index) => {
                          const content = (
                            <>
                              <small>{String(index + 1).padStart(2, "0")}</small>
                              <strong>{item.label}</strong>
                              <span>{item.state}</span>
                              <p>{item.detail}</p>
                            </>
                          );

                          return item.href ? (
                            <a className={item.tone} href={buildRecordingEvidenceUrl(item.href)} target="_blank" rel="noreferrer" key={item.label}>
                              {content}
                            </a>
                          ) : (
                            <div className={item.tone} key={item.label}>
                              {content}
                            </div>
                          );
                        })}
                      </div>
                      <div className="studio-proof-story-actions" aria-label="证据讲解稿">
                        <div className="studio-proof-story-preview" aria-label="证据讲解稿预览">
                          <small>讲解稿预览</small>
                          {proofStoryLines.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                        <div className="studio-proof-script-card" aria-label="Proof Story 脚本素材">
                          <small>脚本素材</small>
                          <strong>Proof Story Demo Script</strong>
                          <code>{proofStoryScriptPath}</code>
                          <p>{proofStoryScriptCue}</p>
                          <button type="button" onClick={copyProofStoryScriptPath}>
                            <Copy size={13} />
                            {proofScriptCopyState === "copied" ? "脚本路径已复制" : proofScriptCopyState === "error" ? "手动复制路径" : "复制脚本路径"}
                          </button>
                        </div>
                        <button type="button" onClick={copyProofStory}>
                          <Copy size={13} />
                          {proofStoryCopyState === "copied" ? "讲解稿已复制" : proofStoryCopyState === "error" ? "手动复制讲解稿" : "复制讲解稿"}
                        </button>
                      </div>
                    </>
                  ) : null}
                  <div className="studio-recording-latest" aria-label="最新素材包摘要">
                    {recordingAssets.latestPack ? (
                      <>
                        <small>最新素材 · {formatRecordingAssetTime(recordingAssets.latestPack.createdAt)}</small>
                        <strong>{recordingAssets.latestPack.title}</strong>
                        <span>{recordingAssets.latestPack.label}</span>
                      </>
                    ) : (
                      <>
                        <small>最新素材</small>
                        <strong>暂无最新素材</strong>
                        <span>先运行 recording suite 生成第一批素材。</span>
                      </>
                    )}
                  </div>
                  <div className={`studio-candidate-handoff-status ${recordingAssets.latestCandidateHandoff ? "ready" : "missing"}`} aria-label="候选点击 QA 状态">
                    {recordingAssets.latestCandidateHandoff ? (
                      <>
                        <small>Candidate QA · {formatRecordingAssetTime(recordingAssets.latestCandidateHandoff.createdAt)}</small>
                        <strong>候选跳转已验证</strong>
                        <span>{recordingAssets.latestCandidateHandoff.captureCount} 个入口 · {recordingAssets.latestCandidateHandoff.summaryPath}</span>
                      </>
                    ) : (
                      <>
                        <small>Candidate QA</small>
                        <strong>等待候选点击 QA</strong>
                        <span>运行 npm run check:lens-candidate-handoff 后显示验证状态。</span>
                      </>
                    )}
                  </div>
                  <div className={`studio-dream-proof-status ${recordingAssets.latestDreamVisualProof ? "ready" : "missing"}`} aria-label="Dream visual proof QA 状态">
                    {recordingAssets.latestDreamVisualProof ? (
                      <>
                        <small>Dream Proof · {formatRecordingAssetTime(recordingAssets.latestDreamVisualProof.createdAt)}</small>
                        <strong>视觉证据线已验证</strong>
                        <span>
                          {recordingAssets.latestDreamVisualProof.finalCueLabel} · {recordingAssets.latestDreamVisualProof.finalCueValue} · {recordingAssets.latestDreamVisualProof.screenshotPath}
                        </span>
                        <div className="studio-dream-proof-links">
                          {recordingAssets.latestDreamVisualProof.screenshotPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestDreamVisualProof.screenshotPath)} target="_blank" rel="noreferrer">
                              播放截图
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                          {recordingAssets.latestDreamVisualProof.summaryPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestDreamVisualProof.summaryPath)} target="_blank" rel="noreferrer">
                              summary
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                          {recordingAssets.latestDreamVisualProof.notesPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestDreamVisualProof.notesPath)} target="_blank" rel="noreferrer">
                              notes
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <small>Dream Proof</small>
                        <strong>等待视觉证据 QA</strong>
                        <span>运行 npm run check:dream-visuals 后显示 Proof 播放状态。</span>
                      </>
                    )}
                  </div>
                  <div className={`studio-recording-index-check-status ${recordingAssets.latestRecordingIndexCheck ? "ready" : "missing"}`} aria-label="Recording Index QA 状态">
                    {recordingAssets.latestRecordingIndexCheck ? (
                      <>
                        <small>Index QA · {formatRecordingAssetTime(recordingAssets.latestRecordingIndexCheck.createdAt)}</small>
                        <strong>素材总索引已验证</strong>
                        <span>{recordingIndexCoverage?.cardDetail}</span>
                        {recordingAssets.latestRecordingIndexCheck.proofChecks?.length ? (
                          <div className="studio-index-proof-checks" aria-label="Index QA proof checks">
                            {recordingAssets.latestRecordingIndexCheck.proofChecks.map((proofCheck) => (
                              <span key={`${proofCheck.proofId}-${proofCheck.label}`}>
                                {getRecordingIndexProofCheckLabel(proofCheck)} {proofCheck.checkedLinkCount}/{proofCheck.expectedLinkCount}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="studio-dream-proof-links">
                          {recordingAssets.latestRecordingIndexCheck.screenshotPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestRecordingIndexCheck.screenshotPath)} target="_blank" rel="noreferrer">
                              索引截图
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                          {recordingAssets.latestRecordingIndexCheck.summaryPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestRecordingIndexCheck.summaryPath)} target="_blank" rel="noreferrer">
                              summary
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                          {recordingAssets.latestRecordingIndexCheck.notesPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestRecordingIndexCheck.notesPath)} target="_blank" rel="noreferrer">
                              notes
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <small>Index QA</small>
                        <strong>等待素材索引 QA</strong>
                        <span>运行 npm run check:recording-index 后显示总索引验证状态。</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`studio-suite-run-status ${
                      recordingAssets.latestRecordingSuiteRun
                        ? recordingAssets.latestRecordingSuiteRun.status === "passed"
                          ? "ready"
                          : "failed"
                        : "missing"
                    }`}
                    aria-label="Recording Suite 状态"
                  >
                    {recordingAssets.latestRecordingSuiteRun ? (
                      <>
                        <small>Suite Run · {formatRecordingAssetTime(recordingAssets.latestRecordingSuiteRun.createdAt)}</small>
                        <strong>{recordingAssets.latestRecordingSuiteRun.status === "passed" ? "Full suite 已通过" : "Full suite 失败"}</strong>
                        <span>
                          {recordingAssets.latestRecordingSuiteRun.stepCount} 步 · {recordingAssets.latestRecordingSuiteRun.passedStepCount} 通过 · {formatDurationMs(recordingAssets.latestRecordingSuiteRun.durationMs)}
                        </span>
                        <div className="studio-dream-proof-links">
                          {recordingAssets.latestRecordingSuiteRun.summaryPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestRecordingSuiteRun.summaryPath)} target="_blank" rel="noreferrer">
                              suite summary
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                          {recordingAssets.latestRecordingSuiteRun.notesPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestRecordingSuiteRun.notesPath)} target="_blank" rel="noreferrer">
                              notes
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <small>Suite Run</small>
                        <strong>等待 full suite</strong>
                        <span>运行 npm run check:recording-suite 后显示全链路验证状态。</span>
                      </>
                    )}
                  </div>
                  <div className={`studio-proof-playback-status ${recordingAssets.latestStudioProofPlayback ? "ready" : "missing"}`} aria-label="Studio proof playback QA 状态">
                    {recordingAssets.latestStudioProofPlayback ? (
                      <>
                        <small>Studio Proof · {formatRecordingAssetTime(recordingAssets.latestStudioProofPlayback.createdAt)}</small>
                        <strong>证据播放已捕获</strong>
                        <span>
                          {recordingAssets.latestStudioProofPlayback.finalCueLabel} · {recordingAssets.latestStudioProofPlayback.finalCueDetail} · {recordingAssets.latestStudioProofPlayback.screenshotPath}
                        </span>
                        <div className="studio-dream-proof-links">
                          {recordingAssets.latestStudioProofPlayback.screenshotPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestStudioProofPlayback.screenshotPath)} target="_blank" rel="noreferrer">
                              播放截图
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                          {recordingAssets.latestStudioProofPlayback.summaryPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestStudioProofPlayback.summaryPath)} target="_blank" rel="noreferrer">
                              summary
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                          {recordingAssets.latestStudioProofPlayback.notesPath ? (
                            <a href={buildRecordingEvidenceUrl(recordingAssets.latestStudioProofPlayback.notesPath)} target="_blank" rel="noreferrer">
                              notes
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <small>Studio Proof</small>
                        <strong>等待 Studio QA 捕获</strong>
                        <span>运行 npm run check:studio-visuals 后显示 Suite Run 播放状态。</span>
                      </>
                    )}
                  </div>
                  {recordingAssetsReadAt ? <span>读取 {formatRecordingAssetTime(recordingAssetsReadAt)}</span> : null}
                  {recordingAssets.recentPacks.length ? (
                    <div className="studio-recording-recent" aria-label="最近素材包">
                      {recordingAssets.recentPacks.map((pack) => (
                        <div className={`studio-recording-recent-item ${pack.type}`} key={`${pack.label}-${pack.id}`}>
                          <small>
                            <em>{getRecordingAssetTypeLabel(pack.type)}</em>
                            {formatRecordingAssetTime(pack.createdAt)}
                          </small>
                          <strong>{pack.title}</strong>
                          <span>{pack.detail}</span>
                          {pack.lens ? <i>{pack.lens}</i> : null}
                          <b>{getRecordingAssetUsageHint(pack.type)}</b>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {!recordingAssets.indexAvailable ? (
                    <div className="studio-recording-command">
                      <span>生成本地素材索引</span>
                      <code>{recordingSuiteCommand}</code>
                    </div>
                  ) : null}
                  <div className="studio-recording-actions">
                    <button type="button" onClick={copyRecordingSuiteCommand}>
                      <Copy size={14} />
                      {recordingCommandCopyState === "copied" ? "已复制" : recordingCommandCopyState === "error" ? "手动复制" : "复制命令"}
                    </button>
                    <button type="button" onClick={copyCandidateHandoffCommand}>
                      <Copy size={14} />
                      {candidateCommandCopyState === "copied" ? "已复制候选 QA" : candidateCommandCopyState === "error" ? "手动复制候选 QA" : "复制候选 QA"}
                    </button>
                    <button type="button" onClick={() => loadRecordingAssets()} disabled={recordingAssetsRefreshing}>
                      <RotateCcw size={14} className={recordingAssetsRefreshing ? "spin" : ""} />
                      {recordingAssetsRefreshing ? "刷新中" : "刷新"}
                    </button>
                    {recordingAssets.indexAvailable && recordingAssets.indexUrl ? (
                      <a href={recordingAssets.indexUrl} target="_blank" rel="noreferrer">
                        打开总索引
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span>等待索引</span>
                    )}
                    <a href={recordingAssets.lensComparisonUrl} target="_blank" rel="noreferrer">
                      镜头对比
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  {recordingCommandCopyState === "copied" ? <span className="studio-recording-copy-status">录屏套件命令已复制</span> : null}
                  {recordingCommandCopyState === "error" ? <span className="studio-recording-copy-status">浏览器不允许自动复制，可手动复制上方命令</span> : null}
                  {candidateCommandCopyState === "copied" ? <span className="studio-recording-copy-status">候选 QA 命令已复制</span> : null}
                  {candidateCommandCopyState === "error" ? <span className="studio-recording-copy-status">浏览器不允许自动复制候选 QA 命令</span> : null}
                  {proofStoryCopyState === "copied" ? <span className="studio-recording-copy-status">证据讲解稿已复制</span> : null}
                  {proofStoryCopyState === "error" ? <span className="studio-recording-copy-status">浏览器不允许自动复制讲解稿</span> : null}
                  <div className="studio-recording-workflow" aria-label="录屏素材流程">
                    {recordingWorkflowSteps.map((item) => (
                      <div key={item.step}>
                        <span>{item.step}</span>
                        <strong>{item.title}</strong>
                        <p>{item.cue}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="studio-creator-section">
              <div className="section-kicker">
                <Code2 size={16} />
                <span>开发过程</span>
              </div>
              {creatorMilestones.slice(0, 4).map((item) => (
                <div className="studio-mini-card" key={item.step}>
                  <strong>{item.step}. {item.title}</strong>
                  <p>{item.contentAngle}</p>
                </div>
              ))}
            </div>

            <div className="studio-creator-section">
              <div className="section-kicker">
                <BookOpen size={16} />
                <span>学习复盘</span>
              </div>
              {vibeCodingLessons.slice(0, 2).map((item) => (
                <div className="studio-mini-card" key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.lesson}</p>
                </div>
              ))}
            </div>

            <div className="studio-creator-section">
              <div className="section-kicker">
                <Mic2 size={16} />
                <span>下一条视频</span>
              </div>
              <div className="studio-mini-card accent">
                <strong>{clipBlueprints[0].title}</strong>
                <p>{clipBlueprints[0].hook}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
