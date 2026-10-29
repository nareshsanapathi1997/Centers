import fs from 'fs'
import path from 'path'

const roots = [
  path.resolve('app', 'admin'),
  path.resolve('app', 'super-admin'),
]

const inputPatterns = [
  /className="w-full px-4 py-2\.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/g,
  /className="w-full px-4 py-2\.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/g,
  /className="w-full px-4 py-2\.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"/g,
  /className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"/g,
  /className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"/g,
  /className="w-full px-4 py-2\.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"/g,
]

const labelPattern =
  /className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"/g

const formSpacingPattern = /<form onSubmit=\{handleSubmit\} className="space-y-[45]">/g

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

let changed = 0
for (const root of roots) {
  for (const file of walk(root)) {
    let content = fs.readFileSync(file, 'utf8')
    const original = content

    for (const pattern of inputPatterns) {
      content = content.replace(pattern, 'className="admin-form-control"')
    }

    content = content.replace(labelPattern, 'className="admin-form-label"')
    content = content.replace(formSpacingPattern, '<form onSubmit={handleSubmit}>')
    content = content.replace(
      /<form onSubmit=\{handleSubmit\} className="p-6 space-y-4">/g,
      '<form onSubmit={handleSubmit}>'
    )
    content = content.replace(
      /<form onSubmit=\{handleSubmit\} className="space-y-4">/g,
      '<form onSubmit={handleSubmit}>'
    )

    if (content !== original) {
      fs.writeFileSync(file, content)
      changed += 1
      console.log('updated', file)
    }
  }
}

console.log(`Done. Updated ${changed} files.`)
