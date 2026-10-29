import fs from 'fs'
import path from 'path'

const cssPath = path.join(process.cwd(), 'public/assets/css/center-overrides.css')
const splitLine = 1960 // 1-based: blog details and below load deferred

const lines = fs.readFileSync(cssPath, 'utf8').split(/\r?\n/)
const coreLines = lines.slice(0, splitLine - 1)
const deferredLines = lines.slice(splitLine - 1)

const corePath = path.join(process.cwd(), 'public/assets/css/center-overrides.css')
const deferredPath = path.join(process.cwd(), 'public/assets/css/center-overrides-deferred.css')

fs.writeFileSync(
  corePath,
  coreLines.join('\n') + (coreLines.length ? '\n' : ''),
)
fs.writeFileSync(
  deferredPath,
  deferredLines.join('\n') + (deferredLines.length ? '\n' : ''),
)

console.log(`Split center-overrides.css: ${coreLines.length} core + ${deferredLines.length} deferred lines`)
