'use client'

import AdminButton from './AdminButton'

interface FormModalActionsProps {
  onCancel: () => void
  submitLabel: string
  cancelLabel?: string
  isSubmitting?: boolean
  submitDisabled?: boolean
  /** When actions live in AdminModal footer (outside <form>), link submit via form id. */
  formId?: string
  className?: string
}

export default function FormModalActions({
  onCancel,
  submitLabel,
  cancelLabel = 'Cancel',
  isSubmitting = false,
  submitDisabled = false,
  formId,
  className = '',
}: FormModalActionsProps) {
  return (
    <div
      className={`admin-btn-group admin-btn-group--end admin-modal__footer-actions ${className}`.trim()}
    >
      <AdminButton type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
        {cancelLabel}
      </AdminButton>
      <AdminButton
        type="submit"
        variant="primary"
        size="sm"
        form={formId}
        disabled={isSubmitting || submitDisabled}
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </AdminButton>
    </div>
  )
}
