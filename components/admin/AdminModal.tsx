'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import AdminButton from './AdminButton'
import { useFocusTrap } from '@/lib/useFocusTrap'
import './admin-modal.css'

export type AdminModalSize = 'sm' | 'default' | 'large' | 'xlarge'

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  size?: AdminModalSize
  footer?: ReactNode
  children: ReactNode
  closeOnOverlayClick?: boolean
  formError?: string
}

export default function AdminModal({
  isOpen,
  onClose,
  title,
  description,
  size = 'default',
  footer,
  children,
  closeOnOverlayClick = true,
  formError,
}: AdminModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen)

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="admin-modal-overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`admin-modal admin-modal--${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        aria-describedby={description ? 'admin-modal-description' : undefined}
      >
        <div className="admin-modal__header">
          <div className="admin-modal__header-text">
            <h2 id="admin-modal-title" className="admin-modal__title">
              {title}
            </h2>
            {description ? (
              <p id="admin-modal-description" className="admin-modal__description">
                {description}
              </p>
            ) : null}
          </div>
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="admin-btn--icon"
            aria-label="Close modal"
            data-dialog-dismiss
            icon={<X className="text-gray-400 dark:text-gray-300" />}
          />
        </div>

        <div className="admin-modal__body">
          {formError ? <div className="admin-modal__error">{formError}</div> : null}
          {children}
        </div>

        {footer ? <div className="admin-modal__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
