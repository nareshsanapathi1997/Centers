import fs from 'fs'
import path from 'path'

const root = path.resolve('app', 'admin')
const superRoot = path.resolve('app', 'super-admin')
const componentsRoot = path.resolve('components', 'admin')

const replacements = [
  [
    'flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 font-medium whitespace-nowrap',
    'admin-btn admin-btn--primary admin-btn--md whitespace-nowrap',
  ],
  [
    'flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-105 font-medium',
    'admin-btn admin-btn--primary admin-btn--md',
  ],
  [
    'flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-105 font-medium whitespace-nowrap',
    'admin-btn admin-btn--primary admin-btn--md whitespace-nowrap',
  ],
  [
    'px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200 font-medium',
    'admin-btn admin-btn--primary admin-btn--md',
  ],
  [
    'px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30 transition-all duration-200 font-medium',
    'admin-btn admin-btn--primary admin-btn--md',
  ],
  [
    'px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30 transition-all duration-200 font-medium',
    'admin-btn admin-btn--primary admin-btn--md',
  ],
  [
    'px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium',
    'admin-btn admin-btn--secondary admin-btn--md',
  ],
  [
    'px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium',
    'admin-btn admin-btn--secondary admin-btn--md',
  ],
  [
    'px-6 py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
    'admin-btn admin-btn--secondary admin-btn--md',
  ],
  [
    'px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
    'admin-btn admin-btn--secondary admin-btn--sm',
  ],
  [
    'px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2',
    'admin-btn admin-btn--primary admin-btn--sm',
  ],
  [
    'flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium',
    'admin-btn admin-btn--danger admin-btn--sm',
  ],
  [
    'flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium',
    'admin-btn admin-btn--success admin-btn--sm',
  ],
  [
    'flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium',
    'admin-btn admin-btn--warning admin-btn--sm',
  ],
  [
    'px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/30 transition-all duration-200 font-medium',
    'admin-btn admin-btn--success admin-btn--md',
  ],
  [
    'p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors',
    'admin-btn admin-btn--icon admin-btn--icon-edit',
  ],
  [
    'p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors',
    'admin-btn admin-btn--icon admin-btn--icon-danger',
  ],
  [
    'p-1.5 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors disabled:opacity-50',
    'admin-btn admin-btn--icon admin-btn--icon-edit disabled:opacity-50',
  ],
  [
    'p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50',
    'admin-btn admin-btn--icon admin-btn--icon-danger disabled:opacity-50',
  ],
  [
    'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2',
    'admin-btn admin-btn--primary admin-btn--sm',
  ],
  [
    'flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2',
    'admin-btn admin-btn--primary admin-btn--md flex-1',
  ],
  [
    'flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors',
    'admin-btn admin-btn--primary admin-btn--sm',
  ],
  [
    'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700',
    'admin-btn admin-btn--primary admin-btn--sm',
  ],
  [
    'flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200 font-medium',
    'admin-btn admin-btn--primary admin-btn--md',
  ],
  [
    'inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200 font-medium',
    'admin-btn admin-btn--primary admin-btn--md',
  ],
  [
    'flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/30 transition-all duration-200 hover:scale-105 font-medium whitespace-nowrap',
    'admin-btn admin-btn--success admin-btn--md whitespace-nowrap',
  ],
  [
    'flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 font-medium',
    'admin-btn admin-btn--primary admin-btn--md',
  ],
  [
    'flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed',
    'admin-btn admin-btn--primary admin-btn--md disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  [
    'flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium whitespace-nowrap',
    'admin-btn admin-btn--primary admin-btn--md whitespace-nowrap',
  ],
  [
    'px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 font-medium',
    'admin-btn admin-btn--primary admin-btn--md',
  ],
  [
    'px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium',
    'admin-btn admin-btn--secondary admin-btn--md',
  ],
  [
    'px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200 font-medium text-sm',
    'admin-btn admin-btn--primary admin-btn--sm',
  ],
  [
    'px-8 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 shadow-xl shadow-purple-500/40 transition-all duration-200 font-bold text-lg flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95',
    'admin-btn admin-btn--primary admin-btn--md disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  [
    'inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg',
    'admin-btn admin-btn--primary admin-btn--sm',
  ],
  [
    'flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors',
    'admin-btn admin-btn--primary admin-btn--sm',
  ],
  [
    'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg',
    'admin-btn admin-btn--primary admin-btn--sm',
  ],
  [
    'mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg',
    'admin-btn admin-btn--primary admin-btn--sm disabled:opacity-50',
  ],
  [
    'px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium',
    'admin-btn admin-btn--primary admin-btn--sm disabled:opacity-50',
  ],
  [
    'w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
    'admin-btn admin-btn--primary admin-btn--md w-full disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  [
    'inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors',
    'admin-btn admin-btn--primary admin-btn--md',
  ],
  [
    'w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    'admin-btn admin-btn--primary admin-btn--md w-full disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  [
    'flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs transition-colors',
    'admin-btn admin-btn--secondary admin-btn--xs',
  ],
  [
    'flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition-colors disabled:opacity-50',
    'admin-btn admin-btn--success admin-btn--xs disabled:opacity-50',
  ],
  [
    'flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition-colors disabled:opacity-50',
    'admin-btn admin-btn--danger admin-btn--xs disabled:opacity-50',
  ],
  [
    'w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600',
    'admin-btn admin-btn--secondary admin-btn--sm w-full',
  ],
  [
    'flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700',
    'admin-btn-group admin-btn-group--end pt-4 border-t border-gray-200 dark:border-gray-700',
  ],
]

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

const files = [
  ...walk(root),
  ...walk(superRoot),
  ...walk(componentsRoot),
].filter(
  (file) =>
    !file.endsWith('AdminButton.tsx') &&
    !file.endsWith('FormModalActions.tsx') &&
    !file.endsWith('BulkActions.tsx') &&
    !file.endsWith('Pagination.tsx') &&
    !file.endsWith('FormModal.tsx') &&
    !file.endsWith('AdminLayout.tsx') &&
    !file.endsWith('SuperAdminLayout.tsx')
)

let changed = 0
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  const original = content
  for (const [from, to] of replacements) {
    content = content.split(from).join(to)
  }
  if (content !== original) {
    fs.writeFileSync(file, content)
    changed += 1
    console.log('updated', file)
  }
}

console.log(`Done. Updated ${changed} files.`)
