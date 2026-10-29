/**
 * Tiny pub/sub between the imperative `toast()` / `confirmDialog()` helpers and
 * the provider that renders them.
 *
 * An imperative API (rather than a hook) is deliberate: the calls it replaces
 * were `alert()` and `confirm()` scattered through event handlers, and a
 * module-level function is a drop-in there. It also means deeply nested
 * components need no prop or context plumbing to raise a message.
 */

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export type ToastMessage = {
  id: number
  variant: ToastVariant
  message: string
  /** Milliseconds before auto-dismiss; 0 keeps it until dismissed. */
  duration: number
}

export type ConfirmOptions = {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button as a destructive action. */
  destructive?: boolean
}

export type ConfirmRequest = ConfirmOptions & {
  id: number
  resolve: (confirmed: boolean) => void
}

type Listener = {
  onToast: (toast: ToastMessage) => void
  onDismiss: (id: number) => void
  onConfirm: (request: ConfirmRequest) => void
}

let listener: Listener | null = null
let nextId = 1

export function registerAdminUiListener(next: Listener | null): void {
  listener = next
}

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  // Errors stay longer: they usually carry information the user must act on.
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
}

function push(variant: ToastVariant, message: unknown, duration?: number): number {
  const id = nextId++
  const text =
    typeof message === 'string'
      ? message
      : message instanceof Error
        ? message.message
        : String(message ?? '')

  if (!listener) {
    // No provider mounted (e.g. a page outside the admin layout). Falling back
    // to the console rather than throwing keeps the calling flow intact.
    console[variant === 'error' ? 'error' : 'log'](`[toast:${variant}]`, text)
    return id
  }

  listener.onToast({
    id,
    variant,
    message: text,
    duration: duration ?? DEFAULT_DURATIONS[variant],
  })
  return id
}

export const toast = {
  success: (message: unknown, duration?: number) => push('success', message, duration),
  error: (message: unknown, duration?: number) => push('error', message, duration),
  info: (message: unknown, duration?: number) => push('info', message, duration),
  warning: (message: unknown, duration?: number) => push('warning', message, duration),
  dismiss: (id: number) => listener?.onDismiss(id),
}

/**
 * Promise-based replacement for `window.confirm`. Resolves true when confirmed.
 *
 * With no provider mounted it resolves false, so a destructive action can never
 * proceed just because the UI failed to render.
 */
export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const opts = typeof options === 'string' ? { message: options } : options

  if (!listener) {
    console.warn('[confirmDialog] no provider mounted; treating as cancelled')
    return Promise.resolve(false)
  }

  return new Promise<boolean>((resolve) => {
    listener!.onConfirm({ ...opts, id: nextId++, resolve })
  })
}
