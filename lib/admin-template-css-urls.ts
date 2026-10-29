import { getBasePath } from '@/lib/with-base-path'

/** Public template CSS under `public/assets` (same list as admin / super-admin theme scripts). */
export const ADMIN_TEMPLATE_CSS_PATHS = [
  '/assets/css/bootstrap.min.css',
  '/assets/css/flaticon.css',
  '/assets/css/remixicon.css',
  '/assets/css/style.css',
  '/assets/css/responsive.css',
  '/assets/css/dark-theme.css',
] as const

/** Full URLs including Next `basePath` for client script `link[href=...]` cleanup. */
export function getAdminTemplateCssUrls(): string[] {
  const bp = getBasePath()
  return ADMIN_TEMPLATE_CSS_PATHS.map((p) => `${bp}${p}`)
}

type AdminThemeInitOptions = {
  /** Super Admin default theme used when localStorage is empty. */
  defaultTheme?: 'light' | 'dark'
  /** When true, ignore local preference and always use defaultTheme. */
  force?: boolean
}

/** Inline `beforeInteractive` script: theme class + remove duplicate template CSS links (href includes `basePath`). */
export function buildAdminThemeInitInlineScript(
  themeStorageKey: string,
  options: AdminThemeInitOptions = {}
): string {
  const urlsJson = JSON.stringify(getAdminTemplateCssUrls())
  const keyJson = JSON.stringify(themeStorageKey)
  const defaultJson = JSON.stringify(options.defaultTheme === 'dark' ? 'dark' : 'light')
  const forceJson = JSON.stringify(Boolean(options.force))
  return `(function() {
  try {
    var forced = ${forceJson};
    var defaultTheme = ${defaultJson};
    var stored = localStorage.getItem('cm-theme') || localStorage.getItem(${keyJson});
    var theme = forced ? defaultTheme : (stored === 'dark' || stored === 'light' ? stored : defaultTheme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('cm-theme', theme);
      localStorage.setItem(${keyJson}, theme);
      localStorage.setItem('cm-theme-force', forced ? '1' : '0');
      localStorage.setItem('cm-theme-default', defaultTheme);
    } catch (e) {}
    var templateCssFiles = ${urlsJson};
    templateCssFiles.forEach(function(href) {
      var link = document.querySelector('link[href="' + href + '"]');
      if (link) link.remove();
    });
  } catch (e) {}
})();`
}
