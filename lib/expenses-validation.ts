import { z } from 'zod'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
} from '@/lib/expenses-types'
import { idSchema, optionalIdSchema, optionalText, paginationQuery, text } from '@/lib/api-validation'

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
    return value
  })

const requiredDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (YYYY-MM-DD)')

const amountSchema = z.coerce.number().positive('Amount must be greater than 0').max(9999999999.99)

export const expenseWriteSchema = z.object({
  centerId: idSchema,
  employeeId: idSchema,
  category: z.enum(EXPENSE_CATEGORIES),
  amount: amountSchema,
  expenseDate: requiredDate,
  description: optionalText(5000),
  receiptUrl: optionalText(1000),
  receiptName: optionalText(255),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional().default('cash'),
  status: z.enum(EXPENSE_STATUSES).optional().default('draft'),
  approvalNotes: optionalText(5000),
  notes: optionalText(5000),
})

export const expenseUpdateSchema = expenseWriteSchema
  .partial()
  .extend({
    centerId: idSchema.optional(),
    employeeId: idSchema.optional(),
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    amount: amountSchema.optional(),
    expenseDate: requiredDate.optional(),
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'centerId'), {
    message: 'No fields to update',
  })

const listFilters = {
  search: optionalText(120),
  status: z
    .union([z.enum(EXPENSE_STATUSES), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
  category: z
    .union([z.enum(EXPENSE_CATEGORIES), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
  employeeId: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    optionalIdSchema
  ),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  export: z
    .union([z.literal('csv'), z.literal('')])
    .optional()
    .transform((v) => (v === 'csv' ? 'csv' : undefined)),
}

export const adminExpensesListQuery = z
  .object({
    centerId: idSchema,
    ...listFilters,
  })
  .and(paginationQuery)

export const superAdminExpensesListQuery = z
  .object({
    centerId: optionalIdSchema,
    ...listFilters,
  })
  .and(paginationQuery)

export type ExpenseWriteData = z.infer<typeof expenseWriteSchema>
export type ExpenseUpdateData = z.infer<typeof expenseUpdateSchema>
