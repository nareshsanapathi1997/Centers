'use client'

import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'

type Props = {
  content: string | null | undefined
  className?: string
  /** Use denser prose styles for passages */
  variant?: 'prompt' | 'passage' | 'directions' | 'option' | 'explanation'
}

/**
 * Render assessment HTML with KaTeX for $...$ / $$...$$ and safe table/image tags.
 * Content should already be sanitized on save; we sanitize again before inject.
 */
export default function AssessmentRichContent({
  content,
  className = '',
  variant = 'prompt',
}: Props) {
  const html = useMemo(() => {
    if (!content?.trim()) return ''
    // Sanitize author HTML first; KaTeX output is trusted and must not be re-stripped.
    const safe = sanitizeCmsHtml(content)
    return renderMathInHtml(safe)
  }, [content])

  if (!html) return null

  const base =
    variant === 'passage'
      ? 'assessment-rich assessment-rich--passage text-slate-800'
      : variant === 'directions'
        ? 'assessment-rich assessment-rich--directions text-slate-700'
        : variant === 'option'
          ? 'assessment-rich assessment-rich--option inline'
          : variant === 'explanation'
            ? 'assessment-rich assessment-rich--explanation text-slate-600'
            : 'assessment-rich assessment-rich--prompt text-slate-900'

  return (
    <div
      className={`${base} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function renderMathInHtml(input: string): string {
  // Protect code/pre blocks from math substitution
  const blocks: string[] = []
  const protectedHtml = input.replace(/<(code|pre)[\s\S]*?<\/\1>/gi, (match) => {
    const key = `@@MATHBLOCK${blocks.length}@@`
    blocks.push(match)
    return key
  })

  let out = protectedHtml
  // Display math $$...$$
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
    try {
      return katex.renderToString(String(tex).trim(), {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
      })
    } catch {
      return _m
    }
  })
  // Inline math $...$ (avoid $$ leftovers)
  out = out.replace(/\$([^$\n]+?)\$/g, (_m, tex) => {
    try {
      return katex.renderToString(String(tex).trim(), {
        displayMode: false,
        throwOnError: false,
        strict: 'ignore',
      })
    } catch {
      return _m
    }
  })

  blocks.forEach((block, i) => {
    out = out.replace(`@@MATHBLOCK${i}@@`, block)
  })
  return out
}
