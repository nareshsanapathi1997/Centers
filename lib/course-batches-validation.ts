import { z } from 'zod'
import { BATCH_STATUSES, ENROLLMENT_STATUSES } from '@/lib/course-batches-types'
import { idSchema, optionalIdSchema, optionalText, paginationQuery, text } from '@/lib/api-validation'

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    return value
  })

const optionalCapacity = z
  .union([z.coerce.number().int().positive(), z.literal(''), z.null()])
  .optional()
  .transform((value) => {
    if (value === '' || value == null) return null
    return value as number
  })

const batchDateOrderRefine = <T extends { startDate?: string | null; endDate?: string | null }>(
  data: T
) => {
  if (!data.startDate || !data.endDate) return true
  return data.endDate >= data.startDate
}

const batchWriteObject = z.object({
  centerId: idSchema,
  courseMasterId: idSchema,
  name: text(255),
  code: optionalText(50),
  startDate: optionalDate,
  endDate: optionalDate,
  status: z.enum(BATCH_STATUSES).optional().default('upcoming'),
  capacity: optionalCapacity,
  facultyEmployeeId: z
    .union([idSchema, z.null(), z.literal('').transform(() => null)])
    .optional(),
  courseMasterBatchId: z
    .union([idSchema, z.null(), z.literal('').transform(() => null)])
    .optional(),
  notes: optionalText(5000),
})

export const batchWriteSchema = batchWriteObject.refine(batchDateOrderRefine, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
})

export const batchUpdateSchema = batchWriteObject
  .partial()
  .extend({
    centerId: idSchema.optional(),
    courseMasterId: idSchema.optional(),
    name: text(255).optional(),
  })
  .refine(batchDateOrderRefine, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'centerId'), {
    message: 'No fields to update',
  })

export const adminBatchesListQuery = z
  .object({
    centerId: idSchema,
    search: optionalText(120),
    status: z
      .union([z.enum(BATCH_STATUSES), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
    courseMasterId: optionalIdSchema,
  })
  .and(paginationQuery)

export const superAdminBatchesListQuery = z
  .object({
    centerId: optionalIdSchema,
    search: optionalText(120),
    status: z
      .union([z.enum(BATCH_STATUSES), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
    courseMasterId: optionalIdSchema,
  })
  .and(paginationQuery)

export const enrollStudentSchema = z.object({
  studentId: idSchema,
  notes: optionalText(2000),
})

export const enrollmentStatusSchema = z.object({
  status: z.enum(ENROLLMENT_STATUSES),
})

export type BatchWriteData = z.infer<typeof batchWriteSchema>
export type BatchUpdateData = z.infer<typeof batchUpdateSchema>
