import { redirect } from 'next/navigation'

export default function CenterCoursesPage({ params }: { params: { slug: string } }) {
  redirect(`/${params.slug}#department`)
}
