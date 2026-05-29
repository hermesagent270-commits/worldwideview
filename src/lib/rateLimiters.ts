import { RateLimiter, getClientIp } from "./rateLimit";

export { getClientIp };

/**
 * Pre-configured rate limiters for sensitive API endpoints.
 * These are singletons — one instance per endpoint, shared across requests.
 */

/** /api/keys/verify — prevents API key brute-force. */
export const keyVerifyLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 5,
});

/** /api/camera/proxy — prevents SSRF abuse. */
export const cameraProxyLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 30,
});

/** /api/marketplace/install-redirect — prevents install spam. */
export const installLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 60,
});

/** /api/marketplace/grant-token — prevents JWT generation spam. */
export const grantTokenLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 5,
});

/** /api/marketplace/status, install, uninstall — general marketplace API. */
export const marketplaceApiLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 60,
});

/** /api/auth/[...nextauth] — prevents credential brute-force. */
export const authLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 10,
});

// TODO: move mcpLimiter and apiKeyManagementLimiter to @upstash/ratelimit for
// multi-replica deployments — in-process limiters are per-replica and do not
// share state across horizontal scale-out.

/**
 * GET /api/globe/commands — browser poll at ~1500ms across a small number of tabs.
 * 120 req/60s per IP comfortably covers several simultaneous tabs with headroom.
 */
export const globeCommandsLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 120,
});

/** /api/mcp — prevents scan/DoS before the expensive auth layer runs. */
export const mcpLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 60,
});

/** /api/api-keys GET/POST/DELETE — prevents enumeration and creation spam. */
export const apiKeyManagementLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 10,
});
