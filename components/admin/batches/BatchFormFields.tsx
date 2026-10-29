'use client'

import { BATCH_STATUSES, type BatchStatus } from '@/lib/course-batches-types'
import AdminFormField from '@/components/admin/AdminFormField'
import { Input, Select, Textarea } from '@/components/forms'

export type CourseOption = { id: number; title: string; slug?: string }
export type FacultyOption = {
  id: number
  full_name: string
  employee_code?: string | null
  job_title?: string | null
}
export type PricingBatchOption = {
  id: number
  course_master_id: number
  batch_name: string
  batch_timing?: string | null
  is_active?: boolean
}

export type BatchFormState = {
  centerId: string
  courseMasterId: string
  name: string
  code: string
  startDate: string
  endDate: string
  status: BatchStatus
  capacity: string
  facultyEmployeeId: string
  courseMasterBatchId: string
  notes: string
}

export const EMPTY_BATCH_FORM: BatchFormState = {
  centerId: '',
  courseMasterId: '',
  name: '',
  code: '',
  startDate: '',
  endDate: '',
  status: 'upcoming',
  capacity: '',
  facultyEmployeeId: '',
  courseMasterBatchId: '',
  notes: '',
}

const STATUS_LABELS: Record<BatchStatus, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
}

export function batchStatusLabel(status: string) {
  return STATUS_LABELS[status as BatchStatus] || status
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300'
    case 'upcoming':
      return 'inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300'
    case 'completed':
      return 'inline-flex rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300'
    default:
      return 'inline-flex rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300'
  }
}

export function formToPayload(form: BatchFormState) {
  return {
    centerId: Number(form.centerId),
    courseMasterId: Number(form.courseMasterId),
    name: form.name.trim(),
    code: form.code.trim() || undefined,
    startDate: form.startDate || undefined,
    endDate: form.endDate || undefined,
    status: form.status,
    capacity: form.capacity.trim() ? Number(form.capacity) : null,
    facultyEmployeeId: form.facultyEmployeeId ? Number(form.facultyEmployeeId) : null,
    courseMasterBatchId: form.courseMasterBatchId ? Number(form.courseMasterBatchId) : null,
    notes: form.notes.trim() || undefined,
  }
}

export function batchToForm(
  batch: {
    center_id: number
    course_master_id: number
    name: string
    code?: string | null
    start_date?: string | null
    end_date?: string | null
    status: BatchStatus
    capacity?: number | null
    faculty_employee_id?: number | null
    course_master_batch_id?: number | null
    notes?: string | null
  },
  centerId?: string
): BatchFormState {
  return {
    centerId: centerId || String(batch.center_id),
    courseMasterId: String(batch.course_master_id),
    name: batch.name,
    code: batch.code || '',
    startDate: batch.start_date ? String(batch.start_date).slice(0, 10) : '',
    endDate: batch.end_date ? String(batch.end_date).slice(0, 10) : '',
    status: batch.status,
    capacity: batch.capacity != null ? String(batch.capacity) : '',
    facultyEmployeeId: batch.faculty_employee_id != null ? String(batch.faculty_employee_id) : '',
    courseMasterBatchId:
      batch.course_master_batch_id != null ? String(batch.course_master_batch_id) : '',
    notes: batch.notes || '',
  }
}

export default function BatchFormFields({
  form,
  onChange,
  courses,
  faculty,
  pricingBatches = [],
  showCenterSelect,
  centers,
  lockCenter,
}: {
  form: BatchFormState
  onChange: (next: BatchFormState) => void
  courses: CourseOption[]
  faculty: FacultyOption[]
  pricingBatches?: PricingBatchOption[]
  showCenterSelect?: boolean
  centers?: Array<{ id: number; name: string }>
  lockCenter?: boolean
}) {
  const set = <K extends keyof BatchFormState>(key: K, value: BatchFormState[K]) =>
    onChange({ ...form, [key]: value })

  const pricingForCourse = pricingBatches.filter(
    (b) => !form.courseMasterId || String(b.course_master_id) === form.courseMasterId
  )

  return (
    <div className="space-y-4">
      {showCenterSelect ? (
        <AdminFormField label="Center" required>
          <Select
            value={form.centerId}
            onChange={(e) =>
              onChange({
                ...form,
                centerId: e.target.value,
                courseMasterId: '',
                courseMasterBatchId: '',
                facultyEmployeeId: '',
              })
            }
            disabled={lockCenter}
            required
          >
            <option value="">Select center</option>
            {(centers || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </AdminFormField>
      ) : null}

      <AdminFormField label="Course" required>
        <Select
          value={form.courseMasterId}
          onChange={(e) =>
            onChange({
              ...form,
              courseMasterId: e.target.value,
              courseMasterBatchId: '',
            })
          }
          required
        >
          <option value="">Select course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
        {courses.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--cm-color-text-muted)]">
            Assign courses to this center under Course Pricing first.
          </p>
        ) : null}
      </AdminFormField>

      <AdminFormField label="Pricing batch (optional)">
        <Select
          value={form.courseMasterBatchId}
          onChange={(e) => set('courseMasterBatchId', e.target.value)}
          disabled={!form.courseMasterId}
        >
          <option value="">
            {form.courseMasterId ? 'None — not linked' : 'Select course first'}
          </option>
          {pricingForCourse.map((b) => (
            <option key={b.id} value={b.id}>
              {b.batch_name}
              {b.batch_timing ? ` · ${b.batch_timing}` : ''}
              {b.is_active === false ? ' (inactive)' : ''}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-[var(--cm-color-text-muted)]">
          Links this class batch to a Course Master pricing/timing batch. Fee flows stay on the
          pricing batch.
        </p>
      </AdminFormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminFormField label="Class batch name" required>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Morning Batch A"
            required
          />
        </AdminFormField>
        <AdminFormField label="Code">
          <Input
            value={form.code}
            onChange={(e) => set('code', e.target.value)}
            placeholder="Auto-generated if blank"
          />
        </AdminFormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminFormField label="Start date">
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </AdminFormField>
        <AdminFormField label="End date">
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </AdminFormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminFormField label="Status">
          <Select
            value={form.status}
            onChange={(e) => set('status', e.target.value as BatchStatus)}
          >
            {BATCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </AdminFormField>
        <AdminFormField label="Capacity">
          <Input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => set('capacity', e.target.value)}
            placeholder="Optional"
          />
        </AdminFormField>
      </div>

      <AdminFormField label="Faculty / employee">
        <Select
          value={form.facultyEmployeeId}
          onChange={(e) => set('facultyEmployeeId', e.target.value)}
        >
          <option value="">None</option>
          {faculty.map((f) => (
            <option key={f.id} value={f.id}>
              {f.full_name}
              {f.employee_code ? ` (${f.employee_code})` : ''}
              {f.job_title ? ` · ${f.job_title}` : ''}
            </option>
          ))}
        </Select>
      </AdminFormField>

      <AdminFormField label="Notes">
        <Textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder="Optional notes"
        />
      </AdminFormField>
    </div>
  )
}
