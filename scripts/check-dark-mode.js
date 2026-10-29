const fs = require('fs')
const path = require('path')

// Common patterns that need dark mode variants
const patternsToCheck = [
  { pattern: /bg-white(?!\s+dark:)/g, name: 'bg-white without dark mode' },
  { pattern: /bg-gray-50(?!\s+dark:)/g, name: 'bg-gray-50 without dark mode' },
  { pattern: /bg-gray-100(?!\s+dark:)/g, name: 'bg-gray-100 without dark mode' },
  { pattern: /text-gray-900(?!\s+dark:)/g, name: 'text-gray-900 without dark mode' },
  { pattern: /text-gray-800(?!\s+dark:)/g, name: 'text-gray-800 without dark mode' },
  { pattern: /text-gray-700(?!\s+dark:)/g, name: 'text-gray-700 without dark mode' },
  { pattern: /border-gray-200(?!\s+dark:)/g, name: 'border-gray-200 without dark mode' },
  { pattern: /border-gray-300(?!\s+dark:)/g, name: 'border-gray-300 without dark mode' },
]

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const issues = []
  
  patternsToCheck.forEach(({ pattern, name }) => {
    const matches = content.match(pattern)
    if (matches) {
      matches.forEach((match, index) => {
        const lines = content.substring(0, content.indexOf(match)).split('\n')
        const lineNumber = lines.length
        issues.push({
          line: lineNumber,
          pattern: name,
          match: match,
        })
      })
    }
  })
  
  return issues
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        walkDir(filePath, fileList)
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath)
    }
  })
  
  return fileList
}

console.log('Checking for dark mode support in pages...\n')

const appDir = path.join(__dirname, '..', 'app')
const files = walkDir(appDir)

const results = {}

files.forEach(file => {
  const issues = checkFile(file)
  if (issues.length > 0) {
    const relativePath = path.relative(path.join(__dirname, '..'), file)
    results[relativePath] = issues
  }
})

if (Object.keys(results).length === 0) {
  console.log('✅ All pages appear to have dark mode support!')
} else {
  console.log(`⚠️  Found ${Object.keys(results).length} files that may need dark mode fixes:\n`)
  
  Object.entries(results).forEach(([file, issues]) => {
    console.log(`📄 ${file}`)
    const grouped = {}
    issues.forEach(issue => {
      if (!grouped[issue.pattern]) {
        grouped[issue.pattern] = []
      }
      grouped[issue.pattern].push(issue.line)
    })
    
    Object.entries(grouped).forEach(([pattern, lines]) => {
      console.log(`   - ${pattern}: lines ${lines.slice(0, 5).join(', ')}${lines.length > 5 ? '...' : ''}`)
    })
    console.log()
  })
}
