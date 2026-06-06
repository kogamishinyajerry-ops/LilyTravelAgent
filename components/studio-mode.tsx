"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Code2,
  Loader2,
  Mic2,
  MonitorPlay,
  Route,
  Sparkles,
  Video,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { defaultBrief } from "@/lib/default-brief";
import { sampleRoadbook } from "@/lib/sample-roadbook";
import type { GenerateRoadbookResponse, GeocodePlace, GeocodePlacesResponse, GeocodePoint, Roadbook, TravelBrief } from "@/lib/roadbook-types";
import { clipBlueprints, creatorMilestones, vibeCodingLessons } from "@/lib/vibe-coding-content";

type StudioStage = "demo" | "generating" | "geocoding" | "ready" | "error";

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

export function StudioMode() {
  const [brief, setBrief] = useState<TravelBrief>(defaultBrief);
  const [roadbook, setRoadbook] = useState<Roadbook>(sampleRoadbook);
  const [points, setPoints] = useState<GeocodePoint[]>([]);
  const [stage, setStage] = useState<StudioStage>("demo");
  const [error, setError] = useState("");
  const [model, setModel] = useState(process.env.NEXT_PUBLIC_AGENT_MODEL_LABEL || "MiniMax-M3");

  const locatedCount = useMemo(() => points.filter((point) => point.status === "ok").length, [points]);
  const topStops = roadbook.days.flatMap((day) => day.stops.slice(0, 2)).slice(0, 8);

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

  function resetDemo() {
    setRoadbook(sampleRoadbook);
    setPoints([]);
    setError("");
    setStage("demo");
  }

  return (
    <main className="studio-page">
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
            <span>{studioStageText(stage)}</span>
            <Link href="/" className="ghost-link">
              <ArrowLeft size={16} />
              返回工具页
            </Link>
            <Link href="/dream" className="ghost-link">
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
              <button className="secondary-action" type="button" onClick={resetDemo}>
                使用示例路书
              </button>
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
