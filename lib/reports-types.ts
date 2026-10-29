export const ADMIN_REPORT_TYPES = [
  'expenses',
  'employee_expenses',
  'enquiries',
  'student_registrations',
  'payments',
  'course_performance',
  'attendance',
] as const

export const REPORT_TYPES = [...ADMIN_REPORT_TYPES, 'center_performance'] as const

export type AdminReportType = (typeof ADMIN_REPORT_TYPES)[number]
export type ReportType = (typeof REPORT_TYPES)[number]

export type ReportFilter = {
  centerId?: number
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
}

export type TrendPoint = {
  date: string
  count: number
  amount?: number
}

export type EnquiryReportSummary = {
  total_count: number
  read_count: number
  unread_count: number
  matched_student_count: number
}

export type EnquiryCourseRow = {
  course_name: string
  enquiry_count: number
  read_count: number
}

export type EnquiryRow = {
  id: number
  center_id: number
  center_name?: string
  full_name: string
  email: string | null
  phone: string | null
  course_name: string | null
  message: string | null
  is_read: boolean
  created_at: string
  matched_student: boolean
}

export type StudentRegistrationSummary = {
  total_count: number
  active_count: number
  inactive_count: number
}

export type StudentRegistrationRow = {
  id: number
  center_id: number
  center_name?: string
  regno: string | null
  full_name: string
  email: string | null
  mobile: string | null
  is_active: boolean
  created_at: string
}

export type PaymentReportSummary = {
  total_count: number
  completed_count: number
  completed_revenue: number
  pending_count: number
  pending_amount: number
  refunded_count: number
  refunded_amount: number
}

export type PaymentReportRow = {
  id: number
  receipt_no: string | null
  center_id: number
  center_name?: string
  course_master_id: number
  course_title?: string
  student_name: string
  student_mobile: string | null
  amount_paid: number
  amount_due: number
  status: string
  payment_method: string | null
  created_at: string
}

export type CoursePerformanceRow = {
  course_master_id: number
  course_title: string
  payment_count: number
  completed_count: number
  unique_students: number
  revenue: number
  discount_total: number
}

export type CenterPerformanceRow = {
  center_id: number
  center_name: string
  center_slug: string
  student_count: number
  enquiry_count: number
  payment_count: number
  revenue: number
  expense_total: number
  expense_count: number
  employee_count: number
}

export type AttendanceReportSummary = {
  total_count: number
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  attendance_rate: number | null
}

export type AttendanceStatusRow = {
  status: string
  count: number
}

export type AttendanceReportRow = {
  id: number
  center_id: number
  center_name?: string
  attendance_date: string
  batch_id: number
  batch_name: string
  batch_code: string | null
  course_title: string
  student_id: number
  student_name: string
  student_regno: string | null
  status: string
  notes: string | null
  marked_by_name: string | null
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  expenses: 'Expenses',
  employee_expenses: 'Employee expenses',
  enquiries: 'Enquiries',
  student_registrations: 'Student registrations',
  payments: 'Payments / revenue',
  course_performance: 'Course performance',
  attendance: 'Attendance',
  center_performance: 'Center performance',
}
