import pool from './db'

export interface ActivityLog {
  user_type: 'admin' | 'super_admin' | 'student'
  user_id: number
  center_id?: number | null
  action: string
  entity_type: string
  entity_id?: number | null
  entity_name?: string | null
  details?: Record<string, any> | null
  ip_address?: string | null
  user_agent?: string | null
}

import { NextRequest } from 'next/server'

/**
 * Log an activity
 */
export async function logActivity(
  activity: ActivityLog,
  request?: NextRequest | { headers: Headers }
): Promise<void> {
  try {
    // Extract IP and user agent from request if provided
    let ipAddress: string | null = null
    let userAgent: string | null = null

    if (request) {
      const headers = request instanceof NextRequest ? request.headers : request.headers
      ipAddress = headers.get('x-forwarded-for')?.split(',')[0] || 
                  headers.get('x-real-ip') || 
                  null
      userAgent = headers.get('user-agent') || null
    }

    await pool.query(
      `INSERT INTO activity_logs 
       (user_type, user_id, center_id, action, entity_type, entity_id, entity_name, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        activity.user_type,
        activity.user_id,
        activity.center_id || null,
        activity.action,
        activity.entity_type,
        activity.entity_id || null,
        activity.entity_name || null,
        activity.details ? JSON.stringify(activity.details) : null,
        ipAddress,
        userAgent,
      ]
    )
  } catch (error) {
    // Don't throw - logging should not break the main flow
    console.error('Error logging activity:', error)
  }
}

/**
 * Get activity logs
 */
export async function getActivityLogs(
  filters: {
    user_type?: 'admin' | 'super_admin' | 'student'
    user_id?: number
    center_id?: number
    action?: string
    entity_type?: string
    limit?: number
    offset?: number
  } = {}
): Promise<any[]> {
  try {
    const conditions: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (filters.user_type) {
      conditions.push(`user_type = $${paramCount++}`)
      values.push(filters.user_type)
    }

    if (filters.user_id) {
      conditions.push(`user_id = $${paramCount++}`)
      values.push(filters.user_id)
    }

    if (filters.center_id) {
      conditions.push(`center_id = $${paramCount++}`)
      values.push(filters.center_id)
    }

    if (filters.action) {
      conditions.push(`action = $${paramCount++}`)
      values.push(filters.action)
    }

    if (filters.entity_type) {
      conditions.push(`entity_type = $${paramCount++}`)
      values.push(filters.entity_type)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit || 100
    const offset = filters.offset || 0

    values.push(limit, offset)

    const result = await pool.query(
      `SELECT * FROM activity_logs 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      values
    )

    return result.rows.map(row => ({
      ...row,
      details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
    }))
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return []
  }
}
