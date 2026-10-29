import fs from 'fs'
import path from 'path'

const base = path.join(process.cwd(), 'app/[slug]')
const site = path.join(base, '(site)')

const pairs = [
  ['vacancies/page.tsx', 'vacancies/page.tsx'],
  ['courses/page.tsx', 'courses/page.tsx'],
  ['blog/[postSlug]/page.tsx', 'blog/[postSlug]/page.tsx'],
  ['category/[categoryId]/page.tsx', 'category/[categoryId]/page.tsx'],
  ['news/[id]/page.tsx', 'news/[id]/page.tsx'],
  ['program/[courseKey]/page.tsx', 'program/[courseKey]/page.tsx'],
]

for (const [from, to] of pairs) {
  const src = path.join(base, from)
  const dst = path.join(site, to)
  if (!fs.existsSync(src)) continue
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(src, dst)
  fs.rmSync(path.dirname(src), { recursive: true, force: true })
  console.log('copied', from)
}
