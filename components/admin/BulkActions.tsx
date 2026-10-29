'use client'

import { useState } from 'react'
import { Trash2, CheckCircle, XCircle, X, Loader2 } from 'lucide-react'
import AdminButton from './AdminButton'

interface BulkActionsProps {
  selectedIds: number[]
  onBulkDelete?: () => void | Promise<void>
  onBulkActivate?: () => void | Promise<void>
  onBulkDeactivate?: () => void | Promise<void>
  onClearSelection: () => void
  /** Override labels (e.g. Blog: Publish / Unpublish) */
  activateLabel?: string
  deactivateLabel?: string
  deleteLabel?: string
  entityLabel?: string
}

type BusyAction = 'delete' | 'activate' | 'deactivate' | null

export default function BulkActions({
  selectedIds,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
  onClearSelection,
  activateLabel = 'Activate',
  deactivateLabel = 'Deactivate',
  deleteLabel = 'Delete',
  entityLabel = 'item',
}: BulkActionsProps) {
  const [busy, setBusy] = useState<BusyAction>(null)

  if (selectedIds.length === 0) return null

  const count = selectedIds.length
  const noun = count === 1 ? entityLabel : `${entityLabel}s`
  const disabled = busy !== null

  const run = async (key: BusyAction, fn?: () => void | Promise<void>) => {
    if (!fn || disabled) return
    setBusy(key)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="admin-bulk-bar-wrap" role="region" aria-label="Bulk actions">
      <div className="admin-bulk-bar">
        <div className="admin-bulk-bar__meta">
          <span className="admin-bulk-bar__count" aria-live="polite">
            {count}
          </span>
          <div className="admin-bulk-bar__text">
            <span className="admin-bulk-bar__title">
              {count} {noun} selected
            </span>
            <span className="admin-bulk-bar__hint">Choose an action for the selection</span>
          </div>
        </div>

        <div className="admin-bulk-bar__actions">
          {onBulkActivate && (
            <AdminButton
              variant="success"
              size="sm"
              disabled={disabled}
              onClick={() => void run('activate', onBulkActivate)}
              icon={
                busy === 'activate' ? (
                  <Loader2 className="admin-bulk-bar__spinner" size={15} aria-hidden />
                ) : (
                  <CheckCircle size={15} aria-hidden />
                )
              }
            >
              {activateLabel}
            </AdminButton>
          )}

          {onBulkDeactivate && (
            <AdminButton
              variant="warning"
              size="sm"
              disabled={disabled}
              onClick={() => void run('deactivate', onBulkDeactivate)}
              icon={
                busy === 'deactivate' ? (
                  <Loader2 className="admin-bulk-bar__spinner" size={15} aria-hidden />
                ) : (
                  <XCircle size={15} aria-hidden />
                )
              }
            >
              {deactivateLabel}
            </AdminButton>
          )}

          {onBulkDelete && (
            <AdminButton
              variant="danger"
              size="sm"
              disabled={disabled}
              onClick={() => void run('delete', onBulkDelete)}
              icon={
                busy === 'delete' ? (
                  <Loader2 className="admin-bulk-bar__spinner" size={15} aria-hidden />
                ) : (
                  <Trash2 size={15} aria-hidden />
                )
              }
            >
              {deleteLabel}
            </AdminButton>
          )}

          <AdminButton
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={onClearSelection}
            className="admin-bulk-bar__clear"
            title="Clear selection"
            aria-label="Clear selection"
            icon={<X size={15} aria-hidden />}
          >
            Clear
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
