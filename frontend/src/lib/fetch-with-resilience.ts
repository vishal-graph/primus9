/**
 * Fetch with timeout and optional retry for transient network failures.
 */

export interface ResilientFetchOptions {
  /** Total timeout per attempt (ms) */
  timeoutMs?: number;
  /** Retries after the first failed attempt (e.g. 1 = two attempts total) */
  retries?: number;
  /** When true, do not retry (e.g. non-idempotent writes) */
  skipRetry?: boolean;
}

function isAbortOrNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as Error).name;
  return name === 'AbortError' || name === 'TypeError';
}

export async function fetchWithResilience(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts: ResilientFetchOptions = {}
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 25_000;
  const maxAttempts = opts.skipRetry ? 1 : (opts.retries ?? 1) + 1;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      const retryable = isAbortOrNetworkError(err);
      if (!retryable || attempt === maxAttempts - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}
