'use client'

import type { ReactNode } from 'react'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import type { FeeStructureInput, InstallmentDueRule } from '@/lib/course-fees-types'
import { computeEffectiveAmount } from '@/lib/course-fees-types'
import { computePayableAmount, explicitInstallmentAmount, MAX_INSTALLMENTS, validateFeeForm } from '@/lib/course-fees-utils'

type CourseFeeStructureFormProps = {
  value: FeeStructureInput
  onChange: (next: FeeStructureInput) => void
  disabled?: boolean
  showOfferToggle?: boolean
  showPayablePreview?: boolean
}

function num(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function ordinal(n: number): string {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

function installmentAmounts(value: FeeStructureInput, count: number): number[] {
  const out: number[] = []
  for (let n = 1; n <= count; n++) {
    const v = explicitInstallmentAmount(value, n)
    if (v != null) out.push(v)
  }
  return out
}

function formatInrCompact(amount: number): string {
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}

function FeeFormSection({
  number,
  title,
  description,
  children,
}: {
  number: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="admin-form-section border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="admin-form-section__header">
        <span className="admin-form-section__number">{number}</span>
        <div>
          <h3 className="admin-form-section__title">{title}</h3>
          <p className="admin-form-section__description">{description}</p>
        </div>
      </div>
      <div className="admin-form-section__body">{children}</div>
    </section>
  )
}

export default function CourseFeeStructureForm({
  value,
  onChange,
  disabled = false,
  showOfferToggle = true,
  showPayablePreview = true,
}: CourseFeeStructureFormProps) {
  const set = (patch: Partial<FeeStructureInput>) => onChange({ ...value, ...patch })

  const updateDueRule = (index: number, patch: Partial<InstallmentDueRule>) => {
    const rules = [...(value.installment_due_rules || [])]
    rules[index] = { ...rules[index], ...patch }
    set({ installment_due_rules: rules })
  }

  const syncInstallmentRules = (count: number) => {
    const rules: InstallmentDueRule[] = []
    for (let i = 1; i <= count; i++) {
      const existing = value.installment_due_rules?.find((r) => r.installment_no === i)
      rules.push(existing || { installment_no: i, due_days: i === 1 ? 0 : (i - 1) * 30 })
    }
    set({ num_installments: count, installment_due_rules: rules })
  }

  const installmentCount = value.num_installments || 1
  const effective = computeEffectiveAmount(value)
  const payable = computePayableAmount(value)
  const validationError = validateFeeForm(value)
  const filledParts = installmentAmounts(value, installmentCount)
  const partsSum = filledParts.reduce((a, b) => a + b, 0)
  const installmentsBalanced =
    installmentCount <= 1 || filledParts.length === 0 || Math.abs(partsSum - effective) <= 1

  return (
    <div className="space-y-4">
      <FeeFormSection number="1" title="Course pricing" description="Set base amounts before installment split">
        <div className="admin-form-row admin-form-row--2">
          <AdminFormField label="Total course amount (₹)">
            <input
              type="number"
              min={0}
              disabled={disabled}
              value={value.total_amount ?? 0}
              onChange={(e) => set({ total_amount: num(e.target.value) ?? 0 })}
              className="admin-form-control"
            />
          </AdminFormField>
          <AdminFormField label="Discount amount (₹)">
            <input
              type="number"
              min={0}
              disabled={disabled}
              value={value.discount_amount ?? 0}
              onChange={(e) => set({ discount_amount: num(e.target.value) ?? 0 })}
              className="admin-form-control"
            />
          </AdminFormField>
          <AdminFormField label="Offer amount (₹)" hint="Optional override price">
            <input
              type="number"
              min={0}
              disabled={disabled}
              value={value.offer_amount ?? ''}
              onChange={(e) => set({ offer_amount: num(e.target.value) })}
              className="admin-form-control"
            />
          </AdminFormField>
          <AdminFormField label="Registration fee (₹)" hint="Optional one-time fee">
            <input
              type="number"
              min={0}
              disabled={disabled}
              value={value.registration_fee ?? 0}
              onChange={(e) => set({ registration_fee: num(e.target.value) ?? 0 })}
              className="admin-form-control"
            />
          </AdminFormField>
        </div>

        {showOfferToggle ? (
          <label htmlFor="fee-offer-enabled" className="admin-form-check admin-form-check--field mt-2">
            <input
              id="fee-offer-enabled"
              type="checkbox"
              disabled={disabled}
              checked={value.offer_enabled !== false}
              onChange={(e) => set({ offer_enabled: e.target.checked })}
            />
            <span>Use offer amount instead of (total − discount)</span>
          </label>
        ) : null}
      </FeeFormSection>

      {showPayablePreview ? (
        <div className="admin-form-section-note border border-dashed border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-100">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span>Course fee after discount</span>
              <strong>{formatInrCompact(effective)}</strong>
            </div>
            {(value.registration_fee || 0) > 0 ? (
              <div className="flex justify-between gap-4">
                <span>Registration fee</span>
                <strong>{formatInrCompact(Number(value.registration_fee))}</strong>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-purple-200/80 pt-2 dark:border-purple-800/50">
              <span>Total payable</span>
              <strong>{formatInrCompact(payable)}</strong>
            </div>
          </div>
        </div>
      ) : null}

      <FeeFormSection number="2" title="Installment structure" description={`Split payment into up to ${MAX_INSTALLMENTS} installments (centre checkout can cap this in Enrollment settings)`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="admin-form-label mb-0">Payment plan</span>
          <div className="admin-btn-group">
            {[1, 2, 3, 4, 6, 12].map((n) => (
              <AdminButton
                key={n}
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled}
                active={installmentCount === n}
                onClick={() => syncInstallmentRules(n)}
              >
                {n === 1 ? 'Single payment' : `${n} installments`}
              </AdminButton>
            ))}
          </div>
          <select
            aria-label="Number of installments"
            disabled={disabled}
            value={installmentCount}
            onChange={(e) => syncInstallmentRules(Number(e.target.value))}
            className="admin-form-control w-auto"
          >
            {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'Single payment' : `${n} installments`}
              </option>
            ))}
          </select>
        </div>

        {installmentCount > 1 ? (
          <>
            <div className="admin-form-row admin-form-row--3">
              {Array.from({ length: installmentCount }, (_, i) => i + 1).map((n) => {
                const key = `installment_${n}_amount` as keyof FeeStructureInput
                const ruleIndex = (value.installment_due_rules || []).findIndex((r) => r.installment_no === n)
                const fieldValue =
                  n <= 3
                    ? (value[key] as number | null | undefined)
                    : ruleIndex >= 0
                      ? value.installment_due_rules![ruleIndex].amount
                      : null
                const onAmount = (v: number | null) => {
                  if (n <= 3) {
                    set({ [key]: v } as Partial<FeeStructureInput>)
                  } else if (ruleIndex >= 0) {
                    updateDueRule(ruleIndex, { amount: v })
                  } else {
                    set({ installment_due_rules: [...(value.installment_due_rules || []), { installment_no: n, due_days: (n - 1) * 30, amount: v }] })
                  }
                }
                return (
                  <AdminFormField key={n} label={`${ordinal(n)} installment (₹)`}>
                    <input
                      type="number"
                      min={0}
                      disabled={disabled}
                      value={fieldValue ?? ''}
                      onChange={(e) => onAmount(num(e.target.value))}
                      className="admin-form-control"
                    />
                  </AdminFormField>
                )
              })}
            </div>

            <p className={`admin-form-hint mt-2 ${installmentsBalanced ? '' : 'text-amber-700 dark:text-amber-300'}`}>
              {filledParts.length === 0
                ? `Enter installment amounts — they should total ${formatInrCompact(effective)}.`
                : installmentsBalanced
                  ? `Installments total ${formatInrCompact(partsSum)} — matches course fee after discount.`
                  : `Installments total ${formatInrCompact(partsSum)} but course fee is ${formatInrCompact(effective)}.${validationError ? ` ${validationError}` : ''}`}
            </p>

            {(value.installment_due_rules || []).length > 0 ? (
              <div className="mt-4 space-y-3">
                <p className="admin-form-label mb-0">Due date schedule</p>
                {(value.installment_due_rules || []).map((rule, index) => (
                  <div key={rule.installment_no} className="admin-form-row admin-form-row--3">
                    <AdminFormField label={`Installment #${rule.installment_no}`}>
                      <input
                        type="text"
                        readOnly
                        value={`${ordinal(rule.installment_no)} payment`}
                        className="admin-form-control bg-gray-50 dark:bg-gray-900"
                      />
                    </AdminFormField>
                    <AdminFormField label="Due days from start">
                      <input
                        type="number"
                        min={0}
                        disabled={disabled}
                        value={rule.due_days ?? ''}
                        onChange={(e) => updateDueRule(index, { due_days: num(e.target.value) })}
                        className="admin-form-control"
                      />
                    </AdminFormField>
                    <AdminFormField label="Or fixed due date" hint="Overrides due days when set">
                      <input
                        type="date"
                        disabled={disabled}
                        value={rule.due_date?.slice(0, 10) || ''}
                        onChange={(e) => updateDueRule(index, { due_date: e.target.value || null })}
                        className="admin-form-control"
                      />
                    </AdminFormField>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="admin-form-hint">Single payment — student pays the full payable amount at once.</p>
        )}
      </FeeFormSection>

      <FeeFormSection number="3" title="Payment rules" description="GST and tax settings applied at checkout">
        <AdminFormField label="GST rate (%)" hint="Applied on amount after coupon discount">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            disabled={disabled}
            value={Number(value.payment_rules?.gst_rate ?? '')}
            onChange={(e) => {
              const v = e.target.value.trim()
              set({
                payment_rules: {
                  ...(value.payment_rules || {}),
                  gst_rate: v === '' ? undefined : Number(v),
                },
              })
            }}
            placeholder="Default 18%"
            className="admin-form-control"
          />
        </AdminFormField>
      </FeeFormSection>
    </div>
  )
}
