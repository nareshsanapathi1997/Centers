'use client'
import { BRAND } from '@/lib/brand'
import { withBasePath } from '@/lib/with-base-path'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { PanelBottom, Save, Plus, Edit, Trash2, ChevronDown, ChevronRight, Link as LinkIcon, X, CheckCircle, AlertCircle, RefreshCw, Copyright } from 'lucide-react'
import { confirmDialog } from '@/lib/admin-ui-store'

interface FooterMenuItem {
  id: number
  menu_group: string
  title: string
  icon_class?: string
  link_url?: string
  target_section?: string
  display_order: number
  is_active: boolean
}

interface GlobalSetting {
  id: number
  setting_key: string
  setting_value: string
  setting_type: string
  description?: string
}

export default function FooterSettings() {
  const [menuItems, setMenuItems] = useState<FooterMenuItem[]>([])
  const [settings, setSettings] = useState<GlobalSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [copyrightText, setCopyrightText] = useState(`${BRAND.name} Pvt. Ltd.`)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['quick_links_1', 'quick_links_2']))
  const [editingItem, setEditingItem] = useState<FooterMenuItem | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newItem, setNewItem] = useState({
    menu_group: 'quick_links_1',
    title: '',
    icon_class: 'ri-arrow-right-s-line',
    link_url: '',
    target_section: '',
    display_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [menuResponse, settingsResponse] = await Promise.all([
        fetch(withBasePath('/api/super-admin/footer-menu'), { credentials: 'include' }),
        superAdminFetch('/api/super-admin/global-settings'),
      ])

      if (menuResponse.ok) {
        const menuData = await menuResponse.json()
        setMenuItems(menuData)
        console.log('Footer menu items loaded:', menuData)
      } else {
        const errorData = await menuResponse.json()
        console.error('Error fetching footer menu items:', errorData)
        setMessage({ type: 'error', text: errorData.error || 'Failed to load footer menu items' })
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSettings(settingsData)
        const copyright = settingsData.find((s: GlobalSetting) => s.setting_key === 'footer_copyright_text')
        if (copyright) {
          setCopyrightText(copyright.setting_value)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage({ type: 'error', text: 'Error loading footer settings' })
    } finally {
      setLoading(false)
    }
  }

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.menu_group]) {
      acc[item.menu_group] = []
    }
    acc[item.menu_group].push(item)
    return acc
  }, {} as Record<string, FooterMenuItem[]>)

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(group)) {
      newExpanded.delete(group)
    } else {
      newExpanded.add(group)
    }
    setExpandedGroups(newExpanded)
  }

  const handleSaveCopyright = async () => {
    setSaving(true)
    setMessage(null)
    try {
      let response = await superAdminFetch('/api/super-admin/global-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: 'footer_copyright_text', setting_value: copyrightText }),
      })

      if (!response.ok && response.status === 404) {
        response = await superAdminFetch('/api/super-admin/global-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setting_key: 'footer_copyright_text',
            setting_value: copyrightText,
            setting_type: 'string',
            description: 'Copyright text displayed in footer',
          }),
        })
      }

      if (response.ok) {
        setMessage({ type: 'success', text: 'Copyright text saved successfully!' })
        fetchData()
      } else {
        setMessage({ type: 'error', text: 'Failed to save copyright text' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving copyright text' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSaveItem = async (item: FooterMenuItem) => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(withBasePath(`/api/super-admin/footer-menu/${item.id}`), {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Menu item updated successfully!' })
        setEditingItem(null)
        fetchData()
      } else {
        setMessage({ type: 'error', text: 'Failed to update menu item' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating menu item' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.title.trim()) {
      setMessage({ type: 'error', text: 'Title is required' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(withBasePath('/api/super-admin/footer-menu'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Menu item added successfully!' })
        setIsAddingNew(false)
        setNewItem({
          menu_group: 'quick_links_1',
          title: '',
          icon_class: 'ri-arrow-right-s-line',
          link_url: '',
          target_section: '',
          display_order: 0,
          is_active: true,
        })
        fetchData()
      } else {
        setMessage({ type: 'error', text: 'Failed to add menu item' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding menu item' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleDeleteItem = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this menu item?', destructive: true }))) return

    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(withBasePath(`/api/super-admin/footer-menu/${id}`), {
        credentials: 'include',
        method: 'DELETE',
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Menu item deleted successfully!' })
        fetchData()
      } else {
        setMessage({ type: 'error', text: 'Failed to delete menu item' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting menu item' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const moveItem = async (item: FooterMenuItem, direction: 'up' | 'down') => {
    const groupItems = groupedItems[item.menu_group] || []
    const currentIndex = groupItems.findIndex(i => i.id === item.id)
    
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === groupItems.length - 1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const targetItem = groupItems[targetIndex]

    // Swap display orders
    const newOrder = item.display_order
    const targetOrder = targetItem.display_order

    await Promise.all([
      fetch(withBasePath(`/api/super-admin/footer-menu/${item.id}`), {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: targetOrder }),
      }),
      fetch(withBasePath(`/api/super-admin/footer-menu/${targetItem.id}`), {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder }),
      }),
    ])

    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading footer settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Footer Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage footer copyright text and quick links
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 admin-btn admin-btn--secondary admin-btn--sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Copyright Text */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Copyright className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Copyright Text
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Text displayed in the footer copyright section
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={copyrightText}
              onChange={(e) => setCopyrightText(e.target.value)}
              placeholder={`${BRAND.name} Pvt. Ltd.`}
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleSaveCopyright}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            The year will be automatically added. Example: "© 2025 {copyrightText}"
          </p>
        </div>
      </div>

      {/* Footer Menu Items */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <PanelBottom className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Footer Quick Links
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage footer navigation links grouped by columns
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAddingNew(true)}
              className="admin-btn admin-btn--primary admin-btn--sm"
            >
              <Plus className="w-4 h-4" />
              Add Link
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Add New Item Form */}
          {isAddingNew && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="admin-form-label">
                    Menu Group
                  </label>
                  <select
                    value={newItem.menu_group}
                    onChange={(e) => setNewItem({ ...newItem, menu_group: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="quick_links_1">Quick Links Column 1</option>
                    <option value="quick_links_2">Quick Links Column 2</option>
                  </select>
                </div>
                <div>
                  <label className="admin-form-label">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="Home"
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="admin-form-label">
                    Target Section (e.g., #about)
                  </label>
                  <input
                    type="text"
                    value={newItem.target_section}
                    onChange={(e) => setNewItem({ ...newItem, target_section: e.target.value })}
                    placeholder="#about"
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="admin-form-label">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={newItem.display_order}
                    onChange={(e) => setNewItem({ ...newItem, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddItem}
                  disabled={saving}
                  className="admin-btn admin-btn--primary admin-btn--sm transition-colors disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Menu Groups */}
          {Object.keys(groupedItems).length > 0 && Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedGroups.has(group) ? (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {group === 'quick_links_1' ? 'Quick Links Column 1' : 'Quick Links Column 2'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({items.length} items)
                  </span>
                </div>
              </button>

              {expandedGroups.has(group) && (
                <div className="p-4 space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${
                        editingItem?.id === item.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {editingItem?.id === item.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editingItem.title}
                              onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <input
                              type="text"
                              value={editingItem.target_section || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, target_section: e.target.value })}
                              placeholder="#about"
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveItem(editingItem)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <i className={item.icon_class || 'ri-arrow-right-s-line'}></i>
                            <span className="font-medium text-gray-900 dark:text-white">{item.title}</span>
                            {item.target_section && (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {item.target_section}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {index > 0 && (
                              <button
                                onClick={() => moveItem(item, 'up')}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                title="Move up"
                              >
                                ↑
                              </button>
                            )}
                            {index < items.length - 1 && (
                              <button
                                onClick={() => moveItem(item, 'down')}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                title="Move down"
                              >
                                ↓
                              </button>
                            )}
                            <button aria-label="Edit"
                              onClick={() => setEditingItem(item)}
                              className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button aria-label="Delete"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <PanelBottom className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Footer Management
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Footer links are organized into two columns. Use target sections (e.g., #about, #results) 
              to link to sections on the same page, or use full URLs for external links. The copyright 
              text will automatically include the current year.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
