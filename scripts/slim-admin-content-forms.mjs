import fs from 'fs'
import path from 'path'

const contentPages = [
  'news',
  'blog',
  'results',
  'testimonials',
  'leadership',
  'hero',
  'gallery',
  'custom-sections',
  'cta-sliders',
  'senior-faculty',
  'student-stories',
  'vacancies',
  'faq',
  'about',
  'centers',
]

const replacements = [
  [
    /className="admin-btn-group admin-btn-group--end pt-4 border-t border-gray-200 dark:border-gray-700"/g,
    'className="admin-form-actions"',
  ],
  [
    /className="grid grid-cols-1 md:grid-cols-2 gap-4"/g,
    'className="admin-form-row admin-form-row--2"',
  ],
  [
    /className="grid grid-cols-2 gap-4"/g,
    'className="admin-form-row admin-form-row--2"',
  ],
  [
    /className="grid grid-cols-1 sm:grid-cols-2 gap-4"/g,
    'className="admin-form-row admin-form-row--2"',
  ],
  [
    /className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700\/50 rounded-xl"/g,
    'className="admin-form-checkgroup admin-form-checkgroup--3"',
  ],
  [
    /className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700\/50 rounded-xl w-full"/g,
    'className="admin-form-checkgroup"',
  ],
  [
    /className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700\/50 rounded-xl"/g,
    'className="admin-form-checkgroup"',
  ],
  [
    /className="flex items-center gap-3 cursor-pointer"/g,
    'className="admin-form-check"',
  ],
  [
    /className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"/g,
    '',
  ],
  [
    /className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/g,
    '',
  ],
  [
    /<span className="text-sm font-medium text-gray-700 dark:text-gray-300">/g,
    '<span>',
  ],
  [
    /htmlFor="([^"]+)" className="text-sm font-medium text-gray-700 dark:text-gray-300"/g,
    'htmlFor="$1" className="admin-form-check"',
  ],
  [
    /className="block text-sm font-medium mb-1"/g,
    'className="admin-form-label"',
  ],
  [
    /className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"/g,
    'className="admin-form-label"',
  ],
  [
    /className="w-full px-4 py-2\.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/g,
    'className="admin-form-control"',
  ],
  [
    /className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"/g,
    'className="admin-form-control"',
  ],
  [
    /onChange=\{\(e\) => setFormData\(\{ \.\.\.formData, is_new: e\.target\.checked \}\)\}\s+\/>/g,
    'onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}\n              />',
  ],
  [
    /className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/g,
    'className="admin-form-control"',
  ],
  [
    /className="p-4 bg-purple-50 dark:bg-purple-900\/20 rounded-xl border border-purple-200 dark:border-purple-800"/g,
    'className="admin-form-notice"',
  ],
  [
    /className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2"/g,
    'className="flex items-center gap-2"',
  ],
  [
    /<div className="space-y-5">/g,
    '<div className="admin-form">',
  ],
  [
    /className="mt-2 text-xs text-gray-500 dark:text-gray-400"/g,
    'className="admin-form-hint"',
  ],
  [
    /className="mb-2 text-xs text-amber-700 dark:text-amber-400"/g,
    'className="admin-form-hint"',
  ],
  [
    /className="flex justify-end gap-3 pt-2"/g,
    'className="admin-form-actions"',
  ],
  [
    /className="flex items-end pb-2"/g,
    'className="admin-form-field admin-form-field--inline-end"',
  ],
  [
    /className="flex items-end"/g,
    'className="admin-form-field admin-form-field--inline-end"',
  ],
]

let changed = 0

for (const page of contentPages) {
  const file = path.resolve('app', 'admin', '[centerId]', page, 'page.tsx')
  if (!fs.existsSync(file)) continue

  let content = fs.readFileSync(file, 'utf8')
  const original = content

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement)
  }

  content = content.replace(
    /<label className="flex items-center gap-2 cursor-pointer">\s*<input/g,
    '<label className="admin-form-check">\n                <input'
  )

  if (content !== original) {
    fs.writeFileSync(file, content)
    changed += 1
    console.log('updated', file)
  }
}

console.log(`Done. Updated ${changed} content pages.`)
