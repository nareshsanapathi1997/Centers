const fs = require('fs')

const path = require('path').join(__dirname, '..', 'app', 'student-portal.css')

let css = fs.readFileSync(path, 'utf8')

const reps = [
  [/background:\s*#f1f5f9;/g, 'background: var(--sp-bg);'],
  [/background:\s*#f8fafc;/g, 'background: var(--sp-muted);'],
  [/background:\s*#fff;/g, 'background: var(--sp-surface);'],
  [/background:\s*#ffffff;/g, 'background: var(--sp-surface);'],
  [/background:\s*#eef2ff;/g, 'background: var(--sp-accent-soft);'],
  [/background:\s*#ecfdf5;/g, 'background: var(--sp-success-bg);'],
  [/background:\s*#fff7ed;/g, 'background: var(--sp-orange-soft);'],
  [/border:\s*3px solid #e2e8f0;/g, 'border: 3px solid var(--sp-border);'],
  [/border-bottom:\s*1px solid #f1f5f9;/g, 'border-bottom: 1px solid var(--sp-border-soft);'],
  [/border-top:\s*1px solid #f1f5f9;/g, 'border-top: 1px solid var(--sp-border-soft);'],
  [
    /background:\s*linear-gradient\(135deg, #fffbeb 0%, #fef3c7 100%\);/g,
    'background: linear-gradient(135deg, var(--sp-warning-bg) 0%, var(--sp-warning-bg-2) 100%);',
  ],
  [
    /background:\s*linear-gradient\(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%\);/g,
    'background: linear-gradient(90deg, var(--sp-skeleton-a) 25%, var(--sp-skeleton-b) 50%, var(--sp-skeleton-a) 75%);',
  ],
  [
    /background:\s*linear-gradient\(180deg, #f8fafc 0%, #f1f5f9 100%\);/g,
    'background: linear-gradient(180deg, var(--sp-muted) 0%, var(--sp-bg) 100%);',
  ],
]

let total = 0
for (const [re, to] of reps) {
  const matches = css.match(re)
  if (matches) total += matches.length
  css = css.replace(re, to)
}

fs.writeFileSync(path, css)
console.log(`Replaced ${total} light-only background/border declarations`)
