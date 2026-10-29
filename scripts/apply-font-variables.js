/**
 * One-off: point the template stylesheet at the self-hosted font CSS variables
 * from `lib/template-fonts.ts`, keeping the original family name as a fallback
 * for anything rendered outside the variable scope.
 */
const fs = require('node:fs')
const path = require('node:path')

const FILE = path.join(__dirname, '..', 'public', 'assets', 'css', 'style.css')

const REPLACEMENTS = [
  ['"Roboto Condensed", sans-serif', 'var(--font-roboto-condensed), "Roboto Condensed", sans-serif'],
  ['"Source Sans Pro", sans-serif', 'var(--font-source-sans), "Source Sans Pro", sans-serif'],
]

let css = fs.readFileSync(FILE, 'utf8')
let total = 0

for (const [from, to] of REPLACEMENTS) {
  if (css.includes(to)) {
    console.log(`already applied: ${from}`)
    continue
  }
  const count = css.split(from).length - 1
  css = css.split(from).join(to)
  console.log(`${count} × ${from}`)
  total += count
}

fs.writeFileSync(FILE, css)
console.log(`\nUpdated ${total} declaration(s) in style.css`)
