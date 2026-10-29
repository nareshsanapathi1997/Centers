type SectionGraphicProps = {
  variant?: 'arc' | 'mesh' | 'orbit'
  className?: string
}

/** Restrained decorative SVG for major public sections. */
export default function SectionGraphic({ variant = 'arc', className = '' }: SectionGraphicProps) {
  const cls = `cm-section-graphic cm-section-graphic--${variant} ${className}`.trim()

  if (variant === 'mesh') {
    return (
      <svg className={cls} viewBox="0 0 640 220" fill="none" aria-hidden>
        <defs>
          <linearGradient id="cm-mesh-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4f46e5" stopOpacity="0.22" />
            <stop offset="1" stopColor="#6366f1" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path
          d="M0 160C90 70 180 40 280 88c90 44 140 90 220 70 70-18 110-70 140-120V220H0V160Z"
          fill="url(#cm-mesh-g)"
        />
      </svg>
    )
  }

  if (variant === 'orbit') {
    return (
      <svg className={cls} viewBox="0 0 280 280" fill="none" aria-hidden>
        <circle cx="140" cy="140" r="118" stroke="#4f46e5" strokeOpacity="0.18" strokeWidth="1.5" />
        <circle cx="140" cy="140" r="78" stroke="#6366f1" strokeOpacity="0.16" strokeWidth="1.5" />
        <circle cx="140" cy="22" r="5" fill="#4f46e5" fillOpacity="0.45" />
        <circle cx="236" cy="186" r="4" fill="#6366f1" fillOpacity="0.45" />
      </svg>
    )
  }

  return (
    <svg className={cls} viewBox="0 0 420 180" fill="none" aria-hidden>
      <path
        d="M12 150C78 62 168 28 258 72c62 30 96 18 150-28"
        stroke="#4f46e5"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <path
        d="M28 164C110 88 198 54 300 96"
        stroke="#6366f1"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
    </svg>
  )
}
