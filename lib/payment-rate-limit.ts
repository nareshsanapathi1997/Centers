import pool from './db'

const buckets = new Map<string, { count: number; resetAt: number }>()

let redisClient: { incr: (k: string) => Promise<number>; pExpire: (k: string, ms: number) => Promise<number> } | null = null
let redisInit: Promise<void> | null = null

async function getRedis() {
  if (redisClient) return redisClient
  if (!process.env.REDIS_URL) return null
  if (!redisInit) {
    redisInit = (async () => {
      try {
        const { createClient } = await import('redis')
        const client = createClient({
          url: process.env.REDIS_URL,
          // Redis 5.x (e.g. Ubuntu 20.04 apt) does not support RESP3 HELLO
          RESP: 2,
        })
        client.on('error', (err: Error) => console.error('[redis rate-limit]', err))
        await client.connect()
        redisClient = {
          incr: (k) => client.incr(k),
          pExpire: (k, ms) => client.pExpire(k, ms),
        }
      } catch (e) {
        console.warn('[rate-limit] Redis unavailable, falling back to database/memory:', e)
        redisClient = null
      }
    })()
  }
  await redisInit
  return redisClient
}

async function checkRateLimitDb(key: string, max: number, windowMs: number): Promise<boolean> {
  const resetAt = new Date(Date.now() + windowMs)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // `count` must be assigned first: it reads reset_at before reset_at is updated.
    await client.query(
      `INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (bucket_key) DO UPDATE SET
         count = CASE
           WHEN rate_limit_buckets.reset_at <= NOW() THEN 1
           ELSE rate_limit_buckets.count + 1
         END,
         reset_at = CASE
           WHEN rate_limit_buckets.reset_at <= NOW() THEN $2
           ELSE rate_limit_buckets.reset_at
         END`,
      [key, resetAt]
    )
    const result = await client.query(`SELECT count FROM rate_limit_buckets WHERE bucket_key = $1`, [key])
    await client.query('COMMIT')
    const count = Number(result.rows[0]?.count || 0)
    return count <= max
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function checkRateLimitRedis(key: string, max: number, windowMs: number): Promise<boolean> {
  const redis = await getRedis()
  if (!redis) return checkRateLimitDb(key, max, windowMs)

  const redisKey = `rl:${key}`
  const count = await redis.incr(redisKey)
  if (count === 1) {
    await redis.pExpire(redisKey, windowMs)
  }
  return count <= max
}

/** Simple in-memory rate limiter (single process). */
export function checkRateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now()
  const row = buckets.get(key)
  if (!row || now > row.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (row.count >= max) return false
  row.count += 1
  return true
}

/** Multi-instance safe when REDIS_URL or the database buckets table is available. */
export async function checkRateLimitAsync(key: string, max = 20, windowMs = 60_000): Promise<boolean> {
  if (process.env.REDIS_URL) {
    return checkRateLimitRedis(key, max, windowMs)
  }
  if (process.env.RATE_LIMIT_STORE === 'database' || process.env.NODE_ENV === 'production') {
    try {
      return await checkRateLimitDb(key, max, windowMs)
    } catch {
      return checkRateLimit(key, max, windowMs)
    }
  }
  return checkRateLimit(key, max, windowMs)
}

export function clientIp(request: Request): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function enforceRateLimit(
  request: Request,
  keyPrefix: string,
  max = 20,
  windowMs = 60_000
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const ip = clientIp(request)
  const key = `${keyPrefix}:${ip}`
  const allowed = await checkRateLimitAsync(key, max, windowMs)
  if (allowed) return { allowed: true }
  return { allowed: false, retryAfterSec: Math.ceil(windowMs / 1000) }
}
