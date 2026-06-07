/**
 * Central M3 (MiniMax-M3) HTTP client.
 *
 * A single entry point used by all M3 chat-completion callers in this repo
 * (lib/landmark-generator.ts, app/api/generate-roadbook,
 * generate-dream-preview, generate-scenic-render-design, ...).
 *
 * Responsibilities:
 *   - Read the API key from options or `process.env.MINIMAX_API_KEY`.
 *   - Apply thinking-mode side effects via `applyMiniMaxThinking` and
 *     resolve a model id with `resolveMiniMaxModel` (caller-provided).
 *   - Wrap the underlying fetch in `AbortSignal.timeout(...)` so every
 *     attempt has a hard deadline.
 *   - Classify failures (network / timeout / 4xx / 5xx / parse / schema)
 *     through `classifyM3Error` and decide whether to retry.
 *   - Delegate the actual retry loop to `withRetry` from
 *     `lib/retry-policy` so the backoff / jitter behaviour stays in one
 *     place.
 *   - Always return a discriminated `M3CallResult` so callers never have
 *     to `try/catch` for control flow.
 */

import { ZodError } from "zod";
import {
  applyMiniMaxThinking,
  buildMiniMaxChatEndpoint,
  resolveMiniMaxModel,
} from "./minimax-config";
import type { GenerationMode } from "./roadbook-types";
import { withRetry } from "./retry-policy";
import { classifyM3Error, type M3Error } from "./m3-error-classifier";

/**
 * Overridable endpoint URL. Defaults to `buildMiniMaxChatEndpoint()` when
 * not provided. Useful for the Scenic Render Skill which posts to a
 * separate gateway.
 */
export type M3EndpointResolver = () => string;

export type M3ChatMessagePart =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: { url: string };
    };

export type M3ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | M3ChatMessagePart[];
};

export type M3ChatRequest = {
  model: string;
  messages: M3ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_completion_tokens?: number;
  thinking?: { type: string };
  response_format?: { type: "json_object" | "text" };
};

export type M3ChatResponse = {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type M3CallOptions = {
  /** Override the API key (defaults to `process.env.MINIMAX_API_KEY`). */
  apiKey?: string;
  /** Optional caller-provided abort signal (combined with the per-attempt timeout). */
  signal?: AbortSignal;
  /** Per-attempt timeout in milliseconds. Default 60_000. */
  timeoutMs?: number;
  /** Total attempts (1 initial + retries). Default 3. */
  maxAttempts?: number;
  /** Base backoff delay in milliseconds. Default 1000. */
  baseDelayMs?: number;
  /** Maximum backoff delay in milliseconds. Default 30_000. */
  maxDelayMs?: number;
  /** Inject a `fetch` implementation (used by tests). */
  fetchImpl?: typeof fetch;
  /** Override the endpoint URL. Defaults to `buildMiniMaxChatEndpoint()`. */
  endpointResolver?: M3EndpointResolver;
  /** Observer hook called before each retry. */
  onRetry?: (err: M3Error, attempt: number, delayMs: number) => void;
};

export type M3CallResult =
  | { ok: true; data: M3ChatResponse; attempts: number; totalDurationMs: number }
  | { ok: false; error: M3Error; attempts: number; totalDurationMs: number };

const DEFAULTS = {
  timeoutMs: 60_000,
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
} as const;

type MiniMaxChoice = {
  message?: { content?: unknown; reasoning_content?: string };
};

type MiniMaxChatResponse = {
  model?: string;
  choices?: MiniMaxChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  base_resp?: { status_code?: number; status_msg?: string };
};

/**
 * Extract a string content field from a MiniMax chat-completion response.
 * Handles the OpenAI-compatible string content shape as well as the
 * array-of-parts shape some gateways use.
 */
function extractContent(data: MiniMaxChatResponse): string {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (
          item &&
          typeof item === "object" &&
          "text" in item &&
          typeof (item as { text: unknown }).text === "string"
        ) {
          return (item as { text: string }).text;
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

/**
 * Resolve the model id for a given request. Falls back to the M3 default
 * when the caller did not pass one. Provided so callers that only know
 * the desired generation mode (speed / quality) can opt-in to a single
 * call site.
 */
export function resolveRequestModel(
  request: M3ChatRequest,
  mode?: GenerationMode,
): string {
  if (request.model) return request.model;
  return resolveMiniMaxModel(mode ?? "quality");
}

/**
 * Read the API key from options or `process.env.MINIMAX_API_KEY`.
 * Returns an empty string when neither is set — callers should treat
 * that as an invalid_request so the request is never sent.
 */
function resolveApiKey(options: M3CallOptions): string {
  return options.apiKey ?? process.env.MINIMAX_API_KEY ?? "";
}

/**
 * Classify a thrown value from the fetch layer. We need this wrapper so
 * fetch-time errors that carry no `Response` (network, abort, parse)
 * can be funneled through the same `classifyM3Error` used by HTTP
 * responses.
 */
function classifyThrown(error: unknown): M3Error {
  return classifyM3Error(error);
}

/**
 * Internal: perform a single attempt (no retry). Throws on every failure
 * so that `withRetry` can decide whether to retry. The thrown value is
 * always classified (so the retry predicate can read `retryable`).
 */
async function attemptOnce(
  request: M3ChatRequest,
  options: M3CallOptions,
): Promise<M3ChatResponse> {
  const apiKey = resolveApiKey(options);
  if (!apiKey) {
    throw classifyM3Error(new Error("missing MINIMAX_API_KEY"));
  }

  const fetchImpl: typeof fetch = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;

  // Combine the per-attempt timeout with any caller-supplied signal.
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  // Apply thinking-mode side effects for the M3 model.
  const body = applyMiniMaxThinking({ ...request });

  const endpoint = options.endpointResolver?.() ?? buildMiniMaxChatEndpoint();
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
  } catch (error) {
    throw classifyThrown(error);
  }

  if (!response.ok) {
    // Read the body for diagnostic context, but never let a body-read
    // failure mask the original HTTP status.
    let details: string | undefined;
    try {
      const text = await response.text();
      if (text) details = text.slice(0, 500);
    } catch {
      // ignore — keep the original error
    }
    const base = classifyM3Error(undefined, response);
    if (details) {
      throw { ...base, details: base.details ?? details } satisfies M3Error;
    }
    throw base;
  }

  // Parse the JSON body. A parse error is non-retryable.
  let data: MiniMaxChatResponse;
  let rawText: string;
  try {
    rawText = await response.text();
    data = rawText ? (JSON.parse(rawText) as MiniMaxChatResponse) : {};
  } catch (error) {
    throw classifyThrown(error);
  }

  // Some MiniMax gateways embed an error in `base_resp.status_code` even
  // on HTTP 200. Treat that as a server error.
  const baseStatus = data?.base_resp?.status_code;
  if (typeof baseStatus === "number" && baseStatus !== 0) {
    const base = classifyM3Error(undefined, response);
    throw {
      ...base,
      category: "server",
      details: data?.base_resp?.status_msg ?? base.details,
    } satisfies M3Error;
  }

  const content = extractContent(data);
  if (!content) {
    throw classifyM3Error(
      new Error("MiniMax response did not include any content"),
    );
  }

  // Usage is optional — only set fields when the gateway provided them.
  const usage = data.usage;
  const usageOut =
    usage &&
    typeof usage.prompt_tokens === "number" &&
    typeof usage.completion_tokens === "number" &&
    typeof usage.total_tokens === "number"
      ? {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        }
      : undefined;

  return {
    content,
    model: data.model ?? request.model,
    ...(usageOut ? { usage: usageOut } : {}),
  };
}

/**
 * Call the MiniMax chat-completion endpoint with retries, timeouts, and
 * structured error classification. Always returns an `M3CallResult` —
 * the function itself does not throw for expected M3 failures.
 */
export async function callM3Chat(
  request: M3ChatRequest,
  options: M3CallOptions = {},
): Promise<M3CallResult> {
  const startedAt = Date.now();
  const maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts;
  let attempts = 0;

  try {
    const data = await withRetry(
      async () => {
        attempts += 1;
        return attemptOnce(request, options);
      },
      {
        maxAttempts,
        baseDelayMs: options.baseDelayMs ?? DEFAULTS.baseDelayMs,
        maxDelayMs: options.maxDelayMs ?? DEFAULTS.maxDelayMs,
        jitter: "none",
        // Non-retryable M3 errors short-circuit out of the loop.
        shouldRetry: (error) => {
          const classified = unwrapM3Error(error);
          return classified.retryable === true;
        },
        onRetry: (error, attempt, delayMs) => {
          const classified = unwrapM3Error(error);
          options.onRetry?.(classified, attempt, delayMs);
        },
      },
    );

    return {
      ok: true,
      data,
      attempts,
      totalDurationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const classified = unwrapM3Error(error);
    return {
      ok: false,
      error: classified,
      attempts: Math.max(attempts, maxAttempts),
      totalDurationMs: Date.now() - startedAt,
    };
  }
}

/**
 * Unwrap and classify any value that surfaces from the retry loop:
 *   - pre-classified `M3Error` objects are returned as-is,
 *   - `RetryError` (from `withRetry`) is unwrapped to its inner error,
 *   - any other value is classified through `classifyM3Error`.
 */
function unwrapM3Error(value: unknown): M3Error {
  if (isM3Error(value)) return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "originalError" in value &&
    "attempts" in value
  ) {
    const inner = (value as { originalError: unknown }).originalError;
    return unwrapM3Error(inner);
  }

  return classifyM3Error(value);
}

/**
 * Type guard: an `M3Error` is a plain object with a `category` field.
 * We use this to detect errors thrown by `attemptOnce` (which we
 * pre-classify) vs. raw errors from `withRetry` itself.
 */
function isM3Error(value: unknown): value is M3Error {
  return (
    typeof value === "object" &&
    value !== null &&
    "category" in value &&
    "retryable" in value &&
    "message" in value
  );
}

// Re-export the ZodError helper for callers that want to test whether a
// thrown value is a schema error without importing zod directly.
export { ZodError };
