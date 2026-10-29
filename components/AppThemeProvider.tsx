'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useTheme } from 'next-themes'
import {
  applyAppTheme,
  persistThemePolicy,
  resolveEffectiveTheme,
  type AppTheme,
} from '@/lib/theme-sync'

type AppThemeContextValue = {
  mode: AppTheme
  force: boolean
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  canToggle: boolean
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

type AppThemeProviderProps = {
  mode: AppTheme
  force: boolean
  children: ReactNode
  /** When true, keep next-themes in sync (admin / super-admin panels). */
  syncNextThemes?: boolean
}

function useThemeController(
  mode: AppTheme,
  force: boolean,
  syncNextThemes: boolean
): AppThemeContextValue {
  const { setTheme: setNextTheme } = useTheme()
  const [theme, setThemeState] = useState<AppTheme>(() =>
    resolveEffectiveTheme({ mode, force })
  )

  useEffect(() => {
    persistThemePolicy(mode, force)
    const next = resolveEffectiveTheme({ mode, force })
    setThemeState(next)
    applyAppTheme(next)
    if (syncNextThemes) {
      setNextTheme(next)
    }
  }, [mode, force, syncNextThemes, setNextTheme])

  const setTheme = useCallback(
    (next: AppTheme) => {
      if (force) return
      setThemeState(next)
      applyAppTheme(next)
      if (syncNextThemes) {
        setNextTheme(next)
      }
    },
    [force, syncNextThemes, setNextTheme]
  )

  return useMemo(
    () => ({
      mode,
      force,
      theme,
      setTheme,
      canToggle: !force,
    }),
    [mode, force, theme, setTheme]
  )
}

function PublicThemeController({
  mode,
  force,
  children,
}: {
  mode: AppTheme
  force: boolean
  children: ReactNode
}) {
  const [theme, setThemeState] = useState<AppTheme>(() =>
    resolveEffectiveTheme({ mode, force })
  )

  useEffect(() => {
    persistThemePolicy(mode, force)
    const next = resolveEffectiveTheme({ mode, force })
    setThemeState(next)
    applyAppTheme(next)
  }, [mode, force])

  const setTheme = useCallback(
    (next: AppTheme) => {
      if (force) return
      setThemeState(next)
      applyAppTheme(next)
    },
    [force]
  )

  const value = useMemo(
    () => ({
      mode,
      force,
      theme,
      setTheme,
      canToggle: !force,
    }),
    [mode, force, theme, setTheme]
  )

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

function AdminThemeController({
  mode,
  force,
  children,
}: {
  mode: AppTheme
  force: boolean
  children: ReactNode
}) {
  const value = useThemeController(mode, force, true)
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

export function AppThemeProvider({
  mode,
  force,
  children,
  syncNextThemes = false,
}: AppThemeProviderProps) {
  if (syncNextThemes) {
    return (
      <AdminThemeController mode={mode} force={force}>
        {children}
      </AdminThemeController>
    )
  }

  return (
    <PublicThemeController mode={mode} force={force}>
      {children}
    </PublicThemeController>
  )
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext)
  if (ctx) return ctx

  const theme = resolveEffectiveTheme()
  return {
    mode: theme,
    force: false,
    theme,
    setTheme: (next) => applyAppTheme(next),
    canToggle: true,
  }
}
