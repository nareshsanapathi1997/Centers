import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import TeemsProgramGrid from '@/components/teems/TeemsProgramGrid'
import CentreFilterNav from '@/components/course/CentreFilterNav'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getWebsiteCatalogCourses } from '@/lib/website-catalog-courses'
import { getCatalogCategoryPageData } from '@/lib/course-master-catalog'
import { sortTeemsCoursesForDisplay } from '@/lib/teems-course-display'
import {
  applyBrandPrices,
  centreCounts,
  coursesForCentre,
  listActiveCentreOptions,
  resolveSelectedCentre,
} from '@/lib/centre-filter-db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'All courses – filter by centre',
  description: 'Browse every programme and filter by the centre near you to see what it offers and its fees.',
  alternates: { canonical: '/courses' },
}

export default async function WebsiteCoursesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const [catalog, heroBackgroundImage, options] = await Promise.all([
    getWebsiteCatalogCourses(),
    getHeroCommonBackgroundImageUrl(),
    listActiveCentreOptions(),
  ])
  const groups = [...catalog.collegeTab, ...catalog.school].filter((g) => (g.courseCount ?? 0) > 0)
  const loaded = await Promise.all(
    groups.map(async (g) => {
      const data = await getCatalogCategoryPageData(Number(g.course_category_id))
      return {
        id: g.course_category_id,
        name: g.course_category_name,
        courses: sortTeemsCoursesForDisplay(data.courses as Record<string, unknown>[], g.course_category_name),
      }
    }),
  )
  const all = loaded.flatMap((g) => g.courses)
  const { counts, sets } = await centreCounts(options, all)
  const sel = resolveSelectedCentre(options, searchParams?.centre, cookies().get('cm_last_centre')?.value)
  const selIdx = options.findIndex((o) => o.slug === sel)
  const selOpt = selIdx >= 0 ? options[selIdx] : null

  const shown = selOpt
    ? await Promise.all(
        loaded.map(async (g) => ({ ...g, courses: await coursesForCentre(g.courses, selOpt.id, sets[selIdx]) })),
      )
    : await Promise.all(loaded.map(async (g) => ({ ...g, courses: await applyBrandPrices(g.courses, options, sets) })))
  const visible = shown.filter((g) => g.courses.length)
  const total = visible.reduce((a, g) => a + g.courses.length, 0)

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }} className="pb-5">
        <PageHero
          titleMode="explore"
          title="All courses"
          titleHighlight="courses"
          subtitle={selOpt ? `Programmes offered at ${selOpt.label}, with that centre's fees` : 'Every programme across our centres'}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Courses', active: true },
          ]}
        />
        <div className="container pt-4 pt-lg-5">
          <CentreFilterNav
            options={options.map((o) => ({ slug: o.slug, label: o.label, count: counts[o.slug] }))}
            value={sel}
            allCount={all.length}
            summary={`${total} course${total === 1 ? '' : 's'}${selOpt ? ` at ${selOpt.label}` : ' across all centres'}`}
          />
          {visible.map((g) => (
            <section key={g.id} className="mb-5">
              <h2 className="content-title style1 mb-3">
                <Link href={`/courses/${g.id}${sel ? `?centre=${encodeURIComponent(sel)}` : ''}`}>{g.name}</Link>
              </h2>
              <TeemsProgramGrid courses={g.courses} centerSlug={sel} />
            </section>
          ))}
          {!visible.length ? (
            <TeemsProgramGrid courses={[]} centerSlug={sel} />
          ) : null}
        </div>
      </main>
      <BackToTopButton />
    </>
  )
}
