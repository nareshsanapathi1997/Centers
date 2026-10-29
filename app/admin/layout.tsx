import type { Metadata } from 'next'
import { sansFont } from '@/lib/template-fonts'
import Script from 'next/script'
import '../globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import AdminPanelStyles from '@/components/admin/AdminPanelStyles'
import AdminUIProvider from '@/components/admin/AdminUIProvider'
import QueryProvider from '@/components/providers/QueryProvider'
import { AppThemeProvider } from '@/components/AppThemeProvider'
import { loadAppThemeSettings } from '@/lib/app-theme-settings'
import { buildAdminPanelMetadata } from '@/lib/admin-panel-metadata'
import { buildAdminThemeInitInlineScript } from '@/lib/admin-template-css-urls'
import { THEME_STORAGE_KEY } from '@/lib/theme-sync'

export async function generateMetadata(): Promise<Metadata> {
  return buildAdminPanelMetadata(
    'Admin Panel - Center Manager',
    'Admin Dashboard for Center Management',
  )
}

const ADMIN_PANEL_STYLES = `
  [data-admin-panel="true"] .admin-login-input {
    width: 100% !important;
    height: 56px !important;
    min-height: 56px !important;
    padding: 16px 18px !important;
    font-size: 16px !important;
    font-weight: 400 !important;
    color: #1f2937 !important;
    background-color: #f9fafb !important;
    border: 2px solid #e5e7eb !important;
    border-radius: 12px !important;
    outline: none !important;
    transition: all 0.2s ease !important;
    box-sizing: border-box !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
  }
  [data-admin-panel="true"] .admin-login-input:focus {
    border-color: #4f46e5 !important;
    background-color: #ffffff !important;
    box-shadow: 0 0 0 4px rgba(79,70,229, 0.14) !important;
  }
  [data-admin-panel="true"] .admin-login-input::placeholder {
    color: #9ca3af !important;
    opacity: 1 !important;
  }
  [data-admin-panel="true"] .admin-login-input-password {
    padding-right: 50px !important;
  }
  .dark [data-admin-panel="true"] .admin-login-input,
  .dark [data-admin-panel="true"] .admin-login-input-password {
    color: #f3f4f6 !important;
    background-color: #374151 !important;
    border-color: #4b5563 !important;
  }
  .dark [data-admin-panel="true"] .admin-login-input:focus,
  .dark [data-admin-panel="true"] .admin-login-input-password:focus {
    border-color: #818cf8 !important;
    background-color: #1f2937 !important;
    box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.2) !important;
  }
  .dark [data-admin-panel="true"] .admin-login-input::placeholder,
  .dark [data-admin-panel="true"] .admin-login-input-password::placeholder {
    color: #9ca3af !important;
    opacity: 1 !important;
  }
  [data-admin-panel="true"] .admin-login-btn {
    width: 100% !important;
    height: 52px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 10px !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    color: white !important;
    background: #4f46e5 !important;
    border: none !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    box-shadow: none !important;
    transition: all 0.2s ease !important;
  }
  [data-admin-panel="true"] .admin-login-btn:hover {
    transform: translateY(-2px) !important;
    background: #4338ca !important;
    box-shadow: 0 6px 16px rgba(79,70,229, 0.28) !important;
  }
  [data-admin-panel="true"] .admin-login-btn:disabled {
    background: #9ca3af !important;
    cursor: not-allowed !important;
    box-shadow: none !important;
    transform: none !important;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const themeSettings = await loadAppThemeSettings()

  return (
    <>
      <Script
        id="admin-theme-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: buildAdminThemeInitInlineScript(THEME_STORAGE_KEY, {
            defaultTheme: themeSettings.mode,
            force: themeSettings.force,
          }),
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: ADMIN_PANEL_STYLES }} />
      <AdminPanelStyles />
      <ThemeProvider
        attribute="class"
        defaultTheme={themeSettings.mode}
        forcedTheme={themeSettings.force ? themeSettings.mode : undefined}
        enableSystem={false}
        storageKey={THEME_STORAGE_KEY}
      >
        <AppThemeProvider mode={themeSettings.mode} force={themeSettings.force} syncNextThemes>
          <QueryProvider>
            <div
              data-admin-panel="true"
              data-admin-theme="center-admin"
              className={`min-h-screen max-w-[100vw] overflow-x-hidden ${sansFont.className}`}
              suppressHydrationWarning
            >
              {children}
              <AdminUIProvider />
            </div>
          </QueryProvider>
        </AppThemeProvider>
      </ThemeProvider>
    </>
  )
}
