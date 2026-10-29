import { z } from 'zod'
import { ATTENDANCE_STATUSES } from '@/lib/attendance-types'
import { idSchema, optionalIdSchema, optionalText, paginationQuery } from '@/lib/api-validation'

const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
    return value
  })

export const attendanceRosterQuery = z.object({
  centerId: idSchema,
  batchId: idSchema,
  date: dateOnly,
})

export const attendanceSaveSchema = z.object({
  centerId: idSchema,
  batchId: idSchema,
  attendanceDate: dateOnly,
  markedByEmployeeId: z
    .union([idSchema, z.null(), z.literal('').transform(() => null)])
    .optional(),
  entries: z
    .array(
      z.object({
        studentId: idSchema,
        status: z.enum(ATTENDANCE_STATUSES),
        notes: optionalText(1000),
      })
    )
    .min(1, 'At least one attendance entry is required'),
})

export const adminAttendanceListQuery = z
  .object({
    centerId: idSchema,
    batchId: optionalIdSchema,
    search: optionalText(120),
    status: z
      .union([z.enum(ATTENDANCE_STATUSES), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
    dateFrom: optionalDate,
    dateTo: optionalDate,
  })
  .and(paginationQuery)

export const superAdminAttendanceListQuery = z
  .object({
    centerId: optionalIdSchema,
    batchId: optionalIdSchema,
    search: optionalText(120),
    status: z
      .union([z.enum(ATTENDANCE_STATUSES), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
    dateFrom: optionalDate,
    dateTo: optionalDate,
  })
  .and(paginationQuery)

export const attendanceDeleteDaySchema = z.object({
  centerId: idSchema,
  batchId: idSchema,
  attendanceDate: dateOnly,
})

export const studentCenterQuery = z.object({
  centerId: idSchema,
})

export type AttendanceSaveData = z.infer<typeof attendanceSaveSchema>
