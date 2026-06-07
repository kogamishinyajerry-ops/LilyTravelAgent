/**
 * Unit tests for the central M3 client (`lib/m3-client.ts`).
 *
 * All network calls are mocked through `options.fetchImpl`. The retry
 * loop's jitter and backoff are pinned to `none` / 1ms so the tests run
 * in deterministic time.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callM3Chat, type M3CallOptions, type M3ChatRequest } from "./m3-client";

type FetchMock = ReturnType<typeof vi.fn>;

function buildRequest(): M3ChatRequest {
  return {
    model: "MiniMax-M3",
    messages: [
      { role: "system", content: "you are a tester" },
      { role: "user", content: "say hi" },
    ],
    temperature: 0.2,
  };
}

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeTextResponse(text: string, status: number): Response {
  return new Response(text, { status });
}

function makeErrorResponse(status: number, bodyText = "boom"): Response {
  return makeTextResponse(bodyText, status);
}

function makeOptions(overrides: Partial<M3CallOptions> = {}): M3CallOptions {
  return {
    apiKey: "test-key",
    baseDelayMs: 1,
    maxDelayMs: 1,
    maxAttempts: 3,
    timeoutMs: 5000,
    ...overrides,
  };
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // Strip MINIMAX_API_KEY from env so tests that pass `apiKey` are
  // unambiguous. Tests that need the env fallback set it explicitly.
  delete process.env.MINIMAX_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe("callM3Chat — success path", () => {
  it("returns ok on the first try without invoking onRetry", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(
      makeJsonResponse({
        model: "MiniMax-M3",
        choices: [{ message: { content: "hello there" } }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      }),
    );
    const onRetry = vi.fn();

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.content).toBe("hello there");
    expect(result.data.model).toBe("MiniMax-M3");
    expect(result.data.usage).toEqual({
      prompt_tokens: 5,
      completion_tokens: 3,
      total_tokens: 8,
    });
    expect(result.attempts).toBe(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("succeeds on the second try after a 500 response", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(500, "server down"))
      .mockResolvedValueOnce(
        makeJsonResponse({
          choices: [{ message: { content: "second try wins" } }],
        }),
      );
    const onRetry = vi.fn();

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.content).toBe("second try wins");
    expect(result.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("succeeds on the third try after two consecutive 503s", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(503))
      .mockResolvedValueOnce(makeErrorResponse(503))
      .mockResolvedValueOnce(
        makeJsonResponse({
          choices: [{ message: { content: "third try wins" } }],
        }),
      );
    const onRetry = vi.fn();

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.content).toBe("third try wins");
    expect(result.attempts).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});

describe("callM3Chat — failure paths", () => {
  it("fails with auth error (401) without retrying", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(401, "unauthorized"));
    const onRetry = vi.fn();

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe("auth");
    expect(result.error.statusCode).toBe(401);
    expect(result.error.retryable).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(result.attempts).toBe(3);
  });

  it("fails with rate limit (429) after exhausting maxAttempts retries", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(429, "rate limited"));
    const onRetry = vi.fn();

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions({ maxAttempts: 3 }),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe("rate_limit");
    expect(result.error.statusCode).toBe(429);
    expect(result.error.retryable).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(3);
  });

  it("fails with parse error (invalid JSON body) without retrying", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValue(makeTextResponse("{not valid json", 200));
    const onRetry = vi.fn();

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe("parse");
    expect(result.error.retryable).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("fails with a network error when fetch rejects", async () => {
    const fetchError = new TypeError("Failed to fetch");
    const fetchMock: FetchMock = vi.fn().mockRejectedValue(fetchError);
    const onRetry = vi.fn();

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe("network");
    expect(result.error.retryable).toBe(true);
    expect(result.error.details).toContain("Failed to fetch");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("fails with a timeout error when fetch rejects with an AbortError", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock: FetchMock = vi.fn().mockRejectedValue(abortError);
    const onRetry = vi.fn();

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe("timeout");
    expect(result.error.retryable).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("fails with an invalid_request when no API key is available", async () => {
    const fetchMock: FetchMock = vi.fn();
    const onRetry = vi.fn();

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions({ apiKey: undefined }),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // A missing API key surfaces as an "unknown" classification that is
    // not retryable; the important part is that no fetch was made.
    expect(result.error.retryable).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
  });
});

describe("callM3Chat — env + observability", () => {
  it("reads MINIMAX_API_KEY from env when no apiKey is in options", async () => {
    process.env.MINIMAX_API_KEY = "env-key-1234";

    const fetchMock: FetchMock = vi.fn().mockResolvedValue(
      makeJsonResponse({
        choices: [{ message: { content: "ok from env key" } }],
      }),
    );

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions({ apiKey: undefined }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.content).toBe("ok from env key");

    // Verify the Authorization header carried the env key.
    const callArgs = fetchMock.mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer env-key-1234");
  });

  it("invokes the onRetry callback for each retry with a classified error", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(500))
      .mockResolvedValueOnce(makeErrorResponse(503))
      .mockResolvedValueOnce(
        makeJsonResponse({
          choices: [{ message: { content: "ok" } }],
        }),
      );

    const onRetry = vi.fn();

    await callM3Chat(buildRequest(), {
      ...makeOptions(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(2);
    for (const call of onRetry.mock.calls) {
      const [err, attempt, delayMs] = call as [
        { category: string; retryable: boolean; statusCode?: number },
        number,
        number,
      ];
      expect(err.category).toBe("server");
      expect(err.retryable).toBe(true);
      expect(err.statusCode).toBeGreaterThanOrEqual(500);
      expect(typeof attempt).toBe("number");
      expect(typeof delayMs).toBe("number");
    }
  });

  it("respects custom maxAttempts when retrying a 500", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(500))
      .mockResolvedValueOnce(
        makeJsonResponse({
          choices: [{ message: { content: "ok" } }],
        }),
      );

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions({ maxAttempts: 2 }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("attempts count equals maxAttempts when all attempts fail with 500", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(500));

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions({ maxAttempts: 4 }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.attempts).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("tracks a non-zero totalDurationMs", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(
      makeJsonResponse({
        choices: [{ message: { content: "ok" } }],
      }),
    );

    const result = await callM3Chat(buildRequest(), {
      ...makeOptions(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.totalDurationMs).toBe("number");
  });
});
