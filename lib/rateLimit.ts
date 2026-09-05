/**
 * Minimal best-effort per-IP throttle for quota-burning endpoints.
 *
 * This is NOT globally enforced distributed rate limiting. It is an
 * in-memory sliding window per serverless instance: it stops trivial
 * single-instance loops and accidental double-taps, but two requests hitting
 * different instances (or a distributed botnet) each get their own bucket.
 * Real global enforcement would need a shared store (e.g. Upstash Redis).
 * Documented in the README — do not mistake this for a quota guarantee.
 *
 * Shared across /api/vibe and /api/build-prompt so both endpoints draw from
 * the same per-IP budget.
 */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

export function checkRateLimit(
  ip: string
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const hits = (rateBuckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_MAX) {
    const oldest = hits[0] ?? now;
    const retryAfter = Math.max(
      1,
      Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000)
    );
    rateBuckets.set(ip, hits);
    return { allowed: false, retryAfter };
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  // Bound memory: drop quiet buckets when the map grows large.
  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets) {
      if (v.length === 0 || v[v.length - 1]! < cutoff) rateBuckets.delete(k);
      if (rateBuckets.size <= 1000) break;
    }
  }
  return { allowed: true };
}
