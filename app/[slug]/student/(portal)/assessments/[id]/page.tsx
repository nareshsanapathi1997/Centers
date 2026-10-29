import { redirect } from 'next/navigation'

/** Legacy take URL — focused exam lives outside the portal shell. */
export default function LegacyAssessmentTakeRedirect({
  params,
  searchParams,
}: {
  params: { slug: string; id: string }
  searchParams: { attemptId?: string }
}) {
  const q = searchParams.attemptId
    ? `?attemptId=${encodeURIComponent(searchParams.attemptId)}`
    : ''
  redirect(`/${params.slug}/student/exam/${params.id}${q}`)
}
