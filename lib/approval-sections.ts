/**
 * Registry of content sections that support super-admin approval.
 * To add a new section: add an entry here, wire the admin API route, and
 * include the section in the approvals API if needed.
 */
export type ApprovalSectionKey = 'news' | 'alert' | 'hero'

export type ApprovalSectionSettings = Record<ApprovalSectionKey, boolean>

export interface ApprovalSectionDefinition {
  key: ApprovalSectionKey
  label: string
  description: string
  defaultEnabled: boolean
  itemType: 'news' | 'alert' | 'hero'
  notifyType: 'news' | 'alert' | 'hero'
}

export const APPROVAL_SETTINGS_KEY = 'approval_section_settings'

export const APPROVAL_SECTIONS: ApprovalSectionDefinition[] = [
  {
    key: 'news',
    label: 'News & Notifications',
    description:
      'News posts and notification items from center admins require approval before they appear on the public site.',
    defaultEnabled: true,
    itemType: 'news',
    notifyType: 'news',
  },
  {
    key: 'alert',
    label: 'Alerts / Banners',
    description: 'Alert banners created by center admins.',
    defaultEnabled: true,
    itemType: 'alert',
    notifyType: 'alert',
  },
  {
    key: 'hero',
    label: 'Hero Slides',
    description: 'Homepage hero slider banners uploaded by center admins.',
    defaultEnabled: true,
    itemType: 'hero',
    notifyType: 'hero',
  },
]

export function getDefaultApprovalSectionSettings(): ApprovalSectionSettings {
  return APPROVAL_SECTIONS.reduce((acc, section) => {
    acc[section.key] = section.defaultEnabled
    return acc
  }, {} as ApprovalSectionSettings)
}

export function mergeApprovalSectionSettings(
  stored: Partial<ApprovalSectionSettings> | null | undefined
): ApprovalSectionSettings {
  const merged = getDefaultApprovalSectionSettings()
  if (!stored) return merged

  for (const section of APPROVAL_SECTIONS) {
    const value = stored[section.key]
    if (typeof value === 'boolean') {
      merged[section.key] = value
    }
  }

  return merged
}

export function getApprovalSectionByKey(key: string): ApprovalSectionDefinition | undefined {
  return APPROVAL_SECTIONS.find((section) => section.key === key)
}

export function getApprovalSectionByItemType(itemType: string): ApprovalSectionDefinition | undefined {
  return APPROVAL_SECTIONS.find((section) => section.itemType === itemType)
}

export function buildApprovalSectionsResponse(settings: ApprovalSectionSettings) {
  return APPROVAL_SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    description: section.description,
    enabled: settings[section.key],
    itemType: section.itemType,
  }))
}
