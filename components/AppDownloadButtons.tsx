'use client'

import { BRAND } from '@/lib/brand'
import { MOBILE_APP_STORE_URL, MOBILE_PLAY_STORE_URL } from '@/lib/mobile-app-links'

interface AppDownloadButtonsProps {
  appStoreUrl?: string
  playStoreUrl?: string
}

export default function AppDownloadButtons({
  appStoreUrl: appStoreProp,
  playStoreUrl: playStoreProp,
}: AppDownloadButtonsProps) {
  const appStoreUrl = appStoreProp?.trim() || MOBILE_APP_STORE_URL
  const playStoreUrl = playStoreProp?.trim() || MOBILE_PLAY_STORE_URL
  if (!appStoreUrl && !playStoreUrl) return null

  return (
    <div className="mobile-apps-buttons">
      {appStoreUrl && (
      <a
        href={appStoreUrl}
        className="app-download-btn app-store-btn"
        aria-label={`Download ${BRAND.name} on the App Store`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <i className="ri-apple-fill"></i>
        <div className="app-btn-text">
          <span className="app-btn-label">Download on the</span>
          <span className="app-btn-name">App Store</span>
        </div>
      </a>
      )}
      {playStoreUrl && (
      <a
        href={playStoreUrl}
        className="app-download-btn google-play-btn"
        aria-label={`Get ${BRAND.name} on Google Play`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <i className="ri-android-fill"></i>
        <div className="app-btn-text">
          <span className="app-btn-label">Get it on</span>
          <span className="app-btn-name">Google Play</span>
        </div>
      </a>
      )}
    </div>
  )
}
