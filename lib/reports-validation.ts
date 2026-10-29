import { z } from 'zod'
import { idSchema, optionalIdSchema, optionalText, paginationQuery } from '@/lib/api-validation'
import { REPORT_TYPES, ADMIN_REPORT_TYPES } from '@/lib/reports-types'

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
    return value
  })

const exportFlag = z
  .union([z.literal('csv'), z.literal('')])
  .optional()
  .transform((v) => (v === 'csv' ? 'csv' : undefined))

const baseFilters = {
  search: optionalText(120),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  export: exportFlag,
}

export const adminReportsQuery = z
  .object({
    centerId: idSchema,
    type: z.enum(ADMIN_REPORT_TYPES),
    ...baseFilters,
  })
  .and(paginationQuery)

export const superAdminReportsQuery = z
  .object({
    type: z.enum(REPORT_TYPES),
    centerId: z.preprocess(
      (value) => (value === '' || value == null ? undefined : value),
      optionalIdSchema
    ),
    ...baseFilters,
  })
  .and(paginationQuery)

export type AdminReportsQuery = z.infer<typeof adminReportsQuery>
export type SuperAdminReportsQuery = z.infer<typeof superAdminReportsQuery>
