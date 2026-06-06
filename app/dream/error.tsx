"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function DreamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dream error boundary caught:", error);
  }, [error]);

  return (
    <div
      className="dream-page"
      role="alert"
      aria-live="assertive"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
      }}
    >
      <div
        className="dream-control"
        style={{
          display: "grid",
          gap: 14,
          maxWidth: 480,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "grid",
            placeItems: "center",
            margin: "0 auto",
            width: 52,
            height: 52,
            borderRadius: 8,
            color: "#fff",
            background: "linear-gradient(135deg, var(--dream-accent), var(--dream-accent-2))",
          }}
        >
          <AlertTriangle size={26} aria-hidden />
        </div>
        <span className="dream-eyebrow" style={{ margin: 0 }}>
          Dream Mode
        </span>
        <h1 style={{ margin: 0, fontSize: "1.6rem" }}>梦境路书暂时无法显示</h1>
        <p
          className="dream-status error"
          style={{ margin: 0, lineHeight: 1.5, textAlign: "left" }}
        >
          {error.message || "梦境生成遇到了一个小问题,请稍后再试一次。"}
        </p>
        {error.digest ? (
          <small
            style={{
              color: "var(--dream-soft)",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            错误编号:{error.digest}
          </small>
        ) : null}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            type="button"
            className="dream-reset-action"
            onClick={() => reset()}
          >
            重新加载
          </button>
          <Link
            href="/"
            className="dream-reset-action"
            style={{ textDecoration: "none" }}
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
