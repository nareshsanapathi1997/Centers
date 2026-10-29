import {
  canShareCenterLocation,
  encodeCenterSharePayload,
  type CenterSharePayload,
} from '@/lib/center-location-share'

interface CenterWhatsAppButtonProps {
  label?: string
  sharePayload?: CenterSharePayload | null
  className?: string
  block?: boolean
  /** Compact icon style for header/footer social links */
  variant?: 'button' | 'icon' | 'center-card'
}

export default function CenterWhatsAppButton({
  label = 'Get Address on WhatsApp',
  sharePayload,
  className = '',
  block = false,
  variant = 'button',
}: CenterWhatsAppButtonProps) {
  if (!sharePayload || !canShareCenterLocation(sharePayload)) return null

  const encoded = encodeCenterSharePayload(sharePayload)
  const isIcon = variant === 'icon'
  const isCenterCard = variant === 'center-card'

  const classes = isIcon
    ? `whatsapp-link get-address-whatsapp-link ${className}`.trim()
    : isCenterCard
      ? `get-address-whatsapp-link center-wa-btn ${className}`.trim()
      : [
          'get-address-whatsapp-link',
          'cp-vacancy-wa-btn',
          block ? 'cp-vacancy-wa-btn--block' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')

  return (
    <button
      type="button"
      className={classes}
      data-bs-toggle="modal"
      data-bs-target="#whatsappAddressModal"
      data-share-payload={encoded}
      aria-label={label}
    >
      <i className={isIcon ? 'ri-whatsapp-line' : 'ri-whatsapp-fill'} aria-hidden="true" />
      {!isIcon ? <span>{label}</span> : null}
    </button>
  )
}
