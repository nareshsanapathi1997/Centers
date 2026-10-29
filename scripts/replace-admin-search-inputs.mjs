import fs from 'fs'
import path from 'path'

const searchPattern =
  /className="block w-full px-3 py-2\.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/g

const searchPattern2 =
  /className="block w-full max-w-md px-3 py-2\.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/g

const heavyInputPattern =
  /className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"/g

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

let changed = 0
for (const file of walk(path.resolve('app', 'admin'))) {
  let content = fs.readFileSync(file, 'utf8')
  const original = content
  content = content.replace(searchPattern, 'className="admin-search-control"')
  content = content.replace(searchPattern2, 'className="admin-search-control max-w-md"')
  content = content.replace(heavyInputPattern, 'className="admin-form-control"')
  if (content !== original) {
    fs.writeFileSync(file, content)
    changed++
    console.log('updated', file)
  }
}

console.log(`Done. Updated ${changed} files.`)
