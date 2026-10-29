'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState, useMemo } from 'react'
import { RefreshCw, Menu, ChevronDown, ChevronRight, Edit2, X, Link as LinkIcon, Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import {
  COURSES_MENU_KEY,
  COURSE_SCHOOL_SECTION_KEY,
  COURSE_COLLEGE_SECTION_KEY,
  getCourseSectionGroups,
  resolveCourseLinkSectionId,
  isCourseLinkItem,
} from '@/lib/headerMenuTree'
import { confirmDialog } from '@/lib/admin-ui-store'

interface HeaderMenuItem {
  id: number
  menu_key: string
  parent_id?: number
  title: string
  icon_class?: string
  link_url?: string
  target_section?: string
  display_order: number
  is_active: boolean
  children?: HeaderMenuItem[]
}

export default function MenuItemsSettings() {
  const [menuItems, setMenuItems] = useState<HeaderMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set())
  const [editingMenuItem, setEditingMenuItem] = useState<HeaderMenuItem | null>(null)
  const [addingToParent, setAddingToParent] = useState<HeaderMenuItem | null>(null)
  const [menuItemForm, setMenuItemForm] = useState({
    title: '',
    link_url: '',
    icon_class: '',
    target_section: '',
    courseSectionId: '',
  })

  const coursesMenu = useMemo(
    () => menuItems.find((item) => item.menu_key === COURSES_MENU_KEY),
    [menuItems],
  )
  const courseSections = useMemo(() => getCourseSectionGroups(coursesMenu), [coursesMenu])

  const ensureCourseSections = async () => {
    if (!coursesMenu || courseSections.length >= 2) return
    const coursesId = coursesMenu.id
    const specs = [
      { menu_key: COURSE_SCHOOL_SECTION_KEY, title: 'School Level Courses', display_order: 1 },
      { menu_key: COURSE_COLLEGE_SECTION_KEY, title: 'College Level Courses', display_order: 2 },
    ]
    for (const spec of specs) {
      if (courseSections.some((s) => s.menu_key === spec.menu_key)) continue
      await superAdminFetch('/api/super-admin/header-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_key: spec.menu_key,
          parent_id: coursesId,
          title: spec.title,
          display_order: spec.display_order,
          is_active: true,
        }),
      })
    }
    await fetchMenuItems()
  }

  useEffect(() => {
    fetchMenuItems()
  }, [])

  const fetchMenuItems = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/header-menu')
      if (response.ok) {
        const data = await response.json()
        setMenuItems(data)
        const parentIds = data.flatMap((item: HeaderMenuItem) => {
          const ids = item.children?.length ? [item.id] : []
          const groupIds = (item.children ?? [])
            .filter((c) => c.children && c.children.length > 0)
            .map((c) => c.id)
          return [...ids, ...groupIds]
        })
        setExpandedMenus(new Set(parentIds))
      }
    } catch (error) {
      console.error('Error fetching menu items:', error)
    } finally {
      setLoading(false)
    }
  }

  // Recursively flip is_active at any depth (parent, section, or course link)
  const setActiveInTree = (
    items: HeaderMenuItem[],
    id: number,
    is_active: boolean
  ): HeaderMenuItem[] =>
    items.map((item) => ({
      ...item,
      ...(item.id === id ? { is_active } : {}),
      children: item.children ? setActiveInTree(item.children, id, is_active) : item.children,
    }))

  const updateMenuItem = async (id: number, is_active: boolean) => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await superAdminFetch('/api/super-admin/header-menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active }),
      })

      if (response.ok) {
        setMenuItems(prev => setActiveInTree(prev, id, is_active))
        setMessage({ type: 'success', text: 'Menu item updated successfully!' })
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

  // Move an item up/down among its siblings and persist sequential display_order
  const moveMenuItem = async (siblings: HeaderMenuItem[], index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= siblings.length) return

    const reordered = [...siblings]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    setSaving(true)
    setMessage(null)
    try {
      const responses = await Promise.all(
        reordered.map((sibling, i) =>
          superAdminFetch('/api/super-admin/header-menu', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sibling.id, display_order: i + 1 }),
          })
        )
      )

      if (responses.every((r) => r.ok)) {
        setMessage({ type: 'success', text: 'Order updated successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to update order' })
      }
      await fetchMenuItems()
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating order' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const deleteMenuItem = async (item: HeaderMenuItem) => {
    const hasChildren = (item.children?.length ?? 0) > 0
    const confirmed = (await confirmDialog({ message: `Delete "${item.title}"${hasChildren ? ' and ALL its sub-links' : ''}? This cannot be undone.`, destructive: true }))
    if (!confirmed) return

    setSaving(true)
    setMessage(null)
    try {
      const response = await superAdminFetch(
        `/api/super-admin/header-menu?id=${item.id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setMessage({ type: 'success', text: `"${item.title}" deleted successfully!` })
        await fetchMenuItems()
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

  const openEditMenuModal = (item: HeaderMenuItem) => {
    setAddingToParent(null)
    setEditingMenuItem(item)
    const sectionId = resolveCourseLinkSectionId(item, coursesMenu)
    setMenuItemForm({
      title: item.title || '',
      link_url: item.link_url || '',
      icon_class: item.icon_class || '',
      target_section: item.target_section || '',
      courseSectionId: sectionId ? String(sectionId) : '',
    })
  }

  const openAddCourseLinkModal = () => {
    if (!coursesMenu) return
    const defaultSection = courseSections[0]
    setEditingMenuItem(null)
    setAddingToParent(coursesMenu)
    setMenuItemForm({
      title: '',
      link_url: '',
      icon_class: '',
      target_section: '#department',
      courseSectionId: defaultSection ? String(defaultSection.id) : '',
    })
    setExpandedMenus((prev) => new Set(prev).add(coursesMenu.id))
  }

  const openAddMenuModal = (parent: HeaderMenuItem) => {
    if (parent.menu_key === COURSES_MENU_KEY) {
      openAddCourseLinkModal()
      return
    }
    setEditingMenuItem(null)
    setAddingToParent(parent)
    setMenuItemForm({
      title: '',
      link_url: '',
      icon_class: '',
      target_section: '#department',
      courseSectionId:
        parent.menu_key === COURSE_SCHOOL_SECTION_KEY || parent.menu_key === COURSE_COLLEGE_SECTION_KEY
          ? String(parent.id)
          : '',
    })
    setExpandedMenus((prev) => new Set(prev).add(parent.id))
  }

  const closeEditMenuModal = () => {
    setEditingMenuItem(null)
    setAddingToParent(null)
    setMenuItemForm({
      title: '',
      link_url: '',
      icon_class: '',
      target_section: '',
      courseSectionId: '',
    })
  }

  const showCourseSectionField = Boolean(
    coursesMenu &&
      courseSections.length > 0 &&
      (addingToParent?.menu_key === COURSES_MENU_KEY ||
        addingToParent?.menu_key === COURSE_SCHOOL_SECTION_KEY ||
        addingToParent?.menu_key === COURSE_COLLEGE_SECTION_KEY ||
        (editingMenuItem && isCourseLinkItem(editingMenuItem, null, coursesMenu))),
  )

  const resolveSaveParentId = (): number | null => {
    if (!showCourseSectionField) {
      return addingToParent?.id ?? null
    }
    const sectionId = Number(menuItemForm.courseSectionId)
    return Number.isFinite(sectionId) && sectionId > 0 ? sectionId : null
  }

  const saveMenuItem = async () => {
    if (!editingMenuItem && !addingToParent) return
    if (showCourseSectionField && !menuItemForm.courseSectionId) {
      setMessage({ type: 'error', text: 'Please select School Level or College Level section' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      if (addingToParent) {
        const parentId = resolveSaveParentId()
        if (!parentId) {
          setMessage({ type: 'error', text: 'Could not determine course section. Create sections first.' })
          setSaving(false)
          return
        }
        const section = courseSections.find((s) => s.id === parentId)
        const childCount = section?.children?.length ?? 0
        const menuKey = `courses_${Date.now()}`
        const response = await superAdminFetch('/api/super-admin/header-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menu_key: menuKey,
            parent_id: parentId,
            title: menuItemForm.title,
            link_url: menuItemForm.link_url || null,
            icon_class: menuItemForm.icon_class || null,
            target_section: menuItemForm.target_section || null,
            display_order: childCount + 1,
            is_active: true,
          }),
        })

        if (response.ok) {
          setMessage({ type: 'success', text: 'Course link added successfully!' })
          closeEditMenuModal()
          await fetchMenuItems()
        } else {
          setMessage({ type: 'error', text: 'Failed to add menu link' })
        }
        return
      }

      const parentId = showCourseSectionField ? resolveSaveParentId() : undefined
      const response = await superAdminFetch('/api/super-admin/header-menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMenuItem!.id,
          title: menuItemForm.title,
          link_url: menuItemForm.link_url,
          icon_class: menuItemForm.icon_class,
          target_section: menuItemForm.target_section,
          ...(parentId != null ? { parent_id: parentId } : {}),
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Menu item updated successfully!' })
        closeEditMenuModal()
        await fetchMenuItems()
      } else {
        setMessage({ type: 'error', text: 'Failed to update menu item' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving menu item' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const toggleExpanded = (id: number) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading menu items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Items Configuration</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage top-bar links: Courses (School / College sections), About Us, Our Results, etc.
            </p>
          </div>
          <button
            onClick={fetchMenuItems}
            className="flex items-center gap-2 admin-btn admin-btn--secondary admin-btn--sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Menu Items */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Menu Items
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Expand a menu to add or edit dropdown links. Use URL for external pages or #section for in-page scroll.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {menuItems.length === 0 ? (
              <div className="text-center py-8">
                <Menu className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No menu items configured</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Run the database migration script to add default menu items
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {menuItems.map((item, itemIndex) => (
                  <div key={item.id} className="space-y-2">
                    {/* Parent Menu Item */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
                      item.is_active 
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                        : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          title="Expand dropdown links"
                        >
                          {expandedMenus.has(item.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                        {item.icon_class && (
                          <i className={`${item.icon_class} text-lg ${item.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}></i>
                        )}
                        <div>
                          <h4 className={`font-medium ${item.is_active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {item.target_section && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                {item.target_section}
                              </span>
                            )}
                            {item.children && item.children.length > 0 ? (
                              <span className="text-xs text-indigo-600 dark:text-indigo-400">
                                {item.children.filter(c => c.is_active).length}/{item.children.length} links active
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">No dropdown links yet</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5">
                          <button aria-label="Move up"
                            onClick={() => moveMenuItem(menuItems, itemIndex, -1)}
                            disabled={saving || itemIndex === 0}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button aria-label="Move down"
                            onClick={() => moveMenuItem(menuItems, itemIndex, 1)}
                            disabled={saving || itemIndex === menuItems.length - 1}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                        <button aria-label="Edit"
                          onClick={() => openEditMenuModal(item)}
                          className="p-1.5 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                          title="Edit menu item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button aria-label="Delete"
                          onClick={() => deleteMenuItem(item)}
                          disabled={saving}
                          className="admin-btn admin-btn--icon admin-btn--icon-danger disabled:opacity-50"
                          title="Delete menu item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className={`text-xs font-medium ${item.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => updateMenuItem(item.id, !item.is_active)}
                          disabled={saving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            item.is_active ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              item.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Child Menu Items */}
                    {expandedMenus.has(item.id) && (
                      <div className="ml-8 space-y-2">
                        {(item.children ?? []).map((child, childIndex) => (
                          <div key={child.id} className="space-y-2">
                            <div
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                child.is_active
                                  ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800'
                                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {child.icon_class && (
                                  <i className={`${child.icon_class} text-sm ${child.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}></i>
                                )}
                                <div className="flex-1">
                                  <h5 className={`text-sm font-medium ${child.is_active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {child.title}
                                    {(child.children?.length ?? 0) > 0 && (
                                      <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">
                                        Section
                                      </span>
                                    )}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {child.link_url && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <LinkIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                        <span className="truncate max-w-xs">{child.link_url}</span>
                                      </div>
                                    )}
                                    {child.target_section && (
                                      <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {child.target_section}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-0.5">
                                  <button aria-label="Move up"
                                    onClick={() => moveMenuItem(item.children ?? [], childIndex, -1)}
                                    disabled={saving || childIndex === 0}
                                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
                                    title="Move up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button aria-label="Move down"
                                    onClick={() => moveMenuItem(item.children ?? [], childIndex, 1)}
                                    disabled={saving || childIndex === (item.children?.length ?? 0) - 1}
                                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
                                    title="Move down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <button aria-label="Edit"
                                  onClick={() => openEditMenuModal(child)}
                                  className="p-1.5 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                                  title="Edit menu item"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {(child.children?.length ?? 0) > 0 && (
                                  <button aria-label="Add"
                                    onClick={() => openAddMenuModal(child)}
                                    className="p-1.5 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                    title="Add link in this section"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button aria-label="Delete"
                                  onClick={() => deleteMenuItem(child)}
                                  disabled={saving}
                                  className="admin-btn admin-btn--icon admin-btn--icon-danger disabled:opacity-50"
                                  title="Delete menu item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <span className={`text-xs ${child.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                  {child.is_active ? 'On' : 'Off'}
                                </span>
                                <button
                                  onClick={() => updateMenuItem(child.id, !child.is_active)}
                                  disabled={saving}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    child.is_active ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                      child.is_active ? 'translate-x-5' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {(child.children ?? []).length > 0 && (
                              <div className="ml-6 space-y-2">
                                {(child.children ?? []).map((grandchild, grandchildIndex) => (
                                  <div
                                    key={grandchild.id}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                      grandchild.is_active
                                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {grandchild.icon_class && (
                                        <i className={`${grandchild.icon_class} text-sm ${grandchild.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}></i>
                                      )}
                                      <span className={`text-sm ${grandchild.is_active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                                        {grandchild.title}
                                      </span>
                                      <span className="text-xs text-indigo-600 dark:text-indigo-400">
                                        {child.title}
                                      </span>
                                      {grandchild.target_section && (
                                        <span className="text-xs text-gray-400">{grandchild.target_section}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-0.5">
                                        <button aria-label="Move up"
                                          onClick={() => moveMenuItem(child.children ?? [], grandchildIndex, -1)}
                                          disabled={saving || grandchildIndex === 0}
                                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
                                          title="Move up"
                                        >
                                          <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button aria-label="Move down"
                                          onClick={() => moveMenuItem(child.children ?? [], grandchildIndex, 1)}
                                          disabled={saving || grandchildIndex === (child.children?.length ?? 0) - 1}
                                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
                                          title="Move down"
                                        >
                                          <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <button aria-label="Edit"
                                        onClick={() => openEditMenuModal(grandchild)}
                                        className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                                        title="Edit link"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button aria-label="Delete"
                                        onClick={() => deleteMenuItem(grandchild)}
                                        disabled={saving}
                                        className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                                        title="Delete link"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => updateMenuItem(grandchild.id, !grandchild.is_active)}
                                        disabled={saving}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                          grandchild.is_active ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                      >
                                        <span
                                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                            grandchild.is_active ? 'translate-x-5' : 'translate-x-1'
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {item.menu_key === COURSES_MENU_KEY && courseSections.length < 2 && (
                          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
                            School / College sections are missing. Create them to organize course links in the header dropdown.
                            <button
                              type="button"
                              onClick={() => void ensureCourseSections()}
                              disabled={saving}
                              className="mt-2 block text-purple-700 dark:text-purple-300 font-medium underline"
                            >
                              Create School &amp; College sections
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() =>
                            item.menu_key === COURSES_MENU_KEY
                              ? openAddCourseLinkModal()
                              : openAddMenuModal(item)
                          }
                          className="flex items-center gap-2 w-full p-3 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          {item.menu_key === COURSES_MENU_KEY ? 'Add course link' : 'Add dropdown link'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit / Add Menu Item Modal */}
        {(editingMenuItem || addingToParent) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {addingToParent
                      ? addingToParent.menu_key === COURSES_MENU_KEY
                        ? 'Add course link'
                        : `Add link under "${addingToParent.title}"`
                      : 'Edit Menu Item'}
                  </h3>
                  <button aria-label="Close"
                    onClick={closeEditMenuModal}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {showCourseSectionField && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Course section *
                    </label>
                    <select
                      value={menuItemForm.courseSectionId}
                      onChange={(e) =>
                        setMenuItemForm({ ...menuItemForm, courseSectionId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select section…</option>
                      {courseSections.map((section) => (
                        <option key={section.id} value={String(section.id)}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Links appear under this heading in the header Courses dropdown.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Menu Title *
                  </label>
                  <input
                    type="text"
                    value={menuItemForm.title}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter menu title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL / Link
                  </label>
                  <input
                    type="text"
                    value={menuItemForm.link_url}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, link_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., /CAT-MBA or https://edusphere.example.com/CAT-MBA"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Full URL for external/main-site links. Leave empty to use Target Section below.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Icon Class (Optional)
                  </label>
                  <input
                    type="text"
                    value={menuItemForm.icon_class}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, icon_class: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., ri-home-line"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    RemixIcon class name (e.g., ri-home-line, ri-user-line)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Section (Optional)
                  </label>
                  <input
                    type="text"
                    value={menuItemForm.target_section}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, target_section: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., #department, #results"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    In-page section anchor (include #). Used when URL is empty.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
                <button
                  onClick={closeEditMenuModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMenuItem}
                  disabled={saving || !menuItemForm.title || (showCourseSectionField && !menuItemForm.courseSectionId)}
                  className="admin-btn admin-btn--primary admin-btn--sm"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {addingToParent ? 'Add Link' : 'Save Changes'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
