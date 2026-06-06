"use client";

import { ArrowLeft, Compass, Eye, Layers3, Loader2, Moon, PlayCircle, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDreamRoadbookDesign,
  dreamMoods,
  dreamTemplates,
  type DreamMood,
  type DreamTemplate,
} from "@/lib/dream-design-skill";
import { defaultBrief } from "@/lib/default-brief";
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
import { sampleRoadbook } from "@/lib/sample-roadbook";
import { DreamMiniMap } from "@/components/dream-mini-map";
import { DreamSkylineScene } from "@/components/dream-skyline-scene";

type DreamStage = "demo" | "generating" | "refining" | "preview" | "ready" | "error";
type TrackStepStatus = "idle" | "active" | "done" | "error";
type PreviewAssetStage = "idle" | "generating" | "ready" | "fallback" | "error";
type PreviewAssetAction = "idle" | "clearing" | "regenerating" | "restoring" | "covering";
type ScenicSkillStage = "idle" | "selected" | "generating" | "ready" | "fallback" | "error";

const dreamMoodNotes: Record<DreamMood, string> = {
  cloud: "柔光 / 轻盈 / 风",
  geometry: "等距 / 错视 / 秩序",
  dusk: "日落 / 低饱和 / 安静",
};

const dreamBriefDefaults: TravelBrief = {
  ...defaultBrief,
  tone: "极简、梦境、生成式网页、像游戏关卡地图一样有高级感",
};

const generationModes: Array<{ id: GenerationMode; label: string; note: string }> = [
  { id: "speed", label: "快速", note: "补细节也快" },
  { id: "quality", label: "高质量", note: "M3 补完整版" },
];

const demoTrackNotes = ["需求进入 Agent", "先出可展示预览", "AI 图做远景贴片", "后台补吃住行", "地图点位点亮"] as const;
const scenicUploadMaxBytes = 6 * 1024 * 1024;

async function fetchPreviewAssetHistory(cacheKey: string) {
  const response = await fetch(`/api/generate-preview-asset?cacheKey=${encodeURIComponent(cacheKey)}`);
  const result = (await response.json()) as PreviewAssetHistoryResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "历史版本读取失败。" : result.message);
  }

  return result.items;
}

export function DreamRoadbook() {
  const runIdRef = useRef(0);
  const [roadbook, setRoadbook] = useState<Roadbook>(sampleRoadbook);
  const [brief, setBrief] = useState<TravelBrief>(dreamBriefDefaults);
  const [interestsInput, setInterestsInput] = useState(dreamBriefDefaults.interests.join("、"));
  const [activeDay, setActiveDay] = useState(1);
  const [mood, setMood] = useState<DreamMood>("cloud");
  const [template, setTemplate] = useState<DreamTemplate>("monument");
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
  const design = useMemo(() => buildDreamRoadbookDesign(roadbook), [roadbook]);
  const activePlan = roadbook.days.find((day) => day.day === activeDay) || roadbook.days[0];
  const activeStop = design.routeStops.find((stop) => stop.day === activePlan?.day) || design.routeStops[0];
  const activeTemplate = dreamTemplates.find((item) => item.id === template) || dreamTemplates[0];
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
      setActiveDay(fullResult.roadbook.days[0]?.day || 1);
      setLastModel(fullResult.model);
      setError("");
      setStage("ready");
      void geocodeRoadbook(fullResult.roadbook, runId);
    } catch (caught) {
      if (runId !== runIdRef.current) {
        return;
      }

      setError(caught instanceof Error ? caught.message : "完整细节补充失败，当前保留预览版。");
      setStage("preview");
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

    const requestBrief = buildRequestBrief();

    try {
      const previewResult = await postRoadbook("/api/generate-dream-preview", requestBrief);

      if (runId !== runIdRef.current) {
        return;
      }

      setRoadbook(previewResult.roadbook);
      setActiveDay(previewResult.roadbook.days[0]?.day || 1);
      setLastModel(previewResult.model);
      setStage("refining");
      void generatePreviewAsset(previewResult.roadbook, runId);
      void geocodeRoadbook(previewResult.roadbook, runId);
      void completeRoadbook(requestBrief, runId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成服务暂时不可用，请先检查 MiniMax Key 或网络。");
      setStage("error");
    }
  }

  function resetDemo() {
    runIdRef.current += 1;
    setTrackDemoStep(null);
    setRoadbook(sampleRoadbook);
    setBrief(dreamBriefDefaults);
    setInterestsInput(dreamBriefDefaults.interests.join("、"));
    setActiveDay(1);
    setTemplate("monument");
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
    setPoints([]);
    setMapConfigured(null);
    setMapLoading(false);
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
    <main className={`dream-page dream-mood-${mood} dream-template-${template}`}>
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
            <Link href="/studio" aria-label="打开录屏台">
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
                  <PlayCircle size={13} />
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

            <button className="dream-reset-action" type="button" onClick={resetDemo}>
              <RotateCcw size={15} />
              默认大理
            </button>
          </form>

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
            {dreamTemplates.map((item) => (
              <button
                key={item.id}
                type="button"
                className={template === item.id ? "active" : ""}
                onClick={() => setTemplate(item.id)}
                aria-pressed={template === item.id}
              >
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </button>
            ))}
          </div>

          <div className="dream-mood-switcher" aria-label="视觉气质">
            {dreamMoods.map((item) => (
              <button
                key={item.id}
                type="button"
                className={mood === item.id ? "active" : ""}
                onClick={() => setMood(item.id)}
              >
                <span>{item.label}</span>
                <small>{dreamMoodNotes[item.id]}</small>
              </button>
            ))}
          </div>
          <div className="dream-rule">
            <Moon size={17} />
            <p>AI 生成内容，设计 skill 生成网页视觉。</p>
          </div>
        </aside>

        <section className="dream-world dream-world-skyline" aria-label={`${roadbook.destination} 3D 目的地预览`}>
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
          />
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
              <button key={stop.id} type="button">
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
                      >
                        <span className="dream-asset-thumb" style={{ backgroundImage: `url(${item.imageDataUrl})` }} />
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
