'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import {
  getNotificationLinkLabel,
  isExternalNotificationLink,
  resolveNotificationLinkForAnchor,
  resolveNotificationLinkForRouter,
} from '@/lib/admin-notification-link'

interface AdminNotificationLinkProps {
  href: string
  onNavigate?: () => void
  className?: string
  showExternalIcon?: boolean
}

const DEFAULT_CLASS =
  'inline-flex items-center gap-1 mt-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline'

export default function AdminNotificationLink({
  href,
  onNavigate,
  className = DEFAULT_CLASS,
  showExternalIcon = true,
}: AdminNotificationLinkProps) {
  const label = getNotificationLinkLabel(href)

  if (isExternalNotificationLink(href)) {
    return (
      <a
        href={resolveNotificationLinkForAnchor(href)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {label}
        {showExternalIcon ? <ExternalLink className="w-3 h-3 shrink-0" /> : null}
      </a>
    )
  }

  return (
    <Link href={resolveNotificationLinkForRouter(href)} className={className} onClick={onNavigate}>
      {label}
    </Link>
  )
}
