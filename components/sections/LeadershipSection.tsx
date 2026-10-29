import React from 'react'
import { getLeadership } from '@/lib/api'
import SafeImage from '@/components/website/PublicImage'
import type { Leadership } from '@/types'
import './LeadershipSection.css'

export interface LeadershipMember {
  id: number
  name: string
  role?: string
  designation?: string
  bio?: string | null
  message_title?: string | null
  message_content?: string | null
  description?: string | null
  image_url?: string | null
}

interface LeadershipSectionProps {
  centerId?: number
  centerName?: string
  leadership?: LeadershipMember[] | Leadership[]
  subtitle?: string
  title?: string
  description?: string
}

const FALLBACK_PORTRAITS = [
  '/assets/demo/woman-2.jpg',
  '/assets/demo/man-senior-1.jpg',
  '/assets/demo/woman-3.jpg',
  '/assets/demo/man-senior-2.jpg',
]

export default async function LeadershipSection({
  centerId,
  centerName,
  leadership: leadershipProp,
  subtitle = 'CENTRE LEADERSHIP',
  title = 'The person guiding this centre',
  description,
}: LeadershipSectionProps) {
  const leadership: LeadershipMember[] =
    leadershipProp ?? (centerId ? await getLeadership(centerId) : [])

  if (!leadership || leadership.length === 0) return null

  const single = leadership.length === 1
  const leadCopy =
    description ??
    (centerName
      ? `Academic planning, mentoring standards, and daily student support at ${centerName}.`
      : 'Academic planning, mentoring standards, and daily student support led directly on campus.')

  return (
    <section id="leadership" className="leadership-section pub-section">
      <div className="pub-container">
        <div className="leadership-section__head">
          <div>
            <p className="pub-eyebrow">{subtitle}</p>
            <h2 className="pub-h2 mt-2">{title}</h2>
          </div>
          {leadCopy && <p className="leadership-section__lead">{leadCopy}</p>}
        </div>

        <div className={`leadership-profile-grid ${single ? 'leadership-profile-grid--single' : ''}`}>
          {leadership.map((leader, index) => {
            const roleText = leader.role || leader.designation || 'Centre Director'
            const bioText =
              leader.message_content ||
              leader.bio ||
              leader.description ||
              'Leads academic quality, mentoring reviews, and student progress across batches at this centre.'
            return (
              <article key={leader.id} className="leadership-profile-card">
                <div className="leadership-profile-card__photo">
                  <SafeImage
                    src={leader.image_url}
                    fallbackSrc={FALLBACK_PORTRAITS[index % FALLBACK_PORTRAITS.length]}
                    alt={leader.name}
                    loading="eager"
                  />
                </div>
                <div className="leadership-profile-card__body">
                  <span className="leadership-profile-card__role">{roleText}</span>
                  <h3 className="leadership-profile-card__name">{leader.name}</h3>
                  {leader.message_title ? (
                    <p className="text-sm font-semibold text-pub-ink mb-2">{leader.message_title}</p>
                  ) : null}
                  <p className="leadership-profile-card__bio">{bioText}</p>
                  <div className="leadership-profile-card__meta">
                    <span><i className="ri-shield-check-line" aria-hidden="true" /> Direct academic oversight</span>
                    <span><i className="ri-calendar-check-line" aria-hidden="true" /> Weekly batch review</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
