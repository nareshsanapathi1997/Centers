'use client'
import { superAdminFetch } from '@/lib/super-admin-api'
import { authenticatedFetch } from '@/lib/admin-api'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import Pagination from '@/components/admin/Pagination'
import BulkActions from '@/components/admin/BulkActions'
import { Switch } from '@/components/forms'
import { ADMIN_CONTENT_FORM_RULES } from '@/lib/admin-content-form-rules'
import { adminControlClass } from '@/lib/admin-form-ui'
import { Plus, Edit, Trash2, BookOpen, CheckCircle, XCircle } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

const CREATE_COURSE_FORM_ID = 'admin-create-course-form'

type CoursesApiMode = 'admin' | 'super-admin'

interface CoursesManagementPanelProps {
  centerId: string
  mode: CoursesApiMode
  /** When true (center admin + catalog), show info instead of CRUD. Super admin always manages courses. */
  catalogCoursesAvailable?: boolean
  sectionsHref?: string
}

const COURSE_ICONS = [
  { value: 'ri-book-open-line', label: 'Book Open', icon: '📖' },
  { value: 'ri-bank-line', label: 'Bank', icon: '🏦' },
  { value: 'ri-graduation-cap-line', label: 'Graduation Cap', icon: '🎓' },
  { value: 'ri-file-paper-line', label: 'File Paper', icon: '📄' },
  { value: 'ri-edit-box-line', label: 'Edit Box', icon: '✏️' },
  { value: 'ri-calculator-line', label: 'Calculator', icon: '🔢' },
  { value: 'ri-building-line', label: 'Building', icon: '🏢' },
  { value: 'ri-global-line', label: 'Global', icon: '🌐' },
  { value: 'ri-file-list-line', label: 'File List', icon: '📋' },
  { value: 'ri-government-line', label: 'Government', icon: '🏛️' },
  { value: 'ri-scales-line', label: 'Scales (Law)', icon: '⚖️' },
  { value: 'ri-lightbulb-line', label: 'Lightbulb', icon: '💡' },
  { value: 'ri-code-line', label: 'Code', icon: '💻' },
  { value: 'ri-briefcase-line', label: 'Briefcase', icon: '💼' },
  { value: 'ri-medal-line', label: 'Medal', icon: '🏅' },
  { value: 'ri-trophy-line', label: 'Trophy', icon: '🏆' },
  { value: 'ri-user-star-line', label: 'User Star', icon: '⭐' },
  { value: 'ri-rocket-line', label: 'Rocket', icon: '🚀' },
]

function apiBase(mode: CoursesApiMode): string {
  return mode === 'super-admin' ? '/api/super-admin' : '/api/admin'
}

function modeFetch(mode: CoursesApiMode, url: string, options: RequestInit = {}) {
  return mode === 'super-admin' ? superAdminFetch(url, options) : authenticatedFetch(url, options)
}

export default function CoursesManagementPanel({
  centerId,
  mode,
  catalogCoursesAvailable = false,
  sectionsHref
}: CoursesManagementPanelProps) {
  const [courses, setCourses] = useState<any[]>([])
  const [filteredCourses, setFilteredCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [masterCourses, setMasterCourses] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    icon_class: 'ri-book-open-line',
    display_order: 0,
    is_active: true
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.courses)

  const blockedByCatalog = mode === 'admin' && catalogCoursesAvailable

  useEffect(() => {
    if (blockedByCatalog) {
      setLoading(false)
      return
    }
    fetchCourses()
    fetchMasterCourses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId, blockedByCatalog])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await modeFetch(mode, `${apiBase(mode)}/courses?centerId=${centerId}`)
      const data = await response.json()
      if (Array.isArray(data)) {
        setCourses(data)
        setFilteredCourses(data)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMasterCourses = async () => {
    try {
      const res = await modeFetch(mode, `${apiBase(mode)}/course-categories`)
      if (res.ok) {
        const data = await res.json()
        setMasterCourses(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching master course categories:', error)
    }
  }

  useEffect(() => {
    if (searchQuery) {
      const filtered = courses.filter(
        (course) =>
          course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredCourses(filtered)
    } else {
      setFilteredCourses(courses)
    }
    setCurrentPage(1)
  }, [searchQuery, courses])

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    setSaving(true)
    try {
      const url = editingCourse
        ? `${apiBase(mode)}/courses/${editingCourse.id}`
        : `${apiBase(mode)}/courses`
      const method = editingCourse ? 'PATCH' : 'POST'

      const response = await modeFetch(mode, url, {
        method,
        body: JSON.stringify({ ...formData, center_id: parseInt(centerId, 10) })
      })

      if (response.ok) {
        setIsModalOpen(false)
        setEditingCourse(null)
        resetForm()
        fetchCourses()
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save course')
      }
    } catch (error) {
      console.error('Error saving course:', error)
      setFormError('Error saving course')
    } finally {
      setSaving(false)
    }
  }

  const closeCourseModal = () => {
    setIsModalOpen(false)
    setEditingCourse(null)
    resetForm()
    clearErrors()
  }

  const handleEdit = (course: any) => {
    clearErrors()
    setEditingCourse(course)
    setFormData({
      name: course.name || '',
      description: course.description || '',
      category: course.category || '',
      icon_class: course.icon_class || 'ri-book-open-line',
      display_order: course.display_order || 0,
      is_active: course.is_active !== false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog('Are you sure?'))) return
    try {

      const response = await modeFetch(mode, `${apiBase(mode)}/courses/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchCourses()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error deleting course')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      icon_class: 'ri-book-open-line',
      display_order: 0,
      is_active: true
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!(await confirmDialog({ message: `Are you sure you want to delete ${selectedIds.length} course(s)?`, destructive: true }))) return

    try {

      const response = await modeFetch(mode, `${apiBase(mode)}/courses/bulk?centerId=${centerId}`, {
          method: 'POST',
          body: JSON.stringify({ ids: selectedIds, action: 'delete' })
        }
      )

      if (response.ok) {
        setSelectedIds([])
        fetchCourses()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete courses')
      }
    } catch (error) {
      console.error('Error deleting courses:', error)
      toast.error('Error deleting courses')
    }
  }

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await modeFetch(mode, `${apiBase(mode)}/courses/bulk?centerId=${centerId}`, {
          method: 'POST',
          body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: true })
        }
      )

      if (response.ok) {
        setSelectedIds([])
        fetchCourses()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to activate courses')
      }
    } catch (error) {
      console.error('Error activating courses:', error)
      toast.error('Error activating courses')
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await modeFetch(mode, `${apiBase(mode)}/courses/bulk?centerId=${centerId}`, {
          method: 'POST',
          body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: false })
        }
      )

      if (response.ok) {
        setSelectedIds([])
        fetchCourses()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to deactivate courses')
      }
    } catch (error) {
      console.error('Error deactivating courses:', error)
      toast.error('Error deactivating courses')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading courses...</p>
        </div>
      </div>
    )
  }

  if (blockedByCatalog) {
    return (
      <div className="max-w-2xl rounded-xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-800 dark:bg-indigo-900/20">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Catalog courses are active</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          This center uses the Prelogin course catalog. Categories are assigned in Super Admin → Courses;
          the public site lists the same programs as prelogin for those categories. To show or hide the home
          page Courses section, use Section Configuration or contact Super Admin.
        </p>
      </div>
    )
  }

  const activeCoursesCount = courses.filter((c) => c.is_active).length
  const hasInactiveCourses = courses.some((c) => !c.is_active)

  return (
    <div className="space-y-6">
      {mode === 'super-admin' ? (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Manage local course cards for the selected center — same as the former Center Admin → Courses
            screen.
          </p>
        </div>
      ) : null}

      {hasInactiveCourses && sectionsHref ? (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Only courses marked as Active will appear on the center page. You have{' '}
            {courses.length - activeCoursesCount} inactive course(s). Enable the Courses section in{' '}
            <Link href={sectionsHref} className="underline font-semibold">
              Section Configuration
            </Link>
            .
          </p>
        </div>
      ) : null}

      {activeCoursesCount === 0 && courses.length > 0 ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>Warning:</strong> You have {courses.length} course(s), but none are active.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="relative max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-form-control"
              placeholder="Search by name or category..."
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm()
            clearErrors()
            setEditingCourse(null)
            setIsModalOpen(true)
          }}
          className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add New Course
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Course Name
                </th>
                <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">No courses found</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {searchQuery ? 'Try a different search term' : 'Create your first course'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div
                            className={`p-2 rounded-lg ${
                              course.category === 'college_level'
                                ? 'bg-purple-100 dark:bg-purple-900/30'
                                : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}
                          >
                            <i
                              className={`${course.icon_class || 'ri-book-open-line'} text-lg ${
                                course.category === 'college_level'
                                  ? 'text-purple-600 dark:text-purple-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                            />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {course.name || 'Untitled'}
                        </p>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          course.category === 'college_level'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {course.category === 'college_level'
                          ? 'College Level'
                          : course.category === 'school_level'
                            ? 'School Level'
                            : course.category || '—'}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {course.display_order || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          course.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {course.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1.5" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button aria-label="Edit"
                          type="button"
                          onClick={() => handleEdit(course)}
                          className="admin-btn admin-btn--icon admin-btn--icon-edit"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button aria-label="Delete"
                          type="button"
                          onClick={() => void handleDelete(course.id)}
                          className="admin-btn admin-btn--icon admin-btn--icon-danger"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCourses.length}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
        />
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={closeCourseModal}
        title={editingCourse ? 'Edit Course' : 'Create Course'}
        description={
          editingCourse
            ? 'Update how this course appears on the center website.'
            : 'Choose a master course and configure how it appears on the center website.'
        }
        formError={formError}
        footer={
          <FormModalActions
            formId={CREATE_COURSE_FORM_ID}
            onCancel={closeCourseModal}
            submitLabel={editingCourse ? 'Update Course' : 'Create Course'}
            isSubmitting={saving}
          />
        }
      >
        <form id={CREATE_COURSE_FORM_ID} onSubmit={handleSubmit} noValidate>
          <AdminFormField label="Course (from master list)" htmlFor="course-name" required error={errors.name}>
            <select
              id="course-name"
              value={formData.name}
              onChange={(e) => {
                clearFieldError('name')
                const selectedName = e.target.value
                const selected = masterCourses.find((c) => c.course_name === selectedName)
                let category = ''
                if (selected) {
                  if (selected.type === 1) category = 'college_level'
                  else if (selected.type === 2) category = 'school_level'
                  else if (selected.type === 3) category = 'demo'
                }
                setFormData({ ...formData, name: selectedName, category })
              }}
              className={adminControlClass(errors, 'name')}
            >
              <option value="">Select course</option>
              {masterCourses.map((mc) => (
                <option key={mc.id} value={mc.course_name}>
                  {mc.course_name}
                </option>
              ))}
            </select>
          </AdminFormField>

          <AdminFormField
            label="Description"
            htmlFor="course-description"
            hint="Shown in the course popup on the public website"
          >
            <textarea
              id="course-description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="admin-form-control"
              placeholder="Brief overview of this course"
            />
          </AdminFormField>

          <div className="admin-form-row admin-form-row--2">
            <AdminFormField
              label="Category"
              htmlFor="course-category"
              hint="Auto-filled from the master course"
              className="admin-form-col-6"
            >
              <input
                id="course-category"
                type="text"
                value={
                  formData.category === 'college_level'
                    ? 'College Level'
                    : formData.category === 'school_level'
                      ? 'School Level'
                      : formData.category === 'demo'
                        ? 'Demo'
                        : ''
                }
                readOnly
                className="admin-form-control admin-form-control--readonly"
                placeholder="Select a course to auto-set category"
              />
            </AdminFormField>

            <AdminFormField label="Icon" htmlFor="course-icon" className="admin-form-col-6">
              <select
                id="course-icon"
                value={formData.icon_class}
                onChange={(e) => setFormData({ ...formData, icon_class: e.target.value })}
                className="admin-form-control"
              >
                {COURSE_ICONS.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {icon.icon} {icon.label}
                  </option>
                ))}
              </select>
            </AdminFormField>
          </div>

          <div className="admin-form-row admin-form-row--2">
            <AdminFormField label="Display Order" htmlFor="course-display-order" className="admin-form-col-6">
              <input
                id="course-display-order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })
                }
                className="admin-form-control"
                placeholder="0"
              />
            </AdminFormField>

            <div className="admin-form-col-6 admin-form-field--inline-end">
              <Switch
                id="course-is-active"
                label="Active on website"
                hint="Inactive courses stay hidden from the public site"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
        </form>
      </FormModal>

      <BulkActions
        selectedIds={selectedIds}
        onBulkDelete={handleBulkDelete}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
        onClearSelection={() => setSelectedIds([])}
      />
    </div>
  )
}
