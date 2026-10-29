import fs from 'fs'
import path from 'path'

const root = path.join(process.cwd(), 'app/super-admin')

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name === 'page.tsx') files.push(full)
  }
  return files
}

for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8')
  if (!src.includes('SuperAdminLayout')) continue

  src = src.replace(/\nimport SuperAdminLayout from '@\/components\/admin\/SuperAdminLayout'\n/, '\n')
  src = src.replace(/\s*<SuperAdminLayout title="[^"]*">\s*/g, '\n')
  src = src.replace(/\s*<\/SuperAdminLayout>\s*/g, '\n')

  fs.writeFileSync(file, src)
  console.log('updated:', path.relative(process.cwd(), file))
}
