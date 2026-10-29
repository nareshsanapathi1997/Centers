/**
 * Free the dev port before starting server.js (avoids EADDRINUSE on Windows).
 * Uses PORT from .env / .env.local, default 3600.
 */
const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { execSync } = require('node:child_process')

const port = String(process.env.PORT || '3600').trim()

function killWindowsPort(p) {
  try {
    const out = execSync(`netstat -ano | findstr :${p}`, { encoding: 'utf8' })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        console.log(`Freed port ${p} (stopped PID ${pid})`)
      } catch {
        /* already gone */
      }
    }
    if (pids.size === 0) console.log(`Port ${p} is free`)
  } catch {
    console.log(`Port ${p} is free`)
  }
}

function killUnixPort(p) {
  try {
    execSync(`lsof -ti:${p} | xargs -r kill -9`, { stdio: 'inherit', shell: true })
    console.log(`Freed port ${p}`)
  } catch {
    console.log(`Port ${p} is free`)
  }
}

if (process.platform === 'win32') killWindowsPort(port)
else killUnixPort(port)
