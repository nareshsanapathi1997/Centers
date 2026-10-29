'use client'
import { withBasePath } from '@/lib/with-base-path'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { Save, RefreshCw, Mail, Plus, Edit, Trash2, Eye, Code, FileText, X, CheckCircle, Shield } from 'lucide-react'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function EmailTemplatesManagement() {
  const [templates, setTemplates] = useState<any[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [formData, setFormData] = useState({
    template_key: '',
    template_name: '',
    template_category: 'general',
    subject: '',
    html_content: '',
    text_content: '',
    description: '',
    variables: {} as Record<string, string>,
    is_active: true
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchQuery, categoryFilter])

  const fetchTemplates = async () => {
    try {
      
      const response = await superAdminFetch('/api/super-admin/email-templates')

      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = templates

    if (categoryFilter) {
      filtered = filtered.filter(t => t.template_category === categoryFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.template_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredTemplates(filtered)
  }

  const handleEdit = (template: any) => {
    setSelectedTemplate(template)
    setFormData({
      template_key: template.template_key,
      template_name: template.template_name,
      template_category: template.template_category,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || '',
      description: template.description || '',
      variables: template.variables || {},
      is_active: template.is_active
    })
  }

  const handleNew = () => {
    setSelectedTemplate({ id: null, is_new: true }) // Set a marker to show editor
    setFormData({
      template_key: '',
      template_name: '',
      template_category: 'general',
      subject: '',
      html_content: '',
      text_content: '',
      description: '',
      variables: {},
      is_active: true
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      
      const url = withBasePath('/api/super-admin/email-templates')
      const method = selectedTemplate && !selectedTemplate.is_new ? 'PATCH' : 'POST'

      const body = selectedTemplate && !selectedTemplate.is_new
        ? { id: selectedTemplate.id, ...formData }
        : formData

      const response = await fetch(url, {
        credentials: 'include',
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast.success(selectedTemplate && !selectedTemplate.is_new ? 'Template updated successfully!' : 'Template created successfully!')
        fetchTemplates()
        setSelectedTemplate(null)
        handleNew()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Error saving template')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (template: any) => {
    if (template.is_system_template) {
      toast.error('Cannot delete system templates')
      return
    }

    if (!(await confirmDialog({ message: `Are you sure you want to delete "${template.template_name}"?`, destructive: true }))) {
      return
    }

    try {
      const response = await superAdminFetch(`/api/super-admin/email-templates?id=${template.id}`, { method: 'DELETE' })

      if (response.ok) {
        toast.success('Template deleted successfully!')
        fetchTemplates()
        if (selectedTemplate?.id === template.id) {
          handleNew()
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Error deleting template')
    }
  }

  const renderPreview = (html: string, variables: Record<string, string>) => {
    let rendered = html
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      rendered = rendered.replace(regex, variables[key] || `{{${key}}}`)
    })
    return rendered
  }

  const handlePreview = (template: any) => {
    setSelectedTemplate(template)
    setIsPreviewOpen(true)
    // Initialize preview variables from template variables
    const vars: Record<string, string> = {}
    if (template.variables) {
      Object.keys(template.variables).forEach(key => {
        vars[key] = template.variables[key] || `Sample ${key}`
      })
    }
    setPreviewVariables(vars)
  }

  const categories = ['general', 'admin', 'user', 'notification']

  if (loading) {
    return (
<div className="flex items-center justify-center h-64">
          <div className="text-[var(--cm-color-text-muted)]">Loading templates</div>
        </div>
)
  }

  return (
    <>
<div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="relative max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Search templates by name, key, or subject..."
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={handleNew}
              className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              New Template
            </button>
          </div>
        </div>

        {/* Templates Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {searchQuery || categoryFilter ? 'No templates found matching your criteria' : 'No email templates yet'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {searchQuery || categoryFilter ? 'Try adjusting your search or filters' : 'Create your first email template to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Variables
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTemplates.map((template) => (
                    <tr
                      key={template.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                        selectedTemplate?.id === template.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => handleEdit(template)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {template.template_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                              {template.template_key}
                            </p>
                            {template.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.template_category === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                          template.template_category === 'user' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          template.template_category === 'notification' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {template.template_category.charAt(0).toUpperCase() + template.template_category.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 dark:text-white max-w-xs truncate" title={template.subject}>
                          {template.subject}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {template.is_system_template ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            <Shield className="w-3 h-3 mr-1" />
                            System
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          template.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {template.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1.5" />
                              Active
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1.5" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {template.variables && Object.keys(template.variables).length > 0 ? (
                          <div className="flex items-center gap-1">
                            <Code className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {Object.keys(template.variables).length} variable{Object.keys(template.variables).length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No variables</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button aria-label="View"
                            onClick={() => handlePreview(template)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Preview Template"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button aria-label="Edit"
                            onClick={() => handleEdit(template)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Edit Template"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {!template.is_system_template && (
                            <button aria-label="Delete"
                              onClick={() => handleDelete(template)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete Template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Template Editor Section */}
      {selectedTemplate && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedTemplate && !selectedTemplate.is_new ? 'Edit Template' : 'New Template'}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Close Editor
                </button>
                {selectedTemplate && !selectedTemplate.is_new && (
                  <button
                    type="button"
                    onClick={handleNew}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                  >
                    New Template
                  </button>
                )}
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.template_key}
                    onChange={(e) => setFormData({ ...formData, template_key: e.target.value })}
                    disabled={!!selectedTemplate && !selectedTemplate.is_new}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                    placeholder="e.g., welcome_email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Welcome Email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.template_category}
                    onChange={(e) => setFormData({ ...formData, template_category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Active
                  </label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Email subject (use {{variable}} for placeholders)"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Template description"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    HTML Content <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-500">Use {'{{variable}}'} for placeholders</span>
                </div>
                <textarea
                  required
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="HTML email content..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Text Content (Optional)
                </label>
                <textarea
                  value={formData.text_content}
                  onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Plain text version (auto-generated if empty)"
                />
              </div>

              {/* Variables Documentation */}
              {selectedTemplate && selectedTemplate.variables && Object.keys(selectedTemplate.variables).length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Available Variables
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(selectedTemplate.variables).map(([key, desc]: [string, any]) => (
                      <div key={key} className="text-sm">
                        <code className="text-blue-800 dark:text-blue-200 font-mono bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                          {`{{${key}}}`}
                        </code>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTemplate) {
                      handleEdit(selectedTemplate)
                    } else {
                      handleNew()
                    }
                  }}
                  className="admin-btn admin-btn--secondary admin-btn--md flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="admin-btn admin-btn--primary admin-btn--md flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {selectedTemplate && !selectedTemplate.is_new ? 'Update' : 'Create'} Template
                    </>
                  )}
                </button>
              </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Preview: {selectedTemplate.template_name}</h2>
              <button aria-label="Close"
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {/* Variable Inputs */}
              {selectedTemplate.variables && Object.keys(selectedTemplate.variables).length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Preview Variables</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.keys(selectedTemplate.variables).map((key) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {key}
                        </label>
                        <input
                          type="text"
                          value={previewVariables[key] || ''}
                          onChange={(e) => setPreviewVariables({ ...previewVariables, [key]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          placeholder={`Enter ${key}...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Preview Content */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subject: {renderPreview(selectedTemplate.subject, previewVariables)}
                  </div>
                </div>
                <div
                  className="p-6 bg-white dark:bg-gray-800"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeCmsHtml(
                      renderPreview(selectedTemplate.html_content, previewVariables)
                    )
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
