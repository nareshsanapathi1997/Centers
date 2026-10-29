import { describe, expect, it } from 'vitest'
import { sanitizeCmsHtml, sanitizeInlineHtml } from '@/lib/sanitize-html'

/**
 * These assert the payloads that matter rather than exercising DOMPurify: on a
 * shared multi-tenant host, script execution from a rich-text field runs against
 * every visitor of that center's site with the session cookie in scope.
 */
describe('sanitizeCmsHtml', () => {
  it('keeps the formatting the editors actually emit', () => {
    const html = '<p>Hello <strong>world</strong></p><ul><li>one</li></ul>'
    expect(sanitizeCmsHtml(html)).toBe(html)
  })

  it('keeps tables and iframe embeds', () => {
    expect(sanitizeCmsHtml('<table><tbody><tr><td>a</td></tr></tbody></table>')).toContain('<td>')
    expect(sanitizeCmsHtml('<iframe src="https://example.com/v"></iframe>')).toContain('<iframe')
  })

  it.each([
    ['script tag', '<script>alert(1)</script>'],
    ['img error handler', '<img src=x onerror="alert(1)">'],
    ['svg onload', '<svg onload="alert(1)"></svg>'],
    ['body onload', '<body onload="alert(1)">'],
    ['iframe srcdoc', '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
    ['form action', '<form action="/steal"><input name="a"></form>'],
    ['object data', '<object data="javascript:alert(1)"></object>'],
    ['style block', '<style>body{background:url("javascript:alert(1)")}</style>'],
  ])('strips %s', (_name, payload) => {
    const output = sanitizeCmsHtml(payload)
    expect(output).not.toMatch(/<script|onerror=|onload=|srcdoc=|<form|<object|<style/i)
  })

  it('strips a javascript: href while keeping the link text', () => {
    const output = sanitizeCmsHtml('<a href="javascript:alert(1)">click</a>')
    expect(output).not.toContain('javascript:')
    expect(output).toContain('click')
  })

  it('keeps an http and a mailto href', () => {
    expect(sanitizeCmsHtml('<a href="https://example.com">x</a>')).toContain('https://example.com')
    expect(sanitizeCmsHtml('<a href="mailto:a@b.com">x</a>')).toContain('mailto:a@b.com')
  })

  it.each([null, undefined, ''])('returns an empty string for %j', (value) => {
    expect(sanitizeCmsHtml(value)).toBe('')
  })
})

describe('sanitizeInlineHtml', () => {
  it('keeps inline emphasis', () => {
    expect(sanitizeInlineHtml('<strong>a</strong><em>b</em>')).toBe('<strong>a</strong><em>b</em>')
  })

  it('drops block layout and embeds', () => {
    const output = sanitizeInlineHtml('<div><p>a</p><iframe src="https://x"></iframe></div>')
    expect(output).not.toMatch(/<div|<p|<iframe/i)
    expect(output).toContain('a')
  })

  it('strips event handlers', () => {
    expect(sanitizeInlineHtml('<span onmouseover="alert(1)">a</span>')).not.toContain('onmouseover')
  })
})
