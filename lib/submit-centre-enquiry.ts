import { withBasePath } from '@/lib/with-base-path'

export type SubmitCentreEnquiryPayload = {
  centerManagerId: number
  fullName: string
  phone: string
  email?: string
  courseName?: string
  message?: string
  formSource?: string
}

export async function submitCentreEnquiry(payload: SubmitCentreEnquiryPayload): Promise<void> {
  const response = await fetch(withBasePath('/api/enquiries/submit'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error || 'Failed to save enquiry to center database')
  }
}
