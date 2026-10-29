'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, Download, Loader2 } from 'lucide-react'
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

function statusBadge(status: string) {
  if (status === 'completed') return 'sp-badge sp-badge--ok'
  if (status === 'pending') return 'sp-badge sp-badge--warn'
  if (status === 'failed') return 'sp-badge sp-badge--danger'
  return 'sp-badge sp-badge--neutral'
}

export default function StudentPaymentsPage() {
  const { centerId, centerSlug: slug } = useStudentPortal()
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [receiptError, setReceiptError] = useState('')

  const paymentsQuery = useQuery({
    queryKey: ['student', 'payments', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/payments?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load payments')
      return (data.payments || []) as any[]
    },
  })

  const downloadReceipt = async (payment: { id: number; receipt_no?: string }) => {
    setReceiptError('')
    setDownloadingId(payment.id)
    try {
      const res = await studentFetch(
        `/api/student/payments/${payment.id}/receipt?centerId=${centerId}&download=1`,
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setReceiptError(data.error || 'Could not download receipt')
        return
      }
      const html = await res.text()
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const filename = `${String(payment.receipt_no || `payment-${payment.id}`).replace(/[^\w.-]+/g, '_')}.html`
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setReceiptError('Could not download receipt. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const payments = paymentsQuery.data ?? []

  return (
    <StudentPageFrame
      title="Payment History"
      subtitle="All your fee payments and receipts."
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'Payments' },
      ]}
      loading={paymentsQuery.isLoading}
      loadingLabel="Loading payments"
    >
      {paymentsQuery.isError ? (
        <StudentErrorState
          error={paymentsQuery.error}
          onRetry={() => void paymentsQuery.refetch()}
        />
      ) : null}
      {receiptError ? (
        <div className="sp-alert sp-alert--error" role="alert">
          {receiptError}
        </div>
      ) : null}

      {!paymentsQuery.isError && payments.length === 0 ? (
        <StudentEmptyState
          icon={CreditCard}
          title="No payments yet"
          message="Completed fee payments and receipts will appear here."
        />
      ) : null}

      {!paymentsQuery.isError && payments.length > 0 ? (
        <>
          <div className="sp-payments-mobile">
            {payments.map((p) => (
              <div key={p.id} className="sp-item">
                <div className="sp-item__main">
                  <h3 className="sp-item__title">{p.course_title || 'Payment'}</h3>
                  <div className="sp-item__meta">
                    <span className="sp-mono">{p.receipt_no || '—'}</span>
                    <span>{new Date(p.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="sp-item__desc" style={{ marginTop: 6 }}>
                    {formatCurrency(Number(p.amount_paid))}
                  </p>
                </div>
                <div className="sp-item__aside">
                  <span className={statusBadge(p.status)}>{p.status}</span>
                  {p.status === 'completed' ? (
                    <button
                      type="button"
                      onClick={() => downloadReceipt(p)}
                      disabled={downloadingId === p.id}
                      className="sp-btn sp-btn--secondary sp-btn--sm"
                    >
                      {downloadingId === p.id ? (
                        <Loader2
                          aria-hidden
                          style={{ width: 14, height: 14, marginRight: 6 }}
                          className="animate-spin"
                        />
                      ) : (
                        <Download aria-hidden style={{ width: 14, height: 14, marginRight: 6 }} />
                      )}
                      {downloadingId === p.id ? 'Preparing…' : 'Download'}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="sp-table-wrap sp-table-wrap--desktop">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Course</th>
                  <th>Date</th>
                  <th className="sp-num">Amount</th>
                  <th>Status</th>
                  <th className="sp-num">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="sp-mono">{p.receipt_no}</td>
                    <td>{p.course_title || '—'}</td>
                    <td>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="sp-num">{formatCurrency(Number(p.amount_paid))}</td>
                    <td>
                      <span className={statusBadge(p.status)}>{p.status}</span>
                    </td>
                    <td className="sp-num">
                      {p.status === 'completed' ? (
                        <button
                          type="button"
                          onClick={() => downloadReceipt(p)}
                          disabled={downloadingId === p.id}
                          className="sp-btn sp-btn--secondary sp-btn--sm"
                        >
                          {downloadingId === p.id ? (
                            <Loader2
                              aria-hidden
                              style={{ width: 14, height: 14, marginRight: 6 }}
                              className="animate-spin"
                            />
                          ) : (
                            <Download aria-hidden style={{ width: 14, height: 14, marginRight: 6 }} />
                          )}
                          {downloadingId === p.id ? 'Preparing…' : 'Download'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </StudentPageFrame>
  )
}
