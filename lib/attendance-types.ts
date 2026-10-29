export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export type AttendanceRecordRow = {
  id: number
  center_id: number
  batch_id: number
  student_id: number
  attendance_date: string
  status: AttendanceStatus
  marked_by_employee_id: number | null
  notes: string | null
  created_at: string
  updated_at: string
  student_name?: string
  student_mobile?: string | null
  student_regno?: string | null
  batch_name?: string
  batch_code?: string | null
  course_title?: string
  center_name?: string
  marked_by_name?: string | null
}

export type AttendanceRosterEntry = {
  student_id: number
  student_name: string
  student_mobile: string | null
  student_regno: string | null
  enrollment_status: string
  attendance_id: number | null
  status: AttendanceStatus | null
  notes: string | null
}

export type AttendanceDaySummary = {
  attendance_date: string
  batch_id: number
  batch_name: string
  center_id?: number
  center_name?: string
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  total_marked: number
}

export type StudentAttendanceSummary = {
  batch_id: number
  batch_name: string
  batch_code: string | null
  course_title: string
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  total_marked: number
  attendance_rate: number | null
  recent: Array<{
    attendance_date: string
    status: AttendanceStatus
    notes: string | null
  }>
}
