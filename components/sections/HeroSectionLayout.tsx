'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import type { HeroSlide } from '@/types'
import { HeroCarouselProvider } from './HeroCarouselContext'
import HeroEdgeNav from './HeroEdgeNav'
import HeroSlider from './HeroSlider'

interface HeroSectionLayoutProps {
  slides: HeroSlide[]
  centerId?: number
  centerName: string
  centerSlug?: string
  centerLocationLabel?: string
  showCenterBadge?: boolean
  heroBadgeBrand?: string
  heroBadgeTitle?: string
  children?: ReactNode
}

export default function HeroSectionLayout({
  slides,
  centerId,
  centerName,
  centerSlug,
  centerLocationLabel,
  showCenterBadge = true,
  heroBadgeBrand,
  heroBadgeTitle,
  children,
}: HeroSectionLayoutProps) {
  const location = (centerLocationLabel || centerName).trim()
  const base = showCenterBadge && centerSlug ? `/${centerSlug}` : ''
  const kicker = showCenterBadge
    ? `EduSphere ${location}`
    : `${heroBadgeBrand || 'EduSphere'} · ${heroBadgeTitle || 'Your ambition. Our expertise.'}`

  return (
    <HeroCarouselProvider>
      <div className="pub-container stage-hero__grid">
        <div className="stage-hero__copy">
          <p className="stage-hero__kicker">
            <span className="stage-hero__live" aria-hidden="true" />
            {kicker}
          </p>
          <h1 className="stage-hero__title">
            Your next chapter
            <br />
            starts <em>here.</em>
          </h1>
          <p className="stage-hero__lead">
            Serious exam preparation, mapped to a clear plan. Mentors, practice, and centre-level
            guidance — so everyday effort becomes exam-day confidence.
          </p>
          <div className="stage-hero__actions">
            <Link href={`${base}#department`} className="pub-btn">
              Find your programme <i className="ri-arrow-right-up-line" aria-hidden="true" />
            </Link>
            <button type="button" className="stage-hero__ghost" data-open-enquiry>
              Talk to a counsellor <i className="ri-chat-smile-3-line" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="stage-hero__media">
          <div className="stage-hero__frame">
            <div className="stage-hero__frame-top">
              <span>In the spotlight</span>
              <small>{slides.length ? 'Current campaigns' : 'Start here'}</small>
            </div>
            {slides.length ? (
              <div className="stage-hero__slides">
                <HeroSlider slides={slides} centerId={centerId} centerName={centerName} />
              </div>
            ) : (
              <div className="stage-hero__empty">
                <i className="ri-compass-discover-line" aria-hidden="true" />
                <h2>
                  A goal. A plan.
                  <br />
                  A place to begin.
                </h2>
                <p>Explore programmes and connect with the academic team.</p>
                <Link href={`${base}#department`} className="pub-btn">
                  Explore programmes <i className="ri-arrow-right-line" aria-hidden="true" />
                </Link>
              </div>
            )}
            <div className="stage-hero__frame-foot">
              <span>Preparation, with direction.</span>
              {slides.length > 1 ? <HeroEdgeNav /> : <i className="ri-arrow-right-up-line" aria-hidden="true" />}
            </div>
          </div>
          {children}
        </div>
      </div>

      <div className="pub-container">
        <div className="stage-hero__proof" aria-label="Why students choose EduSphere">
          <article>
            <strong>30+</strong>
            <span>Years of focused coaching</span>
          </article>
          <article>
            <strong>National</strong>
            <span>CAT, GATE, Bank, NEET &amp; more</span>
          </article>
          <article>
            <strong>1:1</strong>
            <span>Guidance from centre mentors</span>
          </article>
        </div>
      </div>
    </HeroCarouselProvider>
  )
}
