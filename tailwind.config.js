/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pub: {
          ink: 'var(--pub-ink, #0f172a)',
          'ink-soft': 'var(--pub-ink-soft, #1e293b)',
          paper: 'var(--pub-paper, #f8fafc)',
          peach: 'var(--pub-peach, #eef2ff)',
          copper: 'var(--pub-copper, #4f46e5)',
          'copper-deep': 'var(--pub-copper-deep, #4338ca)',
          sage: 'var(--pub-sage, #6366f1)',
          muted: 'var(--pub-muted, #64748b)',
          line: 'var(--pub-line, #e2e8f0)',
          cream: 'var(--pub-cream, #ffffff)',
        },
        primary: {
          DEFAULT: '#4f46e5',
          dark: '#4338ca',
          light: '#6366f1',
          soft: '#eef2ff',
        },
        secondary: {
          DEFAULT: '#0f172a',
          dark: '#0b0f19',
          light: '#1e293b',
        },
        accent: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
          light: '#818cf8',
          soft: '#e0e7ff',
        },
        surface: {
          canvas: 'var(--cm-admin-bg, #f8fafc)',
          card: 'var(--cm-admin-surface, #ffffff)',
          muted: 'var(--cm-admin-surface-muted, #f1f5f9)',
          border: 'var(--cm-admin-border, #e2e8f0)',
        },
        admin: {
          bg: 'var(--cm-admin-bg, #f8fafc)',
          surface: 'var(--cm-admin-surface, #ffffff)',
          muted: 'var(--cm-admin-surface-muted, #f1f5f9)',
          border: 'var(--cm-admin-border, #e2e8f0)',
          text: 'var(--cm-admin-text, #0f172a)',
          subtle: 'var(--cm-admin-text-muted, #475569)',
          primary: 'var(--cm-admin-primary, #4f46e5)',
          accent: 'var(--cm-admin-accent, #6366f1)',
        },
        student: {
          bg: 'var(--cm-student-bg, #f8fafc)',
          surface: 'var(--cm-student-surface, #ffffff)',
          muted: 'var(--cm-student-surface-muted, #f1f5f9)',
          border: 'var(--cm-student-border, #e2e8f0)',
          navy: 'var(--cm-student-navy, #0f172a)',
          primary: 'var(--cm-student-primary, #4f46e5)',
        },
      },
      fontFamily: {
        sans: ['var(--cm-font-sans)', 'Outfit', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--cm-font-display)', 'Plus Jakarta Sans', 'Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--cm-font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: 'var(--cm-radius-xs, 6px)',
        sm: 'var(--cm-radius-sm, 8px)',
        md: 'var(--cm-radius-md, 12px)',
        lg: 'var(--cm-radius-lg, 16px)',
        xl: 'var(--cm-radius-xl, 22px)',
      },
      boxShadow: {
        'cm-xs': 'var(--cm-shadow-xs)',
        'cm-sm': 'var(--cm-shadow-sm)',
        'cm-md': 'var(--cm-shadow-md)',
        'cm-lg': 'var(--cm-shadow-lg)',
      },
    },
  },
  plugins: [],
}
