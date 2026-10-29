export const EMPLOYEE_STATUSES = ['active', 'inactive', 'on_leave', 'terminated'] as const
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'intern',
  'consultant',
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export type EmployeeDocumentMeta = {
  name: string
  url?: string
  uploadedAt?: string
}

export type EmployeeRow = {
  id: number
  center_id: number
  employee_code: string | null
  full_name: string
  email: string | null
  mobile: string | null
  alternate_mobile: string | null
  job_title: string | null
  department: string | null
  employment_type: EmploymentType
  status: EmployeeStatus
  join_date: string | null
  end_date: string | null
  date_of_birth: string | null
  gender: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  admin_user_id: number | null
  documents: EmployeeDocumentMeta[]
  notes: string | null
  created_at: string
  updated_at: string
  center_name?: string
  center_slug?: string
  admin_username?: string | null
  admin_full_name?: string | null
}
