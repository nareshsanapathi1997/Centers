'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import {
  registerAdminUiListener,
  type ConfirmRequest,
  type ToastMessage,
  type ToastVariant,
} from '@/lib/admin-ui-store'
import { useFocusTrap } from '@/lib/useFocusTrap'
import './admin-ui.css'

const ICONS: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const ROLE: Record<ToastVariant, 'status' | 'alert'> = {
  // Errors and warnings interrupt; success/info are announced politely.
  success: 'status',
  info: 'status',
  warning: 'alert',
  error: 'alert',
}

function ConfirmDialog({
  request,
  onResolve,
}: {
  request: ConfirmRequest
  onResolve: (confirmed: boolean) => void
}) {
  const containerRef = useFocusTrap<HTMLDivElement>(true)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onResolve(false)
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onResolve])

  return (
    <div className="admin-confirm-overlay" role="presentation" onClick={() => onResolve(false)}>
      <div
        ref={containerRef}
        className="admin-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`confirm-title-${request.id}`}
        aria-describedby={`confirm-message-${request.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={`confirm-title-${request.id}`} className="admin-confirm__title">
          {request.title ?? (request.destructive ? 'Confirm deletion' : 'Please confirm')}
        </h2>
        <p id={`confirm-message-${request.id}`} className="admin-confirm__message">
          {request.message}
        </p>
        <div className="admin-confirm__actions">
          <button
            type="button"
            className="admin-confirm__btn admin-confirm__btn--cancel"
            onClick={() => onResolve(false)}
          >
            {request.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            data-autofocus
            className={`admin-confirm__btn ${
              request.destructive
                ? 'admin-confirm__btn--danger'
                : 'admin-confirm__btn--primary'
            }`}
            onClick={() => onResolve(true)}
          >
            {request.confirmLabel ?? (request.destructive ? 'Delete' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders toasts and confirmation dialogs for the admin panels, replacing the
 * blocking `alert()` and `confirm()` calls these screens used to make.
 *
 * Mount once per panel layout. Portals to document.body so a dialog is never
 * clipped by an ancestor's overflow or stacking context.
 */
export default function AdminUIProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)
  const [mounted, setMounted] = useState(false)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    setMounted(true)

    registerAdminUiListener({
      onToast: (toast) => {
        setToasts((current) => {
          // Repeated identical messages (e.g. a retried save) replace rather
          // than stack, and the list is capped so a loop cannot fill the screen.
          const withoutDuplicate = current.filter(
            (t) => !(t.message === toast.message && t.variant === toast.variant)
          )
          return [...withoutDuplicate, toast].slice(-4)
        })

        if (toast.duration > 0) {
          timers.current.set(
            toast.id,
            setTimeout(() => dismiss(toast.id), toast.duration)
          )
        }
      },
      onDismiss: dismiss,
      onConfirm: (request) => setConfirmRequest(request),
    })

    return () => {
      registerAdminUiListener(null)
      for (const timer of timers.current.values()) clearTimeout(timer)
      timers.current.clear()
    }
  }, [dismiss])

  const resolveConfirm = useCallback(
    (confirmed: boolean) => {
      setConfirmRequest((current) => {
        current?.resolve(confirmed)
        return null
      })
    },
    []
  )

  if (!mounted) return null

  return createPortal(
    <>
      <div className="admin-toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.variant]
          return (
            <div
              key={toast.id}
              role={ROLE[toast.variant]}
              className={`admin-toast admin-toast--${toast.variant}`}
            >
              <Icon className="admin-toast__icon" aria-hidden="true" />
              <p className="admin-toast__message">{toast.message}</p>
              <button
                type="button"
                className="admin-toast__close"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>

      {confirmRequest ? (
        <ConfirmDialog request={confirmRequest} onResolve={resolveConfirm} />
      ) : null}
    </>,
    document.body
  )
}
