"use client";

import {
  AlertTriangle,
  BookOpen,
  Camera,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Code2,
  Clock,
  FileText,
  Loader2,
  MapPinned,
  Mic2,
  Mountain,
  PenLine,
  Route,
  Sparkles,
  Utensils,
  Video,
  WalletCards,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { defaultBrief } from "@/lib/default-brief";
import type {
  GenerateRoadbookResponse,
  GeocodePlacesResponse,
  GeocodePoint,
  GeocodePlace,
  Roadbook,
  TravelBrief,
} from "@/lib/roadbook-types";
import { clipBlueprints, creatorMilestones, vibeCodingLessons } from "@/lib/vibe-coding-content";
import { RoadbookMap } from "@/components/roadbook-map";
import { ErrorStateBanner } from "@/components/error-ux";
import { showError, showInfo, showSuccess } from "@/lib/toast";
import type { M3Error, M3ErrorCategory } from "@/lib/m3-error-classifier";

const interestOptions = ["洱海骑行", "古城 Citywalk", "咖啡", "白族文化", "日落", "拍照点", "民宿", "市集"];

const coverImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=82";

type Stage = "idle" | "generating" | "geocoding" | "ready" | "error";

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

function statusText(stage: Stage) {
  if (stage === "generating") return "MiniMax 正在生成路书";
  if (stage === "geocoding") return "高德正在定位地点";
  if (stage === "ready") return "路书已生成";
  if (stage === "error") return "需要处理配置或接口错误";
  return "等待输入";
}

/**
 * Map a generate-roadbook response `code` field (or HTTP status) onto an
 * M3 error category. Falls back to `unknown` when the failure cannot be
 * classified.
 */
function mapRoadbookErrorToCategory(
  code: string | undefined,
  status: number,
  message: string,
): M3ErrorCategory {
  if (code === "missing_minimax_key") return "auth";
  if (code === "parse_error") return "parse";
  if (code === "invalid_request") return "invalid_request";
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status === 400) return "invalid_request";
  if (status === 408) return "timeout";
  if (status >= 500) return "server";
  if (/timeout/i.test(message)) return "timeout";
  if (/network|fetch/i.test(message)) return "network";
  return "unknown";
}

function buildRoadbookM3Error(
  code: string | undefined,
  status: number,
  message: string,
): M3Error {
  const category = mapRoadbookErrorToCategory(code, status, message);
  return {
    category,
    message,
    retryable: category === "network" || category === "timeout" || category === "rate_limit" || category === "server" || status >= 500 || status === 429,
    ...(status > 0 ? { statusCode: status, httpStatus: status } : {}),
  };
}

export function TravelAgentApp() {
  const [brief, setBrief] = useState<TravelBrief>(defaultBrief);
  const [roadbook, setRoadbook] = useState<Roadbook | null>(null);
  const [points, setPoints] = useState<GeocodePoint[]>([]);
  const [mapConfigured, setMapConfigured] = useState<boolean | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [errorInfo, setErrorInfo] = useState<M3Error | null>(null);
  const [model, setModel] = useState(process.env.NEXT_PUBLIC_AGENT_MODEL_LABEL || "MiniMax-M3");

  const okPointCount = useMemo(() => points.filter((point) => point.status === "ok").length, [points]);

  function updateBrief<K extends keyof TravelBrief>(key: K, value: TravelBrief[K]) {
    setBrief((current) => ({ ...current, [key]: value }));
  }

  function toggleInterest(interest: string) {
    setBrief((current) => {
      const exists = current.interests.includes(interest);
      return {
        ...current,
        interests: exists
          ? current.interests.filter((item) => item !== interest)
          : [...current.interests, interest],
      };
    });
  }

  async function geocodeRoadbook(nextRoadbook: Roadbook) {
    setStage("geocoding");
    const geocodeResponse = await fetch("/api/geocode-places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: brief.city,
        places: buildPlaces(nextRoadbook),
      }),
    });
    const geocodeData = (await geocodeResponse.json()) as GeocodePlacesResponse;
    if (geocodeData.ok) {
      setPoints(geocodeData.points);
      setMapConfigured(geocodeData.configured);
    }
    setStage("ready");
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setStage("generating");
    setErrorInfo(null);
    setRoadbook(null);
    setPoints([]);
    setMapConfigured(null);

    try {
      showInfo("正在生成路书", "M3 正在为这一份 Brief 编排日程，预计 8-20 秒完成。");
      const response = await fetch("/api/generate-roadbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      const data = (await response.json()) as GenerateRoadbookResponse;
      if (!data.ok) {
        setErrorInfo(
          buildRoadbookM3Error(data.code, response.status, data.message),
        );
        setStage("error");
        return;
      }
      setRoadbook(data.roadbook);
      setModel(data.model);
      await geocodeRoadbook(data.roadbook);
      showSuccess("路书已生成", `${data.roadbook.title} — ${data.roadbook.days.length} 天行程已就绪。`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "生成路书时出现未知错误。";
      setErrorInfo(buildRoadbookM3Error(undefined, 0, message));
      setStage("error");
      showError("路书生成失败", message);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="app-frame">
      <section className="workspace">
        <aside className="control-panel">
          <div className="brand-row">
            <div className="brand-mark">
              <Mountain size={22} />
            </div>
            <div>
              <p className="eyebrow">LilyTravelAgent</p>
              <h1>AI 旅行路书 Agent</h1>
            </div>
          </div>

          <div className="status-strip">
            <div>
              <span>当前阶段</span>
              <strong>{statusText(stage)}</strong>
            </div>
            <div>
              <span>模型</span>
              <strong>{model}</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={`brief-form ${stage === "generating" || stage === "geocoding" ? "is-loading" : ""}`} aria-busy={stage === "generating" || stage === "geocoding"}>
            <label>
              <span>目的地</span>
              <input value={brief.destination} onChange={(event) => updateBrief("destination", event.target.value)} />
            </label>
            <div className="form-grid">
              <label>
                <span>高德城市</span>
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
              <span>出行时间</span>
              <input value={brief.travelMonth} onChange={(event) => updateBrief("travelMonth", event.target.value)} />
            </label>
            <label>
              <span>旅行者画像</span>
              <input value={brief.travelers} onChange={(event) => updateBrief("travelers", event.target.value)} />
            </label>
            <label>
              <span>预算偏好</span>
              <input value={brief.budget} onChange={(event) => updateBrief("budget", event.target.value)} />
            </label>
            <label>
              <span>旅行节奏</span>
              <input value={brief.pace} onChange={(event) => updateBrief("pace", event.target.value)} />
            </label>
            <div className="field-block">
              <span>兴趣标签</span>
              <div className="chip-grid">
                {interestOptions.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className={brief.interests.includes(interest) ? "chip selected" : "chip"}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
            <label>
              <span>避坑要求</span>
              <textarea value={brief.mustAvoid} onChange={(event) => updateBrief("mustAvoid", event.target.value)} />
            </label>
            <label>
              <span>成品要求</span>
              <textarea
                value={brief.specialRequests}
                onChange={(event) => updateBrief("specialRequests", event.target.value)}
              />
            </label>

            {stage === "generating" || stage === "geocoding" ? (
              <div className="brief-form-skeleton" role="status" aria-live="polite" data-testid="roadbook-form-skeleton">
                <span className="brief-form-skeleton-bar" style={{ width: "62%" }} />
                <span className="brief-form-skeleton-bar" style={{ width: "88%" }} />
                <span className="brief-form-skeleton-bar" style={{ width: "74%" }} />
                <span className="brief-form-skeleton-bar" style={{ width: "92%" }} />
                <small>
                  <Loader2 className="spin" size={12} />
                  {stage === "generating" ? "M3 正在生成中，通常需要 8-20 秒…" : "高德正在定位地点…"}
                </small>
              </div>
            ) : null}

            <button className="primary-action" type="submit" disabled={stage === "generating" || stage === "geocoding"}>
              {stage === "generating" || stage === "geocoding" ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
              生成大理路书
            </button>
          </form>

          <div className="recording-note">
            <Video size={18} />
            <p>
              建议按章节录屏：需求定位、项目搭建、接 MiniMax、接高德地图、成品演示、复盘。
              <Link href="/studio">打开 16:9 录屏模式</Link>
              <Link href="/dream">打开梦境路书</Link>
            </p>
          </div>
        </aside>

        <section className="preview-pane">
          {errorInfo && stage === "error" ? (
            <div className="app-error" data-testid="roadbook-error-banner">
              <ErrorStateBanner
                error={errorInfo}
                retrying={false}
                onRetry={() => void handleSubmit()}
                onAction={(action) => {
                  if (action === "configure-api-key") {
                    window.alert(
                      "请在 .env.local 中填入 MINIMAX_API_KEY 后重启 npm run dev。",
                    );
                  }
                }}
              />
            </div>
          ) : null}

          {roadbook ? (
            <RoadbookView roadbook={roadbook} points={points} okPointCount={okPointCount} />
          ) : (
            <EmptyPreview stage={stage} />
          )}

          <RoadbookMap roadbook={roadbook} points={points} configured={mapConfigured} loading={stage === "geocoding"} />
          <CreatorProcessPanel />
        </section>
      </section>
    </main>
  );
}

function EmptyPreview({ stage }: { stage: Stage }) {
  return (
    <section className="empty-preview">
      <div className="empty-visual" style={{ backgroundImage: `linear-gradient(90deg, rgba(15, 24, 22, .72), rgba(15, 24, 22, .15)), url(${coverImage})` }}>
        <div>
          <p className="eyebrow">Demo Roadbook</p>
          <h2>先生成一本能录屏、能截图、能讲清楚的旅行路书。</h2>
        </div>
      </div>
      <div className="empty-grid">
        <div>
          <FileText size={20} />
          <strong>结构化路书</strong>
          <p>封面、摘要、每日路线、预算、提醒一次成型。</p>
        </div>
        <div>
          <MapPinned size={20} />
          <strong>高德定位</strong>
          <p>服务端 geocode，转成 Leaflet 可用坐标。</p>
        </div>
        <div>
          <Camera size={20} />
          <strong>录屏素材</strong>
          <p>{stage === "generating" ? "正在生成，适合录“AI 出稿”片段。" : "从输入到成品都适合做章节素材。"}</p>
        </div>
        <div>
          <BookOpen size={20} />
          <strong>学习过程</strong>
          <p>同步记录如何学 Vibe Coding、如何拆需求、如何验收。</p>
        </div>
      </div>
    </section>
  );
}

function RoadbookView({
  roadbook,
  points,
  okPointCount,
}: {
  roadbook: Roadbook;
  points: GeocodePoint[];
  okPointCount: number;
}) {
  const pointLookup = useMemo(() => new Map(points.map((point) => [point.id, point])), [points]);

  return (
    <article className="roadbook">
      <section className="roadbook-cover" style={{ backgroundImage: `linear-gradient(90deg, rgba(15, 24, 22, .78), rgba(15, 24, 22, .18)), url(${coverImage})` }}>
        <div className="cover-content">
          <p className="eyebrow">Custom AI Roadbook</p>
          <h2>{roadbook.title}</h2>
          <p>{roadbook.subtitle}</p>
          <div className="cover-metrics">
            <span>
              <CalendarDays size={16} />
              {roadbook.durationLabel}
            </span>
            <span>
              <Route size={16} />
              {okPointCount ? `${okPointCount} 个地图点` : "等待地图定位"}
            </span>
            <span>
              <WalletCards size={16} />
              {roadbook.budgetLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="summary-band">
        <div>
          <p className="eyebrow">Concept</p>
          <h3>{roadbook.concept}</h3>
        </div>
        <div className="summary-list">
          {roadbook.highlights.map((highlight) => (
            <span key={highlight}>
              <CheckCircle2 size={15} />
              {highlight}
            </span>
          ))}
        </div>
      </section>

      <section className="info-grid">
        <InfoTile icon={<Route size={18} />} label="路线主题" value={roadbook.summary.routeTheme} />
        <InfoTile icon={<MapPinned size={18} />} label="住宿区域" value={roadbook.summary.stayArea} />
        <InfoTile icon={<Clock size={18} />} label="行程节奏" value={roadbook.summary.rhythm} />
        <InfoTile icon={<ClipboardList size={18} />} label="交通策略" value={roadbook.summary.transportPlan} />
      </section>

      <section className="day-list">
        {roadbook.days.map((day) => (
          <div className="day-section" key={day.day}>
            <div className="day-header">
              <div className="day-number">D{day.day}</div>
              <div>
                <p className="eyebrow">{day.area}</p>
                <h3>{day.title}</h3>
                <p>{day.routeSummary}</p>
              </div>
            </div>

            <div className="stop-list">
              {day.stops.map((stop) => {
                const point = pointLookup.get(stop.id);
                return (
                  <div className="stop-row" key={stop.id}>
                    <div className={`stop-dot ${stop.category}`} />
                    <div>
                      <span>{stop.time}</span>
                      <h4>{stop.name}</h4>
                      <p>{stop.why}</p>
                      <small>
                        {stop.duration} · {stop.tip}
                      </small>
                    </div>
                    <div className={point?.status === "ok" ? "geo-badge ok" : "geo-badge"}>
                      {point?.status === "ok" ? "已定位" : "待定位"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="day-notes">
              <div>
                <Utensils size={17} />
                <strong>吃喝</strong>
                <p>{day.food.join(" / ")}</p>
              </div>
              <div>
                <Camera size={17} />
                <strong>出片</strong>
                <p>{day.photoTips.join(" / ")}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="bottom-grid">
        <div>
          <p className="eyebrow">Budget</p>
          <h3>预算拆分</h3>
          {roadbook.budget.map((line) => (
            <div className="budget-row" key={line.label}>
              <span>{line.label}</span>
              <strong>{line.amount}</strong>
              <small>{line.note}</small>
            </div>
          ))}
        </div>
        <div>
          <p className="eyebrow">Before You Go</p>
          <h3>出发前提醒</h3>
          <ul>
            {roadbook.reminders.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="disclaimer">
            <AlertTriangle size={17} />
            {roadbook.disclaimer}
          </div>
        </div>
      </section>
    </article>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="info-tile">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CreatorProcessPanel() {
  return (
    <section className="creator-panel">
      <div className="creator-heading">
        <div>
          <p className="eyebrow">Creator Track</p>
          <h2>开发过程也要变成内容资产</h2>
          <p>
            这个项目不只是生成路书，也要帮你讲清楚自己如何学习 Vibe Coding、
            如何把一个旅行灵感拆成可运行的 Agent。
          </p>
        </div>
        <div className="creator-badge">
          <Video size={17} />
          可剪成系列
        </div>
      </div>

      <div className="creator-grid">
        <div className="creator-column">
          <div className="section-kicker">
            <Code2 size={17} />
            <span>开发章节</span>
          </div>
          <div className="milestone-list">
            {creatorMilestones.map((item) => (
              <div className="milestone-card" key={item.step}>
                <div className="milestone-step">{item.step}</div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.buildFocus}</p>
                  <small>{item.contentAngle}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="creator-column">
          <div className="section-kicker">
            <PenLine size={17} />
            <span>Vibe Coding 学习点</span>
          </div>
          <div className="lesson-list">
            {vibeCodingLessons.map((item) => (
              <div className="lesson-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.lesson}</p>
                <small>{item.proof}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="creator-column">
          <div className="section-kicker">
            <Mic2 size={17} />
            <span>可直接录的选题</span>
          </div>
          <div className="clip-list">
            {clipBlueprints.map((item) => (
              <div className="clip-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.hook}</p>
                <small>{item.screen}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
