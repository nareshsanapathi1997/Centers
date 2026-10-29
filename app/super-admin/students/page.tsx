'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { FormProvider } from 'react-hook-form'
import { z } from 'zod'
import { superAdminFetch } from '@/lib/super-admin-api'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { FormInput, FormSelect, useZodForm } from '@/components/forms'
import { ChartContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, chartAxisTick, chartGridStroke } from '@/components/charts'
import { GraduationCap, IndianRupee, Users } from 'lucide-react'

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

interface CenterOption {
  id: number
  name: string
}

type PageInfo = { page: number; pageSize: number; total: number; totalPages: number }

type StudentsResponse = {
  students: any[]
  pagination: PageInfo | null
}

const PAGE_SIZE = 25

const filterSchema = z.object({
  search: z.string(),
  centerId: z.string(),
})

export default function SuperAdminStudentsPage() {
  const [page, setPage] = useState(1)
  const form = useZodForm(filterSchema, {
    defaultValues: { search: '', centerId: '' },
  })
  const search = form.watch('search')
  const centerId = form.watch('centerId')

  useEffect(() => {
    setPage(1)
  }, [search, centerId])

  const centersQuery = useQuery({
    queryKey: ['super-admin', 'centers-options'],
    queryFn: async (): Promise<CenterOption[]> => {
      const res = await superAdminFetch('/api/public/centers')
      const data = await res.json()
      return data.centers || []
    },
    staleTime: 60_000,
  })

  const studentsQuery = useQuery({
    queryKey: ['super-admin', 'students', { page, search, centerId }],
    queryFn: async (): Promise<StudentsResponse> => {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (search.trim()) qs.set('search', search.trim())
      if (centerId) qs.set('centerId', centerId)

      const res = await superAdminFetch(`/api/super-admin/students?${qs}`, { headers: authHeaders() })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `Request failed (${res.status})`)
      }

      const data = await res.json()
      return {
        students: data.students || [],
        pagination: data.pagination ?? null,
      }
    },
  })

  const analyticsQuery = useQuery({
    queryKey: ['super-admin', 'students-analytics', centerId],
    queryFn: async () => {
      const qs = centerId ? `?centerId=${centerId}` : ''
      const res = await superAdminFetch(`/api/super-admin/students/analytics${qs}`, {
        headers: authHeaders(),
      })
      if (!res.ok) return null
      return res.json()
    },
  })

  const students = studentsQuery.data?.students ?? []
  const pageInfo = studentsQuery.data?.pagination ?? null
  const analytics = analyticsQuery.data
  const centers = centersQuery.data ?? []

  const chartData = useMemo(() => {
    const byCenter = analytics?.byCenter
    if (!Array.isArray(byCenter)) return []
    return byCenter.slice(0, 8).map((row: { name?: string; student_count?: number }) => ({
      name: String(row.name || 'Center').slice(0, 12),
      students: Number(row.student_count ?? 0),
    }))
  }, [analytics])

  const columns: AdminTableColumn<any>[] = [
    { key: 'center_name', header: 'Center', sortValue: (s) => s.center_name, render: (s) => s.center_name },
    {
      key: 'regno',
      header: 'Reg No',
      sortValue: (s) => s.regno,
      cellClassName: 'font-mono text-xs',
      render: (s) => s.regno,
    },
    { key: 'full_name', header: 'Name', sortValue: (s) => s.full_name, render: (s) => s.full_name },
    { key: 'mobile', header: 'Mobile', render: (s) => s.mobile },
    {
      key: 'payment_count',
      header: 'Payments',
      align: 'right',
      sortValue: (s) => Number(s.payment_count),
      render: (s) => s.payment_count,
    },
    {
      key: 'is_active',
      header: 'Status',
      sortValue: (s) => (s.is_active ? 1 : 0),
      render: (s) => (
        <span className={`admin-badge ${s.is_active ? 'admin-badge-success' : 'admin-badge-danger'}`}>
          {s.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <>
          <Link
            href={`/admin/${s.center_id}/students`}
            className="mr-3 text-sm text-primary hover:underline"
          >
            Manage
          </Link>
          <a
            href={`/${s.center_slug}/student/login`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Portal
          </a>
        </>
      ),
    },
  ]

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <GraduationCap className="h-7 w-7" />
              Student Portal Accounts (All Centers)
            </span>
          }
          description="Cross-center view of student login accounts and payment analytics."
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Students' },
          ]}
        />

        {analyticsQuery.isLoading && !analytics ? (
          <LoadingSkeleton variant="cards" rows={3} />
        ) : null}

        {analytics?.totals && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="admin-card flex items-center gap-3 p-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{analytics.totals.students}</p>
                <p className="text-sm text-[var(--cm-color-text-muted)]">Student accounts</p>
              </div>
            </div>
            <div className="admin-card flex items-center gap-3 p-4">
              <IndianRupee className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  ₹{Number(analytics.totals.revenue || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-[var(--cm-color-text-muted)]">Completed payments</p>
              </div>
            </div>
            <div className="admin-card p-4">
              <p className="text-2xl font-bold">{analytics.totals.payments}</p>
              <p className="text-sm text-[var(--cm-color-text-muted)]">Payment records</p>
            </div>
          </div>
        )}

        {chartData.length > 0 ? (
          <ChartContainer title="Students by center" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
              <XAxis dataKey="name" tick={chartAxisTick} />
              <YAxis allowDecimals={false} tick={chartAxisTick} />
              <Tooltip />
              <Bar dataKey="students" fill="var(--cm-color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : null}

        <FormProvider {...form}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <FormInput
                name="search"
                placeholder="Search student, mobile, center…"
                className="w-full"
                aria-label="Search students"
              />
            </div>
            <FormSelect name="centerId" className="max-w-xs" aria-label="Filter by center">
              <option value="">All centers</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FormSelect>
          </div>
        </FormProvider>

        <div className="admin-card overflow-hidden">
          <AdminDataTable
            columns={columns}
            rows={students}
            rowKey={(s) => s.id}
            loading={studentsQuery.isLoading}
            error={studentsQuery.error}
            onRetry={() => void studentsQuery.refetch()}
            caption="Student portal accounts"
            emptyMessage="No student accounts found."
            emptyIcon={<GraduationCap className="h-12 w-12" />}
          />

          {pageInfo && pageInfo.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--cm-color-border)] px-6 py-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageInfo.page <= 1 || studentsQuery.isLoading}
                className="admin-btn admin-btn--sm"
              >
                Previous
              </button>
              <span className="text-sm text-[var(--cm-color-text-muted)]">
                Page {pageInfo.page} of {pageInfo.totalPages} · {pageInfo.total} accounts
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={pageInfo.page >= pageInfo.totalPages || studentsQuery.isLoading}
                className="admin-btn admin-btn--sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </SuperAdminPageShell>
  )
}
