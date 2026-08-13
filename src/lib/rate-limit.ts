export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type RateLimitWindow = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  window: RateLimitWindow,
  now = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + window.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= window.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimitForTests() {
  buckets.clear();
}

export const AUTH_RATE_LIMIT: RateLimitWindow = {
  limit: 8,
  windowMs: 15 * 60 * 1000,
};

export const REGISTER_RATE_LIMIT: RateLimitWindow = {
  limit: 5,
  windowMs: 60 * 60 * 1000,
};

export const ACCOUNT_MUTATION_RATE_LIMIT: RateLimitWindow = {
  limit: 20,
  windowMs: 15 * 60 * 1000,
};
