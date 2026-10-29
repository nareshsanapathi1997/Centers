'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { withBasePathHref } from '@/lib/with-base-path'
import { PRELOGIN_API_BASE_URL } from '@/lib/prelogin-api-base'
import { buildTeemsProgramEnrollLink } from '@/lib/teems-program-links'
import {
  fetchCourseFeaturesByIds,
  type CourseFeatureRow,
  type TeemsCompareCourse,
} from '@/lib/teems-compare-courses'
import { hasValidCoursePrice, shouldShowStrikethroughOriginal } from '@/lib/teems-course-display'
import './CompareCoursesModal.css'

function CompareEnrollButton({
  course,
  centerSlug,
}: {
  course: TeemsCompareCourse
  centerSlug: string
}) {
  const enroll = buildTeemsProgramEnrollLink(
    course.courseRecord,
    null,
    centerSlug ? `/${centerSlug}/contact` : '/contact',
    centerSlug,
  )

  if (enroll.external) {
    return (
      <a href={withBasePathHref(enroll.href)} className="teems-compare-enroll-btn">
        Enroll Now
      </a>
    )
  }

  return (
    <Link href={enroll.href} className="teems-compare-enroll-btn">
      Enroll Now
    </Link>
  )
}

function ComparePricing({ course }: { course: TeemsCompareCourse }) {
  const { originalPrice, discountedPrice, offerDetails } = course
  const hasOriginal = hasValidCoursePrice(originalPrice)
  const hasDiscounted = hasValidCoursePrice(discountedPrice)
  const showStrikethrough = shouldShowStrikethroughOriginal(originalPrice, discountedPrice)
  const showGst = hasOriginal || hasDiscounted

  if (!hasOriginal && !hasDiscounted && !offerDetails && !showGst) return null

  return (
    <>
      <div className="teems-compare-price-area">
        {hasDiscounted ? (
          <>
            {showStrikethrough ? (
              <div className="teems-compare-price-old">₹ {originalPrice}</div>
            ) : null}
            <div className="teems-compare-price-offer">₹ {discountedPrice}</div>
          </>
        ) : hasOriginal ? (
          <div className="teems-compare-price-offer">₹ {originalPrice}</div>
        ) : null}
      </div>
      {offerDetails ? <p className="teems-compare-offer-text mb-0">{offerDetails}</p> : null}
      {showGst ? <p className="teems-compare-gst-text mb-0">(Including GST)</p> : null}
    </>
  )
}

function CompareResultCards({
  courses,
  selectedIds,
  courseFeatures,
  featuresLoading,
  centerSlug,
  onReselect,
  showReselect,
}: {
  courses: TeemsCompareCourse[]
  selectedIds: number[]
  courseFeatures: Record<number, CourseFeatureRow[]>
  featuresLoading: boolean
  centerSlug: string
  onReselect?: () => void
  showReselect?: boolean
}) {
  if (featuresLoading) {
    return (
      <div className="teems-compare-loading">
        <i className="fa fa-spinner fa-spin me-2" aria-hidden />
        Loading course features...
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0 teems-compare-section-title">Course Comparison</h6>
        {showReselect && onReselect ? (
          <button type="button" className="teems-compare-secondary-btn" onClick={onReselect}>
            <i className="ri-arrow-left-line" aria-hidden />
            Select Different Courses
          </button>
        ) : null}
      </div>
      <div className="row g-2">
        {selectedIds.map((courseId) => {
          const course = courses.find((c) => c.id === courseId)
          const featureList = courseFeatures[courseId] || []
          if (!course) return null

          return (
            <div key={courseId} className="col-12 col-md-4 mb-3">
              <div className="card h-100 teems-compare-card">
                <div className="teems-compare-card-head">
                  <h6 className="mb-0 fw-bold">{course.title}</h6>
                  {course.typeLabel ? <small>{course.typeLabel}</small> : null}
                </div>
                <div className="card-body">
                  <h6 className="card-title">Course Features:</h6>
                  {featureList.length > 0 ? (
                    <ul>
                      {featureList.map((feature, index) => (
                        <li key={`${courseId}-${index}`}>
                          <span>{feature.feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted mb-0">No features available</p>
                  )}
                </div>
                <div className="card-footer bg-transparent border-0 pt-0">
                  <hr />
                  <ComparePricing course={course} />
                  <div className="text-center mt-2">
                    <CompareEnrollButton course={course} centerSlug={centerSlug} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CategoryCoursesCompare({
  courses,
  selectedTypeName,
  showCompareButton,
  centerSlug,
  inline = false,
}: {
  courses: TeemsCompareCourse[]
  selectedTypeName: string
  showCompareButton: boolean
  centerSlug: string
  inline?: boolean
}) {
  const [showModal, setShowModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [courseFeatures, setCourseFeatures] = useState<Record<number, CourseFeatureRow[]>>({})
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [maxSelectionMessage, setMaxSelectionMessage] = useState('')

  const loadFeatures = useCallback(async (courseIds: number[]) => {
    if (courseIds.length === 0) {
      setCourseFeatures({})
      return
    }
    setFeaturesLoading(true)
    try {
      const features = await fetchCourseFeaturesByIds(courseIds)
      setCourseFeatures(features)
    } finally {
      setFeaturesLoading(false)
    }
  }, [])

  const openModal = useCallback(() => {
    if (!PRELOGIN_API_BASE_URL) {
      setMaxSelectionMessage('Course comparison is not available yet.')
      setShowModal(true)
      return
    }

    setShowModal(true)
    setMaxSelectionMessage('')

    if (courses.length >= 2 && courses.length <= 3) {
      const ids = courses.map((course) => course.id)
      setSelectedIds(ids)
      void loadFeatures(ids)
    } else {
      setSelectedIds([])
      setCourseFeatures({})
    }
  }, [courses, loadFeatures])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setSelectedIds([])
    setCourseFeatures({})
    setMaxSelectionMessage('')
  }, [])

  const toggleCourseSelection = useCallback(
    (courseId: number) => {
      setSelectedIds((current) => {
        if (current.includes(courseId)) {
          setMaxSelectionMessage('')
          return current.filter((id) => id !== courseId)
        }
        if (current.length >= 3) {
          setMaxSelectionMessage('You can only select up to 3 courses for comparison')
          window.setTimeout(() => setMaxSelectionMessage(''), 3000)
          return current
        }
        setMaxSelectionMessage('')
        return [...current, courseId]
      })
    },
    []
  )

  const handleCompareSelected = useCallback(() => {
    if (selectedIds.length >= 2) {
      void loadFeatures(selectedIds)
    }
  }, [loadFeatures, selectedIds])

  const handleReselect = useCallback(() => {
    setCourseFeatures({})
    setMaxSelectionMessage('')
  }, [])

  if (!showCompareButton || courses.length < 2) return null

  const showSelection = courses.length > 3
  const showComparison = !showSelection || Object.keys(courseFeatures).length > 0

  const openButton = (
    <button
      type="button"
      className={`teems-compare-open-btn${inline ? ' teems-compare-open-btn-inline' : ''}`}
      onClick={openModal}
      title="Compare up to 3 courses"
    >
      <i className="ri-scales-3-line" aria-hidden />
      Compare Courses
    </button>
  )

  return (
    <>
      {inline ? openButton : <div className="teems-compare-toolbar">{openButton}</div>}

      {showModal ? (
        <>
          <div
            className="modal fade show teems-compare-modal"
            style={{ display: 'block' }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable teems-compare-modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="ri-scales-3-line" aria-hidden />
                    Compare Courses
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  {showSelection && !showComparison ? (
                    <div>
                      <div className="row">
                        <div className="col-md-6">
                          <p className="alert alert-info mb-3">
                            Select up to 3 courses to compare their features:
                          </p>
                        </div>
                        <div className="col-md-6">
                          {selectedTypeName ? (
                            <div className="alert alert-info mb-3">
                              <i className="ri-filter-3-line me-2" aria-hidden />
                              Showing courses filtered by: <strong>{selectedTypeName}</strong>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          <strong>Choose Courses (Click to select):</strong>
                        </label>
                        <div className="rounded">
                          {courses.map((course) => {
                            const selected = selectedIds.includes(course.id)
                            return (
                              <div
                                key={course.id}
                                className={`d-flex align-items-center p-2 teems-compare-course-item${
                                  selected ? ' selected' : ''
                                }`}
                                onClick={() => toggleCourseSelection(course.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    toggleCourseSelection(course.id)
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              >
                                <div className="form-check me-3">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selected}
                                    readOnly
                                    aria-label={`Select ${course.title}`}
                                  />
                                </div>
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center">
                                    {course.imageUrl ? (
                                      <img
                                        src={course.imageUrl}
                                        alt={course.title}
                                        className="teems-compare-course-thumb"
                                        width={48}
                                        height={48}
                                        decoding="async"
                                        loading="lazy"
                                      />
                                    ) : null}
                                    <div>
                                      <h6 className="teems-compare-course-title">{course.title}</h6>
                                      {course.typeLabel ? (
                                        <small className="text-muted">{course.typeLabel}</small>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                                {selected ? (
                                  <span className="teems-compare-check-icon">
                                    <i className="ri-check-line" aria-hidden />
                                  </span>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                        <div className="form-text mt-2">
                          Click on course items to select/deselect. Maximum 3 courses allowed.
                        </div>
                      </div>

                      {maxSelectionMessage ? (
                        <div className="alert alert-warning alert-dismissible fade show" role="alert">
                          <i className="ri-alert-line me-2" aria-hidden />
                          {maxSelectionMessage}
                          <button
                            type="button"
                            className="btn-close"
                            onClick={() => setMaxSelectionMessage('')}
                            aria-label="Dismiss"
                          />
                        </div>
                      ) : null}

                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <small className="text-muted">
                          Selected: {selectedIds.length}/3 courses
                        </small>
                        <button
                          type="button"
                          className="teems-compare-primary-btn"
                          onClick={handleCompareSelected}
                          disabled={selectedIds.length < 2}
                        >
                          <i className="ri-bar-chart-line me-2" aria-hidden />
                          Compare Selected Courses
                        </button>
                      </div>
                    </div>
                  ) : (
                    <CompareResultCards
                      courses={courses}
                      selectedIds={selectedIds}
                      courseFeatures={courseFeatures}
                      featuresLoading={featuresLoading}
                      centerSlug={centerSlug}
                      onReselect={handleReselect}
                      showReselect={showSelection}
                    />
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="teems-compare-primary-btn" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      ) : null}
    </>
  )
}
