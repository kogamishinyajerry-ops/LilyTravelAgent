/**
 * Localized error UX state.
 *
 * Maps an `M3ErrorCategory` to a richer UI presentation bundle: a short
 * Chinese title, a longer description, a recommended user action, the
 * button label for that action, and a severity hint. Use these bundles
 * to drive consistent error banners / toasts across the app.
 *
 * Use `getErrorUX(category)` for an M3-classified failure, and
 * `getFallbackUX()` when the app has switched to the local programmatic
 * fallback pipeline (i.e. the AI path is unavailable but the user can
 * still proceed with a precomputed roadbook).
 */

import type { M3ErrorCategory } from "./m3-error-classifier";

/**
 * Discrete user actions the UI can offer in response to a failure.
 *
 * - `retry`             — call the AI again with the same input.
 * - `configure-api-key` — open configuration docs / settings for the API key.
 * - `contact-developer` — surface a "contact developer" affordance.
 * - `wait-and-retry`    — explicit backoff; the user should wait before retrying.
 * - `check-input`       — re-validate / fix the user's input.
 * - `use-fallback`      — continue with the local programmatic fallback.
 */
export type ErrorUIAction =
  | "retry"
  | "configure-api-key"
  | "contact-developer"
  | "wait-and-retry"
  | "check-input"
  | "use-fallback";

/**
 * Full UX bundle for an error card / banner.
 */
export type ErrorUXState = {
  /** Short Chinese title shown at the top of the banner. */
  title: string;
  /** Longer Chinese description with context and a hint. */
  description: string;
  /** Recommended action for the UI to wire up. */
  action: ErrorUIAction;
  /** Localized Chinese button label. */
  actionLabel: string;
  /** Severity hint: `info` is recoverable, `warning` is degraded, `error` is blocking. */
  severity: "info" | "warning" | "error";
};

const UX_BY_CATEGORY: Record<M3ErrorCategory, ErrorUXState> = {
  network: {
    title: "网络异常",
    description: "无法连接到 MiniMax 服务，请检查网络后重试。",
    action: "retry",
    actionLabel: "重试",
    severity: "warning",
  },
  timeout: {
    title: "请求超时",
    description: "生成耗时较长已超时，建议稍后重试或简化输入。",
    action: "retry",
    actionLabel: "重试",
    severity: "warning",
  },
  rate_limit: {
    title: "请求过快",
    description: "已自动重试，仍受限。请稍候再试。",
    action: "wait-and-retry",
    actionLabel: "稍后再试",
    severity: "info",
  },
  server: {
    title: "服务暂不可用",
    description: "MiniMax 服务异常，已自动重试多次。",
    action: "wait-and-retry",
    actionLabel: "稍后再试",
    severity: "warning",
  },
  auth: {
    title: "需要配置 API Key",
    description:
      "未配置或配置错误 MINIMAX_API_KEY。可以继续使用程序化兜底。",
    action: "configure-api-key",
    actionLabel: "查看配置说明",
    severity: "error",
  },
  invalid_request: {
    title: "请求参数错误",
    description: "请检查输入或联系开发者。",
    action: "contact-developer",
    actionLabel: "联系开发者",
    severity: "error",
  },
  parse: {
    title: "返回格式异常",
    description: "MiniMax 返回了无法解析的内容。",
    action: "retry",
    actionLabel: "重试",
    severity: "warning",
  },
  schema: {
    title: "返回结构异常",
    description: "MiniMax 返回的内容不符合预期格式，请重试。",
    action: "retry",
    actionLabel: "重试",
    severity: "warning",
  },
  unknown: {
    title: "未知错误",
    description: "请稍后重试或联系开发者。",
    action: "retry",
    actionLabel: "重试",
    severity: "error",
  },
};

const FALLBACK_UX: ErrorUXState = {
  title: "已使用程序化兜底",
  description: "AI 不可用，已使用本地程序化预置。",
  action: "use-fallback",
  actionLabel: "继续",
  severity: "info",
};

/**
 * Return the localized UX bundle for a given M3 error category.
 */
export function getErrorUX(category: M3ErrorCategory): ErrorUXState {
  return UX_BY_CATEGORY[category];
}

/**
 * Return the localized UX bundle for the "using programmatic fallback"
 * state, shown when the AI path is unavailable and the app falls back to
 * a locally generated roadbook.
 */
export function getFallbackUX(): ErrorUXState {
  return FALLBACK_UX;
}
