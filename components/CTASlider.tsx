import { getCTASliders } from '@/lib/api'
import { withBasePathHref } from '@/lib/with-base-path'

interface CTASliderProps {
  centerId: number
}

export default async function CTASlider({ centerId }: CTASliderProps) {
  const sliders = await getCTASliders(centerId)

  if (sliders.length === 0) return null

  return (
    <div className="ticker-wrap pt-4 pb-4">
      <div className="container">
        <div className="ticker">
          {sliders.map((slider) => (
            <a key={slider.id} href={withBasePathHref(slider.link_url || '#')} className="ticker__item">
              {slider.text}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

