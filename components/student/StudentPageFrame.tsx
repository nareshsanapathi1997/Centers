import type { ReactNode } from 'react'
import StudentPageHeader, { type StudentBreadcrumbItem } from '@/components/student/StudentPageHeader'
import StudentLoadingState from '@/components/student/StudentLoadingState'

type Props = {
  title: string
  subtitle?: ReactNode
  breadcrumbs?: StudentBreadcrumbItem[]
  actions?: ReactNode
  loading?: boolean
  loadingLabel?: string
  loadingRows?: number
  className?: string
  children: ReactNode
}

/**
 * Consistent student portal page chrome: header always visible, shared loading skeleton.
 * Keeps premium `sp-*` visual language — do not swap for admin kit here.
 */
export default function StudentPageFrame({
  title,
  subtitle,
  breadcrumbs,
  actions,
  loading = false,
  loadingLabel = 'Loading',
  loadingRows = 2,
  className = 'sp-page',
  children,
}: Props) {
  return (
    <div className={className}>
      <StudentPageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />
      {loading ? <StudentLoadingState label={loadingLabel} rows={loadingRows} /> : children}
    </div>
  )
}
