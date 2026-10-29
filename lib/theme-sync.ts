/**
 * Single theme contract shared by admin (next-themes + `.dark`), the public
 * center site (`data-theme`), and any surface that wants to stay in step.
 *
 * Storage key is shared so flipping the toggle on one surface is honored on
 * the next visit to another. Super Admin can set a global default and optionally
 * force the theme for the entire application.
 */
export const THEME_STORAGE_KEY = 'cm-theme'
export const THEME_FORCE_KEY = 'cm-theme-force'
export const THEME_DEFAULT_KEY = 'cm-theme-default'

export type AppTheme = 'light' | 'dark'

export function readStoredTheme(): AppTheme | null {
  if (typeof window === 'undefined') return null
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value === 'dark' || value === 'light') return value
    // Migrate older next-themes / site keys if present.
    const legacy =
      localStorage.getItem('theme') ||
      localStorage.getItem('center-theme') ||
      localStorage.getItem('admin-theme') ||
      localStorage.getItem('super-admin-theme')
    if (legacy === 'dark' || legacy === 'light') return legacy
    const duch = localStorage.getItem('duch_theme')
    if (duch === 'theme-dark') return 'dark'
    if (duch === 'theme-light') return 'light'
  } catch {
    // ignore
  }
  return null
}

export function readThemeForce(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(THEME_FORCE_KEY) === '1'
  } catch {
    return false
  }
}

export function readThemeDefault(): AppTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    const value = localStorage.getItem(THEME_DEFAULT_KEY)
    if (value === 'dark' || value === 'light') return value
  } catch {
    // ignore
  }
  return 'light'
}

export function resolveEffectiveTheme(options?: {
  mode?: AppTheme
  force?: boolean
}): AppTheme {
  const force = options?.force ?? readThemeForce()
  const defaultMode = options?.mode ?? readThemeDefault()
  if (force) return defaultMode
  return readStoredTheme() || defaultMode
}

/** Persist Super Admin theme policy for client bootstraps / toggles. */
export function persistThemePolicy(mode: AppTheme, force: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_DEFAULT_KEY, mode)
    localStorage.setItem(THEME_FORCE_KEY, force ? '1' : '0')
  } catch {
    // ignore
  }
}

/** Apply both the Tailwind `dark` class and the public-site `data-theme` attr. */
export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const dark = theme === 'dark'
  root.classList.toggle('dark', dark)
  root.classList.toggle('theme-dark', dark)
  root.classList.toggle('theme-light', !dark)
  root.setAttribute('data-theme', theme)
  if (document.body) {
    document.body.classList.toggle('dark-theme', dark)
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    localStorage.setItem('duch_theme', dark ? 'theme-dark' : 'theme-light')
    // Keep legacy next-themes keys aligned so older init scripts stay correct.
    localStorage.setItem('admin-theme', theme)
    localStorage.setItem('super-admin-theme', theme)
  } catch {
    // ignore
  }
}
