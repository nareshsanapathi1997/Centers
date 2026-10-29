import CenterImage from '@/components/ui/CenterImage'

interface HeroBackgroundImageProps {
  src: string
}

/**
 * Optimized hero backdrop (replaces CSS background-image for LCP / next/image).
 * Decorative — hidden from assistive tech.
 */
export default function HeroBackgroundImage({ src }: HeroBackgroundImageProps) {
  return (
    <div className="hero-bg-image" aria-hidden="true">
      <CenterImage
        src={src}
        alt=""
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />
    </div>
  )
}
