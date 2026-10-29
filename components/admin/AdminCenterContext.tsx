'use client'

import { createContext, useContext } from 'react'

export type AdminCenterContextValue = {
  center: Record<string, unknown> | null
  centerId: string
  catalogCoursesAvailable: boolean
}

const AdminCenterContext = createContext<AdminCenterContextValue | null>(null)

export function AdminCenterProvider({
  value,
  children,
}: {
  value: AdminCenterContextValue
  children: React.ReactNode
}) {
  return <AdminCenterContext.Provider value={value}>{children}</AdminCenterContext.Provider>
}

export function useAdminCenter() {
  return useContext(AdminCenterContext)
}
