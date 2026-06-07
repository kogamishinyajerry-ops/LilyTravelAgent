import { describe, it, expect, vi } from "vitest";
import {
  computeBackoffDelay,
  withRetry,
  RetryError,
} from "./retry-policy";

describe("computeBackoffDelay", () => {
  it("returns the base delay with no jitter on attempt 1", () => {
    const delay = computeBackoffDelay(1, {
      baseDelayMs: 1000,
      backoffMultiplier: 2,
      jitter: "none",
    });
    expect(delay).toBe(1000);
  });

  it("applies exponential growth across attempts (no jitter)", () => {
    const opts = {
      baseDelayMs: 100,
      backoffMultiplier: 2,
      jitter: "none" as const,
    };
    expect(computeBackoffDelay(1, opts)).toBe(100);
    expect(computeBackoffDelay(2, opts)).toBe(200);
    expect(computeBackoffDelay(3, opts)).toBe(400);
    expect(computeBackoffDelay(4, opts)).toBe(800);
  });

  it("uses default options when none are provided (no jitter mode)", () => {
    // Force 'none' jitter to make output deterministic.
    const delay = computeBackoffDelay(1, { jitter: "none" });
    expect(delay).toBe(1000);
  });

  it("applies 'full' jitter as a value within [0, 2 * baseDelay] for attempt 1", () => {
    for (let i = 0; i < 25; i++) {
      const delay = computeBackoffDelay(1, {
        baseDelayMs: 1000,
        jitter: "full",
      });
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(2000);
    }
  });

  it("applies 'equal' jitter as baseDelay * 1.5", () => {
    const delay = computeBackoffDelay(1, {
      baseDelayMs: 1000,
      jitter: "equal",
    });
    expect(delay).toBe(1500);
  });

  it("applies 'equal' jitter across exponential attempts", () => {
    const opts = {
      baseDelayMs: 100,
      backoffMultiplier: 2,
      jitter: "equal" as const,
    };
    expect(computeBackoffDelay(1, opts)).toBe(150);
    expect(computeBackoffDelay(2, opts)).toBe(300);
    expect(computeBackoffDelay(3, opts)).toBe(600);
  });

  it("caps the delay at maxDelayMs even with jitter", () => {
    const delay = computeBackoffDelay(10, {
      baseDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 5000,
      jitter: "full",
    });
    expect(delay).toBe(5000);
  });

  it("throws for attempt numbers less than 1", () => {
    expect(() => computeBackoffDelay(0, { jitter: "none" })).toThrow();
  });
});

describe("withRetry", () => {
  it("returns the value on the first successful attempt without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const onRetry = vi.fn();

    const result = await withRetry(fn, { onRetry, baseDelayMs: 1 });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("retries after a failure and returns the second-attempt value", async () => {
    const err = new Error("boom");
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce("ok-on-2");

    const result = await withRetry(fn, { baseDelayMs: 1 });

    expect(result).toBe("ok-on-2");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 1);
    expect(fn).toHaveBeenNthCalledWith(2, 2);
  });

  it("throws a RetryError after maxAttempts", async () => {
    const err = new Error("always fails");
    const fn = vi.fn().mockRejectedValue(err);

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 }),
    ).rejects.toBeInstanceOf(RetryError);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("the thrown RetryError wraps the last error and reports attempts", async () => {
    const err = new Error("terminal failure");
    const fn = vi.fn().mockRejectedValue(err);

    try {
      await withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 });
      throw new Error("withRetry should have thrown");
    } catch (caught) {
      expect(caught).toBeInstanceOf(RetryError);
      const retryErr = caught as RetryError;
      expect(retryErr.originalError).toBe(err);
      expect(retryErr.attempts).toBe(2);
      expect(retryErr.message).toContain("terminal failure");
    }
  });

  it("respects shouldRetry=false and throws without further attempts", async () => {
    const err = new Error("do not retry me");
    const fn = vi.fn().mockRejectedValue(err);
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(
      withRetry(fn, { shouldRetry, baseDelayMs: 1 }),
    ).rejects.toBeInstanceOf(RetryError);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(err, 1);
  });

  it("invokes onRetry with the error, attempt, and computed delay", async () => {
    const err = new Error("retry me");
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce("done");

    const onRetry = vi.fn();
    await withRetry(fn, {
      baseDelayMs: 5,
      backoffMultiplier: 1,
      jitter: "none",
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(err, 1, 5);
  });

  it("invokes onRetry once per non-terminal failure only", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("nope"));
    const onRetry = vi.fn();

    await expect(
      withRetry(fn, { maxAttempts: 4, baseDelayMs: 1, jitter: "none", onRetry }),
    ).rejects.toBeInstanceOf(RetryError);

    // 4 attempts: onRetry fires after attempts 1, 2, 3 — not after 4.
    expect(fn).toHaveBeenCalledTimes(4);
    expect(onRetry).toHaveBeenCalledTimes(3);
  });
});
