"use client";

import { CheckCircle2, Info, AlertTriangle, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast, type Toast, type ToastVariant } from "@/lib/toast";

const variantIcons: Record<ToastVariant, React.ComponentType<{ size?: number }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="通知"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((current) => {
        const Icon = variantIcons[current.variant];
        return (
          <div
            key={current.id}
            className={`toast toast--${current.variant}`}
            role={current.variant === "error" || current.variant === "warning" ? "alert" : "status"}
            data-testid={`toast-${current.variant}`}
          >
            <span className="toast-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <div className="toast-body">
              <strong className="toast-title">{current.title}</strong>
              {current.description ? (
                <p className="toast-description">{current.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="toast-dismiss"
              aria-label={`关闭通知：${current.title}`}
              title={`关闭通知：${current.title}`}
              onClick={() => toast.dismiss(current.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
