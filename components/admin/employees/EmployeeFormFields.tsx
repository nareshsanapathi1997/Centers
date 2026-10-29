'use client'

import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  type EmployeeDocumentMeta,
  type EmployeeStatus,
  type EmploymentType,
} from '@/lib/employees-types'
import AdminFormField from '@/components/admin/AdminFormField'
import { Input, Select, Textarea } from '@/components/forms'

export type EmployeeFormState = {
  centerId: string
  employeeCode: string
  fullName: string
  email: string
  mobile: string
  alternateMobile: string
  jobTitle: string
  department: string
  employmentType: EmploymentType
  status: EmployeeStatus
  joinDate: string
  endDate: string
  dateOfBirth: string
  gender: string
  address: string
  city: string
  state: string
  pincode: string
  emergencyContactName: string
  emergencyContactPhone: string
  adminUserId: string
  documentsText: string
  notes: string
}

export const EMPTY_EMPLOYEE_FORM: EmployeeFormState = {
  centerId: '',
  employeeCode: '',
  fullName: '',
  email: '',
  mobile: '',
  alternateMobile: '',
  jobTitle: '',
  department: '',
  employmentType: 'full_time',
  status: 'active',
  joinDate: '',
  endDate: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  adminUserId: '',
  documentsText: '',
  notes: '',
}

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On leave',
  terminated: 'Terminated',
}

const TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full time',
  part_time: 'Part time',
  contract: 'Contract',
  intern: 'Intern',
  consultant: 'Consultant',
}

export function employeeStatusLabel(status: string) {
  return STATUS_LABELS[status as EmployeeStatus] || status
}

export function employmentTypeLabel(type: string) {
  return TYPE_LABELS[type as EmploymentType] || type
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'admin-badge admin-badge-success'
    case 'on_leave':
      return 'admin-badge admin-badge-warning'
    case 'terminated':
      return 'admin-badge admin-badge-danger'
    default:
      return 'admin-badge'
  }
}

function dateInputValue(value: string | null | undefined) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function employeeToForm(row: Record<string, unknown>, centerIdFallback = ''): EmployeeFormState {
  const docs = Array.isArray(row.documents) ? (row.documents as EmployeeDocumentMeta[]) : []
  return {
    centerId: String(row.center_id ?? centerIdFallback ?? ''),
    employeeCode: String(row.employee_code ?? ''),
    fullName: String(row.full_name ?? ''),
    email: String(row.email ?? ''),
    mobile: String(row.mobile ?? ''),
    alternateMobile: String(row.alternate_mobile ?? ''),
    jobTitle: String(row.job_title ?? ''),
    department: String(row.department ?? ''),
    employmentType: (row.employment_type as EmploymentType) || 'full_time',
    status: (row.status as EmployeeStatus) || 'active',
    joinDate: dateInputValue(row.join_date as string),
    endDate: dateInputValue(row.end_date as string),
    dateOfBirth: dateInputValue(row.date_of_birth as string),
    gender: String(row.gender ?? ''),
    address: String(row.address ?? ''),
    city: String(row.city ?? ''),
    state: String(row.state ?? ''),
    pincode: String(row.pincode ?? ''),
    emergencyContactName: String(row.emergency_contact_name ?? ''),
    emergencyContactPhone: String(row.emergency_contact_phone ?? ''),
    adminUserId: row.admin_user_id != null ? String(row.admin_user_id) : '',
    documentsText: docs
      .map((d) => [d.name, d.url].filter(Boolean).join('|'))
      .join('\n'),
    notes: String(row.notes ?? ''),
  }
}

export function formToPayload(form: EmployeeFormState) {
  const documents: EmployeeDocumentMeta[] = form.documentsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, url] = line.split('|').map((part) => part.trim())
      return {
        name: name || 'Document',
        url: url || undefined,
        uploadedAt: new Date().toISOString(),
      }
    })

  return {
    centerId: Number(form.centerId),
    employeeCode: form.employeeCode || undefined,
    fullName: form.fullName,
    email: form.email,
    mobile: form.mobile,
    alternateMobile: form.alternateMobile,
    jobTitle: form.jobTitle,
    department: form.department,
    employmentType: form.employmentType,
    status: form.status,
    joinDate: form.joinDate || undefined,
    endDate: form.endDate || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    gender: form.gender,
    address: form.address,
    city: form.city,
    state: form.state,
    pincode: form.pincode,
    emergencyContactName: form.emergencyContactName,
    emergencyContactPhone: form.emergencyContactPhone,
    adminUserId: form.adminUserId ? Number(form.adminUserId) : null,
    documents,
    notes: form.notes,
  }
}

type CenterOption = { id: number; name: string }
type AdminOption = { id: number; username: string; full_name?: string | null }

type EmployeeFormFieldsProps = {
  form: EmployeeFormState
  onChange: (next: EmployeeFormState) => void
  centers?: CenterOption[]
  showCenterSelect?: boolean
  adminOptions?: AdminOption[]
  formId?: string
}

export default function EmployeeFormFields({
  form,
  onChange,
  centers = [],
  showCenterSelect = false,
  adminOptions = [],
  formId = 'employee-form',
}: EmployeeFormFieldsProps) {
  const set = <K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) => {
    onChange({ ...form, [key]: value })
  }

  return (
    <div id={formId} className="space-y-4">
      {showCenterSelect ? (
        <AdminFormField label="Center" htmlFor="emp-center" required>
          <Select
            id="emp-center"
            value={form.centerId}
            onChange={(e) => set('centerId', e.target.value)}
            className="admin-form-control"
            required
          >
            <option value="">Select center</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </AdminFormField>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminFormField label="Full name" htmlFor="emp-name" required>
          <Input
            id="emp-name"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            required
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Employee code" htmlFor="emp-code" hint="Leave blank to auto-generate">
          <Input
            id="emp-code"
            value={form.employeeCode}
            onChange={(e) => set('employeeCode', e.target.value)}
            className="admin-form-control"
            placeholder="EMP20260001"
          />
        </AdminFormField>
        <AdminFormField label="Mobile" htmlFor="emp-mobile">
          <Input
            id="emp-mobile"
            value={form.mobile}
            onChange={(e) => set('mobile', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Email" htmlFor="emp-email">
          <Input
            id="emp-email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Job title" htmlFor="emp-title">
          <Input
            id="emp-title"
            value={form.jobTitle}
            onChange={(e) => set('jobTitle', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Department" htmlFor="emp-dept">
          <Input
            id="emp-dept"
            value={form.department}
            onChange={(e) => set('department', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Employment type" htmlFor="emp-type">
          <Select
            id="emp-type"
            value={form.employmentType}
            onChange={(e) => set('employmentType', e.target.value as EmploymentType)}
            className="admin-form-control"
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </AdminFormField>
        <AdminFormField label="Status" htmlFor="emp-status">
          <Select
            id="emp-status"
            value={form.status}
            onChange={(e) => set('status', e.target.value as EmployeeStatus)}
            className="admin-form-control"
          >
            {EMPLOYEE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </AdminFormField>
        <AdminFormField label="Join date" htmlFor="emp-join">
          <Input
            id="emp-join"
            type="date"
            value={form.joinDate}
            onChange={(e) => set('joinDate', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="End date" htmlFor="emp-end">
          <Input
            id="emp-end"
            type="date"
            value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Date of birth" htmlFor="emp-dob">
          <Input
            id="emp-dob"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => set('dateOfBirth', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Gender" htmlFor="emp-gender">
          <Input
            id="emp-gender"
            value={form.gender}
            onChange={(e) => set('gender', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Alternate mobile" htmlFor="emp-alt-mobile">
          <Input
            id="emp-alt-mobile"
            value={form.alternateMobile}
            onChange={(e) => set('alternateMobile', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Linked admin account" htmlFor="emp-admin">
          <Select
            id="emp-admin"
            value={form.adminUserId}
            onChange={(e) => set('adminUserId', e.target.value)}
            className="admin-form-control"
          >
            <option value="">None</option>
            {adminOptions.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.full_name || admin.username} ({admin.username})
              </option>
            ))}
          </Select>
        </AdminFormField>
      </div>

      <AdminFormField label="Address" htmlFor="emp-address">
        <Textarea
          id="emp-address"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          rows={2}
          className="admin-form-control"
        />
      </AdminFormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminFormField label="City" htmlFor="emp-city">
          <Input
            id="emp-city"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="State" htmlFor="emp-state">
          <Input
            id="emp-state"
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Pincode" htmlFor="emp-pin">
          <Input
            id="emp-pin"
            value={form.pincode}
            onChange={(e) => set('pincode', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminFormField label="Emergency contact" htmlFor="emp-emerg-name">
          <Input
            id="emp-emerg-name"
            value={form.emergencyContactName}
            onChange={(e) => set('emergencyContactName', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
        <AdminFormField label="Emergency phone" htmlFor="emp-emerg-phone">
          <Input
            id="emp-emerg-phone"
            value={form.emergencyContactPhone}
            onChange={(e) => set('emergencyContactPhone', e.target.value)}
            className="admin-form-control"
          />
        </AdminFormField>
      </div>

      <AdminFormField
        label="Documents metadata"
        htmlFor="emp-docs"
        hint="One per line: Name or Name|https://url"
      >
        <Textarea
          id="emp-docs"
          value={form.documentsText}
          onChange={(e) => set('documentsText', e.target.value)}
          rows={3}
          className="admin-form-control"
          placeholder="Offer letter|https://…"
        />
      </AdminFormField>

      <AdminFormField label="Notes" htmlFor="emp-notes">
        <Textarea
          id="emp-notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          className="admin-form-control"
        />
      </AdminFormField>
    </div>
  )
}
