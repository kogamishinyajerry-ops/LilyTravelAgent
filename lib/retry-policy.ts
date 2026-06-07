/**
 * Retry policy utility.
 *
 * Provides exponential backoff with jitter and a `withRetry` helper that
 * invokes an async function with retries, honoring a custom
 * `shouldRetry` predicate and an `onRetry` callback for observability.
 */

export type JitterMode = 'none' | 'full' | 'equal';

export type RetryOptions = {
  /** Total attempts (1 initial + retries). Default 3. */
  maxAttempts: number;
  /** Base delay in milliseconds used for the first retry. Default 1000. */
  baseDelayMs: number;
  /** Maximum delay in milliseconds after exponential backoff. Default 30000. */
  maxDelayMs: number;
  /** Exponential growth factor between attempts. Default 2. */
  backoffMultiplier: number;
  /**
   * Jitter mode:
   * - 'full'  : adds a random value in [0, delay] to the delay (default).
   * - 'equal' : adds delay / 2 to the delay.
   * - 'none'  : no jitter.
   */
  jitter: JitterMode;
  /** Predicate that decides whether a failed attempt should be retried. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Observer hook called before each retry. */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

const DEFAULTS = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: 'full' as JitterMode,
} satisfies Omit<RetryOptions, 'shouldRetry' | 'onRetry'>;

function resolveOptions(opts: Partial<RetryOptions> = {}): RetryOptions {
  return {
    maxAttempts: opts.maxAttempts ?? DEFAULTS.maxAttempts,
    baseDelayMs: opts.baseDelayMs ?? DEFAULTS.baseDelayMs,
    maxDelayMs: opts.maxDelayMs ?? DEFAULTS.maxDelayMs,
    backoffMultiplier: opts.backoffMultiplier ?? DEFAULTS.backoffMultiplier,
    jitter: opts.jitter ?? DEFAULTS.jitter,
    shouldRetry: opts.shouldRetry,
    onRetry: opts.onRetry,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute the backoff delay (in milliseconds) for the given 1-indexed
 * attempt number. Applies the configured jitter mode and caps the result
 * at `maxDelayMs`.
 */
export function computeBackoffDelay(
  attempt: number,
  opts: Partial<RetryOptions> = {},
): number {
  if (attempt < 1) {
    throw new Error(`attempt must be >= 1, got ${attempt}`);
  }
  const { baseDelayMs, maxDelayMs, backoffMultiplier, jitter } =
    resolveOptions(opts);

  const exp = attempt - 1;
  let delay = baseDelayMs * Math.pow(backoffMultiplier, exp);

  switch (jitter) {
    case 'full':
      delay += Math.random() * delay;
      break;
    case 'equal':
      delay += delay / 2;
      break;
    case 'none':
    default:
      break;
  }

  return Math.min(delay, maxDelayMs);
}

/**
 * Error thrown by `withRetry` after exhausting all attempts. Carries the
 * original error and the number of attempts that were made.
 */
export class RetryError extends Error {
  public readonly originalError: unknown;
  public readonly attempts: number;

  constructor(originalError: unknown, attempts: number) {
    const message =
      originalError instanceof Error
        ? originalError.message
        : String(originalError);
    super(`Retry failed after ${attempts} attempt(s): ${message}`);
    this.name = 'RetryError';
    this.originalError = originalError;
    this.attempts = attempts;
    // Maintain prototype chain when targeting older runtimes.
    Object.setPrototypeOf(this, RetryError.prototype);
  }
}

/**
 * Execute `fn` with retries, sleeping between attempts based on the
 * configured backoff. The promise resolves with the value returned on a
 * successful attempt, or rejects with a `RetryError` wrapping the last
 * error after `maxAttempts` is reached (or `shouldRetry` returns false).
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: Partial<RetryOptions> = {},
): Promise<T> {
  const resolved = resolveOptions(opts);
  const { maxAttempts, shouldRetry, onRetry } = resolved;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts) {
        break;
      }

      if (shouldRetry && !shouldRetry(error, attempt)) {
        break;
      }

      const delayMs = computeBackoffDelay(attempt, resolved);

      if (onRetry) {
        try {
          onRetry(error, attempt, delayMs);
        } catch {
          // Swallow observer errors so they don't break the retry loop.
        }
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw new RetryError(lastError, maxAttempts);
}
