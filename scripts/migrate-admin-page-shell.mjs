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
  if (!src.includes('if (loading)') || src.includes('AdminPageShell')) continue
  if (!src.includes("import AdminLayout from '@/components/admin/AdminLayout'")) continue

  src = src.replace(
    "import AdminLayout from '@/components/admin/AdminLayout'",
    "import AdminPageShell from '@/components/admin/AdminPageShell'"
  )

  const loadingMatch = src.match(
    /if \(loading\) \{\s*return \(\s*<AdminPageShell[\s\S]*?\)\s*\}\s*\n\s*return \(\s*<AdminPageShell([\s\S]*?)>\s*/
  )
  if (!loadingMatch) {
    const alt = src.match(
      /if \(loading\) \{\s*return \(\s*<AdminLayout([\s\S]*?)>\s*[\s\S]*?<\/AdminLayout>\s*\)\s*\}\s*\n\s*return \(\s*<AdminLayout\1>\s*/
    )
    if (!alt) {
      console.log('skip (pattern):', path.relative(process.cwd(), file))
      continue
    }
    const props = alt[1]
    src = src.replace(
      /if \(loading\) \{\s*return \(\s*<AdminLayout[\s\S]*?<\/AdminLayout>\s*\)\s*\}\s*\n\s*return \(\s*<AdminLayout\1>\s*/,
      `<AdminPageShell${props} loading={loading}>\n`
    )
    src = src.replace(/<\/AdminLayout>/g, '</AdminPageShell>')
    fs.writeFileSync(file, src)
    console.log('updated:', path.relative(process.cwd(), file))
    continue
  }

  console.log('skip (complex):', path.relative(process.cwd(), file))
}
