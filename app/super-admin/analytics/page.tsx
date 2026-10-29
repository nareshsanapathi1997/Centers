'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { withBasePath } from '@/lib/with-base-path'
import { useEffect, useState } from 'react'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Select } from '@/components/forms'
import { 
  BarChart3, 
  TrendingUp, 
  MousePointerClick, 
  FileText, 
  Bell, 
  BookOpen, 
  MapPin,
  Calendar,
  Building2,
  Filter,
  Image,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface AnalyticsData {
  overall: {
    total_centers: number
    total_clicks: number
    active_days: number
  }
  centers: Array<{
    id: number
    name: string
    slug: string
    news_count: number
    notifications_count: number
    courses_count: number
    nearby_centers_count: number
    hero_slides_count: number
    news_clicks: number
    notification_clicks: number
    course_clicks: number
    nearby_center_clicks: number
    hero_slide_clicks: number
    total_clicks: number
  }>
  topNews: Array<{
    center_id: number
    center_name: string
    title: string
    click_count: number
  }>
  topNotifications: Array<{
    center_id: number
    center_name: string
    title: string
    click_count: number
  }>
  topCourses: Array<{
    center_id: number
    center_name: string
    course_name: string
    click_count: number
  }>
  topHeroSlides: Array<{
    center_id: number
    center_name: string
    title: string
    click_count: number
  }>
  dailyTrends: Array<{
    date: string
    news_clicks: number
    notification_clicks: number
    course_clicks: number
    hero_slide_clicks: number
    total_clicks: number
  }>
  centerSpecific?: {
    newsCount: number
    notificationsCount: number
    coursesCount: number
    nearbyCentersCount: number
  } | null
  detailedBreakdown?: Array<{
    center_id: number
    center_name: string
    item_type: string
    item_id: number
    item_title: string
    click_count: number
  }>
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [selectedCenter, setSelectedCenter] = useState<string>('')
  const [expandedCenters, setExpandedCenters] = useState<Set<number>>(new Set())
  const [breakdownByCenter, setBreakdownByCenter] = useState<
    Record<number, AnalyticsData['detailedBreakdown']>
  >({})
  const [breakdownLoading, setBreakdownLoading] = useState<Set<number>>(new Set())

  useEffect(() => {
    setBreakdownByCenter({})
    setExpandedCenters(new Set())
    void fetchAnalyticsCore()
  }, [days, selectedCenter])

  const authHeaders = () => ({
  })

  const fetchAnalyticsCore = async () => {
    try {
      setLoading(true)
      const centerQuery = selectedCenter ? `&centerId=${selectedCenter}` : ''
      const [overviewRes, topsRes, trendsRes] = await Promise.all([
        superAdminFetch(`/api/super-admin/analytics/overview?days=${days}${centerQuery}`, { headers: authHeaders() }),
        superAdminFetch(`/api/super-admin/analytics/tops?days=${days}`, { headers: authHeaders() }),
        superAdminFetch(`/api/super-admin/analytics/trends?days=${days}`, { headers: authHeaders() }),
      ])

      const [overview, tops, trends] = await Promise.all([
        overviewRes.json(),
        topsRes.json(),
        trendsRes.json(),
      ])

      setData({
        overall: overview.overall,
        centers: overview.centers,
        centerSpecific: overview.centerSpecific,
        topNews: tops.topNews ?? [],
        topNotifications: tops.topNotifications ?? [],
        topCourses: tops.topCourses ?? [],
        topHeroSlides: tops.topHeroSlides ?? [],
        dailyTrends: trends.dailyTrends ?? [],
        detailedBreakdown: []
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCenterBreakdown = async (centerId: number) => {
    if (breakdownByCenter[centerId] || breakdownLoading.has(centerId)) return

    setBreakdownLoading((prev) => new Set(prev).add(centerId))
    try {
      const response = await fetch(
        withBasePath(`/api/super-admin/analytics/breakdown?days=${days}&centerId=${centerId}`),
        {
        credentials: 'include', headers: authHeaders() },
      )
      const payload = await response.json()
      setBreakdownByCenter((prev) => ({
        ...prev,
        [centerId]: payload.detailedBreakdown ?? []
      }))
    } catch (error) {
      console.error('Error fetching center breakdown:', error)
    } finally {
      setBreakdownLoading((prev) => {
        const next = new Set(prev)
        next.delete(centerId)
        return next
      })
    }
  }

  const toggleCenterExpanded = (centerId: number) => {
    const isExpanded = expandedCenters.has(centerId)
    const newExpanded = new Set(expandedCenters)
    if (isExpanded) {
      newExpanded.delete(centerId)
    } else {
      newExpanded.add(centerId)
      void loadCenterBreakdown(centerId)
    }
    setExpandedCenters(newExpanded)
  }

  if (loading) {
    return (
      <SuperAdminPageShell>
        <div className="space-y-6">
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                <BarChart3 className="h-7 w-7" />
                Analytics Dashboard
              </span>
            }
            description="Track clicks, engagement, and performance across all centers"
            breadcrumbs={[
              { label: 'Super Admin', href: '/super-admin' },
              { label: 'Analytics' },
            ]}
          />
          <LoadingSkeleton variant="cards" rows={6} />
        </div>
      </SuperAdminPageShell>
    )
  }

  if (!data) {
    return (
      <SuperAdminPageShell>
        <div className="space-y-6">
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                <BarChart3 className="h-7 w-7" />
                Analytics Dashboard
              </span>
            }
            description="Track clicks, engagement, and performance across all centers"
            breadcrumbs={[
              { label: 'Super Admin', href: '/super-admin' },
              { label: 'Analytics' },
            ]}
          />
          <EmptyState
            icon={BarChart3}
            title="No analytics data"
            message="No analytics data available"
          />
        </div>
      </SuperAdminPageShell>
    )
  }

  return (
    <SuperAdminPageShell>
      <div className="space-y-8">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <BarChart3 className="h-7 w-7" />
              Analytics Dashboard
            </span>
          }
          description="Track clicks, engagement, and performance across all centers"
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Analytics' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--cm-color-text-muted)]" />
              <Select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                aria-label="Date range"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </Select>
            </div>
          }
        />

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-purple-100 text-sm font-medium mb-1">Total Centers</p>
            <p className="text-4xl font-bold">{data.overall.total_centers}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <MousePointerClick className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-green-100 text-sm font-medium mb-1">Total Clicks</p>
            <p className="text-4xl font-bold">{data.overall.total_clicks}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">Active Days</p>
            <p className="text-4xl font-bold">{data.overall.active_days}</p>
          </div>
        </div>

        {/* Center-wise Statistics */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Center-wise Statistics
            </h3>
            <p className="text-purple-100 text-sm mt-1">Click on any center to view detailed breakdown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Center</th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>News</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <Bell className="w-4 h-4 text-green-600" />
                      <span>Notifications</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Courses</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span>Nearby</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <Image className="w-4 h-4 text-orange-600" />
                      <span>Hero Slides</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <MousePointerClick className="w-4 h-4 text-purple-600" />
                      <span>Total</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.centers.map((center) => {
                  const isExpanded = expandedCenters.has(center.id)
                  const centerDetails = breakdownByCenter[center.id] || []
                  
                  // Group by item type
                  const notifications = centerDetails.filter(item => item.item_type === 'notification')
                  const news = centerDetails.filter(item => item.item_type === 'news')
                  const courses = centerDetails.filter(item => item.item_type === 'course')
                  const heroSlides = centerDetails.filter(item => item.item_type === 'hero_slide')
                  const nearbyCenters = centerDetails.filter(item => item.item_type === 'nearby_center')

                  return (
                    <>
                      <tr 
                        key={center.id} 
                        className={`border-b border-gray-100 dark:border-gray-800 transition-all duration-200 ${
                          isExpanded 
                            ? 'bg-purple-50 dark:bg-purple-900/10' 
                            : 'hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/50 dark:hover:from-purple-900/5 dark:hover:to-indigo-900/5'
                        } cursor-pointer group`}
                        onClick={() => toggleCenterExpanded(center.id)}
                      >
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : 'rotate-0'}`}>
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white text-base">{center.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{center.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-5 px-4">
                          <div className="inline-flex flex-col items-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 min-w-[70px]">
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{center.news_count}</div>
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">{center.news_clicks} clicks</div>
                          </div>
                        </td>
                        <td className="text-center py-5 px-4">
                          <div className="inline-flex flex-col items-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20 min-w-[70px]">
                            <div className="text-lg font-bold text-green-700 dark:text-green-300">{center.notifications_count}</div>
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium">{center.notification_clicks} clicks</div>
                          </div>
                        </td>
                        <td className="text-center py-5 px-4">
                          <div className="inline-flex flex-col items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 min-w-[70px]">
                            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{center.courses_count}</div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">{center.course_clicks} clicks</div>
                          </div>
                        </td>
                        <td className="text-center py-5 px-4">
                          <div className="inline-flex flex-col items-center p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 min-w-[70px]">
                            <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{center.nearby_centers_count}</div>
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{center.nearby_center_clicks} clicks</div>
                          </div>
                        </td>
                        <td className="text-center py-5 px-4">
                          <div className="inline-flex flex-col items-center p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 min-w-[70px]">
                            <div className="text-lg font-bold text-orange-700 dark:text-orange-300">{center.hero_slides_count || 0}</div>
                            <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">{center.hero_slide_clicks || 0} clicks</div>
                          </div>
                        </td>
                        <td className="text-center py-5 px-4">
                          <div className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 min-w-[80px]">
                            <span className="text-xl font-bold">{center.total_clicks}</span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gradient-to-br from-purple-50/50 via-indigo-50/30 to-purple-50/50 dark:from-purple-900/10 dark:via-indigo-900/5 dark:to-purple-900/10">
                          <td colSpan={7} className="py-6 px-6">
                            {breakdownLoading.has(center.id) ? (
                              <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600 mb-3" />
                                <p className="text-sm">Loading detailed breakdown…</p>
                              </div>
                            ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                              {/* Notifications Breakdown */}
                              {notifications.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-green-200 dark:border-green-800/30 overflow-hidden">
                                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3">
                                    <h4 className="text-sm font-bold text-white flex items-center">
                                      <Bell className="w-4 h-4 mr-2" />
                                      Notifications ({notifications.length})
                                    </h4>
                                  </div>
                                  <div className="p-4 space-y-2">
                                    {notifications.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/20 hover:shadow-sm transition-shadow">
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.item_title}</span>
                                        <span className="px-3 py-1 rounded-full bg-green-600 text-white text-xs font-bold shadow-sm">{item.click_count} clicks</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* News Breakdown */}
                              {news.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-purple-200 dark:border-purple-800/30 overflow-hidden">
                                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3">
                                    <h4 className="text-sm font-bold text-white flex items-center">
                                      <FileText className="w-4 h-4 mr-2" />
                                      News ({news.length})
                                    </h4>
                                  </div>
                                  <div className="p-4 space-y-2">
                                    {news.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/20 hover:shadow-sm transition-shadow">
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.item_title}</span>
                                        <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow-sm">{item.click_count} clicks</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Hero Slides Breakdown */}
                              {heroSlides.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-orange-200 dark:border-orange-800/30 overflow-hidden">
                                  <div className="bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3">
                                    <h4 className="text-sm font-bold text-white flex items-center">
                                      <Image className="w-4 h-4 mr-2" />
                                      Hero Slides/Banners ({heroSlides.length})
                                    </h4>
                                  </div>
                                  <div className="p-4 space-y-2">
                                    {heroSlides.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/20 hover:shadow-sm transition-shadow">
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.item_title}</span>
                                        <span className="px-3 py-1 rounded-full bg-orange-600 text-white text-xs font-bold shadow-sm">{item.click_count} clicks</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Courses Breakdown */}
                              {courses.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-blue-200 dark:border-blue-800/30 overflow-hidden">
                                  <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-3">
                                    <h4 className="text-sm font-bold text-white flex items-center">
                                      <BookOpen className="w-4 h-4 mr-2" />
                                      Courses ({courses.length})
                                    </h4>
                                  </div>
                                  <div className="p-4 space-y-2">
                                    {courses.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 hover:shadow-sm transition-shadow">
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.item_title}</span>
                                        <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">{item.click_count} clicks</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Nearby Centers Breakdown */}
                              {nearbyCenters.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-indigo-200 dark:border-indigo-800/30 overflow-hidden">
                                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3">
                                    <h4 className="text-sm font-bold text-white flex items-center">
                                      <MapPin className="w-4 h-4 mr-2" />
                                      Nearby Centers ({nearbyCenters.length})
                                    </h4>
                                  </div>
                                  <div className="p-4 space-y-2">
                                    {nearbyCenters.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/20 hover:shadow-sm transition-shadow">
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.item_title}</span>
                                        <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-sm">{item.click_count} clicks</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {centerDetails.length === 0 && (
                                <div className="text-center py-8">
                                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                                    <BarChart3 className="w-8 h-8 text-gray-400" />
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No detailed data available for this center</p>
                                </div>
                              )}
                            </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Top News */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Top News Items
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {data.topNews.length > 0 ? (
                data.topNews.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/20 hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">{item.center_name}</div>
                    </div>
                    <div className="ml-3 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow-sm whitespace-nowrap">
                      {item.click_count}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--cm-color-text-muted)]">No records in this range</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Top Notifications
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {data.topNotifications.length > 0 ? (
                data.topNotifications.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/20 hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">{item.center_name}</div>
                    </div>
                    <div className="ml-3 px-3 py-1 rounded-full bg-green-600 text-white text-xs font-bold shadow-sm whitespace-nowrap">
                      {item.click_count}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--cm-color-text-muted)]">No records in this range</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Courses */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Top Courses
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {data.topCourses.length > 0 ? (
                data.topCourses.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/20 hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.course_name}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">{item.center_name}</div>
                    </div>
                    <div className="ml-3 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm whitespace-nowrap">
                      {item.click_count}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--cm-color-text-muted)]">No records in this range</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Hero Slides */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Image className="w-5 h-5 mr-2" />
                Top Hero Slides
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {data.topHeroSlides && data.topHeroSlides.length > 0 ? (
                data.topHeroSlides.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800/20 hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">{item.center_name}</div>
                    </div>
                    <div className="ml-3 px-3 py-1 rounded-full bg-orange-600 text-white text-xs font-bold shadow-sm whitespace-nowrap">
                      {item.click_count}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--cm-color-text-muted)]">No records in this range</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Daily Click Trends
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Date</th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="w-3 h-3 text-purple-600" />
                      <span>News</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <Bell className="w-3 h-3 text-green-600" />
                      <span>Notifications</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <BookOpen className="w-3 h-3 text-blue-600" />
                      <span>Courses</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <Image className="w-3 h-3 text-orange-600" />
                      <span>Hero Slides</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3 text-indigo-600" />
                      <span>Total</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.dailyTrends.map((trend, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-semibold">
                        {trend.news_clicks}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold">
                        {trend.notification_clicks}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                        {trend.course_clicks}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-semibold">
                        {trend.hero_slide_clicks || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30">
                        {trend.total_clicks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminPageShell>
  )
}
