/**
 * Stability / edge-case tests for the retry policy (`lib/retry-policy.ts`).
 *
 * These tests focus on the things that bite in production:
 *  - Recursive / chained retries must not blow the call stack when the
 *    caller keeps producing failures.
 *  - `maxAttempts=0` is an error condition (no attempts) and should
 *    reject immediately.
 *  - `maxAttempts=1` is the "no retries" path: one shot, no
 *    `onRetry` callback fired.
 *  - Jitter must stay inside the documented bounds for every mode.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeBackoffDelay,
  RetryError,
  withRetry,
} from "./retry-policy";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("retry-policy — stability / edge cases", () => {
  it("does not blow the stack when many rapid retries keep failing", async () => {
    vi.useFakeTimers();
    const errors = Array.from({ length: 1000 }, (_, i) => new Error(`e-${i}`));
    let i = 0;
    // The producer always fails, but is iterative (returns a rejected
    // promise directly) so the test exercises withRetry's *internal* call
    // structure rather than recursion. We just confirm it can drive
    // 1000 attempts through the loop without throwing or hanging.
    const fn = vi.fn().mockImplementation(async () => {
      throw errors[i++];
    });

    // Attach the rejection handler synchronously to avoid Node's
    // unhandled-rejection warning.
    const promise = withRetry(fn, {
      maxAttempts: 1000,
      baseDelayMs: 1,
      maxDelayMs: 1,
      backoffMultiplier: 1,
      jitter: "none",
    });
    promise.catch(() => {
      // intentional no-op — we re-assert via expect.rejects below
    });

    // Drive the fake clock to completion. The backoff is fixed at 1ms so
    // we can advance all timers in one shot.
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toBeInstanceOf(RetryError);
    expect(fn).toHaveBeenCalledTimes(1000);
  });

  it("maxAttempts=0 throws immediately (no attempts are made)", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockImplementation(async () => "never called");

    await expect(
      withRetry(fn, {
        maxAttempts: 0,
        baseDelayMs: 1,
        maxDelayMs: 1,
        backoffMultiplier: 1,
        jitter: "none",
      }),
    ).rejects.toBeInstanceOf(RetryError);
    expect(fn).not.toHaveBeenCalled();
  });

  it("maxAttempts=1 means no retries (one shot, onRetry never fires)", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("one-shot failure"));
    const onRetry = vi.fn();

    await expect(
      withRetry(fn, {
        maxAttempts: 1,
        baseDelayMs: 1,
        maxDelayMs: 1,
        backoffMultiplier: 1,
        jitter: "none",
        onRetry,
      }),
    ).rejects.toBeInstanceOf(RetryError);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("backoff respects 'none' jitter bounds (delay === base * 2^(attempt-1))", () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const expected = 1000 * Math.pow(2, attempt - 1);
      const delay = computeBackoffDelay(attempt, {
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        jitter: "none",
        maxDelayMs: 1_000_000,
      });
      expect(delay).toBe(expected);
    }
  });

  it("'full' jitter stays inside [base, 2 * base] on attempt 1 across many samples", () => {
    const base = 1000;
    for (let i = 0; i < 200; i++) {
      const delay = computeBackoffDelay(1, {
        baseDelayMs: base,
        backoffMultiplier: 2,
        jitter: "full",
        maxDelayMs: 1_000_000,
      });
      expect(delay).toBeGreaterThanOrEqual(base);
      expect(delay).toBeLessThanOrEqual(2 * base);
    }
  });

  it("'equal' jitter produces exactly base * 1.5 on attempt 1", () => {
    const delay = computeBackoffDelay(1, {
      baseDelayMs: 1000,
      backoffMultiplier: 2,
      jitter: "equal",
      maxDelayMs: 1_000_000,
    });
    expect(delay).toBe(1500);
  });

  it("'equal' jitter scales correctly across exponential attempts (no upper cap)", () => {
    const opts = {
      baseDelayMs: 100,
      backoffMultiplier: 2,
      jitter: "equal" as const,
      maxDelayMs: 1_000_000,
    };
    expect(computeBackoffDelay(1, opts)).toBe(150);
    expect(computeBackoffDelay(2, opts)).toBe(300);
    expect(computeBackoffDelay(3, opts)).toBe(600);
    expect(computeBackoffDelay(4, opts)).toBe(1200);
  });

  it("caps the delay at maxDelayMs even with 'full' jitter at large attempt numbers", () => {
    const cap = 5000;
    for (let i = 0; i < 50; i++) {
      const delay = computeBackoffDelay(20, {
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        jitter: "full",
        maxDelayMs: cap,
      });
      expect(delay).toBeLessThanOrEqual(cap);
    }
  });
});
