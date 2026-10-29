'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { withBasePath } from '@/lib/with-base-path'
import type { CourseBatchFeeRow, FeeStructureInput } from '@/lib/course-fees-types'
import {
  computePayableAmount,
  getInstallmentDueStatus,
  installmentPayAmount,
  resolveInstallmentDueDate,
} from '@/lib/course-fees-utils'
import { CheckCircle, Clock, CreditCard, Download, GraduationCap, Gift, IndianRupee, Loader2, RefreshCw, Tag, Users } from 'lucide-react'
import type { PublicEnrollmentSettings } from '@/lib/enrollment-settings'
import Link from 'next/link'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

type PaymentPageProps = {
  centerSlug: string
  courseKey: string
  courseTitle: string
}

type FeePayload = FeeStructureInput & { payment_available?: boolean; source?: string; batch_id?: number | null }

type ApiResponse = {
  course: { id: number; title: string; slug: string }
  fee: FeePayload | null
  payment_available: boolean
  requires_batch_selection: boolean
  batches: CourseBatchFeeRow[]
  online_payment_enabled?: boolean
  paid_installments?: number[]
  seats?: Record<number, { capacity: number | null; left: number | null; full: boolean; low: boolean }>
  checkout?: PublicEnrollmentSettings
}

type PaymentQuote = {
  amount_due: number
  gst_amount: number
  gst_rate: number
  coupon_discount: number
  coupon_message?: string | null
  scholarship_discount?: number
  scholarship_name?: string | null
  referral_discount?: number
  referral_status?: string
  referral_message?: string | null
  total_discount?: number
}

type Receipt = { receipt_no: string; amount_paid: number; payment_id: number; token: string; pending_approval: boolean }

const CORE_FIELDS = new Set(['name', 'mobile', 'email'])

type PendingOrder = {
  payment_id: number
  razorpay: { order_id: string; key_id: string; amount: number; currency: string }
}

function formatBatchStartDate(value: string): string {
  const datePart = value.slice(0, 10)
  const parsed = new Date(`${datePart}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load payment gateway'))
    document.body.appendChild(s)
  })
}

export default function CenterPaymentClient({ centerSlug, courseKey, courseTitle }: PaymentPageProps) {
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<ApiResponse | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [referralCode, setReferralCode] = useState('')
  const [extra, setExtra] = useState<Record<string, string>>({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [quote, setQuote] = useState<PaymentQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null)
  const mobileDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [form, setForm] = useState({
    student_name: '',
    student_email: '',
    student_mobile: '',
    payment_type: 'lumpsum' as 'lumpsum' | 'installment',
    installment_no: '1',
  })

  const loadFee = useCallback(
    async (batchId?: string, mobile?: string) => {
      setLoading(true)
      setError('')
      try {
        const qs = new URLSearchParams({ centerSlug, courseKey })
        if (batchId) qs.set('batchId', batchId)
        if (mobile?.trim()) qs.set('studentMobile', mobile.trim())
        const res = await fetch(withBasePath(`/api/public/course-fees?${qs}`), { credentials: 'include' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fee not available')
        setPayload(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load fee')
        setPayload(null)
      } finally {
        setLoading(false)
      }
    },
    [centerSlug, courseKey]
  )

  useEffect(() => {
    void loadFee()
  }, [loadFee])

  useEffect(() => {
    if (selectedBatchId) void loadFee(selectedBatchId, form.student_mobile)
  }, [selectedBatchId, loadFee])

  useEffect(() => {
    if (form.student_mobile.length < 10) return
    if (mobileDebounce.current) clearTimeout(mobileDebounce.current)
    mobileDebounce.current = setTimeout(() => {
      void loadFee(selectedBatchId || undefined, form.student_mobile)
    }, 500)
    return () => {
      if (mobileDebounce.current) clearTimeout(mobileDebounce.current)
    }
  }, [form.student_mobile, selectedBatchId, loadFee])

  const fee = payload?.fee ?? null
  const requiresBatch = payload?.requires_batch_selection && !selectedBatchId
  const paidInstallments = payload?.paid_installments || []
  const onlineEnabled = payload?.online_payment_enabled !== false
  const checkout = payload?.checkout
  const fields = checkout?.form_fields || []
  const fieldOf = (k: string) => fields.find((f) => f.key === k)
  const extraFields = fields.filter((f) => !CORE_FIELDS.has(f.key))
  const emailField = fieldOf('email')
  const batchKey = selectedBatchId ? Number(selectedBatchId) : fee?.batch_id ?? null
  const seat = batchKey != null ? payload?.seats?.[batchKey] : undefined
  const batchFull = !!seat?.full

  const installmentNo = form.payment_type === 'installment' ? Number(form.installment_no) || 1 : null

  const basePayAmount = useMemo(() => {
    if (!fee) return 0
    if (form.payment_type === 'installment' && installmentNo) {
      return installmentPayAmount(fee, installmentNo)
    }
    return computePayableAmount(fee)
  }, [fee, form.payment_type, installmentNo])

  const availableInstallments = useMemo(() => {
    if (!fee) return []
    const max = Math.min(fee.num_installments || 1, checkout?.max_installments || 12)
    return Array.from({ length: max }, (_, i) => i + 1).filter((n) => {
      if (paidInstallments.includes(n)) return false
      for (let j = 1; j < n; j++) {
        if (!paidInstallments.includes(j)) return false
      }
      return true
    })
  }, [fee, paidInstallments])

  useEffect(() => {
    if (!fee?.payment_available || requiresBatch) {
      setQuote(null)
      return
    }
    const t = setTimeout(async () => {
      setQuoteLoading(true)
      try {
        const res = await fetch(withBasePath('/api/public/course-fees/quote'), {
        credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            center_slug: centerSlug,
            course_key: courseKey,
            batch_id: selectedBatchId ? Number(selectedBatchId) : null,
            payment_type: form.payment_type,
            installment_no: installmentNo,
            coupon_code: couponCode.trim() || null,
            referral_code: referralCode.trim() || null,
            student_mobile: form.student_mobile.length === 10 ? form.student_mobile : null,
          }),
        })
        const data = await res.json()
        if (res.ok) setQuote(data)
        else setQuote(null)
      } catch {
        setQuote(null)
      } finally {
        setQuoteLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [
    fee?.payment_available,
    requiresBatch,
    centerSlug,
    courseKey,
    selectedBatchId,
    form.payment_type,
    installmentNo,
    couponCode,
    referralCode,
    form.student_mobile,
  ])

  const openRazorpay = async (orderData: {
    payment_id: number
    razorpay: { order_id: string; key_id: string; amount: number; currency: string }
  }, pendingApproval = false) => {
    await loadRazorpayScript()
    await new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay!({
        key: orderData.razorpay.key_id,
        amount: orderData.razorpay.amount,
        currency: orderData.razorpay.currency,
        name: 'Course Payment',
        description: courseTitle || payload?.course.title,
        order_id: orderData.razorpay.order_id,
        prefill: {
          name: form.student_name,
          email: form.student_email,
          contact: form.student_mobile,
        },
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          try {
            const verifyRes = await fetch(withBasePath('/api/public/course-fees/verify'), {
        credentials: 'include',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                payment_id: orderData.payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed')
            setPendingOrder(null)
            setReceipt({ receipt_no: verifyData.receipt_no, amount_paid: verifyData.amount_paid, payment_id: orderData.payment_id, token: orderData.razorpay.order_id, pending_approval: pendingApproval || verifyData.approval_status === 'pending' })
            resolve()
          } catch (err) {
            reject(err)
          }
        },
        modal: {
          ondismiss: () => {
            void fetch(withBasePath('/api/public/course-fees/fail'), {
        credentials: 'include',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payment_id: orderData.payment_id }),
            })
            setPendingOrder(orderData)
            reject(new Error('Payment cancelled. You can retry below.'))
          },
        },
      })
      rzp.open()
    })
  }

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fee?.payment_available || requiresBatch) return
    if (!onlineEnabled) {
      setError('Online payment is not configured. Please pay at the center.')
      return
    }
    if (checkout?.require_terms && !termsAccepted) {
      setError('Please accept the terms and refund policy to continue.')
      return
    }
    for (const f of extraFields) {
      if (f.required && !String(extra[f.key] || '').trim()) {
        setError(`${f.label} is required.`)
        return
      }
    }
    setSubmitting(true)
    setError('')
    try {
      const idempotencyKey = `pub-${centerSlug}-${courseKey}-${form.student_mobile}-${form.payment_type}-${form.installment_no}-${Date.now()}`
      const orderRes = await fetch(withBasePath('/api/public/course-fees/order'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center_slug: centerSlug,
          course_key: courseKey,
          batch_id: selectedBatchId ? Number(selectedBatchId) : null,
          ...form,
          coupon_code: couponCode.trim() || null,
          referral_code: referralCode.trim() || null,
          form_data: extraFields.length ? Object.fromEntries(extraFields.map((f) => [f.key, extra[f.key] || ''])) : null,
          terms_accepted: termsAccepted,
          installment_no: installmentNo,
          idempotency_key: idempotencyKey,
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        if (orderData.code === 'BATCH_FULL') void loadFee(selectedBatchId || undefined, form.student_mobile)
        throw new Error(orderData.error || 'Could not start payment')
      }
      const pendingApproval = orderData.approval_status === 'pending'

      if (!orderData.razorpay) {
        setReceipt({ receipt_no: orderData.receipt_no, amount_paid: orderData.amount_due, payment_id: orderData.payment_id, token: orderData.gateway_order_id || orderData.receipt_no, pending_approval: pendingApproval })
        return
      }

      await openRazorpay({ payment_id: orderData.payment_id, razorpay: orderData.razorpay }, pendingApproval)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setSubmitting(false)
    }
  }

  const retryPayment = async () => {
    if (!pendingOrder) return
    setSubmitting(true)
    setError('')
    try {
      await openRazorpay(pendingOrder)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setSubmitting(false)
    }
  }

  const joinWaitlist = async () => {
    if (!form.student_name.trim() || form.student_mobile.length !== 10) {
      setError('Enter your name and 10-digit mobile to join the waitlist.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(withBasePath('/api/public/enrollment/waitlist'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ center_slug: centerSlug, course_key: courseKey, batch_id: batchKey, student_name: form.student_name, student_mobile: form.student_mobile, student_email: form.student_email || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not join waitlist')
      setWaitlistDone(data.message || "You're on the waitlist. We'll message you as soon as a seat opens.")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join waitlist')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !payload) {
    return (
      <div className="payment-state payment-state--loading max-w-2xl mx-auto py-20 flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
        <Loader2 className="payment-state__spinner w-8 h-8 animate-spin" aria-hidden="true" />
        <p>Loading fee details</p>
      </div>
    )
  }

  if (receipt) {
    return (
      <div className="payment-state payment-state--success max-w-lg mx-auto py-16 px-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-8 text-center shadow-sm">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{checkout?.success_title || 'Payment Successful'}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-1">Receipt</p>
          <p className="font-mono text-sm text-gray-800 dark:text-gray-200 mb-4">{receipt.receipt_no}</p>
          <p className="text-3xl font-bold text-green-700 mb-6">₹{receipt.amount_paid.toLocaleString('en-IN')}</p>
          {receipt.pending_approval ? (
            <p className="mb-4 inline-flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              {checkout?.approval_pending_text || 'Your enrollment is awaiting confirmation from the centre.'}
            </p>
          ) : null}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {checkout?.success_text || 'A student portal account has been created or linked to your mobile number. Sign in to view receipts, installments, and study materials.'}
          </p>
          <a
            href={withBasePath(`/api/public/course-fees/receipt?payment_id=${receipt.payment_id}&token=${encodeURIComponent(receipt.token)}`)}
            className="mb-3 inline-flex items-center justify-center gap-2 rounded-xl border border-green-300 px-5 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-900/40"
          >
            <Download className="h-4 w-4" />
            Download receipt (PDF)
          </a>
          <br />
          <Link
            href={`/${centerSlug}/student/login`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--cm-public-primary,#4f46e5)] text-white font-semibold hover:bg-[var(--cm-public-primary,#4338ca)] transition-colors"
          >
            <GraduationCap className="w-5 h-5" />
            Go to Student Portal
          </Link>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Use your mobile number to sign in. Check your email for login details if this is your first payment.
          </p>
        </div>
      </div>
    )
  }

  if (error && !payload) {
    return (
      <div className="payment-state payment-state--error max-w-lg mx-auto py-16 px-4" role="alert">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-6 text-center text-red-700 dark:text-red-300">{error}</div>
      </div>
    )
  }

  return (
    <div className="payment-shell max-w-2xl mx-auto py-10 px-4">
      <div className="mb-4">
        <Link
          href={`/${centerSlug}/program/${encodeURIComponent(courseKey)}`}
          className="inline-flex items-center text-sm font-medium text-[var(--cm-public-primary,#4f46e5)] hover:underline"
        >
          ← Back to course
        </Link>
      </div>
      <div className="payment-hero mb-8">
        <div className="payment-hero__icon"><CreditCard className="w-8 h-8 shrink-0" /></div>
        <div>
          <span className="payment-hero__eyebrow">Secure admission checkout</span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Complete your course payment</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{courseTitle || payload?.course.title}</p>
        </div>
        {!onlineEnabled ? (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            Online payment is currently unavailable. Please contact your centre to arrange payment.
          </p>
        ) : null}
      </div>

      <div className="payment-trust-rail" aria-label="Payment assurances">
        {(checkout?.checkout_trust?.length ? checkout.checkout_trust.map((t) => t.text) : ['Encrypted checkout', 'Instant confirmation', 'Digital receipt']).map((t) => (
          <span key={t}><CheckCircle /> {t}</span>
        ))}
      </div>

      {requiresBatch ? (
        <div className="chapter-checkout-batches">
          <h2 className="font-semibold text-[var(--cm-public-text,#0f172a)] mb-3">Select your batch</h2>
          <div className="space-y-2">
            {(payload?.batches || []).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBatchId(String(b.id))}
                className="payment-batch-option w-full text-left rounded-lg border px-4 py-3"
                aria-pressed={selectedBatchId === String(b.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{b.batch_name || `Batch #${b.id}`}</span>
                  {payload?.seats?.[b.id]?.full ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">Full</span>
                  ) : payload?.seats?.[b.id]?.left != null ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${payload.seats[b.id].low ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'}`}>
                      {payload.seats[b.id].left} seats left
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {[b.batch_timing, b.start_date ? `Starts ${formatBatchStartDate(b.start_date)}` : null].filter(Boolean).join(' · ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>
      ) : null}

      {pendingOrder ? (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 mb-4 flex flex-wrap items-center justify-between gap-2">
          <span>Payment was not completed.</span>
          <button
            type="button"
            onClick={() => void retryPayment()}
            disabled={submitting}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry payment
          </button>
        </div>
      ) : null}

      {fee && !requiresBatch ? (
        <div className={fee.payment_available ? "chapter-checkout-grid" : undefined}>
          {!fee.payment_available ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-6 text-amber-900 dark:text-amber-100 mb-6">
              {checkout?.contact_fee_text || 'Fee structure exists but payment is not enabled until the center saves pricing.'}
            </div>
          ) : (
            <div className="chapter-checkout-summary">
              <h2 className="font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                <IndianRupee className="w-5 h-5 text-[var(--cm-public-primary,#4f46e5)]" />
                Fee Summary
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>₹{basePayAmount.toLocaleString('en-IN')}</dd>
                </div>
                {quote?.coupon_discount ? (
                  <div className="flex justify-between text-green-700">
                    <dt>Coupon discount</dt>
                    <dd>- ₹{quote.coupon_discount.toLocaleString('en-IN')}</dd>
                  </div>
                ) : null}
                {quote?.scholarship_discount ? (
                  <div className="flex justify-between text-green-700">
                    <dt>Scholarship{quote.scholarship_name ? ` (${quote.scholarship_name})` : ''}</dt>
                    <dd>- ₹{quote.scholarship_discount.toLocaleString('en-IN')}</dd>
                  </div>
                ) : null}
                {quote?.referral_discount ? (
                  <div className="flex justify-between text-green-700">
                    <dt>Referral discount</dt>
                    <dd>- ₹{quote.referral_discount.toLocaleString('en-IN')}</dd>
                  </div>
                ) : null}
                {quote?.gst_amount ? (
                  <div className="flex justify-between">
                    <dt>GST ({quote.gst_rate}%)</dt>
                    <dd>₹{quote.gst_amount.toLocaleString('en-IN')}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <dt>Total payable</dt>
                  <dd className="text-[var(--cm-public-primary,#4f46e5)]">
                    {quoteLoading ? '…' : `₹${(quote?.amount_due ?? basePayAmount).toLocaleString('en-IN')}`}
                  </dd>
                </div>
              </dl>
              {seat?.left != null && !seat.full ? (
                <p className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium ${seat.low ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  <Users className="h-3.5 w-3.5" /> {seat.left} seat{seat.left === 1 ? '' : 's'} left in this batch
                </p>
              ) : null}
              {paidInstallments.length > 0 ? (
                <p className="mt-3 text-xs text-green-700">Paid installments: {paidInstallments.join(', ')}</p>
              ) : null}
              {form.payment_type === 'installment' && installmentNo && fee ? (
                (() => {
                  const due = resolveInstallmentDueDate(fee, installmentNo)
                  const status = getInstallmentDueStatus(due, paidInstallments.includes(installmentNo))
                  if (!due || status === 'paid') return null
                  return (
                    <p
                      className={`mt-2 text-xs ${status === 'overdue' ? 'text-red-700' : status === 'due' ? 'text-amber-700' : 'text-gray-600'}`}
                    >
                      Due date: {due.toLocaleDateString('en-IN')}
                      {status === 'overdue' ? ' (overdue)' : status === 'due' ? ' (due today)' : ''}
                    </p>
                  )
                })()
              ) : null}
            </div>
          )}

          {fee.payment_available && batchFull ? (
            <div className="chapter-checkout-form space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">This batch is full</h2>
              {waitlistDone ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{waitlistDone}</p>
              ) : checkout?.waitlist_enabled ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Join the waitlist and we&apos;ll notify you by SMS / WhatsApp the moment a seat opens.</p>
                  <input required placeholder="Full name" value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} className="w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control" />
                  <input required type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" value={form.student_mobile} onChange={(e) => setForm({ ...form, student_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control" />
                  <input type="email" placeholder="Email (optional)" value={form.student_email} onChange={(e) => setForm({ ...form, student_email: e.target.value })} className="w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control" />
                  <button type="button" onClick={() => void joinWaitlist()} disabled={submitting} className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50">
                    {submitting ? 'Joining…' : 'Join waitlist'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">Please choose another batch or contact the centre.</p>
              )}
            </div>
          ) : fee.payment_available ? (
            <form onSubmit={submitPayment} className="chapter-checkout-form space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Student details</h2>
              <label className="block">
                <span className="text-sm font-medium">{fieldOf('name')?.label || 'Full name'}</span>
                <input
                  required
                  minLength={2}
                  autoComplete="name"
                  value={form.student_name}
                  onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium">{fieldOf('mobile')?.label || 'Mobile'}</span>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    title="Enter a valid 10-digit Indian mobile number"
                    placeholder="10-digit mobile"
                    value={form.student_mobile}
                    onChange={(e) => setForm({ ...form, student_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control"
                  />
                </label>
                {fields.length && !emailField ? null : (
                <label className="block">
                  <span className="text-sm font-medium">{emailField?.label || 'Email'}</span>
                  <input
                    type="email"
                    required={!!emailField?.required}
                    value={form.student_email}
                    onChange={(e) => setForm({ ...form, student_email: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control"
                  />
                </label>
                )}
              </div>
              {extraFields.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {extraFields.map((f) => (
                    <label key={f.key} className={`block ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                      <span className="text-sm font-medium">{f.label}{f.required ? ' *' : ''}</span>
                      {f.type === 'select' ? (
                        <select required={f.required} value={extra[f.key] || ''} onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control">
                          <option value="">Select</option>
                          {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea required={f.required} placeholder={f.placeholder} value={extra[f.key] || ''} onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control" />
                      ) : (
                        <input required={f.required} type={f.type} placeholder={f.placeholder} value={extra[f.key] || ''} onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control" />
                      )}
                    </label>
                  ))}
                </div>
              ) : null}
              <label className="block">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Tag className="w-4 h-4" /> Coupon code
                </span>
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control"
                />
                {couponCode.trim() && !quoteLoading ? (
                  quote?.coupon_discount ? (
                    <span className="mt-1 block text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Coupon applied — you save ₹{quote.coupon_discount.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="mt-1 block text-xs font-medium text-amber-600 dark:text-amber-400">
                      {quote?.coupon_message || 'This coupon is not valid for this programme.'}
                    </span>
                  )
                ) : null}
              </label>
              {checkout?.referral_enabled ? (
                <label className="block">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Gift className="w-4 h-4" /> Referral code
                  </span>
                  <input
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Referred by a friend? (optional)"
                    className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control"
                  />
                  {referralCode.trim() && !quoteLoading ? (
                    quote?.referral_discount ? (
                      <span className="mt-1 block text-xs font-medium text-emerald-600 dark:text-emerald-400">Referral applied — you save ₹{quote.referral_discount.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="mt-1 block text-xs font-medium text-amber-600 dark:text-amber-400">{quote?.referral_message || 'This referral code is not valid.'}</span>
                    )
                  ) : null}
                </label>
              ) : null}
              {(fee.num_installments || 1) > 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium">Payment type</span>
                    <select
                      value={form.payment_type}
                      onChange={(e) =>
                        setForm({ ...form, payment_type: e.target.value as 'lumpsum' | 'installment' })
                      }
                      className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control"
                    >
                      <option value="lumpsum">Full payment</option>
                      <option value="installment">One installment</option>
                    </select>
                  </label>
                  {form.payment_type === 'installment' ? (
                    <label className="block">
                      <span className="text-sm font-medium">Installment</span>
                      <select
                        value={form.installment_no}
                        onChange={(e) => setForm({ ...form, installment_no: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-900 admin-form-control"
                      >
                        {availableInstallments.map((n) => (
                          <option key={n} value={String(n)}>
                            #{n} — ₹{installmentPayAmount(fee, n).toLocaleString('en-IN')}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}
              {checkout?.require_terms ? (
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-600" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                    <span>
                      I agree to the{' '}
                      <button type="button" className="font-medium text-indigo-600 underline dark:text-indigo-400" onClick={() => setShowTerms((v) => !v)}>
                        terms &amp; refund policy
                      </button>
                    </span>
                  </label>
                  {showTerms ? (
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {checkout.terms_html ? <div dangerouslySetInnerHTML={{ __html: checkout.terms_html }} /> : null}
                      {checkout.refund_policy_html ? <div className="mt-3" dangerouslySetInnerHTML={{ __html: checkout.refund_policy_html }} /> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={submitting || !onlineEnabled || (!!checkout?.require_terms && !termsAccepted)}
                className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Processing...' : onlineEnabled ? 'Proceed to pay' : 'Online pay unavailable'}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
