import { listCourseBatchesWithFees, resolveCenterFee } from '@/lib/course-fees-db'
import { computePayableAmount, installmentPayAmount } from '@/lib/course-fees-utils'
import type { ResolvedCenterFee } from '@/lib/course-fees-types'

export type CentrePrice = {
  original: number | null
  final: number | null
  savings: number | null
  discountLabel: string | null
  fromPrice: boolean
  installments: { label: string; amount: number }[]
}

/** Single price source: the same centre fee resolution checkout uses. */
export async function getCentreCoursePrice(
  courseMasterId: number,
  centerId: number,
  maxInstallments = 12,
): Promise<CentrePrice | null> {
  try {
    const batches = await listCourseBatchesWithFees(courseMasterId, centerId)
    let fee: ResolvedCenterFee | null = null
    let fromPrice = false
    if (batches.length > 0) {
      for (const b of batches as Array<{ id: number }>) {
        const f = await resolveCenterFee(courseMasterId, centerId, Number(b.id))
        if (f && (!fee || computePayableAmount(f) < computePayableAmount(fee))) fee = f
      }
      fromPrice = batches.length > 1
    } else {
      fee = await resolveCenterFee(courseMasterId, centerId, null)
    }
    if (!fee) return null
    const final = computePayableAmount(fee)
    if (!(final > 0)) return null
    const reg = Number(fee.registration_fee) || 0
    const original = (Number(fee.total_amount) || 0) + reg
    const savings = original > final ? original - final : null
    const n = Math.max(1, Math.min(Number(fee.num_installments) || 1, maxInstallments))
    const installments =
      n > 1
        ? Array.from({ length: n }, (_, i) => ({
            label: `Installment ${i + 1}`,
            amount: installmentPayAmount(fee as ResolvedCenterFee, i + 1),
          }))
        : []
    return {
      original: savings ? original : final,
      final,
      savings,
      discountLabel: savings ? `₹${savings.toLocaleString('en-IN')} off` : null,
      fromPrice,
      installments,
    }
  } catch (err) {
    console.error('getCentreCoursePrice failed', err)
    return null
  }
}
