/**
 * In-memory sliding-window rate limiter (single Node process).
 * Enough for one-host / small intranet deploy; swap for Redis later if multi-instance.
 */

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export function getApiChatRateLimitRpm() {
  const raw = Number(process.env.API_CHAT_RATE_LIMIT_RPM ?? "30");
  if (!Number.isFinite(raw) || raw <= 0) {
    return 30;
  }
  return Math.min(1000, Math.floor(raw));
}

export function takeRateLimitToken(
  key: string,
  limitPerMinute = getApiChatRateLimitRpm(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= limitPerMinute) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}
