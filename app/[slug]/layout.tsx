import type { ReactNode } from 'react'
import { getActiveCenterStaticParams } from '@/lib/center-static-params'

/**
 * Prebuild every active center slug in production so the first visitor is not
 * paying for a cold render + DB round-trip. Pages keep `revalidate = 120` for ISR.
 *
 * In development this returns [] — generating every /[slug]/* page through
 * Next workers OOMs Windows machines and then CSS/HMR 404s.
 */
export async function generateStaticParams() {
  return getActiveCenterStaticParams()
}

export const dynamicParams = true

export default function CenterSlugLayout({ children }: { children: ReactNode }) {
  return children
}
