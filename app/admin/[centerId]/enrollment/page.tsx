'use client'
import EnrollmentHub from '@/components/admin/enrollment/EnrollmentHub'

export default function CentreEnrollmentPage({ params }: { params: { centerId: string } }) {
  return <EnrollmentHub mode="centre" centerId={Number(params.centerId)} />
}
