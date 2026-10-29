'use client'

import { useEffect, useRef, useState } from 'react'

type AnimatedCounterProps = {
  value: number
  duration?: number
  className?: string
  format?: (n: number) => string
}

function defaultFormat(n: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(n))
}

/** Counts up from 0 on mount. Skips animation when reduced-motion is set. */
export default function AnimatedCounter({
  value,
  duration = 700,
  className = '',
  format = defaultFormat,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0)
  const target = Number.isFinite(value) ? value : 0
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      setDisplay(target)
      return
    }
    started.current = true

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || target === 0) {
      setDisplay(target)
      return
    }

    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(target * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return <span className={`cm-count ${className}`.trim()}>{format(display)}</span>
}
