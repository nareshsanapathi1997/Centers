const path = require('node:path')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const { assertJwtSecretOnStartup } = require('./lib/assert-jwt-secret.js')
assertJwtSecretOnStartup()

const { createServer } = require('node:http')
const next = require('next')
const { Server } = require('socket.io')
const compression = require('compression')
const { setIO, roomFor } = require('./lib/socket-server.js')
const { identifySocket } = require('./lib/socket-auth.js')

const fs = require('node:fs')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3600', 10)

if (dev && process.env.NEXT_WEBPACK_PARALLELISM === undefined) {
  process.env.NEXT_WEBPACK_PARALLELISM = '1'
}

if (dev && !/\bmax-old-space-size=/.test(process.env.NODE_OPTIONS || '')) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--max-old-space-size=4096']
    .filter(Boolean)
    .join(' ')
}

if (dev && process.env.WIN32_CLEAN_NEXT_ON_START === '1') {
  const nextDir = path.join(__dirname, '.next')
  try {
    if (fs.existsSync(nextDir)) {
      fs.rmSync(nextDir, { recursive: true, force: true })
      console.log('[next] WIN32_CLEAN_NEXT_ON_START: removed .next')
    }
  } catch (e) {
    console.warn('[next] Could not remove .next:', e?.message || e)
  }
}

if (dev && process.platform === 'win32') {
  console.log(
    '[next] Windows dev: if you see "Cannot find module ./NNNN.js" or 404 on _next/static/chunks, stop the server and run: npm run dev:fresh (or set WIN32_CLEAN_NEXT_ON_START=1 in .env).'
  )
}

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

/**
 * gzip/deflate for HTML and JSON. `next start` does this for you, but this app
 * runs behind a custom server for Socket.IO, so responses went out uncompressed.
 *
 * Already-compressed payloads (images, zips, media) are skipped, and a response
 * can opt out with `x-no-compression`.
 */
const compress = compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false
    const type = String(res.getHeader('Content-Type') || '')
    if (
      /text\/event-stream/.test(type) ||
      /\/api\/(student\/tutor\/chat|public\/chat)/.test(String(req.url || ''))
    ) {
      return false
    }
    if (/^(image|video|audio)\//.test(type) || /zip|gzip|br$/.test(type)) return false
    return compression.filter(req, res)
  },
})

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    compress(req, res, () => handler(req, res))
  })
  const io = new Server(httpServer)

  setIO(io)

  // Reject unauthenticated handshakes: notifications are per-user, and an open
  // socket previously let anyone subscribe to every tenant's events.
  io.use((socket, next) => {
    const identity = identifySocket(socket.handshake)
    if (!identity) {
      return next(new Error('unauthorized'))
    }
    socket.data.identity = identity
    next()
  })

  io.on('connection', (socket) => {
    const { userType, userId } = socket.data.identity
    socket.join(roomFor(userType, userId))
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Socket.IO ready`)
    })
})
