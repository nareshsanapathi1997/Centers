'use client'

import { useEffect, useMemo, useState } from 'react'
import { withBasePath } from '@/lib/with-base-path'
import { getDefaultImageUrl, handleImageLoadError } from '@/lib/image-utils'
import './AdminPanelLogo.css'

const DEFAULT_LIGHT = '/assets/img/logo.png'
const DEFAULT_DARK = '/assets/img/logo-white.png'

type AdminPanelLogoSize = 'sm' | 'md' | 'lg'

interface AdminPanelLogoProps {
  alt?: string
  size?: AdminPanelLogoSize
  logoLight?: string | null
  logoDark?: string | null
  className?: string
}

export default function AdminPanelLogo({
  alt = 'EduSphere',
  size = 'md',
  logoLight,
  logoDark,
  className = '',
}: AdminPanelLogoProps) {
  const [globalBranding, setGlobalBranding] = useState<{ logoLight: string; logoDark: string } | null>(
    null
  )

  useEffect(() => {
    let cancelled = false

    if (logoLight && logoDark) return

    fetch(withBasePath('/api/public/branding'), { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.logoLight && data?.logoDark) {
          setGlobalBranding(data)
        }
      })
      .catch(() => {
        // Fall back to defaults / props below.
      })

    return () => {
      cancelled = true
    }
  }, [logoLight, logoDark])

  const resolvedLight = useMemo(
    () =>
      getDefaultImageUrl(globalBranding?.logoLight || logoLight, DEFAULT_LIGHT) ??
      withBasePath(DEFAULT_LIGHT),
    [globalBranding?.logoLight, logoLight]
  )

  const resolvedDark = useMemo(
    () =>
      getDefaultImageUrl(globalBranding?.logoDark || logoDark, DEFAULT_DARK) ??
      withBasePath(DEFAULT_DARK),
    [globalBranding?.logoDark, logoDark]
  )

  return (
    <span className={`admin-panel-logo admin-panel-logo--${size} ${className}`.trim()}>
      <img
        src={resolvedLight}
        alt={alt}
        className="admin-panel-logo__light"
        onError={(event) => handleImageLoadError(event)}
      />
      <img
        src={resolvedDark}
        alt=""
        aria-hidden
        className="admin-panel-logo__dark"
        onError={(event) => handleImageLoadError(event)}
      />
    </span>
  )
}
