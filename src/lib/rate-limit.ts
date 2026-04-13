/**
 * Simple in-memory rate limiter for API routes.
 * Limits requests per IP per time window.
 */

const requestCounts = new Map<string, { count: number; resetAt: number }>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of requestCounts) {
    if (val.resetAt < now) requestCounts.delete(key)
  }
}, 5 * 60 * 1000)

export function checkRateLimit(
  ip: string,
  limit = 60,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const key = ip

  const existing = requestCounts.get(key)
  if (!existing || existing.resetAt < now) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  existing.count++
  if (existing.count > limit) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: limit - existing.count }
}
