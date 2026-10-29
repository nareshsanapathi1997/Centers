'use client'

import Link from 'next/link'
import { LogOut, User } from 'lucide-react'
import DarkModeToggle from './DarkModeToggle'
import NotificationsBell from './NotificationsBell'
import './admin-header.css'
import { confirmDialog } from '@/lib/admin-ui-store'

interface AdminHeaderProps {
  title?: string
  centerId?: string
  centerName?: string
  panelLabel?: string
  profileHref?: string
  userType: 'admin' | 'super_admin'
  onLogout: () => void
}

export default function AdminHeader({
  title,
  centerId,
  centerName,
  panelLabel = 'Admin Panel',
  profileHref,
  userType,
  onLogout,
}: AdminHeaderProps) {
  const eyebrow =
    userType === 'admin' && centerName ? `${panelLabel} · ${centerName}` : panelLabel

  return (
    <header className="admin-header">
      <div className="admin-header__inner">
        <div className="admin-header__brand">
          <p className="admin-header__eyebrow">{eyebrow}</p>
          <h1 className="admin-header__title">{title || 'Dashboard'}</h1>
        </div>

        <div className="admin-header__actions">
          <div className="admin-header__toolbar">
            <div className="admin-header-notifications">
              <NotificationsBell userType={userType} centerId={centerId} compact />
            </div>

            <div className="admin-header-theme">
              <DarkModeToggle compact />
            </div>

            {profileHref && (
              <>
                <span className="admin-header__divider" aria-hidden />
                <Link href={profileHref} className="admin-header__profile" title="My Profile">
                  <User className="w-4 h-4 shrink-0" />
                  <span>{userType === 'admin' ? centerName || 'Profile' : 'Profile'}</span>
                </Link>
              </>
            )}

            <span className="admin-header__divider" aria-hidden />

            <button
              type="button"
              onClick={async () => {
                const confirmed = await confirmDialog({
                  title: 'Log out',
                  message: 'Are you sure you want to logout?',
                  confirmLabel: 'Log out',
                })
                if (confirmed) onLogout()
              }}
              className="admin-header__logout admin-header__tool-btn admin-header__tool-btn--danger"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
