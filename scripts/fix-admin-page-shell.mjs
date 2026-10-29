import fs from 'fs'
import path from 'path'

const root = path.join(process.cwd(), 'app/admin/[centerId]')
const pages = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(root, d.name, 'page.tsx'))
  .filter((f) => fs.existsSync(f))

for (const file of pages) {
  let src = fs.readFileSync(file, 'utf8')
  if (!src.includes('AdminPageShell') || !src.includes('AdminLayout')) continue

  src = src.replace(
    /if \(loading\) \{\s*return \(\s*<AdminLayout([\s\S]*?)>\s*[\s\S]*?<\/AdminPageShell>\s*\)\s*\}\s*\n\s*return \(\s*<AdminLayout\1>\s*/,
    '<AdminPageShell$1 loading={loading}>\n'
  )

  src = src.replace(/<AdminLayout/g, '<AdminPageShell')
  src = src.replace(/<\/AdminLayout>/g, '</AdminPageShell>')

  fs.writeFileSync(file, src)
  console.log('fixed:', path.relative(process.cwd(), file))
}
