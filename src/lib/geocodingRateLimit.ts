/**
 * Per-user sliding-window rate limiter for geocoding (Phase 22 Wave 2 -- 22-02).
 *
 * Implements a Redis ZSET sliding window keyed per user. Each call prunes
 * entries older than WINDOW_MS, records the current request, bounds the key
 * lifetime, then counts. If the count exceeds MAX_REQUESTS the call is rejected.
 *
 * Best-effort (T-22-02-05): on any Redis error we fail OPEN (return undefined)
 * so a broken rate-limit check never causes a permanent geocoding outage. The
 * 1 req/sec limit is advisory, not a hard security boundary.
 */

import { redis } from "@/lib/redis";

const WINDOW_MS = 1_000;
const MAX_REQUESTS = 1;
const KEY_TTL_SECONDS = 5;
const RETRY_AFTER_MS = 1_000;

export interface RateLimitExceeded {
    error: "rate_limited";
    retryAfterMs: number;
}

function rateKey(userId: string): string {
    return `nominatim:ratelimit:${userId}`;
}

/**
 * Returns `undefined` when the request is allowed, or a `rate_limited` result
 * object when the per-user window limit is exceeded.
 */
export async function checkRateLimit(userId: string): Promise<RateLimitExceeded | undefined> {
    const key = rateKey(userId);
    try {
        const now = Date.now();
        await redis.zremrangebyscore(key, "-inf", now - WINDOW_MS);
        await redis.zadd(key, now, String(now));
        await redis.expire(key, KEY_TTL_SECONDS);
        const count = await redis.zcard(key);
        if (count > MAX_REQUESTS) {
            return { error: "rate_limited", retryAfterMs: RETRY_AFTER_MS };
        }
        return undefined;
    } catch (err) {
        console.warn("[geocodingRateLimit] Redis error, failing open:", err);
        return undefined;
    }
}
