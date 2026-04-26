type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function randomToken() {
  return Math.random().toString(36).slice(2, 10);
}

export function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${randomToken()}`;
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs
    } satisfies RateLimitEntry;
    rateLimitStore.set(key, next);

    return {
      ok: true,
      remaining: Math.max(0, maxRequests - 1),
      resetAt: next.resetAt
    };
  }

  if (existing.count >= maxRequests) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    ok: true,
    remaining: Math.max(0, maxRequests - existing.count),
    resetAt: existing.resetAt
  };
}
