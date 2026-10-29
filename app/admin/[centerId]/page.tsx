import { redirect } from 'next/navigation'

/** Breadcrumbs link to /admin/{centerId}; send that to the dashboard. */
export default function AdminCenterIndex({ params }: { params: { centerId: string } }) {
  redirect(`/admin/${params.centerId}/dashboard`)
}
