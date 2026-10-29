/**
 * Reports icon-only <button>s that have no accessible name.
 *
 * A button whose entire content is an <Icon /> is announced by screen readers as
 * just "button", and its tooltip-less hover gives sighted keyboard users nothing
 * either. This finds them so an aria-label can be added.
 *
 * Intentionally a reporter, not a codemod: a useful label depends on what the
 * button does, which cannot be inferred from the icon reliably.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const FIX = process.argv.includes('--fix')

/** Icon component -> label, for the unambiguous cases only. */
const ICON_LABELS = {
  Trash2: 'Delete',
  Trash: 'Delete',
  Edit: 'Edit',
  Edit2: 'Edit',
  Edit3: 'Edit',
  Pencil: 'Edit',
  X: 'Close',
  XCircle: 'Close',
  Plus: 'Add',
  Eye: 'View',
  EyeOff: 'Hide',
  Copy: 'Copy',
  Download: 'Download',
  Upload: 'Upload',
  RefreshCw: 'Refresh',
  Search: 'Search',
  ChevronUp: 'Move up',
  ChevronDown: 'Move down',
  ArrowUp: 'Move up',
  ArrowDown: 'Move down',
  MoveUp: 'Move up',
  MoveDown: 'Move down',
  Save: 'Save',
  Check: 'Confirm',
  Menu: 'Open menu',
  Settings: 'Settings',
  ExternalLink: 'Open in new tab',
  Mail: 'Send email',
  Phone: 'Call',
  Star: 'Toggle featured',
  GripVertical: 'Drag to reorder',
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

/** Spans of `<button ...>...</button>`, tracking nesting so we cut at the right close tag. */
function findButtons(src) {
  const buttons = []
  const openRe = /<button(\s|>)/g
  let match

  while ((match = openRe.exec(src))) {
    const start = match.index
    // End of the opening tag, skipping '>' inside strings and braces.
    let i = start + '<button'.length
    let depth = 0
    let quote = null
    let tagEnd = -1

    for (; i < src.length; i++) {
      const ch = src[i]
      if (quote) {
        if (ch === quote) quote = null
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch
      else if (ch === '{') depth++
      else if (ch === '}') depth--
      else if (ch === '>' && depth === 0) {
        tagEnd = i
        break
      }
    }
    if (tagEnd === -1) continue

    const openTag = src.slice(start, tagEnd + 1)
    if (openTag.endsWith('/>')) {
      buttons.push({ start, tagEnd, openTag, body: '' })
      continue
    }

    // Matching </button>, accounting for nested buttons (rare, but cheap).
    let nest = 1
    let cursor = tagEnd + 1
    let bodyEnd = -1
    while (cursor < src.length) {
      const nextOpen = src.indexOf('<button', cursor)
      const nextClose = src.indexOf('</button>', cursor)
      if (nextClose === -1) break
      if (nextOpen !== -1 && nextOpen < nextClose) {
        nest++
        cursor = nextOpen + 7
        continue
      }
      nest--
      if (nest === 0) {
        bodyEnd = nextClose
        break
      }
      cursor = nextClose + 9
    }
    if (bodyEnd === -1) continue

    buttons.push({ start, tagEnd, openTag, body: src.slice(tagEnd + 1, bodyEnd) })
  }

  return buttons
}

/** True when the body has no text a screen reader could announce. */
function isIconOnly(body) {
  const withoutTags = body
    .replace(/<[^>]*>/g, ' ')
    // JSX expressions could contain text, so treat them as opaque content and
    // bail out rather than guess.
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (withoutTags.length > 0) return false
  // A {expression} child may render text; only flag pure element children.
  if (/\{(?!\/\*)/.test(body.replace(/className=\{[^}]*\}/g, ''))) return false
  return /<[A-Z]\w*/.test(body)
}

function iconIn(body) {
  const names = [...body.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1])
  return names.find((n) => ICON_LABELS[n])
}

let flagged = 0
let fixedCount = 0

for (const dir of ['app', 'components']) {
  for (const file of walk(path.join(ROOT, dir))) {
    let src = fs.readFileSync(file, 'utf8')
    const rel = path.relative(ROOT, file)
    const buttons = findButtons(src)
    const edits = []

    for (const button of buttons) {
      if (/aria-label[=\s]/.test(button.openTag)) continue
      if (/aria-labelledby[=\s]/.test(button.openTag)) continue
      if (!isIconOnly(button.body)) continue

      const line = src.slice(0, button.start).split('\n').length
      const icon = iconIn(button.body)

      if (icon && FIX) {
        edits.push({ button, label: ICON_LABELS[icon] })
      } else {
        console.log(`${rel}:${line}  ${icon ? `<${icon}>` : 'unknown icon'}`)
        flagged++
      }
    }

    if (!edits.length) continue

    // Apply from the end so earlier offsets stay valid.
    for (const edit of edits.reverse()) {
      const { button, label } = edit
      const insertAt = button.start + '<button'.length
      src = `${src.slice(0, insertAt)} aria-label="${label}"${src.slice(insertAt)}`
      fixedCount++
    }

    fs.writeFileSync(file, src)
    console.log(`fixed ${edits.length} in ${rel}`)
  }
}

if (FIX) console.log(`\n${fixedCount} aria-label(s) added`)
else console.log(`\n${flagged} icon-only button(s) without an accessible name`)
