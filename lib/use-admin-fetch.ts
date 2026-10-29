'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { withBasePath } from '@/lib/with-base-path'
import {
  getAdminFetchCache,
  peekAdminFetchCache,
  setAdminFetchCache,
  invalidateAdminFetchCache,
} from '@/lib/admin-fetch-cache'

type UseAdminFetchOptions<T> = {
  staleMs?: number
  enabled?: boolean
  auth?: boolean
  parse?: (json: unknown) => T
}

export function useAdminFetch<T>(
  cacheKey: string,
  path: string | null,
  options: UseAdminFetchOptions<T> = {},
) {
  const { staleMs = 60_000, enabled = true, auth = false, parse } = options
  const parseRef = useRef(parse)
  parseRef.current = parse

  const [data, setData] = useState<T | null>(() => peekAdminFetchCache<T>(cacheKey))
  const [loading, setLoading] = useState(() => !peekAdminFetchCache<T>(cacheKey))
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(
    async (force = false) => {
      if (!path || !enabled) return

      if (!force) {
        const cached = getAdminFetchCache<T>(cacheKey)
        if (cached != null) {
          setData(cached)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(withBasePath(path), {
          credentials: auth ? 'include' : 'same-origin',
        })
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }
        const json = await response.json()
        const parsed = parseRef.current ? parseRef.current(json) : (json as T)
        setAdminFetchCache(cacheKey, parsed, staleMs)
        setData(parsed)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Fetch failed'))
      } finally {
        setLoading(false)
      }
    },
    [cacheKey, enabled, path, staleMs, auth],
  )

  useEffect(() => {
    void refetch(false)
  }, [refetch])

  const invalidate = useCallback(() => {
    invalidateAdminFetchCache(cacheKey)
  }, [cacheKey])

  return { data, loading, error, refetch, invalidate, setData }
}
