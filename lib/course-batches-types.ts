export const BATCH_STATUSES = ['upcoming', 'active', 'completed'] as const
export type BatchStatus = (typeof BATCH_STATUSES)[number]

export const ENROLLMENT_STATUSES = ['active', 'withdrawn', 'completed'] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export type CourseBatchRow = {
  id: number
  center_id: number
  course_master_id: number
  name: string
  code: string | null
  start_date: string | null
  end_date: string | null
  status: BatchStatus
  capacity: number | null
  faculty_employee_id: number | null
  course_master_batch_id: number | null
  notes: string | null
  created_at: string
  updated_at: string
  course_title?: string
  course_slug?: string | null
  faculty_name?: string | null
  faculty_code?: string | null
  pricing_batch_name?: string | null
  pricing_batch_timing?: string | null
  center_name?: string
  center_slug?: string
  enrolled_count?: number
}

export type PricingBatchOption = {
  id: number
  course_master_id: number
  batch_name: string
  batch_timing: string | null
  is_active: boolean
}

export type BatchEnrollmentRow = {
  id: number
  batch_id: number
  student_id: number
  status: EnrollmentStatus
  enrolled_at: string
  notes: string | null
  student_name?: string
  student_mobile?: string | null
  student_email?: string | null
  student_regno?: string | null
  student_active?: boolean
}

export type CourseOption = {
  id: number
  title: string
  slug: string
}
