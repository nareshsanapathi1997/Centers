import SectionHeading from '@/components/ui/SectionHeading'
import type { WebsiteCatalogCoursesPayload } from '@/lib/website-catalog-courses'
import WebsiteCatalogCoursesTabs from '@/components/website/WebsiteCatalogCoursesTabs'

type WebsiteCoursesPageContentProps = {
  catalog: WebsiteCatalogCoursesPayload
  siteName: string
}

export default function WebsiteCoursesPageContent({
  catalog,
  siteName,
}: WebsiteCoursesPageContentProps) {
  return (
    <section className="hw-wrap style1 bg-albastor ptb-100 cp-section">
      <div className="pub-container container">
        <div className="exam-dir__head" style={{ marginBottom: '1.25rem' }}>
          <SectionHeading
            variant="lines"
            align="left"
            badge="Programme directory"
            title={<>A programme for your ambition.</>}
            description={`Find your exam and discover what you can study at ${siteName}.`}
            className="mb-0"
          />
        </div>
        <WebsiteCatalogCoursesTabs
          collegeTab={catalog.collegeTab}
          school={catalog.school}
          idPrefix="courses-page"
        />
      </div>
    </section>
  )
}
