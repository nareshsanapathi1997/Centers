import fs from 'fs'
import path from 'path'

const siteRoot = path.join(process.cwd(), 'app/[slug]/(site)')

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name === 'page.tsx') files.push(full)
  }
  return files
}

for (const file of walk(siteRoot)) {
  if (file.includes(`${path.sep}contact${path.sep}`)) continue

  const original = fs.readFileSync(file, 'utf8')
  let src = original

  src = src.replace("\nimport Header from '@/components/Header'\n", '\n')
  src = src.replace("\nimport Footer from '@/components/Footer'\n", '\n')
  src = src.replace(/\s*<Header center=\{center\} \/>\s*\n?/g, '\n')
  src = src.replace(/\s*<Footer center=\{center\} \/>\s*\n?/g, '\n')

  if (src !== original) {
    fs.writeFileSync(file, src)
    console.log('updated:', path.relative(process.cwd(), file))
  }
}
