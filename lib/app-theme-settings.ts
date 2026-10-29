import pool from '@/lib/db'
import { revalidateTag } from 'next/cache'
import { GLOBAL_SETTINGS_CACHE_TAG } from '@/lib/website-home-revalidate'
import type { AppTheme } from '@/lib/theme-sync'

export const APP_THEME_SETTINGS_KEY = 'app_theme'

export type AppThemeSettings = {
  /** Default application theme when the visitor has no local preference. */
  mode: AppTheme
  /** When true, every surface is locked to `mode` and user toggles are hidden. */
  force: boolean
}

export const DEFAULT_APP_THEME_SETTINGS: AppThemeSettings = {
  mode: 'light',
  force: false,
}

function normalizeThemeSettings(raw: unknown): AppThemeSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_APP_THEME_SETTINGS }

  const data = raw as Record<string, unknown>
  const mode: AppTheme = data.mode === 'dark' ? 'dark' : 'light'
  const force = data.force === true || data.force === 'true'

  return { mode, force }
}

export async function loadAppThemeSettings(): Promise<AppThemeSettings> {
  try {
    const result = await pool.query(
      'SELECT setting_value FROM global_settings WHERE setting_key = $1',
      [APP_THEME_SETTINGS_KEY]
    )

    if (result.rows.length === 0 || !result.rows[0].setting_value) {
      return { ...DEFAULT_APP_THEME_SETTINGS }
    }

    try {
      return normalizeThemeSettings(JSON.parse(result.rows[0].setting_value))
    } catch {
      const legacy = String(result.rows[0].setting_value)
      if (legacy === 'dark' || legacy === 'light') {
        return { mode: legacy, force: false }
      }
      return { ...DEFAULT_APP_THEME_SETTINGS }
    }
  } catch (error) {
    console.error('Error loading app theme settings:', error)
    return { ...DEFAULT_APP_THEME_SETTINGS }
  }
}

export async function saveAppThemeSettings(
  incoming: Partial<AppThemeSettings>
): Promise<AppThemeSettings> {
  const current = await loadAppThemeSettings()
  const next = normalizeThemeSettings({ ...current, ...incoming })
  const value = JSON.stringify(next)

  const existing = await pool.query(
    'SELECT id FROM global_settings WHERE setting_key = $1',
    [APP_THEME_SETTINGS_KEY]
  )

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO global_settings (setting_key, setting_value, setting_type, description)
       VALUES ($1, $2, 'json', 'Application-wide light/dark theme controlled by Super Admin')`,
      [APP_THEME_SETTINGS_KEY, value]
    )
  } else {
    await pool.query(
      `UPDATE global_settings
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = $2`,
      [value, APP_THEME_SETTINGS_KEY]
    )
  }

  try {
    revalidateTag(GLOBAL_SETTINGS_CACHE_TAG)
  } catch {
    // Outside a request context this can throw; ignore.
  }

  return next
}

/** Inline script for public/marketing pages (Bootstrap template theme classes). */
export function buildPublicThemeInitInlineScript(settings: AppThemeSettings): string {
  const modeJson = JSON.stringify(settings.mode)
  const forceJson = JSON.stringify(Boolean(settings.force))
  return `(function () {
  try {
    var forced = ${forceJson};
    var defaultMode = ${modeJson};
    var stored = null;
    try {
      stored = localStorage.getItem('cm-theme');
      if (stored !== 'dark' && stored !== 'light') {
        var duch = localStorage.getItem('duch_theme');
        if (duch === 'theme-dark') stored = 'dark';
        else if (duch === 'theme-light') stored = 'light';
      }
    } catch (e) {}
    var theme = forced ? defaultMode : (stored || defaultMode);
    var dark = theme === 'dark';
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', dark);
    root.classList.toggle('theme-dark', dark);
    root.classList.toggle('theme-light', !dark);
    if (document.body) document.body.classList.toggle('dark-theme', dark);
    try {
      localStorage.setItem('cm-theme', theme);
      localStorage.setItem('duch_theme', dark ? 'theme-dark' : 'theme-light');
      localStorage.setItem('cm-theme-force', forced ? '1' : '0');
      localStorage.setItem('cm-theme-default', defaultMode);
    } catch (e) {}
  } catch (e) {}
})();`
}
