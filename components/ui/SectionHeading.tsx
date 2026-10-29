import type { ReactNode } from 'react'

export type SectionHeadingVariant =
  | 'stars'
  | 'icon-pill'
  | 'lines'
  | 'dots'
  | 'underline'
  | 'brackets'
  | 'ribbon'
  | 'gradient-ring'
  | 'about-left'

type SectionHeadingProps = {
  variant: SectionHeadingVariant
  badge: string
  title: ReactNode
  description?: ReactNode
  icon?: string
  align?: 'center' | 'left'
  as?: 'section-title' | 'content-title'
  className?: string
}

export default function SectionHeading({
  badge,
  title,
  description,
  icon,
  align = 'center',
  className = '',
}: SectionHeadingProps) {
  const isLeft = align === 'left'

  return (
    <div className={`${isLeft ? 'max-w-2xl' : 'mx-auto mb-6 max-w-3xl text-center'} ${className}`.trim()}>
      <p className={`pub-eyebrow ${isLeft ? '' : 'justify-center'}`}>
        {icon ? <i className={icon} aria-hidden="true" /> : null}
        {badge}
      </p>
      <h2 className="mt-2 font-display text-[clamp(1.55rem,3.2vw,2.45rem)] font-semibold leading-[1.12] tracking-tight text-inherit">
        {title}
      </h2>
      {description ? (
        <p className={`mt-2 text-[0.98rem] leading-relaxed text-pub-muted ${isLeft ? '' : 'mx-auto max-w-2xl'}`}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
