'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import MetricCard from '@/components/cards/MetricCard'
import { authenticatedFetch } from '@/lib/admin-api'

interface Stats {
  newsCount: number
  coursesCount: number
  enquiriesCount: number
  newEnquiriesCount: number
  galleryCount: number
  blogCount: number
  testimonialsCount: number
  usersCount: number
}

const BAR_PALETTE = ['#4f46e5', '#6366f1', '#0ea5e9', '#7c3aed', '#10b981', '#f59e0b']

export default function CenterDashboardPage() {
  const params = useParams()
  const centerId = params.centerId as string
  const [centerName, setCenterName] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authenticatedFetch(`/api/admin/dashboard-stats?centerId=${encodeURIComponent(centerId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.centerName) setCenterName(data.centerName)
          setStats(data)
        }
      })
      .finally(() => setLoading(false))
  }, [centerId])

  const base = `/admin/${centerId}`

  const barData = useMemo(() => {
    return [
      { name: 'News', count: stats?.newsCount ?? 0, href: `${base}/news`, color: BAR_PALETTE[0] },
      { name: 'Courses', count: stats?.coursesCount ?? 0, href: `${base}/courses`, color: BAR_PALETTE[1] },
      { name: 'Enquiries', count: stats?.enquiriesCount ?? 0, href: `${base}/enquiries`, color: BAR_PALETTE[2] },
      { name: 'Gallery', count: stats?.galleryCount ?? 0, href: `${base}/gallery`, color: BAR_PALETTE[3] },
      { name: 'Blog', count: stats?.blogCount ?? 0, href: `${base}/blog`, color: BAR_PALETTE[4] },
      { name: 'Testimonials', count: stats?.testimonialsCount ?? 0, href: `${base}/testimonials`, color: BAR_PALETTE[5] },
    ]
  }, [stats, base])

  const maxCount = useMemo(() => {
    const max = Math.max(...barData.map((d) => d.count), 1)
    return max
  }, [barData])

  const quickActions = [
    {
      href: `${base}/settings`,
      icon: 'ri-building-4-line',
      title: 'Centre Details & Contact',
      desc: 'Update campus address, phone numbers, working hours, WhatsApp link, and Google Map coordinates.',
    },
    {
      href: `${base}/hero`,
      icon: 'ri-image-edit-line',
      title: 'Hero Banners & Sliders',
      desc: 'Manage homepage hero banners, headlines, call-to-action buttons, and display sequence.',
    },
    {
      href: `${base}/courses`,
      icon: 'ri-book-open-line',
      title: 'Courses & Exam Batches',
      desc: 'Publish exam preparation tracks, batch schedules, fee structures, and syllabus details.',
    },
    {
      href: `${base}/enquiries`,
      icon: 'ri-customer-service-2-line',
      title: 'Student Enquiries',
      desc: `Review incoming counselling requests (${stats?.newEnquiriesCount ?? 0} new) and update follow-up status.`,
    },
    {
      href: `${base}/students`,
      icon: 'ri-graduation-cap-line',
      title: 'Students & Enrolments',
      desc: 'Manage enrolled students, batch assignments, attendance records, and fee instalments.',
    },
    {
      href: `${base}/assessments`,
      icon: 'ri-file-list-3-line',
      title: 'Online Exams & Results',
      desc: 'Configure mock tests, question banks, proctoring rules, and published merit lists.',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Centre Administration Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
            {centerName ? `${centerName} \u2014 Dashboard` : 'Centre Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Manage academic batches, website content, enquiries, and student operations for this campus.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`${base}/enquiries`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-indigo-500/40 transition-colors shadow-xs"
          >
            <i className="ri-mail-unread-line text-indigo-500" /> Enquiries ({stats?.newEnquiriesCount ?? 0} new)
          </Link>
          <Link
            href={`${base}/courses`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-xs"
          >
            <i className="ri-add-circle-line" /> Manage Courses
          </Link>
        </div>
      </div>

      {/* 8 KPI Cards in a Clean 4x2 Grid */}
      <section aria-label="Content and activity metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          <MetricCard
            title="News & Updates"
            value={stats?.newsCount ?? 0}
            href={`${base}/news`}
            subtitle="Announcements & batch notices"
            loading={loading}
            icon={<i className="ri-newspaper-line text-lg" />}
          />
          <MetricCard
            title="Active Courses"
            value={stats?.coursesCount ?? 0}
            href={`${base}/courses`}
            subtitle="Published exam tracks"
            variant="primary"
            loading={loading}
            icon={<i className="ri-book-open-line text-lg" />}
          />
          <MetricCard
            title="Total Enquiries"
            value={stats?.enquiriesCount ?? 0}
            href={`${base}/enquiries`}
            actionLabel="View"
            subtitle="Counselling & callback leads"
            loading={loading}
            icon={<i className="ri-question-answer-line text-lg" />}
          />
          <MetricCard
            title="New Enquiries"
            value={stats?.newEnquiriesCount ?? 0}
            href={`${base}/enquiries?status=new`}
            actionLabel="Respond"
            subtitle="Awaiting counsellor follow-up"
            variant={stats && stats.newEnquiriesCount > 0 ? 'warning' : 'default'}
            loading={loading}
            icon={<i className="ri-notification-badge-line text-lg" />}
          />
          <MetricCard
            title="Campus Gallery"
            value={stats?.galleryCount ?? 0}
            href={`${base}/gallery`}
            subtitle="Classroom & facility photos"
            loading={loading}
            icon={<i className="ri-gallery-line text-lg" />}
          />
          <MetricCard
            title="Blog & Briefings"
            value={stats?.blogCount ?? 0}
            href={`${base}/blog`}
            subtitle="Exam strategy articles"
            loading={loading}
            icon={<i className="ri-article-line text-lg" />}
          />
          <MetricCard
            title="Testimonials"
            value={stats?.testimonialsCount ?? 0}
            href={`${base}/testimonials`}
            subtitle="Verified student stories"
            variant="success"
            loading={loading}
            icon={<i className="ri-chat-quote-line text-lg" />}
          />
          <MetricCard
            title="Centre Staff & Users"
            value={stats?.usersCount ?? 0}
            href={`${base}/center-admins`}
            subtitle="Active portal administrators"
            loading={loading}
            icon={<i className="ri-team-line text-lg" />}
          />
        </div>
      </section>

      {/* Content Overview Chart + Breakdown Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Bar Chart */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text)]">Content Overview</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  Published items and student enquiries across all centre modules
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                {barData.reduce((acc, item) => acc + item.count, 0)} Total Records
              </span>
            </div>

            <div className="w-full h-[260px]">
              {loading ? (
                <div className="w-full h-full rounded-xl bg-[var(--color-border-subtle)] animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ top: 12, right: 16, left: -12, bottom: 6 }}>
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
                      dataKey="count"
                      name="Records"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={44}
                      isAnimationActive={false}
                    >
                      {barData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Visual Distribution & Quick Module Links */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text)]">Module Distribution</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)] mb-5">
              Direct breakdown of published content and active leads
            </p>

            <div className="space-y-3.5">
              {barData.map((item) => {
                const pct = Math.max(10, Math.round((item.count / maxCount) * 100))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group block p-2.5 rounded-xl border border-[var(--color-border-subtle)] hover:border-indigo-500/35 bg-[var(--color-bg-muted)] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-[var(--color-text)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.name}
                      </span>
                      <span className="text-[var(--color-text)] tabular-nums font-bold">
                        {item.count} <span className="text-[var(--color-text-muted)] font-normal">items</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions 3x2 Bento Grid */}
      <section aria-label="Quick actions">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--color-text)]">Quick Actions & Campus Modules</h2>
          <span className="text-xs text-[var(--color-text-muted)]">Select a module to update content</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {quickActions.map((item) => (
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
                Open {item.title.split(' ')[0]} <i className="ri-arrow-right-line group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
