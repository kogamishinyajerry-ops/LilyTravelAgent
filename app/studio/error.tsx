"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Studio error boundary caught:", error);
  }, [error]);

  return (
    <div
      className="studio-page"
      role="alert"
      aria-live="assertive"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
      }}
    >
      <div
        className="studio-input-panel"
        style={{
          display: "grid",
          gap: 14,
          maxWidth: 520,
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
            background: "var(--rust)",
          }}
        >
          <AlertTriangle size={26} aria-hidden />
        </div>
        <span
          className="creator-badge"
          style={{
            margin: "0 auto",
            background: "var(--rust)",
          }}
        >
          Studio Mode
        </span>
        <h1 style={{ margin: 0, fontSize: "1.6rem" }}>录屏模式暂时无法加载</h1>
        <div className="studio-error" style={{ textAlign: "left" }}>
          <p>{error.message || "录屏模式遇到了一个问题,请稍后再试一次。"}</p>
        </div>
        {error.digest ? (
          <small
            style={{
              color: "var(--muted)",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            错误编号:{error.digest}
          </small>
        ) : null}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            type="button"
            className="primary-action"
            onClick={() => reset()}
            style={{ minHeight: 42, padding: "0 18px" }}
          >
            重新加载
          </button>
          <Link
            href="/"
            className="secondary-action"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              padding: "0 18px",
            }}
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
