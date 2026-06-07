"use client";

import { Loader2 } from "lucide-react";
import type { JSX, ReactNode } from "react";

import type { M3Error, M3ErrorCategory } from "@/lib/m3-error-classifier";
import {
  type ErrorUIAction,
  getErrorUX,
  getFallbackUX,
} from "@/lib/error-ux";

/**
 * Map an M3 error category to a small lucide icon component (rendered as a
 * node) used for inline visual cues. The categories are exhaustive over the
 * `M3ErrorCategory` union.
 */
const CATEGORY_ICON: Record<M3ErrorCategory, ReactNode> = {
  network: <span aria-hidden>{"\u{1F4F6}"}</span>,
  timeout: <span aria-hidden>{"⏱️"}</span>,
  rate_limit: <span aria-hidden>{"⚠️"}</span>,
  server: <span aria-hidden>{"\u{1F6E0}"}</span>,
  auth: <span aria-hidden>{"\u{1F511}"}</span>,
  invalid_request: <span aria-hidden>{"⛔"}</span>,
  parse: <span aria-hidden>{"\u{1F4C2}"}</span>,
  schema: <span aria-hidden>{"\u{1F4D0}"}</span>,
  unknown: <span aria-hidden>{"❓"}</span>,
};

/**
 * Map an M3 error category to a short Chinese label suitable for an inline
 * chip. Mirrors the same vocabulary as `getErrorUX`.
 */
const CATEGORY_LABEL: Record<M3ErrorCategory, string> = {
  network: "网络",
  timeout: "超时",
  rate_limit: "限流",
  server: "服务",
  auth: "鉴权",
  invalid_request: "参数",
  parse: "解析",
  schema: "结构",
  unknown: "未知",
};

function severityClassName(severity: "info" | "warning" | "error"): string {
  return `error-state-banner--${severity}`;
}

function ActionButton(props: {
  action: ErrorUIAction;
  actionLabel: string;
  retrying: boolean;
  showRetry: boolean;
  onRetry?: () => void;
  onAction?: (action: ErrorUIAction) => void;
}): ReactNode {
  const { action, actionLabel, retrying, showRetry, onRetry, onAction } = props;
  const handleClick = (): void => {
    onAction?.(action);
    if (showRetry) {
      onRetry?.();
    }
  };
  return (
    <button
      type="button"
      className="error-state-banner__action primary-action"
      onClick={handleClick}
      disabled={retrying}
    >
      {retrying ? (
        <Loader2 size={16} className="spin" aria-hidden />
      ) : null}
      <span>{actionLabel}</span>
    </button>
  );
}

/**
 * Inline error banner for a classified `M3Error`.
 *
 * Renders the localized title, description, severity dot, and a primary
 * action button. When the error is `retryable` and `onRetry` is provided,
 * the action button also calls `onRetry` on click. When `onAction` is
 * provided, the button invokes `onAction(action)` in addition, so callers
 * can wire the same button to both behaviours.
 */
export function ErrorStateBanner(props: {
  error: M3Error;
  onRetry?: () => void;
  onAction?: (action: ErrorUIAction) => void;
  retrying?: boolean;
}): JSX.Element {
  const { error, onRetry, onAction, retrying = false } = props;
  const ux = getErrorUX(error.category);
  const showRetry = error.retryable || ux.action === "retry";

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="error-state-banner"
      data-category={error.category}
      data-severity={ux.severity}
      className={`error-state-banner ${severityClassName(ux.severity)}`}
    >
      <span
        className="error-state-banner__dot"
        aria-hidden
        style={{ background: "var(--rust)" }}
      />
      <div className="error-state-banner__body">
        <h4 className="error-state-banner__title">{ux.title}</h4>
        <p className="error-state-banner__description">{ux.description}</p>
      </div>
      <ActionButton
        action={ux.action}
        actionLabel={ux.actionLabel}
        retrying={retrying}
        showRetry={showRetry}
        onRetry={onRetry}
        onAction={onAction}
      />
    </div>
  );
}

/**
 * Small inline chip showing the icon + label for a given M3 error
 * category. Useful for status strips and tooltips where the full banner
 * would be too noisy.
 */
export function ErrorStateChip(props: {
  category: M3ErrorCategory;
}): JSX.Element {
  const { category } = props;
  return (
    <span
      className="error-state-chip"
      data-testid="error-state-chip"
      data-category={category}
      style={{
        color: "var(--muted)",
        borderColor: "var(--gold)",
      }}
    >
      <span className="error-state-chip__icon" aria-hidden>
        {CATEGORY_ICON[category]}
      </span>
      <span className="error-state-chip__label">{CATEGORY_LABEL[category]}</span>
    </span>
  );
}

/**
 * Friendly notice shown when the AI path has failed and the app has
 * silently switched to the local programmatic fallback roadbook. Uses
 * the same Chinese copy as `getFallbackUX()`.
 */
export function FallbackStateNotice(): JSX.Element {
  const ux = getFallbackUX();
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="fallback-state-notice"
      className="fallback-state-notice"
    >
      <span
        className="fallback-state-notice__dot"
        aria-hidden
        style={{ background: "var(--gold)" }}
      />
      <div className="fallback-state-notice__body">
        <h4 className="fallback-state-notice__title">{ux.title}</h4>
        <p className="fallback-state-notice__description">{ux.description}</p>
      </div>
    </div>
  );
}

export default ErrorStateBanner;
