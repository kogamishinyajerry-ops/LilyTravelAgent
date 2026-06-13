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
      recentPacks: RecordingAssetSummaryPack[];
      latestPack: {
        title: string;
        createdAt: string;
        label: string;
      } | null;
    }
  | { status: "error"; message: string };

type RecordingAssetSummaryPack = {
  type: RecordingAssetType;
  id: string;
  title: string;
  createdAt: string;
  label: string;
  detail: string;
};

type RecordingAssetsApiResponse = {
  ok?: boolean;
  packCount?: number;
  countsByType?: Record<RecordingAssetType, number>;
  indexAvailable?: boolean;
  indexUrl?: string;
  recentPacks?: RecordingAssetSummaryPack[];
  latestPack?: {
    title: string;
    createdAt: string;
    label: string;
  } | null;
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
];
const studioShotCue = {
  title: "当前镜头建议",
  primary: "输入区 → 路书预览 → 素材资产",
  note: "讲：这不是只生成攻略，而是在沉淀可复用的 Agent 素材流水线。",
};
const studioSeriesChapters = [
  "录屏台成型",
  "素材管线可视化",
  "Agent 产品化",
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

  const locatedCount = useMemo(() => points.filter((point) => point.status === "ok").length, [points]);
  const topStops = roadbook.days.flatMap((day) => day.stops.slice(0, 2)).slice(0, 8);

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
          countsByType: data.countsByType || { dream: 0, studio: 0 },
          indexAvailable: Boolean(data.indexAvailable),
          indexUrl: data.indexUrl || "",
          recentPacks: data.recentPacks || [],
          latestPack: data.latestPack || null,
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
              onClick={() => setScriptMode((current) => !current)}
            >
              <ListChecks size={16} />
              脚本模式
            </button>
            <Link href="/" className="ghost-link">
              <ArrowLeft size={16} />
              返回工具页
            </Link>
            <Link href={demoRoadbookId ? `/dream?demo=${demoRoadbookId}` : "/dream"} className="ghost-link">
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
                  </div>
                  <div className="studio-recording-edit-tags" aria-label="素材剪辑标签">
                    <span>{getRecordingAssetUsageHint("dream")} · {recordingAssets.countsByType.dream}</span>
                    <span>{getRecordingAssetUsageHint("studio")} · {recordingAssets.countsByType.studio}</span>
                  </div>
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
                  </div>
                  {recordingCommandCopyState === "copied" ? <span className="studio-recording-copy-status">录屏套件命令已复制</span> : null}
                  {recordingCommandCopyState === "error" ? <span className="studio-recording-copy-status">浏览器不允许自动复制，可手动复制上方命令</span> : null}
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
