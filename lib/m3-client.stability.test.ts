/**
 * Stability / integration tests for the central M3 client
 * (`lib/m3-client.ts`).
 *
 * These tests exercise the real retry loop and `setTimeout`-based
 * backoff scheduler using `vi.useFakeTimers()` so we can advance
 * through exponential backoff deterministically without sleeping the
 * test runner. The goal is to confirm the wire-level behaviour of the
 * client under a wide range of failure mixes (500 storms, 429 waves,
 * timeouts, network drops, transient flakes) without ever needing to
 * talk to the real MiniMax gateway.
 *
 * We use a small `baseDelayMs` (50ms) so the fake clock advances
 * quickly. The exponential ratios are what we assert (1, 2, 4, ...),
 * not the absolute values.
 *
 * Pattern: the `callM3Chat` call is launched without awaiting it,
 * then we drive the fake clock forward in 1ms ticks while the
 * promise resolves, then we await the final result. This avoids the
 * classic "await blocks forever because setTimeout is faked" pitfall.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callM3Chat,
  type M3CallOptions,
  type M3ChatRequest,
} from "./m3-client";
import type { M3Error } from "./m3-error-classifier";

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

function makeErrorResponse(status: number, bodyText = "boom"): Response {
  return new Response(bodyText, { status });
}

/**
 * Convenience wrapper: schedule `fn` (which returns a promise), then
 * drain the fake clock with `runAllTimersAsync` (which fires every
 * pending `setTimeout` AND drains microtasks in a loop). This is
 * the recommended pattern from the Vitest docs for driving promises
 * that depend on timers.
 */
async function driveFakeTimers<T>(makePromise: () => Promise<T>): Promise<T> {
  const p = makePromise();
  // Repeatedly fire all timers + microtasks until the promise settles
  // or we hit a safety bound.
  for (let i = 0; i < 200; i++) {
    await vi.runAllTimersAsync();
    // Race against a microtask boundary so the awaits inside
    // `withRetry` get a chance to resume.
    await Promise.resolve();
    // Use Promise.race to check settlement without consuming the
    // value of `p` twice.
    let settled = false;
    const sentinel = new Promise<void>((resolve) => {
      Promise.race([p, Promise.resolve()]).then(() => {
        settled = true;
        resolve();
      });
    });
    await sentinel;
    if (settled) return p;
  }
  return p;
}

/**
 * Options preset for the stability suite. We use a small `baseDelayMs`
 * so the fake clock advances quickly, but the *ratios* between attempts
 * are still 1x, 2x, 4x. The m3-client hard-codes `jitter='none'` for
 * the internal withRetry call, so the backoff curve is exact.
 */
function makeOptions(overrides: Partial<M3CallOptions> = {}): M3CallOptions {
  return {
    apiKey: "test-key",
    baseDelayMs: 50,
    maxDelayMs: 30_000,
    backoffMultiplier: 2,
    timeoutMs: 5000,
    maxAttempts: 5,
    ...overrides,
  };
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.MINIMAX_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };
});

describe("callM3Chat — stability suite (fake timers)", () => {
  it(
    "Test 1: two consecutive 500s then success → succeeds on attempt 3, onRetry called 2 times",
    async () => {
      vi.useFakeTimers();
      const fetchMock: FetchMock = vi
        .fn()
        .mockResolvedValueOnce(makeErrorResponse(500, "boom-1"))
        .mockResolvedValueOnce(makeErrorResponse(500, "boom-2"))
        .mockResolvedValueOnce(
          makeJsonResponse({
            model: "MiniMax-M3",
            choices: [{ message: { content: "recovered" } }],
          }),
        );
      const onRetry = vi.fn();

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions(),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry,
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.content).toBe("recovered");
      expect(result.attempts).toBe(3);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    },
    15_000,
  );

  it(
    "Test 2: one timeout (AbortError) then success → succeeds on attempt 2",
    async () => {
      vi.useFakeTimers();
      const abortError = new Error("aborted");
      abortError.name = "AbortError";
      const fetchMock: FetchMock = vi
        .fn()
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce(
          makeJsonResponse({
            choices: [{ message: { content: "after-timeout" } }],
          }),
        );
      const onRetry = vi.fn();

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions(),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry,
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.content).toBe("after-timeout");
      expect(result.attempts).toBe(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
    },
    15_000,
  );

  it(
    "Test 3: persistent 500 across 5 attempts → fails with 'server' category",
    async () => {
      vi.useFakeTimers();
      const fetchMock: FetchMock = vi
        .fn()
        .mockResolvedValue(makeErrorResponse(500, "always down"));
      const onRetry = vi.fn();

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions({ maxAttempts: 5 }),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry,
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.category).toBe("server");
      expect(result.error.retryable).toBe(true);
      expect(result.error.statusCode).toBe(500);
      expect(result.attempts).toBe(5);
      expect(fetchMock).toHaveBeenCalledTimes(5);
      // onRetry fires for attempts 1..4 (not 5).
      expect(onRetry).toHaveBeenCalledTimes(4);
    },
    15_000,
  );

  it(
    "Test 4: 429 then 429 then 200 → succeeds on attempt 3",
    async () => {
      vi.useFakeTimers();
      const fetchMock: FetchMock = vi
        .fn()
        .mockResolvedValueOnce(makeErrorResponse(429, "slow down 1"))
        .mockResolvedValueOnce(makeErrorResponse(429, "slow down 2"))
        .mockResolvedValueOnce(
          makeJsonResponse({
            choices: [{ message: { content: "ok-after-throttle" } }],
          }),
        );
      const onRetry = vi.fn();

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions(),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry,
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.content).toBe("ok-after-throttle");
      expect(result.attempts).toBe(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    },
    15_000,
  );

  it(
    "Test 5: 401 → fails with 'auth' category, no retries",
    async () => {
      vi.useFakeTimers();
      const fetchMock: FetchMock = vi
        .fn()
        .mockResolvedValue(makeErrorResponse(401, "unauthorized"));
      const onRetry = vi.fn();

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions(),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry,
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.category).toBe("auth");
      expect(result.error.statusCode).toBe(401);
      expect(result.error.retryable).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(onRetry).not.toHaveBeenCalled();
    },
    15_000,
  );

  it(
    "Test 6: random 500/200 mix with controlled seed → eventually succeeds",
    async () => {
      vi.useFakeTimers();
      // Deterministic pseudo-random: 0..1 range derived from a seeded LCG.
      // Pre-computed sequence (5 numbers): [0.1, 0.9, 0.2, 0.7, 0.3].
      // r<0.5 → 500, r>=0.5 → 200.
      // The fetcher does `i++` then reads seq[i%len], so the *i-th* call
      // returns seq[i-1]. Trace:
      //   call 1: i=1 → returns seq[0]=0.1 → 500  (retry)
      //   call 2: i=2 → returns seq[1]=0.9 → 200  (success)
      // → succeeds on attempt 2, onRetry called once.
      const seq = [0.1, 0.9, 0.2, 0.7, 0.3];
      let i = 0;
      const rand = () => seq[i++ % seq.length];
      const fetchMock: FetchMock = vi.fn().mockImplementation(async () => {
        const r = rand();
        if (r < 0.5) {
          return makeErrorResponse(500, `flaky-${i}`);
        }
        return makeJsonResponse({
          choices: [{ message: { content: "flaky-success" } }],
        });
      });
      const onRetry = vi.fn();

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions({ maxAttempts: 5 }),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry,
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.content).toBe("flaky-success");
      expect(result.attempts).toBe(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
    },
    15_000,
  );

  it(
    "Test 7: network error then network error then 200 → succeeds on attempt 3",
    async () => {
      vi.useFakeTimers();
      const networkError = new TypeError("Failed to fetch");
      const fetchMock: FetchMock = vi
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(new TypeError("NetworkError when attempting…"))
        .mockResolvedValueOnce(
          makeJsonResponse({
            choices: [{ message: { content: "network-recovered" } }],
          }),
        );
      const onRetry = vi.fn();

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions(),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry,
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.content).toBe("network-recovered");
      expect(result.attempts).toBe(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    },
    15_000,
  );

  it(
    "Test 8: timeout (AbortError) → classified as 'timeout' and retried",
    async () => {
      vi.useFakeTimers();
      const abortError = new Error("aborted");
      abortError.name = "AbortError";
      const fetchMock: FetchMock = vi.fn().mockRejectedValue(abortError);
      const observedCategories: string[] = [];

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions({ maxAttempts: 4 }),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry: (err) => {
            observedCategories.push(err.category);
          },
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.category).toBe("timeout");
      expect(result.error.retryable).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(observedCategories).toEqual(["timeout", "timeout", "timeout"]);
    },
    15_000,
  );

  it(
    "Test 9: backoff is exponential (50ms, 100ms, 200ms, 400ms) when jitter is 'none'",
    async () => {
      vi.useFakeTimers();
      const fetchMock: FetchMock = vi
        .fn()
        .mockResolvedValueOnce(makeErrorResponse(500))
        .mockResolvedValueOnce(makeErrorResponse(500))
        .mockResolvedValueOnce(makeErrorResponse(500))
        .mockResolvedValueOnce(makeErrorResponse(500))
        .mockResolvedValueOnce(
          makeJsonResponse({
            choices: [{ message: { content: "done" } }],
          }),
        );
      const observedDelays: number[] = [];
      const onRetry = (_err: M3Error, _attempt: number, delayMs: number) => {
        observedDelays.push(delayMs);
      };

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions({
            maxAttempts: 5,
            baseDelayMs: 50,
            maxDelayMs: 30_000,
            // m3-client hard-codes jitter='none' (see lib/m3-client.ts).
            // The exponential curve should therefore be exact: 50, 100, 200.
          }),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry,
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // 5 attempts → 4 retries → 4 backoff delays, doubling each time.
      expect(observedDelays).toEqual([50, 100, 200, 400]);
    },
    15_000,
  );

  it(
    "Test 10: totalDurationMs is a non-negative finite number",
    async () => {
      vi.useFakeTimers();
      const fetchMock: FetchMock = vi
        .fn()
        .mockResolvedValueOnce(makeErrorResponse(500))
        .mockResolvedValueOnce(
          makeJsonResponse({
            choices: [{ message: { content: "done" } }],
          }),
        );
      const onRetry = vi.fn();

      const result = await driveFakeTimers(() =>
        callM3Chat(buildRequest(), {
          ...makeOptions(),
          fetchImpl: fetchMock as unknown as typeof fetch,
          onRetry,
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(typeof result.totalDurationMs).toBe("number");
      expect(Number.isFinite(result.totalDurationMs)).toBe(true);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
      // Sanity bound: should be far less than 30s on the fake clock.
      expect(result.totalDurationMs).toBeLessThan(30_000);
    },
    15_000,
  );
});
