import pool from '@/lib/db'
import { notifySuperAdminsAboutApproval } from '@/lib/notifications'
import {
  APPROVAL_SETTINGS_KEY,
  APPROVAL_SECTIONS,
  buildApprovalSectionsResponse,
  getApprovalSectionByKey,
  getDefaultApprovalSectionSettings,
  mergeApprovalSectionSettings,
  type ApprovalSectionKey,
  type ApprovalSectionSettings,
} from '@/lib/approval-sections'

export async function loadApprovalSectionSettings(): Promise<ApprovalSectionSettings> {
  try {
    const result = await pool.query(
      'SELECT setting_value FROM global_settings WHERE setting_key = $1',
      [APPROVAL_SETTINGS_KEY]
    )

    if (result.rows.length === 0 || !result.rows[0].setting_value) {
      return getDefaultApprovalSectionSettings()
    }

    const parsed = JSON.parse(result.rows[0].setting_value)
    return mergeApprovalSectionSettings(parsed)
  } catch (error) {
    console.error('Error loading approval section settings:', error)
    return getDefaultApprovalSectionSettings()
  }
}

export async function saveApprovalSectionSettings(
  settings: Partial<ApprovalSectionSettings>
): Promise<ApprovalSectionSettings> {
  const merged = mergeApprovalSectionSettings(settings)
  const value = JSON.stringify(merged)

  const existing = await pool.query(
    'SELECT id FROM global_settings WHERE setting_key = $1',
    [APPROVAL_SETTINGS_KEY]
  )

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO global_settings (setting_key, setting_value, setting_type, description)
       VALUES ($1, $2, 'json', 'Per-section super admin approval ON/OFF settings')`,
      [APPROVAL_SETTINGS_KEY, value]
    )
  } else {
    await pool.query(
      `UPDATE global_settings
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = $2`,
      [value, APPROVAL_SETTINGS_KEY]
    )
  }

  return merged
}

export async function isApprovalEnabled(sectionKey: ApprovalSectionKey): Promise<boolean> {
  const settings = await loadApprovalSectionSettings()
  return settings[sectionKey]
}

export async function resolveApprovalStatus(
  sectionKey: ApprovalSectionKey
): Promise<'pending' | 'approved'> {
  return (await isApprovalEnabled(sectionKey)) ? 'pending' : 'approved'
}

export async function applyApprovalWorkflow(params: {
  sectionKey: ApprovalSectionKey
  title: string
  centerId: number
}): Promise<'pending' | 'approved'> {
  const status = await resolveApprovalStatus(params.sectionKey)

  if (status === 'pending') {
    const section = getApprovalSectionByKey(params.sectionKey)
    if (section) {
      await notifySuperAdminsAboutApproval({
        type: section.notifyType,
        title: params.title,
        centerId: params.centerId,
      })
    }
  }

  return status
}

export function formatApprovalSettingsResponse(settings: ApprovalSectionSettings) {
  return {
    sections: buildApprovalSectionsResponse(settings),
    settings,
  }
}

export { APPROVAL_SECTIONS }
