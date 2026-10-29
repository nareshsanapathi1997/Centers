import type { Metadata } from 'next'
import { getCenterBySlug } from '@/lib/api'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const center = await getCenterBySlug(params.slug)
  if (!center) {
    return { title: 'Vacancies' }
  }
  return {
    title: `Careers & Vacancies | ${center.name}`,
    description: `Open positions and career opportunities at ${center.name}.`,
  }
}

export default function VacanciesLayout({ children }: { children: React.ReactNode }) {
  return children
}
