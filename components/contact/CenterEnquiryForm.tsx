'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { submitCentreEnquiry } from '@/lib/submit-centre-enquiry'
import type { CenterEnquiryCourseOption } from '@/lib/center-enquiry-courses'
import { getCourseTypesByCategory, type EnquiryCourseType } from '@/lib/enquiry-course-types'
import {
  isPlainTextSafe,
  isValidPersonName,
  PERSON_NAME_INVALID_MESSAGE,
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_REGEX,
  PLAIN_TEXT_UNSAFE_MESSAGE,
} from '@/lib/safeFormText'

type FormData = {
  name: string
  course: string
  courseVariant: string
  mobile: string
  email: string
  message: string
}

type CenterEnquiryFormProps = {
  centerSlug: string
  centerName?: string
  centerManagerId: number
  formSource?: string
  layout?: 'hero' | 'card' | 'widget'
  courseOptions: CenterEnquiryCourseOption[]
}

const INITIAL: FormData = {
  name: '',
  course: '',
  courseVariant: '',
  mobile: '',
  email: '',
  message: '',
}

export default function CenterEnquiryForm({
  centerManagerId,
  formSource = 'Centre - Enquiry',
  layout = 'hero',
  courseOptions,
}: CenterEnquiryFormProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL)
  const [courseTypes, setCourseTypes] = useState<EnquiryCourseType[]>([])
  const [loadingCourseTypes, setLoadingCourseTypes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [formAlert, setFormAlert] = useState<string | null>(null)

  const fieldId = (name: string) => `enquiry-${layout}-${name}`

  useEffect(() => {
    if (!formData.course) {
      setCourseTypes([])
      return
    }

    let cancelled = false
    const loadTypes = async () => {
      try {
        setLoadingCourseTypes(true)
        const types = await getCourseTypesByCategory(formData.course)
        if (!cancelled) setCourseTypes(types)
      } catch {
        if (!cancelled) setCourseTypes([])
      } finally {
        if (!cancelled) setLoadingCourseTypes(false)
      }
    }

    loadTypes()
    return () => {
      cancelled = true
    }
  }, [formData.course])

  const validateField = useCallback(
    (fieldName: string, value: string): string | null => {
      switch (fieldName) {
        case 'name':
          if (!value.trim()) return 'Name is required'
          if (value.trim().length < 2) return 'Name must be at least 2 characters'
          if (value.length > PERSON_NAME_MAX_LENGTH) {
            return `Name cannot exceed ${PERSON_NAME_MAX_LENGTH} characters`
          }
          if (!PERSON_NAME_REGEX.test(value)) return PERSON_NAME_INVALID_MESSAGE
          if (!isValidPersonName(value)) return PERSON_NAME_INVALID_MESSAGE
          return null
        case 'mobile':
          if (!value.trim()) return 'Mobile number is required'
          if (!/^[6-9][0-9]{9}$/.test(value)) {
            return 'Enter a valid 10-digit mobile number starting with 6-9'
          }
          return null
        case 'email':
          if (!value.trim()) return null
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address'
          return null
        case 'course':
          if (!value) return 'Please select a course'
          return null
        case 'courseVariant':
          if (courseTypes.length > 0 && !value) return 'Please select a course variant'
          return null
        case 'message':
          if (value && !isPlainTextSafe(value)) return PLAIN_TEXT_UNSAFE_MESSAGE
          if (value.length > 2000) return 'Message cannot exceed 2000 characters'
          return null
        default:
          return null
      }
    },
    [courseTypes.length],
  )

  const validateAll = useCallback(() => {
    const fields = ['name', 'mobile', 'email', 'course', 'courseVariant', 'message'] as const
    const nextErrors: Record<string, string> = {}
    let ok = true
    for (const field of fields) {
      const err = validateField(field, formData[field])
      if (err) {
        nextErrors[field] = err
        ok = false
      }
    }
    setErrors(nextErrors)
    setTouched(Object.fromEntries(fields.map((f) => [f, true])))
    return ok
  }, [formData, validateField])

  const handleChange = (name: keyof FormData, value: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    setFormData((prev) => {
      if (name === 'course') {
        return { ...prev, course: value, courseVariant: '' }
      }
      return { ...prev, [name]: value }
    })
    if (touched[name] || name === 'course') {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, value) || '',
        ...(name === 'course' ? { courseVariant: '' } : {}),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormAlert(null)
    if (!validateAll()) return

    const courseLabel = courseSelectOptions.find((o) => o.value === formData.course)?.label
    const variantLabel = courseTypes.find((t) => String(t.id) === formData.courseVariant)?.name
    const courseName = [courseLabel || formData.course, variantLabel].filter(Boolean).join(' — ')

    try {
      setSubmitting(true)
      await submitCentreEnquiry({
        centerManagerId,
        fullName: formData.name.trim(),
        phone: formData.mobile.trim(),
        email: formData.email.trim() || undefined,
        courseName: courseName || undefined,
        message: formData.message.trim() || undefined,
        formSource,
      })
      setFormData(INITIAL)
      setCourseTypes([])
      setTouched({})
      setErrors({})
      setShowSuccessModal(true)
    } catch (err) {
      setFormAlert(err instanceof Error ? err.message : 'Failed to submit enquiry')
    } finally {
      setSubmitting(false)
    }
  }

  const courseSelectOptions = useMemo(
    () =>
      courseOptions.map((c) => ({
        value: String(c.categoryMasterId),
        label: c.name,
      })),
    [courseOptions],
  )

  const isWidget = layout === 'widget'
  const inputWrap = layout === 'card' ? 'mb-3 grid gap-1' : 'grid gap-1'
  const heroFullCol = layout === 'hero' ? 'sm:col-span-2' : undefined
  const variantDisabled = !formData.course || loadingCourseTypes
  const variantPlaceholder = !formData.course
    ? 'Select course first'
    : loadingCourseTypes
      ? 'Loading variants…'
      : courseTypes.length === 0
        ? 'No variants available'
        : 'Select course variant *'
  const fieldError = (name: keyof FormData) => (touched[name] && errors[name] ? errors[name] : '')
  const fieldClass = (name: keyof FormData) =>
    [layout === 'card' ? 'form-control' : undefined, fieldError(name) ? 'is-invalid' : '']
      .filter(Boolean)
      .join(' ')

  if (courseSelectOptions.length === 0) {
    return (
      <p className="text-muted mb-0" role="status">
        No courses are configured for this center yet. Please contact the center directly.
      </p>
    )
  }

  if (isWidget && showSuccessModal) {
    return (
      <div className="enquiry-app-success" role="status">
        <i className="ri-checkbox-circle-fill" aria-hidden />
        <h3>Enquiry submitted</h3>
        <p>Thank you. Our academic team will contact you shortly.</p>
        <button type="button" className="pub-btn" onClick={() => setShowSuccessModal(false)}>
          Send another enquiry
        </button>
      </div>
    )
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={isWidget ? 'enquiry-app-form' : layout === 'card' ? 'contact-page-form' : 'hero-enquiry-form'}
        noValidate
        aria-label="Centre enquiry form"
      >
        {formAlert ? (
          <div role="alert" className={isWidget ? 'enquiry-app-alert' : 'text-danger d-block mb-2'}>
            {formAlert}
          </div>
        ) : null}

        {isWidget ? (
          <>
            <div className="enquiry-app-form__fields">
              <label className="enquiry-field" htmlFor={fieldId('name')}>
                <span>Full name</span>
                <input
                  id={fieldId('name')}
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  maxLength={PERSON_NAME_MAX_LENGTH}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  aria-invalid={Boolean(fieldError('name'))}
                  required
                />
                {fieldError('name') ? <em>{fieldError('name')}</em> : null}
              </label>
              <label className="enquiry-field" htmlFor={fieldId('mobile')}>
                <span>Mobile number</span>
                <input
                  id={fieldId('mobile')}
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  aria-invalid={Boolean(fieldError('mobile'))}
                  required
                />
                {fieldError('mobile') ? <em>{fieldError('mobile')}</em> : null}
              </label>
              <label className="enquiry-field" htmlFor={fieldId('email')}>
                <span>Email <small>optional</small></span>
                <input
                  id={fieldId('email')}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  aria-invalid={Boolean(fieldError('email'))}
                />
                {fieldError('email') ? <em>{fieldError('email')}</em> : null}
              </label>
              <label className="enquiry-field" htmlFor={fieldId('course')}>
                <span>Course</span>
                <select
                  id={fieldId('course')}
                  name="course"
                  value={formData.course}
                  onChange={(e) => handleChange('course', e.target.value)}
                  aria-invalid={Boolean(fieldError('course'))}
                  required
                >
                  <option value="">Choose a programme</option>
                  {courseSelectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fieldError('course') ? <em>{fieldError('course')}</em> : null}
              </label>
              <label className="enquiry-field" htmlFor={fieldId('courseVariant')}>
                <span>Course type</span>
                <select
                  id={fieldId('courseVariant')}
                  name="courseVariant"
                  value={formData.courseVariant}
                  onChange={(e) => handleChange('courseVariant', e.target.value)}
                  disabled={variantDisabled || courseTypes.length === 0}
                  required={courseTypes.length > 0}
                  aria-invalid={Boolean(fieldError('courseVariant'))}
                >
                  <option value="">{variantPlaceholder}</option>
                  {courseTypes.map((type) => (
                    <option key={type.id} value={String(type.id)}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {fieldError('courseVariant') ? <em>{fieldError('courseVariant')}</em> : null}
              </label>
              <label className="enquiry-field enquiry-field--full" htmlFor={fieldId('message')}>
                <span>Message <small>optional</small></span>
                <textarea
                  id={fieldId('message')}
                  name="message"
                  rows={3}
                  placeholder="Tell us your exam goal or preferred batch"
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  aria-invalid={Boolean(fieldError('message'))}
                />
                {fieldError('message') ? <em>{fieldError('message')}</em> : null}
              </label>
            </div>
            <div className="enquiry-app-form__actions">
              <button type="submit" className="pub-btn w-full" disabled={submitting}>
                {submitting ? 'Sending…' : 'Submit enquiry'}
              </button>
              <p>A counsellor will call you on the mobile number you share.</p>
            </div>
          </>
        ) : (
          <div className={layout === 'hero' ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
            <div>
              <div className={inputWrap}>
                <label htmlFor={fieldId('name')} className="visually-hidden">
                  Your name (required)
                </label>
                <input
                  id={fieldId('name')}
                  className={fieldClass('name')}
                  name="name"
                  type="text"
                  placeholder="Your Name *"
                  maxLength={PERSON_NAME_MAX_LENGTH}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <div className={inputWrap}>
                <label htmlFor={fieldId('mobile')} className="visually-hidden">
                  Mobile number (required)
                </label>
                <input
                  id={fieldId('mobile')}
                  className={fieldClass('mobile')}
                  name="mobile"
                  type="tel"
                  placeholder="Your Mobile Number *"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                />
              </div>
            </div>
            <div>
              <div className={inputWrap}>
                <label htmlFor={fieldId('course')} className="visually-hidden">
                  Course (required)
                </label>
                <select
                  id={fieldId('course')}
                  className={fieldClass('course')}
                  name="course"
                  value={formData.course}
                  onChange={(e) => handleChange('course', e.target.value)}
                  required
                >
                  <option value="">Select Course *</option>
                  {courseSelectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className={inputWrap}>
                <label htmlFor={fieldId('courseVariant')} className="visually-hidden">
                  Course variant
                </label>
                <select
                  id={fieldId('courseVariant')}
                  className={fieldClass('courseVariant')}
                  name="courseVariant"
                  value={formData.courseVariant}
                  onChange={(e) => handleChange('courseVariant', e.target.value)}
                  disabled={variantDisabled || courseTypes.length === 0}
                  required={courseTypes.length > 0}
                >
                  <option value="">{variantPlaceholder}</option>
                  {courseTypes.map((type) => (
                    <option key={type.id} value={String(type.id)}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={heroFullCol}>
              <div className={inputWrap}>
                <input
                  id={fieldId('email')}
                  className={fieldClass('email')}
                  name="email"
                  type="email"
                  placeholder="Your Email ID"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>
            <div className={heroFullCol}>
              <div className={inputWrap}>
                <textarea
                  id={fieldId('message')}
                  className={fieldClass('message')}
                  name="message"
                  rows={4}
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                />
              </div>
            </div>
            <div className={heroFullCol}>
              <button
                type="submit"
                className={layout === 'card' ? 'pub-btn mt-2' : 'pub-btn w-full'}
                disabled={submitting}
              >
                {submitting ? 'Please wait…' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </form>

      {!isWidget &&
        showSuccessModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="enquiry-success-modal" role="dialog" aria-modal="true">
            <div className="enquiry-success-modal__card">
              <h5>Thank you!</h5>
              <p>Your enquiry has been submitted. We will contact you soon.</p>
              <button type="button" className="pub-btn" onClick={() => setShowSuccessModal(false)}>
                Close
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
