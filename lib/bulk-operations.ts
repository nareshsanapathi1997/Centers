/**
 * Bulk operations utilities
 */

export interface BulkOperation {
  ids: number[]
  action: 'delete' | 'activate' | 'deactivate' | 'update'
  data?: Record<string, any>
}

/**
 * Execute bulk delete
 */
export async function bulkDelete(
  endpoint: string,
  ids: number[]
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(endpoint, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids })
    })

    if (response.ok) {
      return { success: true, message: `Successfully deleted ${ids.length} item(s)` }
    } else {
      const error = await response.json()
      return { success: false, message: error.error || 'Failed to delete items' }
    }
  } catch (error) {
    console.error('Bulk delete error:', error)
    return { success: false, message: 'Error deleting items' }
  }
}

/**
 * Execute bulk status change
 */
export async function bulkStatusChange(
  endpoint: string,
  ids: number[],
  status: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(endpoint, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids, is_active: status })
    })

    if (response.ok) {
      return {
        success: true,
        message: `Successfully ${status ? 'activated' : 'deactivated'} ${ids.length} item(s)`
      }
    } else {
      const error = await response.json()
      return { success: false, message: error.error || 'Failed to update items' }
    }
  } catch (error) {
    console.error('Bulk status change error:', error)
    return { success: false, message: 'Error updating items' }
  }
}

/**
 * Execute bulk update
 */
export async function bulkUpdate(
  endpoint: string,
  ids: number[],
  data: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(endpoint, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids, ...data })
    })

    if (response.ok) {
      return { success: true, message: `Successfully updated ${ids.length} item(s)` }
    } else {
      const error = await response.json()
      return { success: false, message: error.error || 'Failed to update items' }
    }
  } catch (error) {
    console.error('Bulk update error:', error)
    return { success: false, message: 'Error updating items' }
  }
}
