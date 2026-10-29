'use client'

import { withBasePath } from '@/lib/with-base-path'
import Link from 'next/link'
import { useState } from 'react'
import SafeImage from '@/components/website/PublicImage'
import { Center } from '@/types'
import CenterWhatsAppButton from '@/components/shared/CenterWhatsAppButton'
import { canShareCenterLocation, toCenterSharePayload } from '@/lib/center-location-share'

interface CentersGridProps {
  centers: Center[]
  centerId?: number
  linkToCenterSite?: boolean
}

export default function CentersGrid({
  centers,
  centerId,
  linkToCenterSite = false,
}: CentersGridProps) {
  const [search, setSearch] = useState('')
  const [openMapId, setOpenMapId] = useState<number | null>(null)

  const filteredCenters = centers.filter((center) =>
    [center.name, center.address]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  )
  const openCenter = filteredCenters.find((center) => center.id === openMapId) ?? null

  const trackClick = async (nearbyCenterId: number) => {
    if (!centerId) return
    try {
      await fetch(withBasePath('/api/analytics/track'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId,
          itemType: 'nearby_center',
          itemId: nearbyCenterId,
          actionType: 'click',
        }),
      })
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="centre-dir">
      <div className="chapter-directory-toolbar">
        <label className="chapter-search">
          <i className="ri-search-line" aria-hidden="true" />
          <span className="visually-hidden">Search centres</span>
          <input
            type="search"
            placeholder="Find a centre by city or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <p role="status" aria-live="polite">
          {filteredCenters.length} centre{filteredCenters.length === 1 ? '' : 's'} found
        </p>
      </div>

      {filteredCenters.length === 0 ? (
        <div className="public-empty-state">
          <h3>No centres match your search.</h3>
          <button type="button" className="pub-btn-ghost" onClick={() => setSearch('')}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="centre-dir__grid">
          {filteredCenters.map((center) => {
            const sharePayload = toCenterSharePayload(center)
            const showWhatsAppShare = canShareCenterLocation(sharePayload)
            const phones = center.phone?.filter(Boolean) ?? []

            return (
              <article key={center.id} className="centre-card">
                <figure className="centre-card__media">
                  <SafeImage
                    src={center.center_image_url || '/assets/img/center.jpg'}
                    alt={center.name}
                  />
                  {center.google_rating != null ? (
                    <span className="centre-card__rating">
                      <i className="ri-star-fill" aria-hidden />
                      {center.google_rating}
                    </span>
                  ) : null}
                </figure>
                <div className="centre-card__body">
                  <p className="pub-eyebrow">EduSphere centre</p>
                  <h3>{center.name}</h3>
                  {center.address ? <p className="centre-card__address">{center.address}</p> : null}
                  <ul className="centre-card__meta">
                    {phones.length > 0 ? (
                      <li>
                        <i className="ri-phone-line" aria-hidden />
                        <span>
                          {phones.map((phone, index) => (
                            <span key={phone}>
                              <a href={`tel:${phone}`}>{phone}</a>
                              {index < phones.length - 1 ? ', ' : null}
                            </span>
                          ))}
                        </span>
                      </li>
                    ) : null}
                    {center.email ? (
                      <li>
                        <i className="ri-mail-line" aria-hidden />
                        <a href={`mailto:${center.email}`}>{center.email}</a>
                      </li>
                    ) : null}
                    {center.working_hours ? (
                      <li>
                        <i className="ri-time-line" aria-hidden />
                        <span>{center.working_hours}</span>
                      </li>
                    ) : null}
                  </ul>
                  <div className="centre-card__actions">
                    {linkToCenterSite && center.slug ? (
                      <Link
                        href={`/${center.slug}`}
                        className="pub-btn"
                        onClick={() => trackClick(center.id)}
                      >
                        Visit centre <i className="ri-arrow-right-line" aria-hidden />
                      </Link>
                    ) : null}
                    {center.map_embed_url ? (
                      <button
                        type="button"
                        className="pub-btn-ghost"
                        onClick={() => {
                          trackClick(center.id)
                          setOpenMapId(center.id)
                        }}
                      >
                        View map
                      </button>
                    ) : null}
                    {showWhatsAppShare ? (
                      <CenterWhatsAppButton
                        sharePayload={sharePayload}
                        variant="center-card"
                        label="WhatsApp address"
                      />
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {openCenter?.map_embed_url ? (
        <div className="centre-map" role="dialog" aria-modal="true" aria-labelledby="centre-map-title">
          <button
            type="button"
            className="centre-map__backdrop"
            aria-label="Close map"
            onClick={() => setOpenMapId(null)}
          />
          <div className="centre-map__panel">
            <header>
              <div>
                <p className="pub-eyebrow">Location</p>
                <h2 id="centre-map-title">{openCenter.name}</h2>
              </div>
              <button type="button" className="pub-icon-btn" aria-label="Close map" onClick={() => setOpenMapId(null)}>
                <i className="ri-close-line" />
              </button>
            </header>
            <iframe
              src={openCenter.map_embed_url}
              title={`${openCenter.name} map`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
