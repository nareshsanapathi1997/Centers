import { notFound } from 'next/navigation'
import { getCenterBySlug } from '@/lib/api'
import { teemsCityFromCenterSlug } from '@/lib/center-mssql-city'
import { getCenterCategoryGroupForCenter } from '@/lib/center-catalog-courses'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import CategoryCoursesFilteredView from '@/components/teems/CategoryCoursesFilteredView'
import { sortTeemsCoursesForDisplay } from '@/lib/teems-course-display'
import { buildTeemsCategorySectionTitle } from '@/lib/teems-category-section-title'

export const revalidate = 120

export default async function CenterCategoryCoursesPage({
  params,
  searchParams,
}: {
  params: { slug: string; categoryId: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const [categoryPayload, heroBackgroundImage] = await Promise.all([
    getCenterCategoryGroupForCenter(center.id, params.categoryId),
    getHeroCommonBackgroundImageUrl(),
  ])
  if (!categoryPayload) notFound()

  const { group, filters } = categoryPayload
  const title = group.course_category_name || 'Courses'
  const cityLabel = teemsCityFromCenterSlug(params.slug)
  const sectionTitle = buildTeemsCategorySectionTitle(params.slug, group.course_category_name)
  const heroSubtitle = `EduSphere ${cityLabel} – Tailored learning, comprehensive preparation – find the right course for your success`

  const rawPage = searchParams?.page
  const pageParam = Array.isArray(rawPage) ? rawPage[0] : rawPage
  const parsed = parseInt(String(pageParam ?? '1'), 10)
  const initialPage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1

  const rawType = searchParams?.type
  const initialType = (Array.isArray(rawType) ? rawType[0] : rawType) ?? ''
  const rawSubType = searchParams?.subtype
  const initialSubType = (Array.isArray(rawSubType) ? rawSubType[0] : rawSubType) ?? ''

  let coursesWithTypeName = sortTeemsCoursesForDisplay(
    group.courses as Record<string, unknown>[],
    group.course_category_name
  )

  const categoryNumericId = group.course_category_id

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          titleMode="explore"
          title={title}
          titleHighlight={title}
          subtitle={heroSubtitle}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${params.slug}` },
            { label: 'Courses', href: `/${params.slug}#department` },
            { label: title, active: true },
          ]}
        />

        <div className="pub-container pub-section">
          <CategoryCoursesFilteredView
            centerSlug={params.slug}
            categoryId={params.categoryId}
            sectionTitle={sectionTitle}
            courses={coursesWithTypeName as Record<string, unknown>[]}
            typeRows={filters.typeRows}
            subTypesByTypeId={filters.subTypesByTypeId}
            typeNameByIdEntries={filters.typeNameByIdEntries}
            categoryNumericId={
              typeof categoryNumericId === 'number' && Number.isFinite(categoryNumericId)
                ? categoryNumericId
                : null
            }
            initialType={initialType}
            initialSubType={initialSubType}
            initialPage={initialPage}
          />
        </div>
      </main>
      <BackToTopButton />
    </>
  )
}
