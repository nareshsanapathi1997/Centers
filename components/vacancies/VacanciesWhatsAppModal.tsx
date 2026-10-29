'use client'

import CenterWhatsAppModal from '@/components/shared/CenterWhatsAppModal'
import type { CenterSharePayload } from '@/lib/center-location-share'

interface VacanciesWhatsAppModalProps {
  centerName?: string
  defaultPayload?: CenterSharePayload | null
}

/** Vacancies page wrapper around the shared Get Address on WhatsApp modal. */
export default function VacanciesWhatsAppModal({
  centerName,
  defaultPayload = null,
}: VacanciesWhatsAppModalProps) {
  const payload =
    defaultPayload ??
    (centerName
      ? {
          name: centerName,
        }
      : null)

  return <CenterWhatsAppModal defaultPayload={payload} />
}
