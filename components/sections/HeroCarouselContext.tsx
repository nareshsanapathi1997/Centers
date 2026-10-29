'use client'

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react'
import type { TemplateCarouselHandle } from '@/components/ui/TemplateCarousel'

type HeroCarouselContextValue = {
  register: (handle: TemplateCarouselHandle | null) => void
  prev: () => void
  next: () => void
}

const HeroCarouselContext = createContext<HeroCarouselContextValue | null>(null)

export function HeroCarouselProvider({ children }: { children: ReactNode }) {
  const handleRef = useRef<TemplateCarouselHandle | null>(null)

  const register = useCallback((handle: TemplateCarouselHandle | null) => {
    handleRef.current = handle
  }, [])

  const value = useMemo<HeroCarouselContextValue>(
    () => ({
      register,
      prev: () => handleRef.current?.prev(),
      next: () => handleRef.current?.next(),
    }),
    [register],
  )

  return <HeroCarouselContext.Provider value={value}>{children}</HeroCarouselContext.Provider>
}

export function useHeroCarousel() {
  const context = useContext(HeroCarouselContext)
  if (!context) {
    throw new Error('useHeroCarousel must be used within HeroCarouselProvider')
  }
  return context
}
