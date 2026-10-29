const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

/** Optional sub-path mount; empty = site root. */
function resolveBasePath() {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH
  if (raw == null || raw === '') return undefined
  const v = String(raw).trim().replace(/\/+$/, '')
  if (!v) return undefined
  return v.startsWith('/') ? v : `/${v}`
}

const basePath = resolveBasePath()

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optional isolated development cache for concurrent local previews.
  ...(process.env.NODE_ENV !== 'production' && process.env.CM_NEXT_DIST_DIR
    ? { distDir: process.env.CM_NEXT_DIST_DIR }
    : {}),
  ...(basePath ? { basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath ?? '',
  },
  // Keep `npm run lint` for ESLint; skip the long warning dump during production builds.
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mssql', 'tedious', 'dotenv'],
    optimizePackageImports: ['lucide-react'],
    webpackBuildWorker: false,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.parallelism = 1
      config.cache = false
    }
    if (isServer) {
      const prev = config.externals
      config.externals = [
        ...(Array.isArray(prev) ? prev : prev != null ? [prev] : []),
        ({ request }, callback) => {
          if (request === 'mssql' || request === 'tedious') {
            return callback(null, `commonjs ${request}`)
          }
          callback()
        },
      ]
    }
    return config
  },
  async rewrites() {
    return [{ source: '/uploads/:path*', destination: '/api/uploads/:path*' }]
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    unoptimized: false,
  },
  async headers() {
    return [
      {
        // Baseline hardening for every response.
        //
        // CSP allows 'unsafe-inline' and 'unsafe-eval' for scripts because the
        // Bootstrap-based public template and Next's dev runtime both require
        // them; tightening that needs a nonce-based setup and template rework.
        // The directives that matter most here are frame-ancestors (clickjacking)
        // and object-src 'none' (legacy plugin execution).
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.googletagmanager.com",
              // Fonts are self-hosted via next/font, so no font CDN is needed.
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "font-src 'self' data: https://cdn.jsdelivr.net",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' ws: wss: https://api.razorpay.com https://lumberjack.razorpay.com",
              "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://www.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
