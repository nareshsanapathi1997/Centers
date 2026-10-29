'use client'
import { withBasePath } from '@/lib/with-base-path'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { Send, Building2, Mail, Bell, AlertCircle, CheckCircle, X, Loader2, Users, Globe, Info, Sparkles } from 'lucide-react'

export default function SendMessages() {
  const [centers, setCenters] = useState<any[]>([])
  const [selectedCenterIds, setSelectedCenterIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendNotification, setSendNotification] = useState(true)
  const [sendEmail, setSendEmail] = useState(false)
  const [notificationType, setNotificationType] = useState<'info' | 'success' | 'warning' | 'error'>('info')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Notification fields
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  
  // Email fields
  const [emailSubject, setEmailSubject] = useState('')
  const [emailContent, setEmailContent] = useState('')
  
  // Results
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCenters()
  }, [])

  const fetchCenters = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/centers')

      if (response.ok) {
        const data = await response.json()
        setCenters(data.filter((c: any) => c.is_active))
      }
    } catch (error) {
      console.error('Error fetching centers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCenters = centers.filter(center =>
    center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectAll = () => {
    if (selectedCenterIds.length === filteredCenters.length) {
      setSelectedCenterIds([])
    } else {
      setSelectedCenterIds(filteredCenters.map(c => c.id))
    }
  }

  const handleToggleCenter = (centerId: number) => {
    if (selectedCenterIds.includes(centerId)) {
      setSelectedCenterIds(selectedCenterIds.filter(id => id !== centerId))
    } else {
      setSelectedCenterIds([...selectedCenterIds, centerId])
    }
  }

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    setResult(null)

    try {
      const response = await superAdminFetch('/api/super-admin/send-messages', { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          centerIds: selectedCenterIds.length > 0 ? selectedCenterIds : undefined, // Empty array means all centers
          sendNotification,
          sendEmail,
          title,
          message,
          emailSubject,
          emailContent,
          notificationType,
          linkUrl: linkUrl || undefined })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data.results)
        // Reset form
        setTitle('')
        setMessage('')
        setLinkUrl('')
        setEmailSubject('')
        setEmailContent('')
        setSelectedCenterIds([])
      } else {
        setError(data.error || 'Failed to send messages')
      }
    } catch (error: any) {
      console.error('Error sending messages:', error)
      setError(error.message || 'Failed to send messages')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
<div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading centers...</div>
        </div>
)
  }

  return (
<div className="space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Send className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Send Messages to Centers</h1>
              <p className="text-purple-100 mt-1">Communicate with center admins and send important updates</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2 text-lg">How It Works</h3>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <p className="flex items-start gap-2">
                  <span className="font-semibold">• Notifications:</span>
                  <span>Sent to all active admins of selected centers. They'll appear in their notification panel.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-semibold">• Emails:</span>
                  <span>Sent directly to center email addresses for important announcements.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-semibold">• Selection:</span>
                  <span>Select specific centers or leave empty to send to all active centers.</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500 rounded-xl">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 dark:text-green-200 mb-4 text-xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Messages Sent Successfully!
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Centers Processed</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-200">{result.centersProcessed}</p>
                  </div>
                  {sendNotification && (
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-green-200 dark:border-green-800">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Notifications Sent</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-200">{result.notificationsSent}</p>
                    </div>
                  )}
                  {sendEmail && (
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-green-200 dark:border-green-800">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Emails Sent</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-200">{result.emailsSent}</p>
                    </div>
                  )}
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-4 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                    <p className="font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Errors ({result.errors.length})
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-400">
                      {result.errors.map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button aria-label="Close"
                onClick={() => setResult(null)}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-2 border-red-300 dark:border-red-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500 rounded-xl">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 dark:text-red-200 mb-2">Error Sending Messages</h3>
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
              <button aria-label="Close"
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Center Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                Select Centers
              </h2>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    {selectedCenterIds.length === 0 
                      ? 'All Centers'
                      : `${selectedCenterIds.length} Selected`
                    }
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="admin-btn admin-btn--primary admin-btn--sm"
                >
                  {selectedCenterIds.length === filteredCenters.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search centers by name or email..."
                className="admin-form-control"
              />
            </div>

            {/* Centers list */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
              <div className="max-h-80 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/80 sticky top-0 z-10">
                    <tr>
                      <th className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={
                            filteredCenters.length > 0 &&
                            filteredCenters.every((c) => selectedCenterIds.includes(c.id))
                          }
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                          aria-label="Select all centers"
                        />
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                        Center
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                        Slug
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredCenters.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          No centers found matching your search
                        </td>
                      </tr>
                    ) : (
                      filteredCenters.map((center) => {
                        const selected = selectedCenterIds.includes(center.id)
                        return (
                          <tr
                            key={center.id}
                            onClick={() => handleToggleCenter(center.id)}
                            className={`cursor-pointer transition-colors ${
                              selected
                                ? 'bg-purple-50 dark:bg-purple-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                            }`}
                          >
                            <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => handleToggleCenter(center.id)}
                                className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                                aria-label={`Select ${center.name}`}
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {center.name}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <code className="text-xs text-gray-600 dark:text-gray-400">{center.slug}</code>
                            </td>
                            <td className="px-4 py-2.5">
                              {center.email ? (
                                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 shrink-0" />
                                  {center.email}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Message Type Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              Message Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative flex flex-col p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                sendNotification
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-400 dark:border-blue-600 shadow-lg'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
              }`}>
                <div className="flex items-start gap-4 mb-4">
                  <input
                    type="checkbox"
                    checked={sendNotification}
                    onChange={(e) => setSendNotification(e.target.checked)}
                    className="w-6 h-6 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mt-1"
                  />
                  <div className={`p-3 rounded-xl ${sendNotification ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Bell className={`w-6 h-6 ${sendNotification ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-lg mb-1">Send Notification</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Send in-app notifications to all active admins of selected centers</p>
                </div>
                {sendNotification && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  </div>
                )}
              </label>
              
              <label className={`relative flex flex-col p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                sendEmail
                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-400 dark:border-purple-600 shadow-lg'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md'
              }`}>
                <div className="flex items-start gap-4 mb-4">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-6 h-6 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 mt-1"
                  />
                  <div className={`p-3 rounded-xl ${sendEmail ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Mail className={`w-6 h-6 ${sendEmail ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-lg mb-1">Send Email</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Send email directly to center email addresses</p>
                </div>
                {sendEmail && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="w-6 h-6 text-purple-500" />
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Notification Form */}
          {sendNotification && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                Notification Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Notification Type
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {(['info', 'success', 'warning', 'error'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNotificationType(type)}
                        className={`px-4 py-3 rounded-xl border-2 font-medium transition-all duration-200 ${
                          notificationType === type
                            ? `${getNotificationTypeColor(type)} border-current shadow-lg scale-105`
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="admin-form-label">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={sendNotification}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter notification title..."
                  />
                </div>
                <div>
                  <label className="admin-form-label">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required={sendNotification}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Enter notification message..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {message.length} characters
                  </p>
                </div>
                <div>
                  <label className="admin-form-label">
                    Link URL <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="https://example.com"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Add a link that will be accessible when users click the notification
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Email Form */}
          {sendEmail && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                Email Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="admin-form-label">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={sendEmail}
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter email subject..."
                  />
                </div>
                <div>
                  <label className="admin-form-label">
                    Content (HTML) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      required={sendEmail}
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      rows={12}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                      placeholder="<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    </style>
  </head>
  <body>
    <h1>Your Email Content</h1>
    <p>Write your email content here...</p>
  </body>
</html>"
                    />
                    <div className="absolute top-3 right-3">
                      <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold">
                        HTML
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      HTML content is supported. Use proper HTML tags for formatting.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {emailContent.length} characters
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Ready to Send</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCenterIds.length === 0 
                    ? `Will send to all ${centers.length} active centers`
                    : `Will send to ${selectedCenterIds.length} selected center(s)`
                  }
                </p>
              </div>
              <button
                type="submit"
                disabled={sending || (!sendNotification && !sendEmail)}
                className="admin-btn admin-btn--primary admin-btn--md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Sending Messages...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    <span>Send Messages</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
)
}
