'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { studentFetch } from '@/lib/student-api'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentEmptyState from '@/components/student/StudentEmptyState'
import StudentErrorState from '@/components/student/StudentErrorState'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function StudentInstallmentsPage() {
  const { centerId, centerSlug: slug } = useStudentPortal()

  const installmentsQuery = useQuery({
    queryKey: ['student', 'installments', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/installments?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load installments')
      return (data.installments || []) as any[]
    },
  })

  const installments = installmentsQuery.data ?? []
  const unpaid = installments.filter((i) => i.status === 'unpaid' || i.status === 'pending')
  const paid = installments.filter((i) => i.status === 'paid')

  return (
    <StudentPageFrame
      title="Installments"
      subtitle="Track your installment schedule and dues."
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'Installments' },
      ]}
      loading={installmentsQuery.isLoading}
      loadingLabel="Loading installments"
    >
      {installmentsQuery.isError ? (
        <StudentErrorState
          error={installmentsQuery.error}
          onRetry={() => void installmentsQuery.refetch()}
        />
      ) : installments.length === 0 ? (
        <StudentEmptyState
          icon={CalendarClock}
          title="No installment plans"
          message="Installment schedules linked to your enrollments will appear here."
        />
      ) : (
        <>
          {unpaid.length > 0 ? (
            <section>
              <h2 className="sp-section-label sp-section-label--warn">Pending ({unpaid.length})</h2>
              <div className="sp-stack">
                {unpaid.map((i) => (
                  <div key={i.id} className="sp-banner">
                    <div className="sp-item" style={{ padding: 0, border: 0 }}>
                      <div className="sp-item__main">
                        <h3 className="sp-item__title">{i.course_title}</h3>
                        <div className="sp-item__meta">
                          <span className="sp-chip">Installment #{i.installment_no}</span>
                          <span className="sp-chip">Receipt {i.receipt_no}</span>
                          {i.due_date ? (
                            <span className="sp-chip">
                              Due {new Date(i.due_date).toLocaleDateString('en-IN')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="sp-item__aside">
                        <span style={{ fontWeight: 800, color: 'var(--cm-warning, #b45309)' }}>
                          {formatCurrency(Number(i.amount))}
                        </span>
                        {i.course_slug || i.course_master_id ? (
                          <Link
                            href={`/${slug}/payment/${i.course_slug || i.course_master_id}`}
                            className="sp-btn sp-btn--primary sp-btn--sm"
                          >
                            Pay now
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {paid.length > 0 ? (
            <section className="sp-group">
              <div className="sp-group__head">
                <h2>Paid ({paid.length})</h2>
              </div>
              <div className="sp-group__body">
                {paid.map((i) => (
                  <div key={i.id} className="sp-item">
                    <div className="sp-item__main">
                      <p className="sp-item__title" style={{ fontSize: '0.9375rem' }}>
                        {i.course_title} — #{i.installment_no}
                      </p>
                      <p className="sp-item__desc">
                        Paid {i.paid_date ? new Date(i.paid_date).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </div>
                    <div className="sp-item__aside">
                      <span style={{ fontWeight: 700, color: 'var(--sp-success)' }}>
                        {formatCurrency(Number(i.paid_amount || i.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </StudentPageFrame>
  )
}
