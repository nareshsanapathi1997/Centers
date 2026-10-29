'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAppTheme } from '@/components/AppThemeProvider'

interface DarkModeToggleProps {
  compact?: boolean
}

export default function DarkModeToggle({ compact = false }: DarkModeToggleProps) {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, canToggle, force } = useAppTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return compact ? (
      <div className="h-8 w-8 rounded-md bg-gray-200 dark:bg-gray-600 animate-pulse" />
    ) : (
      <div className="h-9 w-[4.25rem] rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
    )
  }

  if (!canToggle || force) {
    return null
  }

  const isDark = theme === 'dark'

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 dark:text-gray-300 transition-colors hover:bg-white dark:hover:bg-gray-700"
      >
        {isDark ? <Moon className="h-4 w-4" strokeWidth={2} /> : <Sun className="h-4 w-4" strokeWidth={2} />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="
        relative inline-flex h-9 w-[4.25rem] shrink-0 rounded-full
        bg-gradient-to-r from-amber-100 to-amber-50 dark:from-indigo-950 dark:to-slate-800
        border border-amber-200/60 dark:border-indigo-800/60
        shadow-inner
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-amber-400/50 dark:focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800
        hover:shadow-md
      "
    >
      <span
        className={`
          absolute top-1 left-1 flex h-7 w-7 items-center justify-center
          rounded-full shadow-md
          transition-all duration-300 ease-out
          ${isDark
            ? 'translate-x-[1.95rem] bg-slate-700 text-indigo-200 border border-slate-600/50'
            : 'translate-x-0 bg-white text-amber-600 border border-amber-200/80'
          }
        `}
      >
        {isDark ? (
          <Moon className="h-4 w-4" strokeWidth={2} />
        ) : (
          <Sun className="h-4 w-4" strokeWidth={2} />
        )}
      </span>
      <span className="sr-only">{isDark ? 'Dark mode' : 'Light mode'}</span>
    </button>
  )
}
