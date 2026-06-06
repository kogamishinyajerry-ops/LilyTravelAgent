"use client";

import { ArrowLeft, BadgeCheck, Image as ImageIcon, Layers3, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PreviewAssetHistoryItem, PreviewAssetHistoryResponse } from "@/lib/roadbook-types";

type SharePreviewState = "idle" | "loading" | "ready" | "fallback" | "error";

type SharePreviewCardProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export function SharePreviewCard({ searchParams }: SharePreviewCardProps) {
  const params = useMemo(() => normalizeSearchParams(searchParams), [searchParams]);
  const [state, setState] = useState<SharePreviewState>(params.cacheKey ? "loading" : "fallback");
  const [asset, setAsset] = useState<PreviewAssetHistoryItem | null>(null);
  const [assetMessage, setAssetMessage] = useState(params.cacheKey ? "读取最终封面" : "未绑定资产缓存");

  useEffect(() => {
    if (!params.cacheKey) {
      return;
    }

    let cancelled = false;
    fetch(`/api/generate-preview-asset?cacheKey=${encodeURIComponent(params.cacheKey)}`)
      .then(async (response) => {
        const result = (await response.json()) as PreviewAssetHistoryResponse;
        if (!response.ok || !result.ok) {
          throw new Error(result.ok ? "资产历史读取失败。" : result.message);
        }

        return pickShareAsset(result.items, params.historyId);
      })
      .then((nextAsset) => {
        if (cancelled) {
          return;
        }

        setAsset(nextAsset);
        setState(nextAsset ? "ready" : "fallback");
        setAssetMessage(nextAsset?.isCover ? "最终封面已锁定" : nextAsset ? "使用当前视觉资产" : "没有可用封面资产");
      })
      .catch((caught) => {
        if (cancelled) {
          return;
        }

        setAsset(null);
        setState("error");
        setAssetMessage(caught instanceof Error ? caught.message : "资产历史读取失败。");
      });

    return () => {
      cancelled = true;
    };
  }, [params.cacheKey, params.historyId]);

  return (
    <main className="share-preview-page">
      <section className="share-preview-shell">
        <nav className="share-preview-nav" aria-label="分享预览导航">
          <Link href="/dream">
            <ArrowLeft size={16} />
            返回 Dream
          </Link>
          <span>Share Preview / 16:9</span>
        </nav>

        <div className="share-preview-recording-strip" aria-label="录屏状态">
          <span>Final Card</span>
          <strong>{asset?.isCover ? "Cover Locked" : "Cover Preview"}</strong>
          <strong>{params.days.length}-Day Route</strong>
          <strong>{params.cacheKey ? "Asset Cached" : "Asset Pending"}</strong>
        </div>

        <section className={`share-preview-card ${state}`}>
          <div
            className="share-preview-hero"
            style={asset?.imageDataUrl ? { backgroundImage: `url(${asset.imageDataUrl})` } : undefined}
          >
            <div className="share-preview-sheen" />
            <div className="share-preview-cover-badge">
              <BadgeCheck size={16} />
              <span>{asset?.isCover ? "最终封面" : state === "loading" ? "读取中" : "预览封面"}</span>
            </div>
            <div className="share-preview-title">
              <p>{params.destination || "Dream Roadbook"}</p>
              <h1>{params.title || "生成式梦境路书"}</h1>
              <span>{params.duration || "4 天路线"} / {params.assetStatus || assetMessage}</span>
            </div>
          </div>

          <aside className="share-preview-side">
            <div className="share-preview-status">
              <ImageIcon size={17} />
              <div>
                <span>Asset</span>
                <strong>{assetMessage}</strong>
              </div>
            </div>

            <div className="share-preview-route">
              <div className="share-preview-section-title">
                <Route size={16} />
                <span>Route</span>
              </div>
              {params.days.map((day) => (
                <div key={day.day} className="share-preview-day">
                  <small>D{day.day}</small>
                  <strong>{day.title}</strong>
                  <span>{day.area}</span>
                </div>
              ))}
            </div>

            <div className="share-preview-meta">
              <div>
                <Layers3 size={16} />
                <span>{params.cacheKey ? formatCacheKey(params.cacheKey) : "no-cache"}</span>
              </div>
              <div>
                <Sparkles size={16} />
                <span>{asset?.createdAt ? formatAssetTime(asset.createdAt) : "waiting"}</span>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function pickShareAsset(items: PreviewAssetHistoryItem[], historyId?: string) {
  return items.find((item) => item.isCover) || items.find((item) => item.historyId === historyId) || items[0] || null;
}

function normalizeSearchParams(searchParams: SharePreviewCardProps["searchParams"]) {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] || "" : value || "";
  };

  return {
    title: get("title"),
    destination: get("destination"),
    duration: get("duration"),
    cacheKey: get("cacheKey"),
    historyId: get("historyId"),
    assetStatus: get("assetStatus"),
    days: parseDays(get("days")),
  };
}

function parseDays(value: string) {
  const parsed = value
    .split("~")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const [title = `D${index + 1}`, area = "路线待生成"] = item.split("|");
      return {
        day: index + 1,
        title,
        area,
      };
    })
    .slice(0, 4);

  return parsed.length
    ? parsed
    : [
        { day: 1, title: "抵达", area: "封面预览" },
        { day: 2, title: "主线", area: "路线生成" },
        { day: 3, title: "慢游", area: "资产补全" },
        { day: 4, title: "收束", area: "分享预览" },
      ];
}

function formatCacheKey(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatAssetTime(value: string) {
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
