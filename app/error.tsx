"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <div
      className="app-frame"
      role="alert"
      aria-live="assertive"
      style={{ display: "grid", placeItems: "center" }}
    >
      <div
        className="control-panel"
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
        <span className="eyebrow" style={{ margin: 0 }}>
          Something went wrong
        </span>
        <h1 style={{ margin: 0, fontSize: "1.6rem" }}>页面出现错误</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
          {error.message || "请稍后再试,或点击下方按钮重新加载。"}
        </p>
        {error.digest ? (
          <small style={{ color: "var(--muted)", fontFamily: "ui-monospace, monospace" }}>
            错误编号:{error.digest}
          </small>
        ) : null}
        <button
          type="button"
          className="primary-action"
          onClick={() => reset()}
          style={{ marginTop: 6 }}
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
