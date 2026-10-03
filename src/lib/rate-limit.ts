/**
 * Rate Limiting Utility
 * In-memory rate limiter for development, with Upstash Redis support for production
 */

// Simple in-memory sliding window rate limiter
const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a request from the given IP is allowed
 * @param ip - The IP address to check
 * @param maxRequests - Maximum requests allowed in the window (default: 3)
 * @param windowMs - Window duration in milliseconds (default: 1 hour)
 */
export async function checkRateLimit(
    ip: string,
    maxRequests = 3,
    windowMs = 60 * 60 * 1000
): Promise<{ success: boolean; remaining: number }> {
    // Try Upstash if configured
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            const { Ratelimit } = await import('@upstash/ratelimit');
            const { Redis } = await import('@upstash/redis');

            const redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL,
                token: process.env.UPSTASH_REDIS_REST_TOKEN,
            });

            const limiter = new Ratelimit({
                redis,
                limiter: Ratelimit.slidingWindow(maxRequests, '1 h'),
                analytics: false,
                prefix: 'ratelimit:register',
            });

            const result = await limiter.limit(ip);
            return { success: result.success, remaining: result.remaining };
        } catch (err) {
            console.warn('Upstash rate limit failed, falling back to memory:', err);
        }
    }

    // In-memory fallback
    const now = Date.now();
    const entry = memoryStore.get(ip);

    if (!entry || now > entry.resetAt) {
        memoryStore.set(ip, { count: 1, resetAt: now + windowMs });
        return { success: true, remaining: maxRequests - 1 };
    }

    if (entry.count >= maxRequests) {
        return { success: false, remaining: 0 };
    }

    entry.count++;
    return { success: true, remaining: maxRequests - entry.count };
}
