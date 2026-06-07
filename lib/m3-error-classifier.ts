/**
 * M3 error classifier.
 *
 * Maps any failure surfaced by an M3 (MiniMax) call — fetch/network errors,
 * timeouts, HTTP responses, JSON parse errors, and Zod schema validation
 * errors — to a structured `M3Error` with a category, user-friendly Chinese
 * message, retryable hint, and HTTP status (when applicable).
 *
 * Use `classifyM3Error` to normalize an arbitrary thrown value, and
 * `getM3ErrorMessage` to fetch the localized user-facing message for a
 * given classified error.
 */

import { ZodError } from "zod";

export type M3ErrorCategory =
  | "network"
  | "timeout"
  | "rate_limit"
  | "server"
  | "auth"
  | "invalid_request"
  | "parse"
  | "schema"
  | "unknown";

export type M3Error = {
  category: M3ErrorCategory;
  /** User-friendly Chinese message, safe to surface in the UI. */
  message: string;
  /** Optional technical details (e.g. the raw error message). */
  details?: string;
  /** Whether the call is safe to retry. */
  retryable: boolean;
  /** HTTP status code, when the failure came from a Response. */
  statusCode?: number;
  /** Alias of `statusCode` retained for API clarity. */
  httpStatus?: number;
};

const MESSAGES: Record<M3ErrorCategory, string> = {
  network: "网络连接失败，请检查网络后重试",
  timeout: "请求超时，请稍后重试",
  rate_limit: "请求频率过高，已自动重试。请稍候",
  server: "服务暂时不可用，已自动重试",
  auth: "API 密钥无效或已过期，请检查 MINIMAX_API_KEY 配置",
  invalid_request: "请求参数有误，请联系开发者",
  parse: "返回内容不是有效 JSON，请重试或简化输入",
  schema: "返回内容不符合预期结构，请重试",
  unknown: "未知错误，请稍后重试或联系开发者",
};

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  if (/abort(ed)?/i.test(error.message)) return true;
  if (/timeout/i.test(error.message)) return true;
  return false;
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // Built-in fetch TypeError ("Failed to fetch", "NetworkError when attempting…")
  if (error instanceof TypeError) return true;
  // Node-style fetch sometimes surfaces a code on the error.
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") {
    if (
      code === "ECONNRESET" ||
      code === "ENOTFOUND" ||
      code === "ECONNREFUSED" ||
      code === "EAI_AGAIN" ||
      code === "ETIMEDOUT" ||
      code === "UND_ERR_SOCKET" ||
      code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      return true;
    }
  }
  return false;
}

function detailsFromError(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error === undefined || error === null) return undefined;
  try {
    return JSON.stringify(error);
  } catch {
    return undefined;
  }
}

/**
 * Classify any failure from an M3 call into a structured `M3Error`.
 *
 * The classifier checks the error first (network / timeout / parse /
 * schema) and then falls back to inspecting the HTTP `Response` status.
 * The order matters: if an `AbortError` is thrown after a fetch, the
 * timeout category should win over a 5xx status.
 */
export function classifyM3Error(
  error: unknown,
  response?: Response,
): M3Error {
  // 1. Timeout / abort always wins.
  if (isTimeoutError(error)) {
    return {
      category: "timeout",
      message: MESSAGES.timeout,
      details: detailsFromError(error),
      retryable: true,
    };
  }

  // 2. Zod schema validation errors are surfaced as `parse` adjacent,
  //    but we treat them as their own `schema` category so callers can
  //    differentiate "model returned malformed JSON" from "the model
  //    returned valid JSON that didn't match the schema".
  if (error instanceof ZodError) {
    return {
      category: "schema",
      message: MESSAGES.schema,
      details: detailsFromError(error),
      retryable: false,
    };
  }

  // 3. JSON parse errors.
  if (error instanceof SyntaxError) {
    return {
      category: "parse",
      message: MESSAGES.parse,
      details: detailsFromError(error),
      retryable: false,
    };
  }

  // 4. Fetch / network errors.
  if (isNetworkError(error)) {
    return {
      category: "network",
      message: MESSAGES.network,
      details: detailsFromError(error),
      retryable: true,
    };
  }

  // 5. Fall back to HTTP status (if a Response was provided).
  if (response) {
    const status = response.status;
    if (status === 429) {
      return {
        category: "rate_limit",
        message: MESSAGES.rate_limit,
        statusCode: status,
        httpStatus: status,
        retryable: true,
      };
    }
    if (status === 401 || status === 403) {
      return {
        category: "auth",
        message: MESSAGES.auth,
        statusCode: status,
        httpStatus: status,
        retryable: false,
      };
    }
    if (status === 400) {
      return {
        category: "invalid_request",
        message: MESSAGES.invalid_request,
        statusCode: status,
        httpStatus: status,
        retryable: false,
      };
    }
    if (status === 500 || status === 502 || status === 503 || status === 504) {
      return {
        category: "server",
        message: MESSAGES.server,
        statusCode: status,
        httpStatus: status,
        retryable: true,
      };
    }
  }

  // 6. Unknown — not retryable by default to avoid amplifying broken
  //    request shapes.
  return {
    category: "unknown",
    message: MESSAGES.unknown,
    details: detailsFromError(error),
    retryable: false,
  };
}

/**
 * Return the Chinese user-friendly message for a classified `M3Error`.
 */
export function getM3ErrorMessage(error: M3Error): string {
  return MESSAGES[error.category];
}
