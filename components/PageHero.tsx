import Link from 'next/link'

export interface BreadcrumbItem {
  label: string
  href?: string
  active?: boolean
}

interface PageHeroProps {
  eyebrow?: string
  title: string
  titleHighlight?: string
  titleMode?: 'default' | 'explore'
  subtitle?: string
  breadcrumbs: BreadcrumbItem[]
  backgroundImage?: string
}

export default function PageHero({
  eyebrow,
  title,
  titleHighlight,
  titleMode = 'default',
  subtitle,
  breadcrumbs,
}: PageHeroProps) {
  return (
    <section className="chapter-page-hero" aria-labelledby="chapter-page-title">
      <div className="pub-container">
        <nav aria-label="Breadcrumb">
          <ol className="chapter-breadcrumbs">
            {breadcrumbs.map((item, index) => (
              <li key={item.label + index} className="inline-flex items-center gap-1">
                {index > 0 && <i className="ri-arrow-right-s-line" aria-hidden="true" />}
                {item.href && !item.active ? (
                  <Link href={item.href}>{item.label}</Link>
                ) : (
                  <span aria-current={item.active ? 'page' : undefined}>{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="chapter-page-hero__body">
          <div>
            <span className="pub-eyebrow">
              {eyebrow || breadcrumbs[breadcrumbs.length - 1]?.label || 'Discover EduSphere'}
            </span>
            <h1 id="chapter-page-title">
              {titleMode === 'explore' ? (
                <>
                  Find your path in <em>{titleHighlight || title}.</em>
                </>
              ) : (
                <>
                  {title}
                  {titleHighlight && (
                    <>
                      {' '}
                      <em>{titleHighlight}</em>
                    </>
                  )}
                </>
              )}
            </h1>
            {subtitle && <p className="max-w-2xl text-lg text-pub-muted">{subtitle}</p>}
          </div>
          <div className="hidden text-right md:block" aria-hidden="true">
            <span className="block text-4xl text-pub-copper">✳</span>
            <small className="tracking-[0.18em] text-pub-muted">A NEW CHAPTER</small>
          </div>
        </div>
      </div>
    </section>
  )
}
