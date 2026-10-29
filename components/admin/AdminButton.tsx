'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type AdminButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'ghost'
  | 'ghost-danger'
  | 'icon-edit'
  | 'icon-danger'

export type AdminButtonSize = 'xs' | 'sm' | 'md'

export interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant
  size?: AdminButtonSize
  icon?: ReactNode
  trailingIcon?: ReactNode
  active?: boolean
}

function buildAdminButtonClassName(
  variant: AdminButtonVariant = 'primary',
  size: AdminButtonSize = 'sm',
  active = false,
  className = ''
): string {
  const classes = ['admin-btn', `admin-btn--${size}`]

  if (variant === 'icon-edit') {
    classes.push('admin-btn--icon', 'admin-btn--icon-edit')
  } else if (variant === 'icon-danger') {
    classes.push('admin-btn--icon', 'admin-btn--icon-danger')
  } else {
    classes.push(`admin-btn--${variant}`)
  }

  if (active) {
    classes.push('admin-btn--active')
  }

  if (className) {
    classes.push(className)
  }

  return classes.join(' ')
}

const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(function AdminButton(
  {
    variant = 'primary',
    size = 'sm',
    icon,
    trailingIcon,
    active = false,
    className = '',
    children,
    type,
    ...props
  },
  ref
) {
  const isIconOnly =
    variant === 'icon-edit' ||
    variant === 'icon-danger' ||
    (variant === 'ghost' && !children && Boolean(icon) && !className.includes('admin-btn--icon'))

  const resolvedClassName = [
    buildAdminButtonClassName(variant, isIconOnly ? 'sm' : size, active, className),
    isIconOnly && variant === 'ghost' ? 'admin-btn--icon' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} type={type ?? 'button'} className={resolvedClassName} {...props}>
      {icon ? <span className="admin-btn__icon">{icon}</span> : null}
      {children}
      {trailingIcon ? <span className="admin-btn__icon">{trailingIcon}</span> : null}
    </button>
  )
})

export default AdminButton
export { buildAdminButtonClassName }
