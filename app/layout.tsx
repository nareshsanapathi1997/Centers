import { BRAND } from '@/lib/brand'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { templateFontVariables } from '@/lib/template-fonts'
import SiteChatWidget from '@/components/chat/SiteChatWidget'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:2500'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: BRAND.productName,
  description: `Center Management System for ${BRAND.name}`,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // The font variables sit on <html> because the template stylesheet sets
    // font-family on `body` itself, which a wrapper element could not reach.
    <html lang="en" className={templateFontVariables} suppressHydrationWarning>
      <head>
        {/* Global CSS will be loaded by individual layouts */}
      </head>
      <body suppressHydrationWarning>
        {children}
        <Suspense fallback={null}>
          <SiteChatWidget />
        </Suspense>
      </body>
    </html>
  )
}

