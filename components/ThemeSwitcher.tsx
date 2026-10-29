'use client'

import { useEffect, useState } from 'react'
import { useAppTheme } from '@/components/AppThemeProvider'
import { applyAppTheme, readThemeForce, type AppTheme } from '@/lib/theme-sync'

type ThemeSwitcherProps = {
  /** `toggle` = legacy round switch; `icon` = compact icon button for utility bars */
  variant?: 'toggle' | 'icon'
  className?: string
}

function applyPublicThemeClasses(theme: AppTheme) {
  applyAppTheme(theme)
}

export default function ThemeSwitcher({ variant = 'toggle', className }: ThemeSwitcherProps) {
  const appTheme = useAppTheme()
  const [mounted, setMounted] = useState(false)
  const [localDark, setLocalDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    setLocalDark(appTheme.theme === 'dark')
  }, [appTheme.theme])

  if (!mounted) return null

  // Respect Super Admin force even if provider is missing on this surface.
  if (!appTheme.canToggle || appTheme.force || readThemeForce()) {
    return null
  }

  const isDark = appTheme.theme === 'dark' || localDark

  const toggleTheme = () => {
    const next: AppTheme = isDark ? 'light' : 'dark'
    setLocalDark(next === 'dark')
    appTheme.setTheme(next)
    applyPublicThemeClasses(next)
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`pub-icon-btn website-theme-btn${className ? ` ${className}` : ''}`}
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
        suppressHydrationWarning
      >
        <i className={isDark ? 'ri-sun-line' : 'ri-moon-line'} aria-hidden />
      </button>
    )
  }

  return (
    <div className={`switch-theme-mode${className ? ` ${className}` : ''}`}>
      <label id="switch" className="switch">
        <input
          type="checkbox"
          id="slider"
          checked={isDark}
          onChange={toggleTheme}
          aria-label="Toggle dark mode"
          suppressHydrationWarning
        />
        <span className="slider round" />
      </label>
    </div>
  )
}
