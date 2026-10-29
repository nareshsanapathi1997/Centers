'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppTheme } from '@/components/AppThemeProvider'

/** Compact theme control for student portal (hidden when Super Admin forces theme). */
export default function StudentThemeToggle() {
  const { theme, setTheme, canToggle, force } = useAppTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!canToggle || force) return null

  // Keep the first render deterministic. The provider reads the persisted
  // theme on the client, so choosing the icon before mount causes SSR/CSR
  // markup to diverge and triggers a hydration warning in Next dev.
  const isDark = mounted && theme === 'dark'

  return (
    <button
      type="button"
      className="sp-theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
      title={mounted ? (isDark ? 'Light mode' : 'Dark mode') : 'Toggle theme'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
