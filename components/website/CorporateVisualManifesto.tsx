'use client'

import Link from 'next/link'

interface CorporateVisualManifestoProps {
  coursesHref?: string
  centersHref?: string
  resultsHref?: string
  aboutHref?: string
  centerName?: string
}

const PILLARS = [
  {
    step: '01',
    icon: 'ri-compass-3-line',
    title: 'Diagnostic & Track Mapping',
    text: 'We start with your target exam, current baseline, and attempt timeline before recommending a batch.',
  },
  {
    step: '02',
    icon: 'ri-book-open-line',
    title: 'Structured Concept & Drill Cycles',
    text: 'Every week pairs classroom teaching with timed topic drills and curated study material.',
  },
  {
    step: '03',
    icon: 'ri-bar-chart-box-line',
    title: 'Proctored Mock Analytics',
    text: 'Full-length mocks mirror real exam pressure, followed by question-by-question accuracy diagnostics.',
  },
  {
    step: '04',
    icon: 'ri-user-voice-line',
    title: '1-on-1 Faculty Mentoring',
    text: 'Dedicated mentors review weak areas weekly so no student falls behind silently.',
  },
]

export default function CorporateVisualManifesto({
  coursesHref = '/courses',
  resultsHref = '/results',
  aboutHref,
  centerName,
}: CorporateVisualManifestoProps) {
  const scope = centerName ? `at ${centerName}` : 'across every centre'

  return (
    <section className="pub-section chapter-method" aria-labelledby="corporate-visual-heading">
      <div className="pub-container">
        <div className="ink-panel">
          <div className="chapter-method__intro">
            <div>
              <p className="pub-eyebrow">HOW PREPARATION WORKS</p>
              <h2 id="corporate-visual-heading" className="pub-h2 mt-2">
                Ambition meets a clear direction.
              </h2>
            </div>
            <div>
              <p className="ink-panel__lead m-0">
                High-stakes exams reward rhythm over last-minute cramming. Our 4-stage academic cycle {scope} keeps preparation measurable from day one to exam day.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <Link href={coursesHref} className="pub-btn pub-btn--primary">
                  Explore courses <i className="ri-arrow-right-up-line" aria-hidden="true" />
                </Link>
                <Link href={aboutHref || resultsHref} className="pub-btn pub-btn--secondary">
                  {aboutHref ? 'About this centre' : 'Student outcomes'}
                </Link>
              </div>
            </div>
          </div>

          <ol className="chapter-method__steps mt-8">
            {PILLARS.map((item) => (
              <li key={item.step} className="chapter-method__card">
                <div className="chapter-method__step-top">
                  <span className="chapter-method__icon">
                    <i className={item.icon} aria-hidden="true" />
                  </span>
                  <span className="chapter-method__badge">STAGE {item.step}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
