import fs from 'fs'
import path from 'path'

const root = path.join(process.cwd(), 'app/admin/[centerId]')

function stripPageChrome(file) {
  let src = fs.readFileSync(file, 'utf8')
  let changed = false

  if (src.includes('AdminPageShell')) {
    src = src.replace(
      /<AdminPageShell[^>]*centerId=\{params\.centerId\}[^>]*loading=\{loading\}[^>]*>/g,
      '<AdminPageShell loading={loading}>'
    )
    src = src.replace(
      /<AdminPageShell[^>]*loading=\{loading\}[^>]*centerId=\{params\.centerId\}[^>]*>/g,
      '<AdminPageShell loading={loading}>'
    )
    src = src.replace(
      /<AdminPageShell\s+centerId=\{params\.centerId\}[^>]*>/g,
      '<AdminPageShell>'
    )
    changed = true
  }

  if (src.includes("import AdminLayout from '@/components/admin/AdminLayout'")) {
    src = src.replace(/\nimport AdminLayout from '@\/components\/admin\/AdminLayout'\n/, '\n')
    src = src.replace(
      /\s*<AdminLayout centerId=\{params\.centerId\} title="[^"]*"(?: backUrl=\{`[^`]+`\})?>\s*/g,
      '\n'
    )
    src = src.replace(/\s*<\/AdminLayout>\s*/g, '\n')
    changed = true
  }

  if (changed) {
    fs.writeFileSync(file, src)
    console.log('updated:', path.relative(process.cwd(), file))
  }
}

for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const page = path.join(root, dir.name, 'page.tsx')
  if (fs.existsSync(page)) stripPageChrome(page)
}
