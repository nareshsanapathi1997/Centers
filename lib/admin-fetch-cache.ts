const DEFAULT_STALE_MS = 60_000

type CacheEntry<T> = {
  data: T
  fetchedAt: number
  staleMs: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function getAdminFetchCache<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > entry.staleMs) return null
  return entry.data as T
}

export function peekAdminFetchCache<T>(key: string): T | null {
  const entry = store.get(key)
  return entry ? (entry.data as T) : null
}

export function setAdminFetchCache<T>(key: string, data: T, staleMs = DEFAULT_STALE_MS): void {
  store.set(key, { data, fetchedAt: Date.now(), staleMs })
}

export function invalidateAdminFetchCache(key?: string): void {
  if (key) {
    store.delete(key)
    return
  }
  store.clear()
}

export function invalidateAdminFetchCachePrefix(prefix: string): void {
  Array.from(store.keys()).forEach((key) => {
    if (key.startsWith(prefix)) store.delete(key)
  })
}
