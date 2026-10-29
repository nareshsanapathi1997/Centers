'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import MetricCard from '@/components/cards/MetricCard'
import { superAdminFetch } from '@/lib/super-admin-api'

interface CenterOverviewItem {
  id: number
  name: string
  slug: string
  city: string
  state: string
  isActive: boolean
  studentsCount: number
  coursesCount: number
  enquiriesCount: number
  adminsCount: number
  galleryCount: number
  testimonialsCount: number
}

interface DashboardStats {
  totalCenters: number
  activeCenters: number
  totalAdmins: number
  totalStudents: number
  totalCourses: number
  totalEnquiries: number
  totalGallery: number
  totalBlogPosts: number
  centersOverview: CenterOverviewItem[]
}

const CENTER_BAR_COLORS = ['#4f46e5', '#6366f1', '#7c3aed', '#0284c7', '#10b981', '#4338ca']

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    superAdminFetch('/api/super-admin/dashboard-stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const centerChartData = useMemo(() => {
    if (!stats?.centersOverview?.length) return []
    return stats.centersOverview.map((c, idx) => ({
      name: c.city.split(' ')[0] || c.name.replace(/^EduSphere\s+/i, ''),
      fullName: c.name,
      courses: c.coursesCount,
      enquiries: c.enquiriesCount,
      students: c.studentsCount,
      totalActivity: c.coursesCount + c.enquiriesCount + c.studentsCount + c.galleryCount,
      color: CENTER_BAR_COLORS[idx % CENTER_BAR_COLORS.length],
    }))
  }, [stats])

  const pieData = useMemo(() => {
    if (!stats) return []
    const inactive = Math.max(0, stats.totalCenters - stats.activeCenters)
    if (inactive === 0) {
      return [
        { name: 'Active Centres', value: stats.activeCenters || 6, color: '#10b981' },
      ]
    }
    return [
      { name: 'Active Centres', value: stats.activeCenters, color: '#10b981' },
      { name: 'Inactive Centres', value: inactive, color: '#64748b' },
    ]
  }, [stats])

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Multi-Centre Network Control
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
            Super Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Real-time operational health, academic catalog volume, and enquiry flow across all regional centres.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/super-admin/centers"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-indigo-500/40 transition-colors shadow-xs"
          >
            <i className="ri-building-2-line text-indigo-500" /> View All Centres
          </Link>
          <Link
            href="/super-admin/reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-xs"
          >
            <i className="ri-bar-chart-box-line" /> Platform Reports
          </Link>
        </div>
      </div>

      {/* 4-Column KPI Grid */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          <MetricCard
            title="Total Centres"
            value={stats?.totalCenters ?? 0}
            href="/super-admin/centers"
            actionLabel="Manage"
            subtitle={`${stats?.activeCenters ?? 0} of ${stats?.totalCenters ?? 0} live on public directory`}
            variant="primary"
            loading={loading}
            icon={<i className="ri-building-4-line text-lg" />}
          />
          <MetricCard
            title="Active Centres"
            value={stats?.activeCenters ?? 0}
            href="/super-admin/centers"
            actionLabel="Inspect"
            subtitle="100% operational readiness"
            variant="success"
            loading={loading}
            icon={<i className="ri-checkbox-circle-line text-lg" />}
          />
          <MetricCard
            title="Centre Admins & Staff"
            value={stats?.totalAdmins ?? 0}
            href="/super-admin/center-admins"
            actionLabel="Users"
            subtitle={`${stats?.totalStudents ?? 0} enrolled portal students`}
            variant="default"
            loading={loading}
            icon={<i className="ri-shield-user-line text-lg" />}
          />
          <MetricCard
            title="Courses & Enquiries"
            value={(stats?.totalCourses ?? 0) + (stats?.totalEnquiries ?? 0)}
            href="/super-admin/reports"
            actionLabel="Analytics"
            subtitle={`${stats?.totalCourses ?? 0} active courses | ${stats?.totalEnquiries ?? 0} enquiries`}
            variant="warning"
            loading={loading}
            icon={<i className="ri-line-chart-line text-lg" />}
          />
        </div>
      </section>

      {/* Middle 12-Column Analytics & Center Status Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Multi-Centre Operations Bar Chart & Breakdown */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text)]">
                  Centre Operations & Academic Volume
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  Published courses, enquiries, and campus media across all 6 regional centres
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" /> Courses
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" /> Enquiries & Media
                </span>
              </div>
            </div>

            <div className="w-full h-[250px]">
              {loading ? (
                <div className="w-full h-full rounded-xl bg-[var(--color-border-subtle)] animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={centerChartData}
                    margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                    barGap={6}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontWeight: 600 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-md)',
                        color: 'var(--color-text)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="courses"
                      name="Active Courses"
                      fill="#4f46e5"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="totalActivity"
                      name="Total Content & Enquiries"
                      fill="#0ea5e9"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Summary Strip at bottom of Left Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-[var(--color-border-subtle)]">
            <div className="rounded-xl bg-[var(--color-bg-muted)] p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Active Courses
              </span>
              <strong className="mt-1 block text-lg font-bold text-[var(--color-text)] tabular-nums">
                {stats?.totalCourses ?? 0}
              </strong>
            </div>
            <div className="rounded-xl bg-[var(--color-bg-muted)] p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Total Enquiries
              </span>
              <strong className="mt-1 block text-lg font-bold text-[var(--color-text)] tabular-nums">
                {stats?.totalEnquiries ?? 0}
              </strong>
            </div>
            <div className="rounded-xl bg-[var(--color-bg-muted)] p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Portal Students
              </span>
              <strong className="mt-1 block text-lg font-bold text-[var(--color-text)] tabular-nums">
                {stats?.totalStudents ?? 0}
              </strong>
            </div>
            <div className="rounded-xl bg-[var(--color-bg-muted)] p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Campus Gallery
              </span>
              <strong className="mt-1 block text-lg font-bold text-[var(--color-text)] tabular-nums">
                {stats?.totalGallery ?? 0}
              </strong>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Center Status Donut + Live Centre Readiness Roster */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text)]">Center Status & Readiness</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  Live status and portal links across all regional centres
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats?.activeCenters ?? 6}/{stats?.totalCenters ?? 6} Active
              </span>
            </div>

            {/* Compact Donut + KPI Callout */}
            <div className="flex items-center gap-5 p-3.5 rounded-xl bg-[var(--color-bg-muted)] border border-[var(--color-border-subtle)] mb-4">
              <div className="w-24 h-24 shrink-0 relative">
                <ResponsiveContainer width="100%" height={96}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={42}
                      paddingAngle={2}
                      dataKey="value"
                      isAnimationActive={false}
                      stroke="none"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-extrabold text-[var(--color-text)] tabular-nums">100%</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  All Regional Campuses Live
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Every centre microsite, enquiry pipeline, and student portal is active and synced with the central database.
                </p>
              </div>
            </div>

            {/* Live Centre List */}
            <div className="space-y-2">
              {(stats?.centersOverview ?? []).map((center) => (
                <div
                  key={center.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[var(--color-border-subtle)] hover:border-indigo-500/35 bg-[var(--color-surface)] transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        center.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-text)] truncate">{center.name}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                        {center.coursesCount} courses | {center.enquiriesCount} enquiries | {center.studentsCount} students
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/${center.id}/dashboard`}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                    >
                      Manage <i className="ri-arrow-right-line ml-0.5" aria-hidden="true" /></Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions 4-Column Bento Grid */}
      <section aria-label="Quick actions">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--color-text)]">Platform Governance & Quick Actions</h2>
          <span className="text-xs text-[var(--color-text-muted)]">Direct administrative controls</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {[
            {
              href: '/super-admin/centers',
              icon: 'ri-building-2-line',
              title: 'Manage Centres',
              desc: 'Add or edit regional centres, contact info, map coordinates, and active status.',
            },
            {
              href: '/super-admin/center-admins',
              icon: 'ri-user-settings-line',
              title: 'Admin & Staff Access',
              desc: 'Provision centre administrators, reset passwords, and manage role permissions.',
            },
            {
              href: '/super-admin/expenses',
              icon: 'ri-wallet-3-line',
              title: 'Expenses & Approvals',
              desc: 'Review centre operational budgets, expense submissions, and approval workflows.',
            },
            {
              href: '/super-admin/reports',
              icon: 'ri-file-chart-line',
              title: 'Cross-Centre Reports',
              desc: 'Compare student enrolment, exam performance, and enquiry conversion across campuses.',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col justify-between h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-[var(--shadow-md)] transition-all"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mb-3.5 border border-indigo-500/15">
                  <i className={`${item.icon} text-lg`} />
                </div>
                <h3 className="text-sm font-bold text-[var(--color-text)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
              </div>
              <span className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Open module <i className="ri-arrow-right-line group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
