import { Plus_Jakarta_Sans, Outfit } from 'next/font/google'

/**
 * EduSphere Academy typography:
 * - Plus Jakarta Sans for geometric display headings (mapped to --font-roboto-condensed for template compatibility)
 * - Outfit for crisp UI, body copy, and tabular numerals (mapped to --font-source-sans)
 */
export const displayFont = Plus_Jakarta_Sans({
  weight: ['500', '600', '700', '800'],
  style: ['normal'],
  subsets: ['latin'],
  variable: '--font-roboto-condensed',
  display: 'swap',
  preload: true,
})

export const sansFont = Outfit({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap',
  preload: true,
})

export const templateFontVariables = `${displayFont.variable} ${sansFont.variable}`
export const templateFontVariableClassNames = templateFontVariables
