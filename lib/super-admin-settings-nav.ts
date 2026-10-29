import type { LucideIcon } from 'lucide-react'
import {
  Image,
  Menu,
  Settings as SettingsIcon,
  Navigation,
  FileImage,
  Smartphone,
  PanelBottom,
  CheckCircle2,
  Palette,
} from 'lucide-react'

export type SuperAdminSettingsNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const SUPER_ADMIN_SETTINGS_NAV: SuperAdminSettingsNavItem[] = [
  { href: '/super-admin/settings', label: 'Hero Section', icon: Image },
  { href: '/super-admin/settings/logo-favicon', label: 'Logo & Favicon', icon: FileImage },
  { href: '/super-admin/settings/theme', label: 'Theme', icon: Palette },
  { href: '/super-admin/settings/navigation', label: 'Header Navigation', icon: Navigation },
  { href: '/super-admin/settings/menu-items', label: 'Menu Items', icon: Menu },
  { href: '/super-admin/settings/mobile-app', label: 'Mobile App', icon: Smartphone },
  { href: '/super-admin/settings/footer', label: 'Footer', icon: PanelBottom },
  { href: '/super-admin/settings/approvals', label: 'Content Approvals', icon: CheckCircle2 },
  { href: '/super-admin/settings/global', label: 'Global Settings', icon: SettingsIcon },
]

export function isSuperAdminSettingsPath(pathname: string | null): boolean {
  return Boolean(pathname === '/super-admin/settings' || pathname?.startsWith('/super-admin/settings/'))
}

export function isSuperAdminSettingsItemActive(pathname: string | null, href: string): boolean {
  if (href === '/super-admin/settings') {
    return pathname === '/super-admin/settings'
  }
  return pathname === href
}
