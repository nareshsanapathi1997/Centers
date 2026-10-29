'use client'

import type { ReactNode } from 'react'
import AdminModal, { type AdminModalSize } from './AdminModal'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: AdminModalSize
  formError?: string
  footer?: ReactNode
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'default',
  formError,
  footer,
}: FormModalProps) {
  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      formError={formError}
      footer={footer}
    >
      <div className="admin-form">{children}</div>
    </AdminModal>
  )
}
