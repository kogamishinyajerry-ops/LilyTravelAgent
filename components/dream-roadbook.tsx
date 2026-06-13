"use client";

import { ArrowLeft, Building2, Compass, Eye, Hourglass, Layers3, Loader2, MapPinned, Moon, Pause, PlayCircle, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDreamRoadbookDesign,
  dreamMoods,
  dreamTemplates,
  type DreamMood,
  type DreamTemplate,
} from "@/lib/dream-design-skill";
import { buildCinematicSceneInspector, buildCinematicSceneTimeline } from "@/lib/cinematic-scene-preset";
import { defaultBrief } from "@/lib/default-brief";
import type { LandmarkPreset } from "@/lib/landmark-preset";
import {
  createRecordingController,
  getTotalCombinations,
  type RecordingConfig,
  type RecordingController,
  type RecordingMode,
} from "@/lib/recording-helper";
import { scenicSamplePhotos, type ScenicSamplePhoto } from "@/lib/scenic-sample-photos";
import type {
  DeletePreviewAssetCacheResponse,
  GenerateRoadbookRequest,
  GenerateRoadbookResponse,
  GenerateScenicRenderDesignResponse,
  GeneratePreviewAssetResponse,
  GeocodePlace,
  GeocodePlacesResponse,
  GeocodePoint,
  GenerationMode,
  PreviewAsset,
  PreviewAssetHistoryItem,
  PreviewAssetHistoryResponse,
  RestorePreviewAssetHistoryResponse,
  SetPreviewAssetCoverResponse,
  Roadbook,
  ScenicRenderDesign,
  TravelBrief,
} from "@/lib/roadbook-types";
import { coastalSampleRoadbook, sampleRoadbook } from "@/lib/sample-roadbook";
import { DreamMiniMap } from "@/components/dream-mini-map";
import { DreamSkylineScene } from "@/components/dream-skyline-scene";
import { ErrorStateBanner } from "@/components/error-ux";
import { LandmarkBlueprintCard } from "@/components/landmark-blueprint-card";
import { TemplateCardGrid } from "@/components/template-card-grid";
import { showError, showInfo, showSuccess, showWarning } from "@/lib/toast";
import type { M3Error, M3ErrorCategory } from "@/lib/m3-error-classifier";

const RealSkylineScene = dynamic(
  () => import("@/components/real-skyline-scene").then((mod) => mod.default),
  { ssr: false },
);

type DreamStage = "demo" | "generating" | "refining" | "preview" | "ready" | "error";
type TrackStepStatus = "idle" | "active" | "done" | "error";
type PreviewAssetStage = "idle" | "generating" | "ready" | "fallback" | "error";
type PreviewAssetAction = "idle" | "clearing" | "regenerating" | "restoring" | "covering";
type ScenicSkillStage = "idle" | "selected" | "generating" | "ready" | "fallback" | "error";
type LandmarkSkillStage = "idle" | "generating" | "ready" | "fallback" | "error";

const dreamMoodNotes: Record<DreamMood, string> = {
  cloud: "柔光 / 轻盈 / 风",
  geometry: "等距 / 错视 / 秩序",
  dusk: "日落 / 低饱和 / 安静",
  neon: "霓虹 / 蓝紫 / 雨夜",
};

const dreamMoodSwatchColors: Record<DreamMood, { core: string; ring: string; soft: string }> = {
  cloud: { core: "#7cb6e0", ring: "#a8d3ee", soft: "rgba(124, 182, 224, 0.32)" },
  geometry: { core: "#9a6cd6", ring: "#c6a3ec", soft: "rgba(154, 108, 214, 0.32)" },
  dusk: { core: "#e8894a", ring: "#f4b285", soft: "rgba(232, 137, 74, 0.32)" },
  neon: { core: "#e6478c", ring: "#f48ab8", soft: "rgba(230, 71, 140, 0.32)" },
};

const dreamBriefDefaults: TravelBrief = {
  ...defaultBrief,
  tone: "极简、梦境、生成式网页、像游戏关卡地图一样有高级感",
};

type DemoRoadbookId = "dali" | "coast";
type DreamRoadbookProps = {
  initialDemo?: string;
};

const coastalDreamBriefDefaults: TravelBrief = {
  ...defaultBrief,
  destination: "三亚海岛",
  city: "三亚",
  travelMonth: "秋季",
  interests: ["海岸灯塔", "蓝色海湾", "港口", "日落", "咖啡"],
  specialRequests: "文字极简，画面像海岸预告片，重点展示灯塔、海湾、港口和日落。",
  tone: "极简、梦境、生成式网页、海岸电影感、像游戏关卡地图一样高级",
};

const demoRoadbookOptions: Array<{
  id: DemoRoadbookId;
  label: string;
  note: string;
  roadbook: Roadbook;
  brief: TravelBrief;
  mood: DreamMood;
  template: DreamTemplate;
}> = [
  {
    id: "dali",
    label: "大理",
    note: "苍山洱海",
    roadbook: sampleRoadbook,
    brief: dreamBriefDefaults,
    mood: "cloud",
    template: "monument",
  },
  {
    id: "coast",
    label: "海岸",
    note: "灯塔海湾",
    roadbook: coastalSampleRoadbook,
    brief: coastalDreamBriefDefaults,
    mood: "dusk",
    template: "starlake",
  },
];

function normalizeDemoRoadbookId(value?: string): DemoRoadbookId {
  return value === "coast" ? "coast" : "dali";
}

function getDemoRoadbookOption(value?: string) {
  const demoId = normalizeDemoRoadbookId(value);
  return demoRoadbookOptions.find((option) => option.id === demoId) || demoRoadbookOptions[0];
}

const generationModes: Array<{ id: GenerationMode; label: string; note: string }> = [
  { id: "speed", label: "快速", note: "补细节也快" },
  { id: "quality", label: "高质量", note: "M3 补完整版" },
];

const demoTrackNotes = ["需求进入 Agent", "先出可展示预览", "AI 图做远景贴片", "后台补吃住行", "地图点位点亮"] as const;
const scenicUploadMaxBytes = 6 * 1024 * 1024;

const recordingModes: Array<{ id: RecordingMode; label: string; note: string }> = [
  { id: "cycle-both", label: "模板+气质", note: "录屏遍历" },
  { id: "cycle-templates", label: "只换模板", note: "气质不变" },
  { id: "cycle-moods", label: "只换气质", note: "模板不变" },
  { id: "manual", label: "手动", note: "用按钮走" },
];

const allTemplateIds = dreamTemplates.map((item) => item.id);
const allMoodIds = dreamMoods.map((item) => item.id);
const defaultRecordingConfig: RecordingConfig = {
  mode: "cycle-both",
  stepIntervalMs: 4000,
  templates: allTemplateIds,
  moods: allMoodIds,
};

async function fetchPreviewAssetHistory(cacheKey: string) {
  const response = await fetch(`/api/generate-preview-asset?cacheKey=${encodeURIComponent(cacheKey)}`);
  const result = (await response.json()) as PreviewAssetHistoryResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "历史版本读取失败。" : result.message);
  }

  return result.items;
}

export function DreamRoadbook({ initialDemo = "dali" }: DreamRoadbookProps = {}) {
  const initialDemoOption = getDemoRoadbookOption(initialDemo);
  const runIdRef = useRef(0);
  const recordingControllerRef = useRef<RecordingController | null>(null);
  const recordingConfigRef = useRef<RecordingConfig>(defaultRecordingConfig);
  const manualTemplateIndexRef = useRef(0);
  const manualMoodIndexRef = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingConfig, setRecordingConfig] = useState<RecordingConfig>(defaultRecordingConfig);
  const [recordingProgress, setRecordingProgress] = useState({ step: 0, total: getTotalCombinations(defaultRecordingConfig) });
  type RecordingStatus = "idle" | "recording" | "stopped" | "finished";
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [countdownMs, setCountdownMs] = useState(recordingConfig.stepIntervalMs ?? 4000);
  const [demoRoadbookId, setDemoRoadbookId] = useState<DemoRoadbookId | null>(initialDemoOption.id);
  const [roadbook, setRoadbook] = useState<Roadbook>(initialDemoOption.roadbook);
  const [brief, setBrief] = useState<TravelBrief>(initialDemoOption.brief);
  const [interestsInput, setInterestsInput] = useState(initialDemoOption.brief.interests.join("、"));
  const [activeDay, setActiveDay] = useState(1);
  const [mood, setMood] = useState<DreamMood>(initialDemoOption.mood);
  const [template, setTemplate] = useState<DreamTemplate>(initialDemoOption.template);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("speed");
  const [lastModel, setLastModel] = useState("");
  const [points, setPoints] = useState<GeocodePoint[]>([]);
  const [mapConfigured, setMapConfigured] = useState<boolean | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [stage, setStage] = useState<DreamStage>("demo");
  const [error, setError] = useState("");
  const [trackDemoStep, setTrackDemoStep] = useState<number | null>(null);
  const [previewAsset, setPreviewAsset] = useState<PreviewAsset | null>(null);
  const [assetStage, setAssetStage] = useState<PreviewAssetStage>("idle");
  const [assetAction, setAssetAction] = useState<PreviewAssetAction>("idle");
  const [assetMessage, setAssetMessage] = useState("");
  const [assetHistory, setAssetHistory] = useState<PreviewAssetHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");
  const [restoringHistoryId, setRestoringHistoryId] = useState("");
  const [coveringHistoryId, setCoveringHistoryId] = useState("");
  const [scenicImageDataUrl, setScenicImageDataUrl] = useState("");
  const [scenicImageName, setScenicImageName] = useState("");
  const [selectedSamplePhotoId, setSelectedSamplePhotoId] = useState("");
  const [selectingSamplePhotoId, setSelectingSamplePhotoId] = useState("");
  const [scenicDesign, setScenicDesign] = useState<ScenicRenderDesign | null>(null);
  const [scenicStage, setScenicStage] = useState<ScenicSkillStage>("idle");
  const [scenicMessage, setScenicMessage] = useState("");
  const [landmarkPreset, setLandmarkPreset] = useState<LandmarkPreset | null>(null);
  const [landmarkLoading, setLandmarkLoading] = useState(false);
  const [landmarkError, setLandmarkError] = useState("");
  const [landmarkErrorInfo, setLandmarkErrorInfo] = useState<M3Error | null>(null);
  const [landmarkConfigTipOpen, setLandmarkConfigTipOpen] = useState(false);
  const [landmarkStage, setLandmarkStage] = useState<LandmarkSkillStage>("idle");
  const [landmarkModel, setLandmarkModel] = useState("");
  const [useRealTerrain, setUseRealTerrain] = useState(false);
  const [realTerrainTokenMissing, setRealTerrainTokenMissing] = useState(false);
  const design = useMemo(() => buildDreamRoadbookDesign(roadbook), [roadbook]);
  const activePlan = roadbook.days.find((day) => day.day === activeDay) || roadbook.days[0];
  const activeStop = design.routeStops.find((stop) => stop.day === activePlan?.day) || design.routeStops[0];
  const activeTemplate = dreamTemplates.find((item) => item.id === template) || dreamTemplates[0];
  const sceneInspector = useMemo(() => buildCinematicSceneInspector(roadbook, activeDay), [activeDay, roadbook]);
  const sceneTimeline = useMemo(() => buildCinematicSceneTimeline(roadbook, activeDay), [activeDay, roadbook]);
  const studioHandoffHref = demoRoadbookId ? `/studio?demo=${demoRoadbookId}` : "/studio";
  // Lazily build the real terrain/buildings sources only when the toggle is on,
  // so MAPBOX_TOKEN env lookups don't run at module-load time.
  const [realTerrainSources, setRealTerrainSources] = useState<
    | { terrainSource: import("@/lib/terrain-source").TerrainSource; buildingsSource: import("@/lib/buildings-source").BuildingsSource }
    | null
  >(null);

  useEffect(() => {
    if (!useRealTerrain) {
      return;
    }

    let cancelled = false;

    async function loadSources() {
      try {
        const [terrainModule, buildingsModule] = await Promise.all([
          import("@/lib/mapbox-terrain-source"),
          import("@/lib/overpass-buildings-source"),
        ]);

        if (cancelled) {
          return;
        }

        try {
          const terrainSource = terrainModule.createMapboxTerrainSource();
          const buildingsSource = buildingsModule.createOverpassBuildingsSource();
          if (cancelled) {
            return;
          }
          setRealTerrainSources({ terrainSource, buildingsSource });
          setRealTerrainTokenMissing(false);
        } catch (constructionError) {
          // Most common cause: MAPBOX_TOKEN env var is not configured.
          console.warn("Real terrain pipeline unavailable, falling back:", constructionError);
          if (!cancelled) {
            setRealTerrainSources(null);
            setRealTerrainTokenMissing(true);
          }
        }
      } catch (loadError) {
        console.error("Real terrain module load failed:", loadError);
        if (!cancelled) {
          setRealTerrainSources(null);
          setRealTerrainTokenMissing(true);
        }
      }
    }

    void loadSources();

    return () => {
      cancelled = true;
    };
  }, [useRealTerrain]);
  // Derived: when toggle is off, the pipeline is inactive regardless of cached sources.
  const realTerrainActive = useRealTerrain && realTerrainSources !== null && !realTerrainTokenMissing;
  const isBusy = stage === "generating" || stage === "refining";
  const isTrackDemo = trackDemoStep !== null;
  const trackBadge = isTrackDemo ? "explain" : stage === "ready" ? "completed" : isBusy ? "running" : "local";
  const isAssetWorking = assetStage === "generating" || assetAction !== "idle";
  const coverHistory = assetHistory.find((item) => item.isCover);
  const sharePreviewHref = useMemo(
    () => buildSharePreviewHref(roadbook, previewAsset, coverHistory),
    [coverHistory, previewAsset, roadbook],
  );

  useEffect(() => {
    if (trackDemoStep === null || trackDemoStep >= demoTrackNotes.length - 1 || isBusy) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTrackDemoStep((current) => {
        if (current === null) {
          return null;
        }

        return Math.min(current + 1, demoTrackNotes.length - 1);
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isBusy, trackDemoStep]);

  // Keep the ref synced so the setInterval closure always reads the latest config.
  useEffect(() => {
    recordingConfigRef.current = recordingConfig;
  }, [recordingConfig]);

  // Track the last template/mood to trigger the brief transition flash.
  const lastFlashTemplateRef = useRef<DreamTemplate>(template);
  const lastFlashMoodRef = useRef<DreamMood>(mood);
  const [transitionFlash, setTransitionFlash] = useState(0);

  // Trigger a brief flash when the active template or mood changes.
  useEffect(() => {
    if (template === lastFlashTemplateRef.current && mood === lastFlashMoodRef.current) {
      return;
    }
    lastFlashTemplateRef.current = template;
    lastFlashMoodRef.current = mood;
    setTransitionFlash((value) => value + 1);
  }, [mood, template]);

  // Recording loop: when isRecording is on, poll the controller on a fixed
  // interval. In manual mode we only mount the controller for API symmetry
  // but it never auto-advances; the user drives prev/next via buttons.
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    if (!recordingControllerRef.current) {
      const controller = createRecordingController(recordingConfigRef.current);
      controller.state.currentStepStartMs = performance.now();
      recordingControllerRef.current = controller;
      const initialTemplate = allTemplateIds[0];
      const initialMood = allMoodIds[0];
      // Defer the initial state sync to the next tick so we are not
      // calling setState synchronously inside the effect body.
      const initialProgress = { step: 0, total: getTotalCombinations(recordingConfigRef.current) };
      window.setTimeout(() => {
        if (initialTemplate) {
          setTemplate(initialTemplate);
        }
        if (initialMood) {
          setMood(initialMood);
        }
        setRecordingProgress(initialProgress);
        setCountdownMs(recordingConfigRef.current.stepIntervalMs ?? 4000);
      }, 0);
    }

    const handle = window.setInterval(() => {
      const controller = recordingControllerRef.current;
      if (!controller) {
        return;
      }

      const result = controller.tick(performance.now());

      if (result.templateChanged) {
        const nextTemplate = allTemplateIds[controller.state.currentTemplateIndex];
        if (nextTemplate) {
          setTemplate(nextTemplate);
        }
      }

      if (result.moodChanged) {
        const nextMood = allMoodIds[controller.state.currentMoodIndex];
        if (nextMood) {
          setMood(nextMood);
        }
      }

      if (result.finished) {
        setRecordingProgress({ step: controller.state.totalSteps, total: controller.state.totalSteps });
        setIsRecording(false);
        setRecordingStatus("finished");
        showSuccess("录制完成", `共 ${controller.state.totalSteps} 组组合已巡演。`);
        return;
      }

      setRecordingProgress({
        step: controller.state.totalSteps,
        total: getTotalCombinations(recordingConfigRef.current),
      });
      setCountdownMs(recordingConfigRef.current.stepIntervalMs ?? 4000);
    }, 500);

    // Smooth countdown: 60Hz tick that decrements the visible timer.
    let lastTickMs = performance.now();
    const countdownHandle = window.setInterval(() => {
      const now = performance.now();
      const delta = now - lastTickMs;
      lastTickMs = now;
      setCountdownMs((current) => {
        const next = current - delta;
        return next < 0 ? 0 : next;
      });
    }, 100);

    return () => {
      window.clearInterval(handle);
      window.clearInterval(countdownHandle);
    };
  }, [isRecording]);

  // Drop the controller whenever recording stops so the next run starts fresh.
  useEffect(() => {
    if (!isRecording) {
      recordingControllerRef.current = null;
    }
  }, [isRecording]);

  function startRecording() {
    if (isRecording) {
      return;
    }
    manualTemplateIndexRef.current = allTemplateIds.indexOf(template);
    manualMoodIndexRef.current = allMoodIds.indexOf(mood);
    if (manualTemplateIndexRef.current < 0) {
      manualTemplateIndexRef.current = 0;
    }
    if (manualMoodIndexRef.current < 0) {
      manualMoodIndexRef.current = 0;
    }
    setRecordingProgress({ step: 0, total: getTotalCombinations(recordingConfig) });
    setCountdownMs(recordingConfig.stepIntervalMs ?? 4000);
    setRecordingStatus("recording");
    setIsRecording(true);
    showInfo("录制开始", `将按 ${getTotalCombinations(recordingConfig)} 组组合自动巡演。`);
  }

  function stopRecording() {
    if (!isRecording) {
      return;
    }
    setIsRecording(false);
    // Only show "已停止" if we actually had progress; otherwise the user
    // toggled the button without a run in flight.
    if (recordingProgress.step > 0) {
      setRecordingStatus("stopped");
    } else {
      setRecordingStatus("idle");
    }
  }

  function reRecord() {
    // Reset everything for a fresh run.
    setRecordingStatus("idle");
    setRecordingProgress({ step: 0, total: getTotalCombinations(recordingConfig) });
    setCountdownMs(recordingConfig.stepIntervalMs ?? 4000);
    startRecording();
  }

  function stepManualTemplate(direction: 1 | -1) {
    if (recordingConfig.mode !== "manual" || isRecording) {
      return;
    }
    const templates = recordingConfig.templates && recordingConfig.templates.length > 0 ? recordingConfig.templates : allTemplateIds;
    if (templates.length === 0) {
      return;
    }
    const currentIndex = templates.indexOf(template);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + direction + templates.length) % templates.length;
    const nextTemplate = templates[nextIndex];
    if (nextTemplate) {
      setTemplate(nextTemplate);
    }
  }

  function stepManualMood(direction: 1 | -1) {
    if (recordingConfig.mode !== "manual" || isRecording) {
      return;
    }
    const moods = recordingConfig.moods && recordingConfig.moods.length > 0 ? recordingConfig.moods : allMoodIds;
    if (moods.length === 0) {
      return;
    }
    const currentIndex = moods.indexOf(mood);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + direction + moods.length) % moods.length;
    const nextMood = moods[nextIndex];
    if (nextMood) {
      setMood(nextMood);
    }
  }

  const baseTrackSteps = [
    {
      label: "接收需求",
      note: generationMode === "speed" ? "fast model" : "quality mode",
      status: stage === "demo" ? "idle" : "done",
    },
    {
      label: "预览完成",
      note: "15-30 秒先展示",
      status:
        stage === "generating"
          ? "active"
          : stage === "demo" || stage === "error"
            ? "idle"
            : "done",
    },
    {
      label: "视觉资产",
      note:
        scenicStage === "generating"
          ? "M3 读图设计"
          : scenicDesign?.status === "generated" && assetStage !== "idle"
            ? "照片建模蓝图"
            : assetStage === "ready"
          ? previewAsset?.cacheStatus === "hit"
            ? "缓存命中"
            : previewAsset?.cacheStatus === "stored"
              ? "已写缓存"
              : previewAsset?.cacheStatus === "restored"
                ? "历史恢复"
                : previewAsset?.cacheStatus === "cover"
                  ? "最终封面"
                  : previewAsset?.cacheStatus === "cleared"
                    ? "缓存已清除"
                    : "AI 远景贴片"
          : assetStage === "generating"
            ? "cinematic preview"
            : assetStage === "fallback"
              ? "Three.js 兜底"
              : "待生成",
      status:
        assetStage === "generating"
          ? "active"
          : assetStage === "ready" || assetStage === "fallback"
            ? "done"
            : assetStage === "error"
              ? "error"
              : "idle",
    },
    {
      label: "补全细节",
      note: "吃住行后台补充",
      status:
        stage === "refining"
          ? "active"
          : stage === "ready"
            ? "done"
            : stage === "preview"
              ? "error"
              : "idle",
    },
    {
      label: "地图定位",
      note: mapConfigured === false ? "等待 AMAP_KEY" : "高德点位",
      status: mapLoading ? "active" : points.some((point) => point.status === "ok") ? "done" : "idle",
    },
  ] satisfies Array<{ label: string; note: string; status: TrackStepStatus }>;
  const trackSteps = isTrackDemo
    ? baseTrackSteps.map((step, index) => ({
        ...step,
        note: demoTrackNotes[index] || step.note,
        status:
          index < trackDemoStep ? "done" : index === trackDemoStep ? "active" : "idle",
      }))
    : baseTrackSteps;

  function updateBrief<Key extends keyof TravelBrief>(key: Key, value: TravelBrief[Key]) {
    setBrief((current) => ({ ...current, [key]: value }));
  }

  function buildPlaces(nextRoadbook: Roadbook): GeocodePlace[] {
    return nextRoadbook.days.flatMap((day) =>
      day.stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        addressHint: stop.addressHint,
        day: day.day,
        category: stop.category,
      })),
    );
  }

  async function geocodeRoadbook(nextRoadbook: Roadbook, runId: number) {
    setMapLoading(true);

    try {
      const response = await fetch("/api/geocode-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: brief.city,
          places: buildPlaces(nextRoadbook).slice(0, 18),
        }),
      });
      const result = (await response.json()) as GeocodePlacesResponse;

      if (runId !== runIdRef.current) {
        return;
      }

      if (result.ok) {
        setPoints(result.points);
        setMapConfigured(result.configured);
      }
    } catch {
      if (runId === runIdRef.current) {
        setPoints([]);
        setMapConfigured(null);
      }
    } finally {
      if (runId === runIdRef.current) {
        setMapLoading(false);
      }
    }
  }

  async function refreshPreviewAssetHistory(cacheKey?: string) {
    if (!cacheKey) {
      setAssetHistory([]);
      setHistoryMessage("");
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);

    try {
      const items = await fetchPreviewAssetHistory(cacheKey);
      setAssetHistory(items);
      setHistoryMessage(items.length ? "" : "还没有历史版本。");
    } catch (caught) {
      setAssetHistory([]);
      setHistoryMessage(caught instanceof Error ? caught.message : "历史版本读取失败。");
    } finally {
      setHistoryLoading(false);
    }
  }

  function buildRequestBrief(): GenerateRoadbookRequest {
    return {
      ...brief,
      days: Number(brief.days),
      interests: splitInterests(interestsInput),
      tone: `${brief.tone}；${activeTemplate.label}模板；文字极简；强画面感。`,
      specialRequests: `${brief.specialRequests}。输出适合极简动态网页：每天只保留最强场景、少文字、强画面感。视觉方向：${activeTemplate.generationHint}`,
      generationMode,
    };
  }

  function handleScenicImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      setScenicStage("error");
      setScenicMessage("请上传 PNG、JPG 或 WebP 风景照片。");
      return;
    }

    if (file.size > scenicUploadMaxBytes) {
      setScenicStage("error");
      setScenicMessage("图片太大，请压缩到 6MB 以内。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setScenicStage("error");
        setScenicMessage("照片读取失败，请换一张图片。");
        return;
      }

      setScenicImageDataUrl(result);
      setScenicImageName(file.name);
      setSelectedSamplePhotoId("");
      setScenicDesign(null);
      setScenicStage("selected");
      setScenicMessage("照片已载入，等待 M3 读图设计。");
    };
    reader.onerror = () => {
      setScenicStage("error");
      setScenicMessage("照片读取失败，请换一张图片。");
    };
    reader.readAsDataURL(file);
  }

  async function selectScenicSamplePhoto(sample: ScenicSamplePhoto) {
    if (selectingSamplePhotoId || scenicStage === "generating") {
      return;
    }

    setSelectingSamplePhotoId(sample.id);
    setScenicStage("selected");
    setScenicMessage(`正在载入示例图：${sample.label}，随后自动读图。`);

    try {
      const response = await fetch(sample.src);
      if (!response.ok) {
        throw new Error("示例图读取失败。");
      }

      const blob = await response.blob();
      if (!/^image\/(png|jpe?g|webp)$/i.test(blob.type) || blob.size > scenicUploadMaxBytes) {
        throw new Error("示例图格式或大小不符合读图要求。");
      }

      const dataUrl = await readBlobAsDataUrl(blob);
      setScenicImageDataUrl(dataUrl);
      setScenicImageName(sample.label);
      setSelectedSamplePhotoId(sample.id);
      setScenicDesign(null);
      await generateScenicRenderDesignForImage(
        dataUrl,
        `示例图 ${sample.label} 已载入，MiniMax-M3 正在自动读图。`,
        `${sample.scene} 已读图。${sample.license} / ${sample.credit}`,
      );
    } catch (caught) {
      setScenicStage("error");
      setScenicMessage(caught instanceof Error ? caught.message : "示例图读取失败。");
    } finally {
      setSelectingSamplePhotoId("");
    }
  }

  async function generateScenicRenderDesign() {
    if (!scenicImageDataUrl || scenicStage === "generating") {
      setScenicStage("error");
      setScenicMessage("先上传一张风景照片。");
      return;
    }

    await generateScenicRenderDesignForImage(scenicImageDataUrl);
  }

  async function generateLandmarkPresetFromAI() {
    if (landmarkLoading) {
      return;
    }

    setLandmarkLoading(true);
    setLandmarkError("");
    setLandmarkErrorInfo(null);
    setLandmarkConfigTipOpen(false);
    setLandmarkStage("generating");

    try {
      const response = await fetch("/api/generate-landmark-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadbook,
          activeDay,
          template,
          mood,
          scenicDesign: scenicDesign || undefined,
        }),
      });
      const result = (await response.json()) as
        | {
            ok: true;
            preset: LandmarkPreset;
            model: string;
            cached: boolean;
            durationMs: number;
            cacheKey?: string;
          }
        | {
            ok: false;
            code: string;
            message: string;
          };

      if (result.ok) {
        setLandmarkPreset(result.preset);
        setLandmarkModel(result.model || "");
        setLandmarkStage(result.preset.source === "m3-generated" ? "ready" : "fallback");
        setLandmarkError("");
        setLandmarkErrorInfo(null);
        showSuccess("地标已生成", result.preset.name);
        return;
      }

      setLandmarkPreset(null);
      setLandmarkModel("");
      setLandmarkStage("error");
      setLandmarkError(result.message || "AI 地标预设生成失败。");
      setLandmarkErrorInfo(buildLandmarkM3Error(result.code, response.status, result.message || "AI 地标预设生成失败。"));
      showError("地标生成失败", result.message || "AI 地标预设生成失败。");
    } catch (caught) {
      setLandmarkPreset(null);
      setLandmarkModel("");
      setLandmarkStage("error");
      const message = caught instanceof Error ? caught.message : "AI 地标预设生成失败。";
      setLandmarkError(message);
      setLandmarkErrorInfo(buildLandmarkM3Error(undefined, 0, message));
      showError("地标生成失败", message);
    } finally {
      setLandmarkLoading(false);
    }
  }

  async function generateScenicRenderDesignForImage(
    imageDataUrl: string,
    loadingMessage = "MiniMax-M3 正在把照片转成建模渲染蓝图。",
    successPrefix?: string,
  ) {
    setScenicStage("generating");
    setScenicMessage(loadingMessage);

    try {
      const response = await fetch("/api/generate-scenic-render-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          destination: roadbook.destination || brief.destination,
          mood,
          template,
          roadbookTitle: roadbook.title,
          activeDayTitle: activePlan?.title,
          activeArea: activePlan?.area,
        }),
      });
      const result = (await response.json()) as GenerateScenicRenderDesignResponse;

      if (result.ok) {
        setScenicDesign(result.design);
        setScenicStage(result.design.status === "generated" ? "ready" : "fallback");
        setScenicMessage(
          result.design.status === "generated"
            ? `${successPrefix ? `${successPrefix} ` : ""}M3 蓝图已生成，重生成预览图会自动应用。`
            : result.design.message || "已使用本地建模蓝图兜底。",
        );
        return;
      }

      if (result.design) {
        setScenicDesign(result.design);
        setScenicStage(result.design.status === "fallback" ? "fallback" : "error");
      } else {
        setScenicDesign(null);
        setScenicStage("error");
      }
      setScenicMessage(result.message);
    } catch (caught) {
      setScenicStage("error");
      setScenicMessage(caught instanceof Error ? caught.message : "照片建模蓝图生成失败。");
    }
  }

  async function postRoadbook(endpoint: string, body: GenerateRoadbookRequest) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as GenerateRoadbookResponse;

    if (!response.ok || !result.ok) {
      throw new Error(result.ok ? "生成失败，请稍后重试。" : result.message);
    }

    return result;
  }

  async function completeRoadbook(requestBrief: GenerateRoadbookRequest, runId: number) {
    try {
      let fullResult: GenerateRoadbookResponse & { ok: true };

      try {
        fullResult = await postRoadbook("/api/generate-roadbook", requestBrief);
      } catch (firstError) {
        if (requestBrief.generationMode !== "speed") {
          throw firstError;
        }

        if (runId !== runIdRef.current) {
          return;
        }

        setError("快速补充不稳定，已切到 M3 补完整细节。");
        fullResult = await postRoadbook("/api/generate-roadbook", {
          ...requestBrief,
          generationMode: "quality",
        });
      }

      if (runId !== runIdRef.current) {
        return;
      }

      setRoadbook(fullResult.roadbook);
      setDemoRoadbookId(null);
      setActiveDay(fullResult.roadbook.days[0]?.day || 1);
      setLastModel(fullResult.model);
      setError("");
      setStage("ready");
      showSuccess("路书已生成", `${fullResult.roadbook.title} · ${fullResult.roadbook.durationLabel}`);
      void geocodeRoadbook(fullResult.roadbook, runId);
    } catch (caught) {
      if (runId !== runIdRef.current) {
        return;
      }

      const message = caught instanceof Error ? caught.message : "完整细节补充失败，当前保留预览版。";
      setError(message);
      setStage("preview");
      showWarning("路书细节未补齐", message);
    }
  }

  async function generatePreviewAsset(
    nextRoadbook: Roadbook,
    runId: number,
    options: { forceRegenerate?: boolean } = {},
  ) {
    setPreviewAsset(null);
    setAssetStage("generating");
    setAssetMessage(
      options.forceRegenerate
        ? scenicDesign
          ? "正在用照片建模蓝图重新生成远景贴片。"
          : "正在跳过缓存重新生成远景贴片。"
        : scenicDesign
          ? "正在用照片建模蓝图生成 cinematic preview。"
          : "正在生成 cinematic preview 远景贴片。",
    );

    try {
      const response = await fetch("/api/generate-preview-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadbook: nextRoadbook,
          activeDay: nextRoadbook.days[0]?.day || 1,
          mood,
          template,
          scenicDesign: scenicDesign || undefined,
          forceRegenerate: options.forceRegenerate,
        }),
      });
      const result = (await response.json()) as GeneratePreviewAssetResponse;

      if (runId !== runIdRef.current) {
        return;
      }

      if (result.ok) {
        setPreviewAsset(result.asset);
        setAssetStage(result.asset.status === "generated" ? "ready" : "fallback");
        setAssetMessage(buildPreviewAssetMessage(result.asset));
        void refreshPreviewAssetHistory(result.asset.cacheKey);
        return;
      }

      setPreviewAsset(result.asset || null);
      setAssetStage(result.asset ? "fallback" : "error");
      setAssetMessage(result.message);
      void refreshPreviewAssetHistory(result.asset?.cacheKey);
    } catch (caught) {
      if (runId !== runIdRef.current) {
        return;
      }

      setPreviewAsset(null);
      setAssetStage("error");
      setAssetMessage(caught instanceof Error ? caught.message : "预览资产生成失败，当前使用程序化 3D 兜底。");
    }
  }

  async function restorePreviewAssetHistory(item: PreviewAssetHistoryItem) {
    if (assetAction !== "idle" || assetStage === "generating") {
      return;
    }

    setAssetAction("restoring");
    setRestoringHistoryId(item.historyId);
    setAssetMessage("正在恢复历史预览图。");

    try {
      const response = await fetch("/api/generate-preview-asset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cacheKey: item.cacheKey,
          historyId: item.historyId,
        }),
      });
      const result = (await response.json()) as RestorePreviewAssetHistoryResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.ok ? "历史版本恢复失败。" : result.message);
      }

      setPreviewAsset(result.asset);
      setAssetStage(result.asset.status === "generated" ? "ready" : "fallback");
      setAssetMessage(result.message);
      void refreshPreviewAssetHistory(result.asset.cacheKey);
    } catch (caught) {
      setAssetMessage(caught instanceof Error ? caught.message : "历史版本恢复失败。");
    } finally {
      setRestoringHistoryId("");
      setAssetAction("idle");
    }
  }

  async function setPreviewAssetCover(item: PreviewAssetHistoryItem) {
    if (assetAction !== "idle" || assetStage === "generating") {
      return;
    }

    setAssetAction("covering");
    setCoveringHistoryId(item.historyId);
    setAssetMessage("正在设置最终封面。");

    try {
      const response = await fetch("/api/generate-preview-asset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cacheKey: item.cacheKey,
          historyId: item.historyId,
        }),
      });
      const result = (await response.json()) as SetPreviewAssetCoverResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.ok ? "最终封面设置失败。" : result.message);
      }

      setPreviewAsset(result.asset);
      setAssetStage(result.asset.status === "generated" ? "ready" : "fallback");
      setAssetMessage(result.message);
      setAssetHistory((current) =>
        current.map((historyItem) => ({
          ...historyItem,
          isCover: historyItem.historyId === result.historyId,
        })),
      );
      void refreshPreviewAssetHistory(result.cacheKey);
    } catch (caught) {
      setAssetMessage(caught instanceof Error ? caught.message : "最终封面设置失败。");
    } finally {
      setCoveringHistoryId("");
      setAssetAction("idle");
    }
  }

  async function clearPreviewAssetCache() {
    if (!previewAsset?.cacheKey || assetAction !== "idle") {
      return;
    }

    const cacheKey = previewAsset.cacheKey;
    setAssetAction("clearing");
    setAssetMessage("正在清除当前预览图缓存。");

    try {
      const response = await fetch("/api/generate-preview-asset", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cacheKey }),
      });
      const result = (await response.json()) as DeletePreviewAssetCacheResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.ok ? "缓存清除失败。" : result.message);
      }

      const message = result.deleted ? "缓存已清除，当前画面暂时保留在页面中。" : "本地没有找到这个缓存，当前画面暂时保留。";
      setPreviewAsset((current) =>
        current?.cacheKey === cacheKey
          ? {
              ...current,
              cacheStatus: "cleared",
              message,
              cachedAt: result.deleted ? new Date().toISOString() : current.cachedAt,
            }
          : current,
      );
      setAssetMessage(message);
      void refreshPreviewAssetHistory(cacheKey);
    } catch (caught) {
      setAssetMessage(caught instanceof Error ? caught.message : "缓存清除失败。");
    } finally {
      setAssetAction("idle");
    }
  }

  async function regeneratePreviewAsset() {
    if (assetAction !== "idle" || assetStage === "generating") {
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setTrackDemoStep(null);
    setAssetAction("regenerating");

    try {
      await generatePreviewAsset(roadbook, runId, { forceRegenerate: true });
    } finally {
      if (runId === runIdRef.current) {
        setAssetAction("idle");
      }
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setTrackDemoStep(null);
    setPreviewAsset(null);
    setAssetStage("idle");
    setAssetAction("idle");
    setAssetMessage("");
    setAssetHistory([]);
    setHistoryLoading(false);
    setHistoryMessage("");
    setRestoringHistoryId("");
    setCoveringHistoryId("");
    setStage("generating");
    setError("");
    setLandmarkPreset(null);
    setLandmarkLoading(false);
    setLandmarkError("");
    setLandmarkErrorInfo(null);
    setLandmarkConfigTipOpen(false);
    setLandmarkStage("idle");
    setLandmarkModel("");

    const requestBrief = buildRequestBrief();

    try {
      const previewResult = await postRoadbook("/api/generate-dream-preview", requestBrief);

      if (runId !== runIdRef.current) {
        return;
      }

      setRoadbook(previewResult.roadbook);
      setDemoRoadbookId(null);
      setActiveDay(previewResult.roadbook.days[0]?.day || 1);
      setLastModel(previewResult.model);
      setStage("refining");
      showInfo("梦境路书预览已出", `${previewResult.roadbook.title} · 后台补完整细节中`);
      void generatePreviewAsset(previewResult.roadbook, runId);
      void geocodeRoadbook(previewResult.roadbook, runId);
      void completeRoadbook(requestBrief, runId);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "生成服务暂时不可用，请先检查 MiniMax Key 或网络。";
      setError(message);
      setStage("error");
      showError("梦境路书生成失败", message);
    }
  }

  function resetDemo(nextDemoRoadbookId: DemoRoadbookId = "dali") {
    const nextDemo = demoRoadbookOptions.find((option) => option.id === nextDemoRoadbookId) || demoRoadbookOptions[0];
    runIdRef.current += 1;
    setTrackDemoStep(null);
    setDemoRoadbookId(nextDemo.id);
    setRoadbook(nextDemo.roadbook);
    setBrief(nextDemo.brief);
    setInterestsInput(nextDemo.brief.interests.join("、"));
    setActiveDay(1);
    setMood(nextDemo.mood);
    setTemplate(nextDemo.template);
    setGenerationMode("speed");
    setLastModel("");
    setPreviewAsset(null);
    setAssetStage("idle");
    setAssetAction("idle");
    setAssetMessage("");
    setAssetHistory([]);
    setHistoryLoading(false);
    setHistoryMessage("");
    setRestoringHistoryId("");
    setCoveringHistoryId("");
    setScenicImageDataUrl("");
    setScenicImageName("");
    setSelectedSamplePhotoId("");
    setSelectingSamplePhotoId("");
    setScenicDesign(null);
    setScenicStage("idle");
    setScenicMessage("");
    setLandmarkPreset(null);
    setLandmarkLoading(false);
    setLandmarkError("");
    setLandmarkErrorInfo(null);
    setLandmarkConfigTipOpen(false);
    setLandmarkStage("idle");
    setLandmarkModel("");
    setPoints([]);
    setMapConfigured(null);
    setMapLoading(false);
    setUseRealTerrain(false);
    setRealTerrainTokenMissing(false);
    setRealTerrainSources(null);
    setStage("demo");
    setError("");
  }

  function playTrackDemo() {
    if (isBusy) {
      return;
    }

    setTrackDemoStep(0);
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`dream-page dream-mood-${mood} dream-template-${template}`}
    >
      <section className="dream-shell">
        <header className="dream-topbar">
          <div>
            <p className="dream-eyebrow">Dream Roadbook / {design.eyebrow}</p>
            <h1>生成式梦境路书</h1>
          </div>
          <nav className="dream-nav" aria-label="页面导航">
            <Link href="/" aria-label="返回工具页">
              <ArrowLeft size={16} />
              工具页
            </Link>
            <Link href={studioHandoffHref} aria-label="打开录屏台">
              <Eye size={16} />
              录屏台
            </Link>
          </nav>
        </header>

        <aside className="dream-control">
          <div className="dream-control-title">
            <Compass size={18} />
            <span>点击生成</span>
          </div>

          <div
            className={`dream-trigger-track ${isTrackDemo ? "demo" : ""}`}
            aria-label="两段式补全进度轨道"
          >
            <div className="dream-track-head">
              <span>Trigger Track</span>
              <div className="dream-track-actions">
                <strong>{trackBadge}</strong>
                <button
                  type="button"
                  className="dream-track-demo-button"
                  disabled={isBusy}
                  onClick={playTrackDemo}
                  aria-label="播放录屏讲解模式"
                >
                  <PlayCircle size={13} aria-hidden="true" />
                  {isTrackDemo ? "重播" : "讲解"}
                </button>
              </div>
            </div>
            <div className="dream-track-steps">
              {trackSteps.map((step) => (
                <div key={step.label} className={`dream-track-step ${step.status}`}>
                  <span className="dream-track-dot" />
                  <div>
                    <strong>{step.label}</strong>
                    <small>{step.note}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form className="dream-brief-form" onSubmit={handleGenerate}>
            <label>
              <span>目的地</span>
              <input
                value={brief.destination}
                onChange={(event) => {
                  const destination = event.target.value;
                  updateBrief("destination", destination);
                  updateBrief("city", destination.replace(/中国|云南|四川|浙江|江苏|广东|广西/g, ""));
                }}
                placeholder="云南大理"
              />
            </label>

            <div className="dream-brief-row">
              <label>
                <span>月份</span>
                <input
                  value={brief.travelMonth}
                  onChange={(event) => updateBrief("travelMonth", event.target.value)}
                  placeholder="秋季"
                />
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
              <span>兴趣</span>
              <input
                value={interestsInput}
                onChange={(event) => setInterestsInput(event.target.value)}
                placeholder="日落、咖啡、古城"
              />
            </label>

            <label>
              <span>一句偏好</span>
              <textarea
                value={brief.specialRequests}
                onChange={(event) => updateBrief("specialRequests", event.target.value)}
                rows={3}
                placeholder="想要高级、梦境、少文字"
              />
            </label>

            <div className="dream-generation-mode" aria-label="生成模式">
              {generationModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={generationMode === item.id ? "active" : ""}
                  disabled={isBusy}
                  onClick={() => setGenerationMode(item.id)}
                  aria-pressed={generationMode === item.id}
                >
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </button>
              ))}
            </div>

            <button className="dream-generate-action" type="submit" disabled={isBusy}>
              {isBusy ? <Loader2 size={16} className="dream-spin" /> : <Sparkles size={16} />}
              {stage === "generating" ? "先生成预览" : stage === "refining" ? "补充细节中" : "生成梦境路书"}
            </button>

            <div className="dream-demo-roadbooks" aria-label="本地演示路书">
              {demoRoadbookOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={demoRoadbookId === option.id ? "active" : ""}
                  onClick={() => resetDemo(option.id)}
                  aria-pressed={demoRoadbookId === option.id}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.note}</small>
                  </span>
                </button>
              ))}
            </div>
          </form>

          <div className="dream-studio-bridge" aria-label="Studio Bridge">
            <span>Studio Bridge</span>
            <strong>{roadbook.destination} → Studio</strong>
            <p>{demoRoadbookId ? "保留当前本地演示，回到同款录屏台。" : "真实生成后可回到录屏台继续拆解。"}</p>
            <small className="dream-studio-bridge-badge">Recording suite 已覆盖</small>
            <Link href={studioHandoffHref}>
              返回同款录屏台
              <Eye size={13} />
            </Link>
          </div>

          <div className={`dream-status ${stage === "error" ? "error" : ""}`}>
            {stage === "ready" && `完整细节已补齐${lastModel ? ` / ${lastModel}` : ""}`}
            {stage === "refining" &&
              `${error || "预览版已展示，后台补完整细节"}${lastModel ? ` / ${lastModel}` : ""}`}
            {stage === "preview" && `当前为预览版；完整细节补充失败${error ? ` / ${error}` : ""}`}
            {stage === "generating" && "第一段生成中：先出可展示的梦境路书"}
            {stage === "error" && error}
            {stage === "demo" && "两段式：先出梦境预览，再后台补完整细节。"}
          </div>

          <div className="dream-template-switcher" aria-label="梦境模板">
            <TemplateCardGrid
              templates={dreamTemplates}
              activeId={template}
              onSelect={setTemplate}
            />
          </div>

          <div className="dream-mood-switcher" aria-label="视觉气质">
            <div className="dream-mood-swatch-row" role="radiogroup" aria-label="视觉气质">
              {dreamMoods.map((item) => {
                const isActive = mood === item.id;
                const swatch = dreamMoodSwatchColors[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`dream-mood-swatch ${isActive ? "active" : ""}`}
                    data-mood={item.id}
                    onClick={() => setMood(item.id)}
                    style={{
                      // CSS custom properties consumed by .dream-mood-swatch styles
                      // so the same component renders a different palette per mood.
                      ["--mood-core" as string]: swatch.core,
                      ["--mood-ring" as string]: swatch.ring,
                      ["--mood-soft" as string]: swatch.soft,
                    }}
                    aria-label={`${item.label} 气质 · ${dreamMoodNotes[item.id]}${isActive ? "（已选）" : ""}`}
                    title={`${item.label} · ${dreamMoodNotes[item.id]}`}
                  >
                    <span className="dream-mood-swatch-chip" aria-hidden="true" />
                    <strong className="dream-mood-swatch-label">{item.label}</strong>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="dream-rule">
            <Moon size={17} />
            <p>AI 生成内容，设计 skill 生成网页视觉。</p>
          </div>
        </aside>

        <section className="dream-world dream-world-skyline" aria-label={`${roadbook.destination} 3D 目的地预览`}>
          <div className="dream-recording-panel" aria-label="录屏控制器">
            <div className="dream-recording-head">
              <span>录屏控制器</span>
              {recordingStatus === "recording" ? (
                <strong className="dream-recording-head-live">
                  <Loader2 size={12} className="dream-spin" />
                  正在录制 · {Math.ceil(countdownMs / 1000)}s
                </strong>
              ) : recordingStatus === "finished" ? (
                <strong className="dream-recording-head-finished">录制完成</strong>
              ) : recordingStatus === "stopped" ? (
                <strong className="dream-recording-head-stopped">已停止</strong>
              ) : (
                <strong>待开始</strong>
              )}
            </div>

            <div
              className={`dream-recording-progress ${recordingStatus === "recording" ? "live" : ""} ${transitionFlash > 0 ? "flash" : ""}`}
              data-flash={transitionFlash}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label="录屏进度"
            >
              <div className="dream-recording-progress-head">
                <strong className="dream-recording-step-number">
                  <em>D{recordingProgress.step}</em>
                  <span>/{recordingProgress.total}</span>
                </strong>
                <div className="dream-recording-current-pair">
                  <span className="dream-recording-template-chip" data-template={template}>
                    {activeTemplate?.label || template}
                  </span>
                  <span className="dream-recording-pair-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="dream-recording-mood-chip" data-mood={mood}>
                    {dreamMoods.find((item) => item.id === mood)?.label || mood}
                  </span>
                </div>
              </div>

              <div className="dream-recording-dot-bar" role="progressbar" aria-valuemin={0} aria-valuemax={recordingProgress.total} aria-valuenow={recordingProgress.step}>
                {Array.from({ length: recordingProgress.total }).map((_, index) => {
                  const isFilled = index < recordingProgress.step;
                  const isCurrent = index === recordingProgress.step && recordingStatus === "recording";
                  return (
                    <span
                      key={index}
                      className={`dream-recording-dot ${isFilled ? "filled" : ""} ${isCurrent ? "current" : ""}`}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
            </div>

            {recordingStatus === "finished" ? (
              <div className="dream-recording-toast finished" role="status" aria-live="polite">
                <Sparkles size={14} aria-hidden="true" />
                <span>录制完成 · 共 {recordingProgress.total} 组模板 × 气质组合已全部过一遍。</span>
                <button type="button" onClick={reRecord} aria-label="重新录屏">
                  <RotateCcw size={12} aria-hidden="true" />
                  重新录制
                </button>
              </div>
            ) : null}

            {recordingStatus === "stopped" ? (
              <div className="dream-recording-toast stopped" role="status" aria-live="polite">
                <Pause size={14} aria-hidden="true" />
                <span>已停止 · 进度停留在 D{recordingProgress.step}/{recordingProgress.total}。</span>
                <button type="button" onClick={reRecord} aria-label="重新录屏">
                  <RotateCcw size={12} aria-hidden="true" />
                  重新录制
                </button>
              </div>
            ) : null}

            <div className="dream-recording-modes" aria-label="录屏模式">
              {recordingModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={recordingConfig.mode === item.id ? "active" : ""}
                  onClick={() => {
                    if (isRecording) {
                      return;
                    }
                    setRecordingConfig((current) => ({ ...current, mode: item.id }));
                  }}
                  disabled={isRecording}
                  aria-pressed={recordingConfig.mode === item.id}
                >
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </button>
              ))}
            </div>
            <div className="dream-recording-actions">
              {isRecording ? (
                <button
                  type="button"
                  className="dream-recording-stop"
                  onClick={stopRecording}
                  aria-label="停止录屏"
                >
                  <Pause size={14} aria-hidden="true" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  className="dream-recording-start"
                  onClick={startRecording}
                  aria-label={`开始录屏，共 ${getTotalCombinations(recordingConfig)} 组组合`}
                >
                  <PlayCircle size={14} aria-hidden="true" />
                  录制
                </button>
              )}
              {recordingConfig.mode === "manual" && !isRecording ? (
                <>
                  <button
                    type="button"
                    onClick={() => stepManualTemplate(-1)}
                    aria-label="上一个模板"
                  >
                    模板 ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => stepManualTemplate(1)}
                    aria-label="下一个模板"
                  >
                    模板 ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => stepManualMood(-1)}
                    aria-label="上一组气质"
                  >
                    气质 ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => stepManualMood(1)}
                    aria-label="下一组气质"
                  >
                    气质 ▶
                  </button>
                </>
              ) : null}
            </div>
            <p className="dream-recording-hint">
              {recordingConfig.mode === "manual"
                ? "手动模式：使用 ◀ ▶ 按钮逐个切换模板和气质。"
                : `自动模式：每 ${recordingConfig.stepIntervalMs ?? 4000}ms 切换一次。`}
            </p>
          </div>
          <div className="dream-terrain-toggle" aria-label="真实地形管线开关">
            <label>
              <input
                type="checkbox"
                checked={useRealTerrain}
                onChange={(event) => setUseRealTerrain(event.target.checked)}
                disabled={isBusy}
              />
              <MapPinned size={14} />
              <span>真实地形管线</span>
              <small>Real Terrain: {realTerrainActive ? "on" : "off"}</small>
            </label>
            {useRealTerrain ? (
              realTerrainTokenMissing ? (
                <p className="dream-terrain-toggle-hint warn">
                  未配置 MAPBOX_TOKEN，使用回退
                </p>
              ) : (
                <p className="dream-terrain-toggle-hint">需要配置 MAPBOX_TOKEN</p>
              )
            ) : null}
          </div>
          {realTerrainActive && realTerrainSources ? (
            <RealSkylineScene
              roadbook={roadbook}
              design={design}
              activeDay={activeDay}
              mood={mood}
              template={template}
              previewAsset={previewAsset}
              assetStage={assetStage}
              assetMessage={assetMessage}
              onSelectDay={setActiveDay}
              terrainSource={realTerrainSources.terrainSource}
              buildingsSource={realTerrainSources.buildingsSource}
              isRecording={isRecording}
            />
          ) : (
            <DreamSkylineScene
              roadbook={roadbook}
              design={design}
              activeDay={activeDay}
              mood={mood}
              template={template}
              previewAsset={previewAsset}
              assetStage={assetStage}
              assetMessage={assetMessage}
              onSelectDay={setActiveDay}
              landmarkPreset={landmarkPreset}
            />
          )}
          <div className="dream-title-block">
            <p className="dream-eyebrow">AI Custom Atlas</p>
            <h2>
              {design.titleLines[0]}
              <br />
              {design.titleLines[1]}
            </h2>
            <div>
              {design.highlightChips.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        <aside className="dream-detail">
          <div className="dream-day-mark">
            <Layers3 size={18} />
            <span>D{activePlan.day}</span>
          </div>
          <h2>{activeStop?.title || activePlan.area}</h2>
          <p>{activePlan.mood}</p>

          <div className="dream-keywords">
            {(activeStop?.keywords || [activePlan.area]).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="dream-mini-route">
            {activePlan.stops.slice(0, 3).map((stop) => (
              <button
                key={stop.id}
                type="button"
                aria-label={`${stop.time} · ${stop.name}`}
                title={`${stop.time} · ${stop.name}`}
              >
                <small>{stop.time}</small>
                <strong>{stop.name.replace("大理", "")}</strong>
              </button>
            ))}
          </div>

          <div className="dream-whisper">
            <Sparkles size={17} />
            <p>
              {activePlan.photoTips[0] || activePlan.routeSummary} / {activePlan.food[0] || activePlan.area}
            </p>
          </div>

          <div className={`dream-scene-inspector ${sceneInspector.status}`} aria-label="3D 场景预设检查器">
            <div className="dream-scene-inspector-head">
              <span>Scene Inspector</span>
              <strong>{sceneInspector.status === "active" ? "preset active" : "fallback"}</strong>
            </div>
            <div className="dream-scene-inspector-title">
              <Eye size={15} aria-hidden="true" />
              <div>
                <small>{sceneInspector.destination}</small>
                <b>{sceneInspector.heroLabel}</b>
              </div>
            </div>
            <div className="dream-scene-inspector-grid">
              <span>
                <small>Shot</small>
                <strong>{sceneInspector.shotLabel}</strong>
              </span>
              <span>
                <small>Route</small>
                <strong>{sceneInspector.routeProgress}</strong>
              </span>
              <span>
                <small>Lens</small>
                <strong>FOV {sceneInspector.cameraFov}</strong>
              </span>
              <span>
                <small>Parallax</small>
                <strong>{sceneInspector.parallaxWeight.toFixed(2)}x</strong>
              </span>
            </div>
            <p>{sceneInspector.visualCue}</p>
            {sceneTimeline.status === "active" ? (
              <div className="dream-scene-timeline" aria-label="D1-D4 视觉导演轨道">
                {sceneTimeline.items.map((item) => (
                  <button
                    key={item.day}
                    type="button"
                    className={item.isActive ? "active" : ""}
                    onClick={() => setActiveDay(item.day)}
                    aria-pressed={item.isActive}
                    aria-label={`D${item.day} ${item.label} · ${item.visualCue}`}
                  >
                    <small>D{item.day}</small>
                    <strong>{item.label}</strong>
                    <em>{item.visualCue}</em>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <DreamMiniMap roadbook={roadbook} points={points} configured={mapConfigured} loading={mapLoading} />

          <div className={`dream-scenic-skill ${scenicStage}`} aria-label="风景照片转建模渲染技能">
            <div className="dream-scenic-head">
              <span>Scenic Render Skill</span>
              <div className="dream-scenic-head-actions">
                <strong>{buildScenicSkillStatus(scenicStage, scenicDesign)}</strong>
                <button type="button" onClick={generateScenicRenderDesign} disabled={!scenicImageDataUrl || scenicStage === "generating"}>
                  {scenicStage === "generating" ? <Loader2 size={12} className="dream-spin" /> : <Sparkles size={12} />}
                  读图
                </button>
              </div>
            </div>

            <label className="dream-scenic-upload">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleScenicImageChange} />
              {scenicImageDataUrl ? (
                <span className="dream-scenic-thumb" style={{ backgroundImage: `url(${scenicImageDataUrl})` }} />
              ) : (
                <span className="dream-scenic-empty">
                  <Sparkles size={17} />
                </span>
              )}
              <span>
                <strong>{scenicImageName || "上传风景照片"}</strong>
                <small>示例图会自动读图</small>
              </span>
            </label>

            <div className="dream-scenic-library" aria-label="真实照片示例库">
              {scenicSamplePhotos.map((sample) => {
                const isSelected = selectedSamplePhotoId === sample.id;
                const isSelecting = selectingSamplePhotoId === sample.id || (isSelected && scenicStage === "generating");

                return (
                  <button
                    key={sample.id}
                    type="button"
                    className={isSelected ? "active" : ""}
                    onClick={() => selectScenicSamplePhoto(sample)}
                    disabled={Boolean(selectingSamplePhotoId) || scenicStage === "generating"}
                    aria-pressed={isSelected}
                    title={`${sample.label} / ${sample.license} / ${sample.credit}`}
                  >
                    <span style={{ backgroundImage: `url(${sample.src})` }}>
                      {isSelecting ? <Loader2 size={13} className="dream-spin" /> : null}
                    </span>
                    <strong>{sample.label}</strong>
                  </button>
                );
              })}
            </div>

            <div className="dream-scenic-actions">
              <button type="button" onClick={generateScenicRenderDesign} disabled={!scenicImageDataUrl || scenicStage === "generating"}>
                {scenicStage === "generating" ? <Loader2 size={14} className="dream-spin" /> : <Sparkles size={14} />}
                读图设计
              </button>
              <button type="button" onClick={regeneratePreviewAsset} disabled={!scenicDesign || isAssetWorking}>
                <RotateCcw size={14} />
                应用重生成
              </button>
            </div>

            <p>{scenicMessage || "用真实照片提取地形、建筑、光线和镜头。"}</p>

            {scenicDesign ? (
              <div className="dream-scenic-blueprint">
                <strong>{scenicDesign.sceneTitle}</strong>
                <small>{scenicDesign.lighting}</small>
                <div>
                  {buildScenicBlueprintChips(scenicDesign).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className={`dream-landmark-skill ${landmarkStage}`} aria-label="AI 地标预设">
            <div className="dream-landmark-head">
              <span>AI Landmark</span>
              <div className="dream-landmark-head-actions">
                <strong>{buildLandmarkStatus(landmarkStage, landmarkPreset)}</strong>
                <button
                  type="button"
                  onClick={generateLandmarkPresetFromAI}
                  disabled={landmarkLoading || isBusy || roadbook.days.length === 0}
                  aria-label="生成 AI 地标"
                  title={roadbook.days.length === 0 ? "需要先生成路书" : undefined}
                >
                  {landmarkLoading ? <Loader2 size={12} className="dream-spin" /> : <Sparkles size={12} />}
                  生成 AI 地标
                </button>
              </div>
            </div>
            {roadbook.days.length === 0 ? (
              <div className="dream-landmark-empty" role="status" aria-live="polite">
                <span className="dream-landmark-empty-icon" aria-hidden="true">
                  <MapPinned size={18} />
                </span>
                <div>
                  <strong>需要先生成路书</strong>
                  <p>AI 地标会基于路书的每日行程、当前模板和气质生成。请先点击 “生成梦境路书” 拿到行程后再生成地标。</p>
                </div>
              </div>
            ) : landmarkStage === "generating" ? (
              <div className="dream-landmark-loading" role="status" aria-live="polite" data-testid="dream-landmark-loading">
                <span className="dream-landmark-loading-icon" aria-hidden="true">
                  <Loader2 size={18} className="dream-spin" />
                </span>
                <div>
                  <strong>M3 生成中</strong>
                  <p>通常需要 3-10 秒，正在调用 M3 写入 LandmarkPreset（几何体 / 灯光 / 材质）。</p>
                </div>
                <span className="dream-landmark-loading-hint" aria-hidden="true">
                  <Hourglass size={12} />
                  3-10s
                </span>
              </div>
            ) : landmarkStage === "idle" && !landmarkPreset && !landmarkErrorInfo ? (
              <div className="dream-landmark-empty" data-testid="dream-landmark-empty">
                <span className="dream-landmark-empty-icon" aria-hidden="true">
                  <Building2 size={18} />
                </span>
                <div>
                  <strong>AI 地标未生成</strong>
                  <p>当前路书已就绪，但还没有为今日场景生成 AI 地标。点击 “生成 AI 地标” 调起 M3，未配置 Key 时会回退到程序化预设。</p>
                </div>
                <button
                  type="button"
                  className="dream-landmark-empty-action"
                  onClick={generateLandmarkPresetFromAI}
                  disabled={landmarkLoading || isBusy}
                >
                  <Sparkles size={12} />
                  点击生成
                </button>
              </div>
            ) : landmarkErrorInfo && landmarkStage === "error" ? (
              <div className="dream-landmark-error">
                <ErrorStateBanner
                  error={landmarkErrorInfo}
                  retrying={landmarkLoading}
                  onRetry={() => void generateLandmarkPresetFromAI()}
                  onAction={(action) => {
                    if (action === "configure-api-key") {
                      setLandmarkConfigTipOpen((current) => !current);
                    }
                  }}
                />
                {landmarkErrorInfo.category === "auth" && landmarkConfigTipOpen ? (
                  <div className="dream-landmark-config-tip" role="note">
                    <strong>MINIMAX_API_KEY 配置说明</strong>
                    <p>在项目根目录新建或编辑 <code>.env.local</code>，加入下面这行后重启 <code>npm run dev</code>：</p>
                    <pre>
                      <code>MINIMAX_API_KEY=your_minimax_key</code>
                    </pre>
                    <p>同时确保 <code>MINIMAX_BASE_URL</code> 指向 <code>https://api.minimaxi.com/v1</code>，否则调用会失败。</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p role="status" aria-live="polite" aria-atomic="true">
                {landmarkError
                  ? landmarkError
                  : landmarkPreset
                    ? `${landmarkPreset.name} · ${formatLandmarkSource(landmarkPreset.source)}${landmarkModel ? ` · ${landmarkModel}` : ""}`
                    : "基于当前路书 + 模板 + 气质调用 M3 生成 LandmarkPreset；未配置 MiniMax Key 时会回退到程序化预设。"}
              </p>
            )}
            {landmarkPreset ? (
              <LandmarkBlueprintCard
                preset={landmarkPreset}
                currentSceneDay={activeDay}
                model={landmarkModel || undefined}
                onActivateScene={(day) => {
                  setActiveDay(day);
                }}
              />
            ) : null}
          </div>

          <div className={`dream-asset-panel ${assetStage}`} aria-label="预览资产管理面板">
            <div className="dream-asset-head">
              <span>资产缓存</span>
              <strong>{buildAssetPanelStatus(assetStage, previewAsset, assetAction)}</strong>
            </div>
            <dl className="dream-asset-meta">
              <div>
                <dt>Key</dt>
                <dd title={previewAsset?.cacheKey}>{formatCacheKey(previewAsset?.cacheKey)}</dd>
              </div>
              <div>
                <dt>时间</dt>
                <dd>{formatAssetTime(previewAsset?.cachedAt)}</dd>
              </div>
              <div>
                <dt>来源</dt>
                <dd>{previewAsset?.source === "minimax-image" ? "MiniMax image" : "Three.js fallback"}</dd>
              </div>
              <div>
                <dt>封面</dt>
                <dd>{coverHistory ? formatAssetTime(coverHistory.createdAt) : "未选择"}</dd>
              </div>
            </dl>
            <p>{buildAssetPanelMessage(previewAsset, assetMessage)}</p>
            <div className="dream-asset-actions">
              <button
                type="button"
                onClick={clearPreviewAssetCache}
                disabled={!previewAsset?.cacheKey || previewAsset.cacheStatus === "cleared" || isAssetWorking}
              >
                {assetAction === "clearing" ? <Loader2 size={14} className="dream-spin" /> : <Trash2 size={14} />}
                清除
              </button>
              <button type="button" onClick={regeneratePreviewAsset} disabled={isAssetWorking}>
                {assetAction === "regenerating" ? <Loader2 size={14} className="dream-spin" /> : <RotateCcw size={14} />}
                重生成
              </button>
            </div>
            <Link className="dream-share-preview-link" href={sharePreviewHref}>
              <Eye size={14} />
              分享预览
            </Link>
          </div>

          <div className="dream-asset-history" aria-label="预览资产历史抽屉">
            <div className="dream-asset-history-head">
              <span>历史版本</span>
              <strong>{historyLoading && !assetHistory.length ? "读取中" : `${assetHistory.length} 张`}</strong>
            </div>
            {assetHistory.length ? (
              <div className="dream-asset-history-list">
                {assetHistory.map((item, index) => {
                  const isCurrent = item.historyId === previewAsset?.historyId;
                  const isRestoring = restoringHistoryId === item.historyId;
                  const isCovering = coveringHistoryId === item.historyId;

                  return (
                    <div
                      key={item.historyId}
                      className={`dream-asset-history-item ${isCurrent ? "active" : ""} ${item.isCover ? "cover" : ""}`}
                    >
                      <button
                        type="button"
                        className="dream-asset-history-main"
                        onClick={() => restorePreviewAssetHistory(item)}
                        disabled={isAssetWorking || isCurrent}
                        aria-label={
                          isCurrent
                            ? `当前版本 · ${formatAssetTime(item.createdAt)}`
                            : `恢复版本 ${assetHistory.length - index} · ${formatAssetTime(item.createdAt)}`
                        }
                        title={
                          isCurrent
                            ? `当前版本 · ${formatAssetTime(item.createdAt)}`
                            : `恢复版本 ${assetHistory.length - index} · ${formatAssetTime(item.createdAt)}`
                        }
                      >
                        <span className="dream-asset-thumb" style={{ backgroundImage: `url(${item.imageDataUrl})` }} aria-hidden="true" />
                        <span>
                          <strong>{item.isCover ? "最终封面" : isCurrent ? "当前版本" : `版本 ${assetHistory.length - index}`}</strong>
                          <small>{formatAssetTime(item.createdAt)} / {item.mood || item.template || "visual"}</small>
                        </span>
                        <em>{isRestoring ? "恢复中" : isCurrent ? "使用中" : "恢复"}</em>
                      </button>
                      <button
                        type="button"
                        className="dream-cover-pick-button"
                        onClick={() => setPreviewAssetCover(item)}
                        disabled={isAssetWorking || item.isCover}
                        aria-label={
                          item.isCover
                            ? `当前已是最终封面 · 版本 ${assetHistory.length - index}`
                            : `将版本 ${assetHistory.length - index} 设为最终封面`
                        }
                      >
                        {isCovering ? "标记中" : item.isCover ? "封面" : "设封面"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>{historyLoading ? "正在读取本地历史。" : historyMessage || "真实生成后会保留历史版本。"}</p>
            )}
          </div>

        </aside>
      </section>
    </main>
  );
}

function buildScenicSkillStatus(stage: ScenicSkillStage, design: ScenicRenderDesign | null) {
  if (stage === "generating") {
    return "M3 读图中";
  }

  if (design?.status === "generated") {
    return "M3 蓝图";
  }

  if (stage === "fallback" || design?.status === "fallback") {
    return "本地蓝图";
  }

  if (stage === "selected") {
    return "已载入";
  }

  if (stage === "error") {
    return "需重试";
  }

  return "待上传";
}

function buildScenicBlueprintChips(design: ScenicRenderDesign) {
  return [
    design.terrain[0],
    design.architecture[0],
    design.waterAndVegetation[0],
    design.camera.replace(/[，。,.].*$/, ""),
  ]
    .filter((item): item is string => Boolean(item))
    .map((item) => (item.length > 12 ? item.slice(0, 12) : item))
    .slice(0, 4);
}

function buildLandmarkStatus(stage: LandmarkSkillStage, preset: LandmarkPreset | null) {
  if (stage === "generating") {
    return "M3 生成中";
  }

  if (preset?.source === "m3-generated") {
    return "M3 蓝图";
  }

  if (preset?.source === "procedural-fallback" || stage === "fallback") {
    return "本地兜底";
  }

  if (stage === "error") {
    return "需重试";
  }

  return "待生成";
}

function formatLandmarkSource(source: LandmarkPreset["source"]) {
  if (source === "m3-generated") {
    return "M3 生成";
  }

  if (source === "procedural-fallback") {
    return "程序化兜底";
  }

  if (source === "user-uploaded") {
    return "用户上传";
  }

  return source;
}

function buildPreviewAssetMessage(asset: PreviewAsset) {
  if (asset.message) {
    return asset.message;
  }

  if (asset.cacheStatus === "cleared") {
    return "缓存已清除，当前画面暂时保留在页面中。";
  }

  if (asset.cacheStatus === "hit") {
    return "已命中本地预览缓存，未重复调用图片生成。";
  }

  if (asset.cacheStatus === "stored") {
    return "AI 远景贴片已接入，并已保存到本地缓存。";
  }

  if (asset.cacheStatus === "restored") {
    return "已从历史版本恢复为当前预览图。";
  }

  if (asset.cacheStatus === "cover") {
    return "已设为最终封面，并同步为当前预览图。";
  }

  return "AI 远景贴片已接入 Three.js 场景。";
}

function buildAssetPanelStatus(
  assetStage: PreviewAssetStage,
  previewAsset: PreviewAsset | null,
  assetAction: PreviewAssetAction,
) {
  if (assetAction === "clearing") {
    return "清理中";
  }

  if (assetAction === "regenerating" || assetStage === "generating") {
    return "生成中";
  }

  if (assetAction === "restoring") {
    return "恢复中";
  }

  if (assetAction === "covering") {
    return "封面中";
  }

  if (previewAsset?.cacheStatus === "hit") {
    return "缓存命中";
  }

  if (previewAsset?.cacheStatus === "stored") {
    return "已写缓存";
  }

  if (previewAsset?.cacheStatus === "restored") {
    return "已恢复";
  }

  if (previewAsset?.cacheStatus === "cover") {
    return "最终封面";
  }

  if (previewAsset?.cacheStatus === "cleared") {
    return "已清除";
  }

  if (assetStage === "fallback") {
    return "3D 兜底";
  }

  if (assetStage === "error") {
    return "生成失败";
  }

  return "待生成";
}

function formatAssetTime(value?: string) {
  if (!value) {
    return "待生成";
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCacheKey(value?: string) {
  if (!value) {
    return "待生成";
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function buildAssetPanelMessage(previewAsset: PreviewAsset | null, assetMessage: string) {
  if (previewAsset?.cacheStatus === "hit") {
    return "本地命中，未重复调用图片生成。";
  }

  if (previewAsset?.cacheStatus === "stored") {
    return "新图已生成，并写入本地缓存。";
  }

  if (previewAsset?.cacheStatus === "restored") {
    return "已恢复历史版本为当前画面。";
  }

  if (previewAsset?.cacheStatus === "cover") {
    return "已设为最终封面。";
  }

  if (previewAsset?.cacheStatus === "cleared") {
    return "缓存已清除，当前画面暂时保留。";
  }

  return assetMessage || "生成后会显示 key、时间和来源。";
}

function buildSharePreviewHref(
  roadbook: Roadbook,
  previewAsset: PreviewAsset | null,
  coverHistory?: PreviewAssetHistoryItem,
) {
  const params = new URLSearchParams({
    title: roadbook.title,
    destination: roadbook.destination,
    duration: roadbook.durationLabel,
    days: roadbook.days
      .slice(0, 4)
      .map((day) => `${day.title}|${day.area}`)
      .join("~"),
    assetStatus: coverHistory ? "最终封面" : previewAsset?.cacheStatus === "stored" ? "已写缓存" : previewAsset?.cacheStatus || "待生成",
  });

  if (previewAsset?.cacheKey) {
    params.set("cacheKey", previewAsset.cacheKey);
  }

  if (coverHistory?.historyId || previewAsset?.historyId) {
    params.set("historyId", coverHistory?.historyId || previewAsset?.historyId || "");
  }

  return `/share-preview?${params.toString()}`;
}

function splitInterests(value: string) {
  const interests = value
    .split(/[、，,。/／｜|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);

  return interests.length > 0 ? interests : dreamBriefDefaults.interests;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("图片读取失败。"));
    };
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Map a landmark route error code (or HTTP status) onto an M3 error
 * category so the error UX banner can pick a coherent state. Falls back
 * to `unknown` when the failure cannot be classified.
 */
function mapLandmarkErrorToCategory(
  code: string | undefined,
  status: number,
): M3ErrorCategory {
  if (code === "missing_minimax_key") return "auth";
  if (code === "parse_error") return "parse";
  if (code === "schema_error") return "schema";
  if (code === "invalid_request") return "invalid_request";
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status === 400) return "invalid_request";
  if (status === 408) return "timeout";
  if (status >= 500) return "server";
  return "unknown";
}

function buildLandmarkM3Error(
  code: string | undefined,
  status: number,
  message: string,
): M3Error {
  return {
    category: mapLandmarkErrorToCategory(code, status),
    message,
    retryable: status === 0 || status === 408 || status === 429 || status >= 500,
    ...(status > 0 ? { statusCode: status, httpStatus: status } : {}),
  };
}

// TemplateCardGrid moved to its own file: components/template-card-grid.tsx
