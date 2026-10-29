import Script from 'next/script'
import TemplateStylesheetLinks from '@/components/TemplateStylesheetLinks'
import TemplateRuntime from '@/components/template/TemplateRuntime'
import { buildPublicThemeInitInlineScript, loadAppThemeSettings } from '@/lib/app-theme-settings'

/** Theme + icon font for public center pages. Visual system is Tailwind. */
export default async function CenterTemplateAssets() {
  const themeSettings = await loadAppThemeSettings()
  const themeInit = buildPublicThemeInitInlineScript(themeSettings)

  return (
    <>
      <TemplateStylesheetLinks />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            ${themeInit}
            (function () {
              var hash = window.location.hash;
              if (hash && hash !== '#') {
                try { window.history.scrollRestoration = 'manual'; } catch (e) {}
                window.scrollTo(0, 0);
                document.documentElement.setAttribute('data-hash-restore-pending', '1');
              }
            })();
          `,
        }}
      />
      <TemplateRuntime />
      <Script id="theme-toggle" strategy="afterInteractive">
        {`
          function setTheme(theme) {
            if (localStorage.getItem('cm-theme-force') === '1') {
              theme = localStorage.getItem('cm-theme-default') === 'dark' ? 'theme-dark' : 'theme-light';
            }
            var root = document.documentElement;
            if (theme === 'theme-dark') {
              root.setAttribute('data-theme', 'dark');
              root.classList.add('theme-dark', 'dark');
              root.classList.remove('theme-light');
              document.body.classList.add('dark-theme');
              localStorage.setItem('duch_theme', 'theme-dark');
              localStorage.setItem('cm-theme', 'dark');
            } else {
              root.setAttribute('data-theme', 'light');
              root.classList.remove('theme-dark', 'dark');
              root.classList.add('theme-light');
              document.body.classList.remove('dark-theme');
              localStorage.setItem('duch_theme', 'theme-light');
              localStorage.setItem('cm-theme', 'light');
            }
          }

          function toggleTheme() {
            if (localStorage.getItem('cm-theme-force') === '1') return;
            const slider = document.getElementById('slider');
            if (slider && slider.checked) {
              setTheme('theme-dark');
            } else {
              setTheme('theme-light');
            }
          }

          (function () {
            var forced = localStorage.getItem('cm-theme-force') === '1';
            var stored = localStorage.getItem('cm-theme');
            var dark = forced
              ? localStorage.getItem('cm-theme-default') === 'dark'
              : stored === 'dark' || localStorage.getItem('duch_theme') === 'theme-dark';
            setTheme(dark ? 'theme-dark' : 'theme-light');
            const slider = document.getElementById('slider');
            if (slider) slider.checked = dark;
          })();
        `}
      </Script>
    </>
  )
}
