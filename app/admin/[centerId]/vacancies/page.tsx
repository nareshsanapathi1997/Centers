'use client'

import AdminContentCrudPage from '@/components/admin/AdminContentCrudPage'
import { VACANCIES_CRUD } from '@/lib/admin-content-resource-registry'

export default function VacanciesPage({ params }: { params: { centerId: string } }) {
  return <AdminContentCrudPage centerId={params.centerId} resource={VACANCIES_CRUD} />
}
