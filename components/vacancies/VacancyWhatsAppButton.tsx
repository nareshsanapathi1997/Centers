import CenterWhatsAppButton from '@/components/shared/CenterWhatsAppButton'
import type { CenterSharePayload } from '@/lib/center-location-share'

interface VacancyWhatsAppButtonProps {
  /** Legacy: address-only share (website Jobs page). Prefer sharePayload. */
  address?: string
  sharePayload?: CenterSharePayload | null
  label?: string
  className?: string
  block?: boolean
}

export default function VacancyWhatsAppButton({
  address,
  sharePayload,
  label = 'Get Address on WhatsApp',
  className,
  block,
}: VacancyWhatsAppButtonProps) {
  const payload =
    sharePayload ??
    (address
      ? {
          address,
        }
      : null)

  return (
    <CenterWhatsAppButton
      sharePayload={payload}
      label={label}
      className={className}
      block={block}
    />
  )
}
