/**
 * Optional Redis cache for hot public reads.
 * Falls back to the provided loader when REDIS_URL is unset or Redis is down.
 */

type RedisLike = {
  get: (k: string) => Promise<string | null>
  set: (k: string, v: string, opts?: { EX?: number }) => Promise<unknown>
  del: (k: string) => Promise<unknown>
}

let client: RedisLike | null = null
let init: Promise<void> | null = null

async function getRedis(): Promise<RedisLike | null> {
  if (client) return client
  if (!process.env.REDIS_URL) return null
  if (!init) {
    init = (async () => {
      try {
        const { createClient } = await import('redis')
        const c = createClient({
          url: process.env.REDIS_URL,
          RESP: 2,
        })
        c.on('error', (err: Error) => console.error('[redis-cache]', err))
        await c.connect()
        client = {
          get: (k) => c.get(k),
          set: (k, v, opts) => c.set(k, v, opts),
          del: (k) => c.del(k),
        }
      } catch (error) {
        console.warn('[redis-cache] unavailable:', error)
        client = null
      }
    })()
  }
  await init
  return client
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const redis = await getRedis()
  if (!redis) return null
  try {
    const raw = await redis.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function redisSetJson(key: string, value: unknown, ttlSec: number): Promise<void> {
  const redis = await getRedis()
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSec })
  } catch (error) {
    console.warn('[redis-cache] set failed:', error)
  }
}

export async function redisDel(key: string): Promise<void> {
  const redis = await getRedis()
  if (!redis) return
  try {
    await redis.del(key)
  } catch {
    // ignore
  }
}

/** Cache-aside helper: Redis → loader → Redis. */
export async function withRedisCache<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = await redisGetJson<T>(key)
  if (cached != null) return cached
  const value = await loader()
  if (value != null) {
    await redisSetJson(key, value, ttlSec)
  }
  return value
}
