'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { withBasePath } from '@/lib/with-base-path'
import RichTextEditor from '@/components/admin/RichTextEditor'
import ImageUpload from '@/components/admin/ImageUpload'
import AdminFormField from '@/components/admin/AdminFormField'
import FileUploadField from '@/components/forms/FileUploadField'
import { Switch } from '@/components/forms'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import { adminControlClass } from '@/lib/admin-form-ui'
import {
  CourseMasterLevel,
  LEVEL_LABELS,
  isDetailLevel,
  getParentFieldLabel,
  getParentLevels,
} from '@/lib/course-masters'

const COURSE_MASTER_FORM_RULES = {
  title: [{ type: 'required' as const, message: 'Title is required.' }],
  slug: [
    { type: 'required' as const, message: 'Slug is required.' },
    { type: 'slug' as const, message: 'Use lowercase letters, numbers, and hyphens only.' },
  ],
}

export type CourseMasterHierarchyItem = {
  id: number
  title: string
  level_type: CourseMasterLevel
  parent_id: number | null
}

export interface CourseMasterFormData {
  parent_id: number | null
  level_type: CourseMasterLevel
  title: string
  slug: string
  short_description: string
  detailed_description: string
  image_url: string
  brochure_url: string
  syllabus_html: string
  syllabus_pdf_url: string
  demo_class_link: string
  highlights: string[]
  features: string[]
  learning_outcomes: string[]
  eligibility_criteria: string[]
  duration: string
  mode: string
  price: string
  discount_percent: string
  discount_amount: string
  coupon_code: string
  coupon_enabled: boolean
  installment_config: string
  enrollment_validity_days: string
  meta_title: string
  meta_description: string
  display_order: number
  is_active: boolean
  batches: Array<{
    batch_name: string
    batch_timing: string
    schedule_days: string
    start_date: string
    end_date: string
    enrollment_deadline: string
    capacity: string
    notes: string
    is_active: boolean
    display_order: number
    price: string
    discount_percent: string
    discount_amount: string
    coupon_code: string
    coupon_enabled: boolean
    installment_config: string
  }>
  faqs: Array<{ question: string; answer: string; is_active: boolean }>
  faculty: Array<{ name: string; role: string; bio: string; image_url: string }>
}

export const emptyCourseMasterBatch = (display_order = 0) => ({
  batch_name: '',
  batch_timing: '',
  schedule_days: '',
  start_date: '',
  end_date: '',
  enrollment_deadline: '',
  capacity: '',
  notes: '',
  is_active: true,
  display_order,
  price: '',
  discount_percent: '',
  discount_amount: '',
  coupon_code: '',
  coupon_enabled: false,
  installment_config: '',
})

export const emptyCourseMasterForm = (
  level_type: CourseMasterLevel = 'main_course',
  parent_id: number | null = null
): CourseMasterFormData => ({
  parent_id,
  level_type,
  title: '',
  slug: '',
  short_description: '',
  detailed_description: '',
  image_url: '',
  brochure_url: '',
  syllabus_html: '',
  syllabus_pdf_url: '',
  demo_class_link: '',
  highlights: [''],
  features: [''],
  learning_outcomes: [''],
  eligibility_criteria: [''],
  duration: '',
  mode: '',
  price: '',
  discount_percent: '',
  discount_amount: '',
  coupon_code: '',
  coupon_enabled: false,
  installment_config: '',
  enrollment_validity_days: '',
  meta_title: '',
  meta_description: '',
  display_order: 0,
  is_active: true,
  batches: [emptyCourseMasterBatch()],
  faqs: [{ question: '', answer: '', is_active: true }],
  faculty: [{ name: '', role: '', bio: '', image_url: '' }],
})

interface CourseMasterFormProps {
  formData: CourseMasterFormData
  setFormData: React.Dispatch<React.SetStateAction<CourseMasterFormData>>
  hierarchyItems: CourseMasterHierarchyItem[]
  uploadFile: (file: File, folder?: string) => Promise<string | null>
  uploadUrl?: string
  uploadHeaders?: Record<string, string>
}

type FormSectionDef = {
  id: string
  number: number
  title: string
  description: string
  detailOnly?: boolean
}

const FORM_SECTIONS: FormSectionDef[] = [
  {
    id: 'section-hierarchy',
    number: 1,
    title: 'Hierarchy & Identity',
    description: 'Level in the course tree, parent link, title, slug, and visibility.',
  },
  {
    id: 'section-basic',
    number: 2,
    title: 'Basic Information',
    description: 'Short summary and banner image shown on listing and detail pages.',
  },
  {
    id: 'section-content',
    number: 3,
    title: 'Course Content',
    description: 'Detailed description, highlights, features, outcomes, and eligibility.',
    detailOnly: true,
  },
  {
    id: 'section-syllabus',
    number: 4,
    title: 'Syllabus & Resources',
    description: 'Syllabus content, PDFs, brochure, and demo class link.',
    detailOnly: true,
  },
  {
    id: 'section-batches',
    number: 5,
    title: 'Batch Schedule',
    description: 'Create batches for this course — timing, dates, capacity, and deadlines. Set pricing in Course Fee Management.',
    detailOnly: true,
  },
  {
    id: 'section-faqs',
    number: 6,
    title: 'FAQs',
    description: 'Frequently asked questions and answers for this course.',
    detailOnly: true,
  },
  {
    id: 'section-faculty',
    number: 7,
    title: 'Faculty Information',
    description: 'Optional instructors linked to this course.',
    detailOnly: true,
  },
  {
    id: 'section-seo',
    number: 8,
    title: 'SEO Details',
    description: 'Meta title and description for search engines.',
  },
]

function FormSection({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string
  number: number
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="admin-form-section border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      <div className="admin-form-section__header">
        <span className="admin-form-section__number">{number}</span>
        <div>
          <h3 className="admin-form-section__title">{title}</h3>
          <p className="admin-form-section__description">{description}</p>
        </div>
      </div>
      <div className="admin-form-section__body">{children}</div>
    </section>
  )
}

function HierarchyParentPicker({
  levelType,
  parentId,
  onParentIdChange,
  hierarchyItems,
  labelClass,
  inputClass,
}: {
  levelType: CourseMasterLevel
  parentId: number | null
  onParentIdChange: (id: number | null) => void
  hierarchyItems: CourseMasterHierarchyItem[]
  labelClass: string
  inputClass: string
}) {
  const allowedParentLevels = getParentLevels(levelType)
  const parentFieldLabel = getParentFieldLabel(levelType)

  const mainCourses = useMemo(
    () =>
      hierarchyItems
        .filter((i) => i.level_type === 'main_course')
        .sort((a, b) => a.title.localeCompare(b.title)),
    [hierarchyItems]
  )

  const subVariants = useMemo(
    () =>
      hierarchyItems
        .filter((i) => i.level_type === 'sub_variant')
        .sort((a, b) => a.title.localeCompare(b.title)),
    [hierarchyItems]
  )

  const subSubVariants = useMemo(
    () =>
      hierarchyItems
        .filter((i) => i.level_type === 'sub_sub_variant')
        .sort((a, b) => a.title.localeCompare(b.title)),
    [hierarchyItems]
  )

  const [mainCourseId, setMainCourseId] = useState<number | null>(null)
  const [subVariantId, setSubVariantId] = useState<number | null>(null)
  const [subSubVariantId, setSubSubVariantId] = useState<number | null>(null)

  const isCourseLevel = levelType === 'course' || levelType === 'leaf_course'

  const commitCourseParent = (nextSubVariantId: number | null, nextSubSubVariantId: number | null) => {
    if (nextSubSubVariantId) {
      onParentIdChange(nextSubSubVariantId)
      return
    }
    if (nextSubVariantId) {
      onParentIdChange(nextSubVariantId)
      return
    }
    onParentIdChange(null)
  }

  useEffect(() => {
    if (!parentId) {
      if (isCourseLevel) {
        setMainCourseId(null)
        setSubVariantId(null)
        setSubSubVariantId(null)
      }
      return
    }

    if (levelType === 'sub_sub_variant') {
      const subVariant = hierarchyItems.find((i) => i.id === parentId)
      if (subVariant?.parent_id) {
        setMainCourseId(subVariant.parent_id)
      }
      return
    }

    if (!isCourseLevel) return

    const parent = hierarchyItems.find((i) => i.id === parentId)
    if (!parent) return

    if (parent.level_type === 'sub_sub_variant') {
      setSubSubVariantId(parentId)
      setSubVariantId(parent.parent_id)
      const subVariant = hierarchyItems.find((i) => i.id === parent.parent_id)
      if (subVariant?.parent_id) {
        setMainCourseId(subVariant.parent_id)
      }
    } else if (parent.level_type === 'sub_variant') {
      setSubSubVariantId(null)
      setSubVariantId(parentId)
      if (parent.parent_id) {
        setMainCourseId(parent.parent_id)
      }
    }
  }, [levelType, parentId, hierarchyItems, isCourseLevel])

  const filteredSubVariants = useMemo(() => {
    if (mainCourseId == null) return []
    return subVariants.filter((i) => i.parent_id === mainCourseId)
  }, [subVariants, mainCourseId])

  const filteredSubSubVariants = useMemo(() => {
    if (subVariantId == null) return []
    return subSubVariants.filter((i) => i.parent_id === subVariantId)
  }, [subSubVariants, subVariantId])

  if (allowedParentLevels.length === 0) return null

  if (levelType === 'sub_variant') {
    return (
      <div className="admin-form-field md:col-span-2">
        <label className={labelClass}>
          {parentFieldLabel}
          <span className="admin-form-label__required">*</span>
        </label>
        <select
          required
          value={parentId ?? ''}
          onChange={(e) => {
            const value = e.target.value
            onParentIdChange(value ? parseInt(value, 10) : null)
          }}
          className={inputClass}
        >
          <option value="">Select {parentFieldLabel.toLowerCase()}</option>
          {mainCourses.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <p className="admin-form-hint">
          Links this sub course variant under the selected main course.
        </p>
      </div>
    )
  }

  if (levelType === 'sub_sub_variant') {
    return (
      <>
        <div className="admin-form-field md:col-span-2">
          <label className={labelClass}>
            Main Course
            <span className="admin-form-label__required">*</span>
          </label>
          <select
            required
            value={mainCourseId ?? ''}
            onChange={(e) => {
              const value = e.target.value
              const nextMainCourseId = value ? parseInt(value, 10) : null
              setMainCourseId(nextMainCourseId)
              if (parentId) {
                const subVariant = hierarchyItems.find((i) => i.id === parentId)
                if (subVariant?.parent_id !== nextMainCourseId) {
                  onParentIdChange(null)
                }
              }
            }}
            className={inputClass}
          >
            <option value="">Select main course</option>
            {mainCourses.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-form-field md:col-span-2">
          <label className={labelClass}>
            {parentFieldLabel}
            <span className="admin-form-label__required">*</span>
          </label>
          <select
            required
            disabled={mainCourseId == null}
            value={parentId ?? ''}
            onChange={(e) => {
              const value = e.target.value
              onParentIdChange(value ? parseInt(value, 10) : null)
            }}
            className={`${inputClass}${mainCourseId == null ? ' opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">
              {mainCourseId ? `Select ${parentFieldLabel.toLowerCase()}` : 'Select main course first'}
            </option>
            {filteredSubVariants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <p className="admin-form-hint">
            Choose the main course first, then pick which sub course variant this sub-sub variant belongs to.
          </p>
        </div>
      </>
    )
  }

  if (isCourseLevel) {
    return (
      <>
        <div className="admin-form-field md:col-span-2">
          <label className={labelClass}>
            Main Course
            <span className="admin-form-label__required">*</span>
          </label>
          <select
            required
            value={mainCourseId ?? ''}
            onChange={(e) => {
              const value = e.target.value
              const nextMainCourseId = value ? parseInt(value, 10) : null
              setMainCourseId(nextMainCourseId)
              setSubVariantId(null)
              setSubSubVariantId(null)
              onParentIdChange(null)
            }}
            className={inputClass}
          >
            <option value="">Select main course</option>
            {mainCourses.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-form-field md:col-span-2">
          <label className={labelClass}>
            {LEVEL_LABELS.sub_variant}
            <span className="admin-form-label__required">*</span>
          </label>
          <select
            required
            disabled={mainCourseId == null}
            value={subVariantId ?? ''}
            onChange={(e) => {
              const value = e.target.value
              const nextSubVariantId = value ? parseInt(value, 10) : null
              setSubVariantId(nextSubVariantId)
              setSubSubVariantId(null)
              commitCourseParent(nextSubVariantId, null)
            }}
            className={`${inputClass}${mainCourseId == null ? ' opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">
              {mainCourseId ? `Select ${LEVEL_LABELS.sub_variant.toLowerCase()}` : 'Select main course first'}
            </option>
            {filteredSubVariants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-form-field md:col-span-2">
          <label className={labelClass}>{LEVEL_LABELS.sub_sub_variant} (optional)</label>
          <select
            disabled={subVariantId == null}
            value={subSubVariantId ?? ''}
            onChange={(e) => {
              const value = e.target.value
              const nextSubSubVariantId = value ? parseInt(value, 10) : null
              setSubSubVariantId(nextSubSubVariantId)
              commitCourseParent(subVariantId, nextSubSubVariantId)
            }}
            className={`${inputClass}${subVariantId == null ? ' opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">
              {subVariantId
                ? filteredSubSubVariants.length > 0
                  ? `None — link directly under ${LEVEL_LABELS.sub_variant.toLowerCase()}`
                  : `No ${LEVEL_LABELS.sub_sub_variant.toLowerCase()} for this variant`
                : `Select ${LEVEL_LABELS.sub_variant.toLowerCase()} first`}
            </option>
            {filteredSubSubVariants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <p className="admin-form-hint">
            Main course and sub course variant are required. Sub-sub variant is optional — leave empty to attach
            this course directly under the sub course variant.
          </p>
        </div>
      </>
    )
  }

  const parentOptions = hierarchyItems
    .filter((i) => allowedParentLevels.includes(i.level_type))
    .sort((a, b) => a.title.localeCompare(b.title))

  if (parentOptions.length === 0) return null

  return (
    <div className="admin-form-field md:col-span-2">
      <label className={labelClass}>
        {parentFieldLabel}
        <span className="admin-form-label__required">*</span>
      </label>
      <select
        required
        value={parentId ?? ''}
        onChange={(e) => {
          const value = e.target.value
          onParentIdChange(value ? parseInt(value, 10) : null)
        }}
        className={inputClass}
      >
        <option value="">Select {parentFieldLabel.toLowerCase()}</option>
        {parentOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      <p className="admin-form-hint">
        Links this {LEVEL_LABELS[levelType].toLowerCase()} under the selected {parentFieldLabel.toLowerCase()}.
      </p>
    </div>
  )
}

function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items]
                next[index] = e.target.value
                onChange(next)
              }}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="text-sm text-purple-600 dark:text-purple-400 font-medium"
        >
          + Add item
        </button>
      </div>
    </div>
  )
}

export default function CourseMasterForm({
  formData,
  setFormData,
  hierarchyItems,
  uploadFile,
  uploadUrl = withBasePath('/api/super-admin/upload'),
  uploadHeaders,
}: CourseMasterFormProps) {
  const showDetail = isDetailLevel(formData.level_type)
  const baselineRef = useRef(JSON.stringify(formData))
  const { errors, clearFieldError } = useAdminFormValidation(
    { title: formData.title, slug: formData.slug },
    COURSE_MASTER_FORM_RULES
  )

  // Warn before discarding unsaved edits (browser tab close / refresh).
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(formData) === baselineRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [formData])

  const inputClass = 'admin-form-control'

  const labelClass = 'admin-form-label'

  const subPanelClass =
    'p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/80 dark:bg-gray-800/40'

  const visibleSections = useMemo(
    () =>
      FORM_SECTIONS.filter((section) => showDetail || !section.detailOnly).map((section, index) => ({
        ...section,
        displayNumber: index + 1,
      })),
    [showDetail]
  )

  const seoSectionNumber = visibleSections.find((s) => s.id === 'section-seo')?.displayNumber ?? 3

  const handlePdfUpload = async (file: File, field: 'brochure_url' | 'syllabus_pdf_url') => {
    const url = await uploadFile(file, 'course-masters/docs')
    if (url) setFormData((prev) => ({ ...prev, [field]: url }))
  }

  return (
    <div className="space-y-4">
      <nav
        className="admin-form-section-nav border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
        aria-label="Course form sections"
      >
        {visibleSections.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="admin-form-section-nav__link">
            <span>{section.displayNumber}.</span>
            <span>{section.title}</span>
          </a>
        ))}
      </nav>

      {!showDetail ? (
        <div className="admin-form-section-note border border-dashed border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-100">
          You are editing a <strong className="text-purple-950 dark:text-purple-50">{LEVEL_LABELS[formData.level_type]}</strong> node. Full course
          details (content, batches, FAQs, faculty) are available on the{' '}
          <strong className="text-purple-950 dark:text-purple-50">Course</strong> level only. Pricing is managed in{' '}
          <strong className="text-purple-950 dark:text-purple-50">Course Fee Management</strong>.
        </div>
      ) : null}

      <FormSection
        id="section-hierarchy"
        number={1}
        title="Hierarchy & Identity"
        description="Level in the course tree, parent link, title, slug, and visibility."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HierarchyParentPicker
            levelType={formData.level_type}
            parentId={formData.parent_id}
            onParentIdChange={(parent_id) => setFormData({ ...formData, parent_id })}
            hierarchyItems={hierarchyItems}
            labelClass={labelClass}
            inputClass={inputClass}
          />
          <div className="admin-form-field">
            <label className={labelClass}>Level Type</label>
            <input
              type="text"
              readOnly
              value={LEVEL_LABELS[formData.level_type]}
              className={`${inputClass} admin-form-control--readonly`}
            />
          </div>
          <div className="md:col-span-2">
            <AdminFormField label="Course Title" required error={errors.title}>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => {
                  clearFieldError('title')
                  setFormData({ ...formData, title: e.target.value })
                }}
                className={adminControlClass(errors, 'title', inputClass)}
              />
            </AdminFormField>
          </div>
          <div>
            <AdminFormField label="URL Slug" error={errors.slug}>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => {
                  clearFieldError('slug')
                  setFormData({ ...formData, slug: e.target.value })
                }}
                placeholder="Auto-generated from title if empty"
                className={adminControlClass(errors, 'slug', inputClass)}
              />
            </AdminFormField>
          </div>
          <div className="admin-form-field">
            <label className={labelClass}>Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <Switch
              id="is_active"
              label="Active"
              hint="Inactive courses are hidden from public listings"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        id="section-basic"
        number={2}
        title="Basic Information"
        description="Short summary and banner image shown on listing and detail pages."
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Short Description</label>
            <textarea
              rows={3}
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              className={inputClass}
            />
          </div>
          <ImageUpload
            label="Course Image / Banner"
            value={formData.image_url}
            onChange={(url) => setFormData({ ...formData, image_url: url })}
            folder="course-masters/images"
            uploadUrl={uploadUrl}
            uploadHeaders={uploadHeaders}
          />
          {showDetail ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Course Duration</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g. 6 months"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Course Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select mode</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </FormSection>

      {showDetail ? (
        <>
          <FormSection
            id="section-content"
            number={3}
            title="Course Content"
            description="Detailed description, highlights, features, outcomes, and eligibility."
          >
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Detailed Description</label>
                <RichTextEditor
                  value={formData.detailed_description}
                  onChange={(v) => setFormData({ ...formData, detailed_description: v })}
                  minHeight="240px"
                />
              </div>
              <StringListEditor
                label="Course Highlights"
                items={formData.highlights}
                onChange={(highlights) => setFormData({ ...formData, highlights })}
                placeholder="e.g. 100+ mock tests"
              />
              <StringListEditor
                label="Course Features"
                items={formData.features}
                onChange={(features) => setFormData({ ...formData, features })}
              />
              <StringListEditor
                label="Learning Outcomes"
                items={formData.learning_outcomes}
                onChange={(learning_outcomes) => setFormData({ ...formData, learning_outcomes })}
              />
              <StringListEditor
                label="Eligibility Criteria"
                items={formData.eligibility_criteria}
                onChange={(eligibility_criteria) => setFormData({ ...formData, eligibility_criteria })}
              />
            </div>
          </FormSection>

          <FormSection
            id="section-syllabus"
            number={4}
            title="Syllabus & Resources"
            description="Syllabus content, PDFs, brochure, and demo class link."
          >
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Course Syllabus (HTML)</label>
                <RichTextEditor
                  value={formData.syllabus_html}
                  onChange={(v) => setFormData({ ...formData, syllabus_html: v })}
                  minHeight="200px"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadField
                  label="Syllabus PDF"
                  value={formData.syllabus_pdf_url}
                  accept="application/pdf,.pdf"
                  formatHint="PDF only"
                  helpText="Upload the course syllabus as a PDF"
                  previewLabel="View syllabus PDF"
                  onFile={(file) => handlePdfUpload(file, 'syllabus_pdf_url')}
                  onClear={() => setFormData((prev) => ({ ...prev, syllabus_pdf_url: '' }))}
                />
                <FileUploadField
                  label="Course Brochure PDF (optional)"
                  value={formData.brochure_url}
                  accept="application/pdf,.pdf"
                  formatHint="PDF only"
                  helpText="Optional brochure for download on the course page"
                  previewLabel="View brochure"
                  onFile={(file) => handlePdfUpload(file, 'brochure_url')}
                  onClear={() => setFormData((prev) => ({ ...prev, brochure_url: '' }))}
                />
              </div>
              <div>
                <label className={labelClass}>Demo Class Link (optional)</label>
                <input
                  type="url"
                  value={formData.demo_class_link}
                  onChange={(e) => setFormData({ ...formData, demo_class_link: e.target.value })}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            id="section-batches"
            number={5}
            title="Batch Schedule"
            description="Create batches for this course — timing, dates, capacity, and deadlines. Set pricing in Course Fee Management."
          >
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-800 dark:bg-purple-950/40">
              <p className="text-sm text-purple-900 dark:text-purple-100">
                Batches for course:{' '}
                <strong>{formData.title.trim() || 'Untitled course'}</strong>
              </p>
              <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">
                Batch schedule is saved here. Batch-wise pricing is configured in{' '}
                <strong>Course Fee Management</strong> when batches exist.
              </p>
            </div>
            <div className="space-y-4">
              {formData.batches.map((batch, index) => (
                <div key={index} className={`${subPanelClass} space-y-3`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Batch {index + 1}
                    </span>
                    {formData.batches.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            batches: formData.batches.filter((_, i) => i !== index),
                          })
                        }
                        className="text-red-600 dark:text-red-400 text-sm hover:underline"
                      >
                        Remove batch
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Batch name</label>
                      <input
                        type="text"
                        placeholder="e.g. Weekend Batch, Morning Batch A"
                        value={batch.batch_name}
                        onChange={(e) => {
                          const batches = [...formData.batches]
                          batches[index].batch_name = e.target.value
                          setFormData({ ...formData, batches })
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Batch timing</label>
                      <input
                        type="text"
                        placeholder="e.g. Weekday Morning, Sat–Sun Evening"
                        value={batch.batch_timing}
                        onChange={(e) => {
                          const batches = [...formData.batches]
                          batches[index].batch_timing = e.target.value
                          setFormData({ ...formData, batches })
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Schedule days</label>
                      <input
                        type="text"
                        placeholder="e.g. Mon–Fri, Sat–Sun"
                        value={batch.schedule_days}
                        onChange={(e) => {
                          const batches = [...formData.batches]
                          batches[index].schedule_days = e.target.value
                          setFormData({ ...formData, batches })
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Capacity (optional)</label>
                      <input
                        type="number"
                        min={1}
                        placeholder="Max seats"
                        value={batch.capacity}
                        onChange={(e) => {
                          const batches = [...formData.batches]
                          batches[index].capacity = e.target.value
                          setFormData({ ...formData, batches })
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Start date</label>
                      <input
                        type="date"
                        value={batch.start_date}
                        onChange={(e) => {
                          const batches = [...formData.batches]
                          batches[index].start_date = e.target.value
                          setFormData({ ...formData, batches })
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>End date</label>
                      <input
                        type="date"
                        value={batch.end_date}
                        onChange={(e) => {
                          const batches = [...formData.batches]
                          batches[index].end_date = e.target.value
                          setFormData({ ...formData, batches })
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Enrollment deadline</label>
                      <input
                        type="date"
                        value={batch.enrollment_deadline}
                        onChange={(e) => {
                          const batches = [...formData.batches]
                          batches[index].enrollment_deadline = e.target.value
                          setFormData({ ...formData, batches })
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <input
                        id={`batch-active-${index}`}
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-600"
                        checked={batch.is_active}
                        onChange={(e) => {
                          const batches = [...formData.batches]
                          batches[index].is_active = e.target.checked
                          setFormData({ ...formData, batches })
                        }}
                      />
                      <label
                        htmlFor={`batch-active-${index}`}
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Active batch
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Notes (optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Extra details shown to admins or on the course page"
                      value={batch.notes}
                      onChange={(e) => {
                        const batches = [...formData.batches]
                        batches[index].notes = e.target.value
                        setFormData({ ...formData, batches })
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    batches: [...formData.batches, emptyCourseMasterBatch(formData.batches.length)],
                  })
                }
                className="text-purple-600 dark:text-purple-400 text-sm font-medium hover:underline"
              >
                + Add another batch
              </button>
            </div>
          </FormSection>

          <FormSection
            id="section-faqs"
            number={6}
            title="FAQs"
            description="Frequently asked questions and answers for this course."
          >
            <div className="space-y-3">
              {formData.faqs.map((faq, index) => (
                <div key={index} className={`${subPanelClass} space-y-2`}>
                  <input
                    type="text"
                    placeholder="Question"
                    value={faq.question}
                    onChange={(e) => {
                      const faqs = [...formData.faqs]
                      faqs[index].question = e.target.value
                      setFormData({ ...formData, faqs })
                    }}
                    className={inputClass}
                  />
                  <textarea
                    rows={2}
                    placeholder="Answer"
                    value={faq.answer}
                    onChange={(e) => {
                      const faqs = [...formData.faqs]
                      faqs[index].answer = e.target.value
                      setFormData({ ...formData, faqs })
                    }}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, faqs: formData.faqs.filter((_, i) => i !== index) })}
                    className="text-red-600 dark:text-red-400 text-sm hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    faqs: [...formData.faqs, { question: '', answer: '', is_active: true }],
                  })
                }
                className="text-purple-600 dark:text-purple-400 text-sm font-medium hover:underline"
              >
                + Add FAQ
              </button>
            </div>
          </FormSection>

          <FormSection
            id="section-faculty"
            number={7}
            title="Faculty Information"
            description="Optional instructors linked to this course."
          >
            <div className="space-y-4">
              {formData.faculty.map((member, index) => (
                <div
                  key={index}
                  className={`${subPanelClass} grid grid-cols-1 md:grid-cols-2 gap-3`}
                >
                  <input
                    type="text"
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => {
                      const faculty = [...formData.faculty]
                      faculty[index].name = e.target.value
                      setFormData({ ...formData, faculty })
                    }}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Role"
                    value={member.role}
                    onChange={(e) => {
                      const faculty = [...formData.faculty]
                      faculty[index].role = e.target.value
                      setFormData({ ...formData, faculty })
                    }}
                    className={inputClass}
                  />
                  <textarea
                    rows={2}
                    placeholder="Bio"
                    value={member.bio}
                    onChange={(e) => {
                      const faculty = [...formData.faculty]
                      faculty[index].bio = e.target.value
                      setFormData({ ...formData, faculty })
                    }}
                    className={`${inputClass} md:col-span-2`}
                  />
                  <ImageUpload
                    label="Faculty photo"
                    value={member.image_url}
                    onChange={(url) => {
                      const faculty = [...formData.faculty]
                      faculty[index].image_url = url
                      setFormData({ ...formData, faculty })
                    }}
                    folder="course-masters/faculty"
                    uploadUrl={uploadUrl}
                    uploadHeaders={uploadHeaders}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, faculty: formData.faculty.filter((_, i) => i !== index) })
                    }
                    className="text-red-600 dark:text-red-400 text-sm md:col-span-2 text-left hover:underline"
                  >
                    Remove faculty
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    faculty: [...formData.faculty, { name: '', role: '', bio: '', image_url: '' }],
                  })
                }
                className="text-purple-600 dark:text-purple-400 text-sm font-medium hover:underline"
              >
                + Add faculty
              </button>
            </div>
          </FormSection>
        </>
      ) : null}

      <FormSection
        id="section-seo"
        number={seoSectionNumber}
        title="SEO Details"
        description="Meta title and description for search engines."
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Meta Title</label>
            <input
              type="text"
              value={formData.meta_title}
              onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Meta Description</label>
            <textarea
              rows={3}
              value={formData.meta_description}
              onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </FormSection>
    </div>
  )
}

export function courseMasterFormToPayload(form: CourseMasterFormData) {
  return {
    parent_id: form.parent_id,
    level_type: form.level_type === 'leaf_course' ? 'course' : form.level_type,
    title: form.title,
    slug: form.slug || undefined,
    short_description: form.short_description || undefined,
    detailed_description: form.detailed_description || undefined,
    image_url: form.image_url || undefined,
    brochure_url: form.brochure_url || undefined,
    syllabus_html: form.syllabus_html || undefined,
    syllabus_pdf_url: form.syllabus_pdf_url || undefined,
    demo_class_link: form.demo_class_link || undefined,
    highlights: form.highlights.filter(Boolean),
    features: form.features.filter(Boolean),
    learning_outcomes: form.learning_outcomes.filter(Boolean),
    eligibility_criteria: form.eligibility_criteria.filter(Boolean),
    duration: form.duration || undefined,
    mode: form.mode || undefined,
    meta_title: form.meta_title || undefined,
    meta_description: form.meta_description || undefined,
    display_order: form.display_order,
    is_active: form.is_active,
    batches: form.batches
      .filter((b) => b.start_date)
      .map((b, i) => ({
        batch_name: b.batch_name.trim() || undefined,
        batch_timing: b.batch_timing.trim() || undefined,
        schedule_days: b.schedule_days.trim() || undefined,
        start_date: b.start_date,
        end_date: b.end_date || undefined,
        enrollment_deadline: b.enrollment_deadline || undefined,
        capacity: b.capacity ? parseInt(b.capacity, 10) : undefined,
        notes: b.notes.trim() || undefined,
        is_active: b.is_active,
        display_order: i,
      })),
    faqs: form.faqs.filter((f) => f.question.trim()),
    faculty: form.faculty.filter((f) => f.name.trim()),
  }
}

export function courseMasterToForm(data: any): CourseMasterFormData {
  return {
    parent_id: data.parent_id ?? null,
    level_type: data.level_type,
    title: data.title || '',
    slug: data.slug || '',
    short_description: data.short_description || '',
    detailed_description: data.detailed_description || '',
    image_url: data.image_url || '',
    brochure_url: data.brochure_url || '',
    syllabus_html: data.syllabus_html || '',
    syllabus_pdf_url: data.syllabus_pdf_url || '',
    demo_class_link: data.demo_class_link || '',
    highlights: Array.isArray(data.highlights) && data.highlights.length ? data.highlights : [''],
    features: Array.isArray(data.features) && data.features.length ? data.features : [''],
    learning_outcomes:
      Array.isArray(data.learning_outcomes) && data.learning_outcomes.length ? data.learning_outcomes : [''],
    eligibility_criteria:
      Array.isArray(data.eligibility_criteria) && data.eligibility_criteria.length
        ? data.eligibility_criteria
        : [''],
    duration: data.duration || '',
    mode: data.mode || '',
    price: data.price != null ? String(data.price) : '',
    discount_percent: data.discount_percent != null ? String(data.discount_percent) : '',
    discount_amount: data.discount_amount != null ? String(data.discount_amount) : '',
    coupon_code: data.coupon_code || '',
    coupon_enabled: !!data.coupon_enabled,
    installment_config: data.installment_config ? JSON.stringify(data.installment_config, null, 2) : '',
    enrollment_validity_days: data.enrollment_validity_days != null ? String(data.enrollment_validity_days) : '',
    meta_title: data.meta_title || '',
    meta_description: data.meta_description || '',
    display_order: data.display_order ?? 0,
    is_active: data.is_active !== false,
    batches: data.batches?.length
      ? data.batches.map((b: any, i: number) => ({
        batch_name: b.batch_name || '',
        batch_timing: b.batch_timing || '',
        schedule_days: b.schedule_days || '',
        start_date: b.start_date ? String(b.start_date).slice(0, 10) : '',
        end_date: b.end_date ? String(b.end_date).slice(0, 10) : '',
        enrollment_deadline: b.enrollment_deadline
          ? String(b.enrollment_deadline).slice(0, 10)
          : '',
        capacity: b.capacity != null ? String(b.capacity) : '',
        price: b.price != null ? String(b.price) : '',
        discount_percent: b.discount_percent != null ? String(b.discount_percent) : '',
        discount_amount: b.discount_amount != null ? String(b.discount_amount) : '',
        coupon_code: b.coupon_code || '',
        coupon_enabled: !!b.coupon_enabled,
        installment_config: b.installment_config ? JSON.stringify(b.installment_config, null, 2) : '',
        notes: b.notes || '',
        is_active: b.is_active !== false,
        display_order: b.display_order ?? i,
      }))
      : [emptyCourseMasterBatch()],
    faqs: data.faqs?.length
      ? data.faqs.map((f: any) => ({
        question: f.question || '',
        answer: f.answer || '',
        is_active: f.is_active !== false,
      }))
      : [{ question: '', answer: '', is_active: true }],
    faculty: data.faculty?.length
      ? data.faculty.map((f: any) => ({
        name: f.name || '',
        role: f.role || '',
        bio: f.bio || '',
        image_url: f.image_url || '',
      }))
      : [{ name: '', role: '', bio: '', image_url: '' }],
  }
}
