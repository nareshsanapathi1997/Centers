import Link from 'next/link'
import { getGalleryImages } from '@/lib/api'
import type { GalleryImage } from '@/types'
import SectionHeading from '@/components/ui/SectionHeading'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import GallerySlider from './GallerySlider'

interface GallerySectionProps {
  centerId: number
  galleryImages?: GalleryImage[]
  viewAllHref?: string
}

export default async function GallerySection({
  centerId,
  galleryImages: galleryProp,
  viewAllHref,
}: GallerySectionProps) {
  const galleryImages = galleryProp ?? (await getGalleryImages(centerId))

  return (
    <section id="gallery" className="pub-section premium-section">
      <div className="pub-container">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            variant="lines"
            align="left"
            badge="Campus life"
            icon="ri-gallery-line"
            title={
              <>
                Inside the rooms where <span className="section-heading-highlight">preparation happens</span>
              </>
            }
            className="mb-0"
          />
          {viewAllHref && galleryImages.length > 0 ? (
            <Link href={viewAllHref} className="pub-btn shrink-0">
              View full gallery <i className="ri-arrow-right-line" />
            </Link>
          ) : null}
        </div>
        {galleryImages.length === 0 ? (
          <PublicEmptyState
            icon="ri-image-line"
            title="No gallery images yet"
            message="Photos from events and campus life will appear here once published."
          />
        ) : (
          <GallerySlider images={galleryImages.slice(0, 6)} layout="grid" />
        )}
      </div>
    </section>
  )
}
