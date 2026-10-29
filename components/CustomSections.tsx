import { getCustomSections } from '@/lib/api'
import { CustomSection } from '@/types'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'

interface CustomSectionsProps {
  centerId: number
}

export default async function CustomSections({ centerId }: CustomSectionsProps) {
  const sections = await getCustomSections(centerId)

  if (sections.length === 0) return null

  return (
    <>
      {sections.map((section) => (
        <section key={section.id} className={`custom-section custom-section-${section.section_type}`}>
          <div className="container">
            {section.title && <h2>{section.title}</h2>}
            {section.content && (
              <div dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(section.content) }} />
            )}
            {/* Render based on section_type */}
            {section.section_type === 'image_slider' && section.config && (
              <div className="image-slider">
                {/* Image slider implementation */}
              </div>
            )}
          </div>
        </section>
      ))}
    </>
  )
}

