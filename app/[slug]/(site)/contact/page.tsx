import { redirect } from 'next/navigation'

/** Legacy contact URL — dedicated enquiry page is the public contact surface. */
export default function ContactPage({ params }: { params: { slug: string } }) {
  redirect(`/${params.slug}/enquiry`)
}
