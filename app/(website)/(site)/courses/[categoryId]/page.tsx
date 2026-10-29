import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import CategoryCoursesFilteredView from '@/components/teems/CategoryCoursesFilteredView'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'
import { getWebsiteCategoryGroup } from '@/lib/website-catalog-courses'
import { sortTeemsCoursesForDisplay } from '@/lib/teems-course-display'

export const revalidate = 120

export default async function WebsiteCategoryCoursesPage({
  params,
  searchParams,
}: {
  params: { categoryId: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const brandingCenter = await getWebsiteHomeBrandingCenter()
  if (!brandingCenter) notFound()

  const [categoryPayload, heroBackgroundImage] = await Promise.all([
    getWebsiteCategoryGroup(params.categoryId),
    getHeroCommonBackgroundImageUrl(),
  ])
  if (!categoryPayload) notFound()

  const { group, filters } = categoryPayload
  const title = group.course_category_name || 'Courses'
  const sectionTitle = `${title} programmes`

  const rawPage = searchParams?.page
  const pageParam = Array.isArray(rawPage) ? rawPage[0] : rawPage
  const parsed = parseInt(String(pageParam ?? '1'), 10)
  const initialPage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1

  const rawType = searchParams?.type
  const initialType = (Array.isArray(rawType) ? rawType[0] : rawType) ?? ''
  const rawSubType = searchParams?.subtype
  const initialSubType = (Array.isArray(rawSubType) ? rawSubType[0] : rawSubType) ?? ''

  const coursesWithTypeName = sortTeemsCoursesForDisplay(
    group.courses as Record<string, unknown>[],
    group.course_category_name
  )

  const categoryNumericId = group.course_category_id

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }} className="pb-5">
        <PageHero
          titleMode="explore"
          title={title}
          titleHighlight={title}
          subtitle="EduSphere — Tailored learning, comprehensive preparation – find the right course for your success"
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/#department' },
            { label: title, active: true },
          ]}
        />

        <div className="container pt-4 pt-lg-5">
          <CategoryCoursesFilteredView
            centerSlug={brandingCenter.slug}
            brandLinks
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
