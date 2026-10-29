'use client'

import type { ReactNode } from 'react'
import { Save } from 'lucide-react'
import AdminButton from './AdminButton'

type PageFormActionsProps = {
  /** Shown while submit is in flight. */
  isSubmitting?: boolean
  submitLabel?: string
  submittingLabel?: string
  /** Optional secondary action (e.g. Reset / Cancel). */
  onSecondary?: () => void
  secondaryLabel?: string
  secondaryDisabled?: boolean
  submitDisabled?: boolean
  /** When actions sit outside the form, link submit via form id. */
  formId?: string
  /** Sticky bottom bar (default) vs inline footer. */
  sticky?: boolean
  /** Optional status / hint on the left. */
  status?: ReactNode
  className?: string
}

/**
 * Page-level save chrome for full-page admin forms (not modals).
 * Prefer this over a lone bottom button so long forms keep Save visible.
 */
export default function PageFormActions({
  isSubmitting = false,
  submitLabel = 'Save Changes',
  submittingLabel = 'Saving…',
  onSecondary,
  secondaryLabel = 'Cancel',
  secondaryDisabled = false,
  submitDisabled = false,
  formId,
  sticky = true,
  status,
  className = '',
}: PageFormActionsProps) {
  return (
    <div
      className={`admin-page-form-actions ${sticky ? 'admin-page-form-actions--sticky' : ''} ${className}`.trim()}
    >
      <div className="admin-page-form-actions__inner">
        <div className="admin-page-form-actions__status">{status}</div>
        <div className="admin-btn-group admin-btn-group--end">
          {onSecondary ? (
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={onSecondary}
              disabled={isSubmitting || secondaryDisabled}
            >
              {secondaryLabel}
            </AdminButton>
          ) : null}
          <AdminButton
            type="submit"
            variant="primary"
            size="sm"
            form={formId}
            disabled={isSubmitting || submitDisabled}
            icon={<Save className="h-4 w-4" />}
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
