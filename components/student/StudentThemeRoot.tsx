import { AppThemeProvider } from '@/components/AppThemeProvider'
import {
  buildPublicThemeInitInlineScript,
  loadAppThemeSettings,
} from '@/lib/app-theme-settings'
import StudentThemeToggle from '@/components/student/StudentThemeToggle'

/** Shared theme shell for center + corporate student portal routes. */
export default async function StudentThemeRoot({ children }: { children: React.ReactNode }) {
  const themeSettings = await loadAppThemeSettings()

  return (
    <AppThemeProvider mode={themeSettings.mode} force={themeSettings.force}>
      <script
        dangerouslySetInnerHTML={{
          __html: buildPublicThemeInitInlineScript(themeSettings),
        }}
      />
      <div className="student-portal-root" data-theme-root="student">
        <div className="sp-theme-toggle-dock">
          <StudentThemeToggle />
        </div>
        {children}
      </div>
    </AppThemeProvider>
  )
}
