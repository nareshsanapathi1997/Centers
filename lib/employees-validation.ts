import { z } from 'zod'
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from '@/lib/employees-types'
import { idSchema, optionalIdSchema, optionalText, paginationQuery, text } from '@/lib/api-validation'

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return null
    // Accept YYYY-MM-DD from <input type="date">
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    return value
  })

const documentSchema = z.object({
  name: text(200),
  url: optionalText(1000),
  uploadedAt: optionalText(40),
})

export const employeeWriteSchema = z.object({
  centerId: idSchema,
  employeeCode: optionalText(50),
  fullName: text(255),
  email: z
    .union([z.string().trim().email('Invalid email').max(255), z.literal('')])
    .optional()
    .transform((value) => (value ? value.toLowerCase() : null)),
  mobile: optionalText(50),
  alternateMobile: optionalText(50),
  jobTitle: optionalText(150),
  department: optionalText(150),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional().default('full_time'),
  status: z.enum(EMPLOYEE_STATUSES).optional().default('active'),
  joinDate: optionalDate,
  endDate: optionalDate,
  dateOfBirth: optionalDate,
  gender: optionalText(20),
  address: optionalText(2000),
  city: optionalText(100),
  state: optionalText(100),
  pincode: optionalText(20),
  emergencyContactName: optionalText(255),
  emergencyContactPhone: optionalText(50),
  adminUserId: z
    .union([idSchema, z.null(), z.literal('').transform(() => null)])
    .optional(),
  documents: z.array(documentSchema).optional().default([]),
  notes: optionalText(5000),
})

export const employeeUpdateSchema = employeeWriteSchema
  .partial()
  .extend({
    centerId: idSchema.optional(),
    fullName: text(255).optional(),
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'centerId'), {
    message: 'No fields to update',
  })

export const adminEmployeesListQuery = z
  .object({
    centerId: idSchema,
    search: optionalText(120),
    status: z
      .union([z.enum(EMPLOYEE_STATUSES), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
    employmentType: z
      .union([z.enum(EMPLOYMENT_TYPES), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .and(paginationQuery)

export const superAdminEmployeesListQuery = z
  .object({
    centerId: optionalIdSchema,
    search: optionalText(120),
    status: z
      .union([z.enum(EMPLOYEE_STATUSES), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
    employmentType: z
      .union([z.enum(EMPLOYMENT_TYPES), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .and(paginationQuery)

export type EmployeeWriteData = z.infer<typeof employeeWriteSchema>
export type EmployeeUpdateData = z.infer<typeof employeeUpdateSchema>
