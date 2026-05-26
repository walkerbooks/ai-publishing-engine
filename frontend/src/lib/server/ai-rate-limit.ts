/**
 * Fixed-window in-memory rate limit for the AI BFF. One bucket per key (user token hash or IP).
 * For multi-instance production, replace with Redis/Upstash or edge limits.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function maxPerWindowFromEnv(): number {
  const n = Number(process.env.AI_PROXY_RPM);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 120;
}

function windowMsFromEnv(): number {
  const n = Number(process.env.AI_PROXY_WINDOW_MS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60_000;
}

function pruneExpired(now: number): void {
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export type AiRateLimitOpts = {
  /** Max requests per window (default from AI_PROXY_RPM or 120). */
  maxPerWindow?: number;
  /** Window length in ms (default from AI_PROXY_WINDOW_MS or 60_000). */
  windowMs?: number;
};

export function checkAiRateLimit(
  key: string,
  opts?: AiRateLimitOpts,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const win = opts?.windowMs ?? windowMsFromEnv();
  const max = opts?.maxPerWindow ?? maxPerWindowFromEnv();
  if (buckets.size > 10_000) pruneExpired(now);

  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + win });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
