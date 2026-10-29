'use client'
import { withBasePath } from '@/lib/with-base-path'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { Save, RefreshCw, Globe, FileText, Code, BarChart3, CheckCircle } from 'lucide-react'
import { toast } from '@/lib/admin-ui-store'

export default function SEOManagement() {
  const [centers, setCenters] = useState<any[]>([])
  const [selectedCenterId, setSelectedCenterId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seoSettings, setSeoSettings] = useState<any>(null)
  const [formData, setFormData] = useState({
    // Basic Meta Tags
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    meta_author: '',
    meta_robots: 'index, follow',
    canonical_url: '',
    
    // Open Graph
    og_title: '',
    og_description: '',
    og_image: '',
    og_type: 'website',
    og_url: '',
    og_site_name: '',
    og_locale: 'en_US',
    
    // Twitter Card
    twitter_card: 'summary_large_image',
    twitter_site: '',
    twitter_creator: '',
    twitter_title: '',
    twitter_description: '',
    twitter_image: '',
    
    // Schema Markup (JSON)
    schema_markup: '',
    
    // Additional Meta
    meta_viewport: 'width=device-width, initial-scale=1',
    meta_theme_color: '',
    meta_apple_mobile_web_app_capable: 'yes',
    meta_apple_mobile_web_app_status_bar_style: 'default',
    meta_apple_mobile_web_app_title: '',
    
    // Analytics & Verification
    google_analytics_id: '',
    google_search_console_verification: '',
    bing_verification: '',
    facebook_pixel_id: '',
    
    // Sitemap & Robots
    sitemap_enabled: true,
    robots_txt_content: ''
  })

  useEffect(() => {
    fetchCenters()
  }, [])

  useEffect(() => {
    if (selectedCenterId) {
      fetchSEOSettings(selectedCenterId)
    } else {
      setSeoSettings(null)
      resetForm()
    }
  }, [selectedCenterId])

  const fetchCenters = async () => {
    try {
      
      const response = await superAdminFetch('/api/super-admin/centers')

      if (response.ok) {
        const data = await response.json()
        setCenters(data)
      }
    } catch (error) {
      console.error('Error fetching centers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSEOSettings = async (centerId: string) => {
    try {
      const response = await superAdminFetch(`/api/super-admin/seo?centerId=${centerId}`)

      if (response.ok) {
        const data = await response.json()
        setSeoSettings(data)
        if (data) {
          setFormData({
            meta_title: data.meta_title || '',
            meta_description: data.meta_description || '',
            meta_keywords: data.meta_keywords || '',
            meta_author: data.meta_author || '',
            meta_robots: data.meta_robots || 'index, follow',
            canonical_url: data.canonical_url || '',
            og_title: data.og_title || '',
            og_description: data.og_description || '',
            og_image: data.og_image || '',
            og_type: data.og_type || 'website',
            og_url: data.og_url || '',
            og_site_name: data.og_site_name || '',
            og_locale: data.og_locale || 'en_US',
            twitter_card: data.twitter_card || 'summary_large_image',
            twitter_site: data.twitter_site || '',
            twitter_creator: data.twitter_creator || '',
            twitter_title: data.twitter_title || '',
            twitter_description: data.twitter_description || '',
            twitter_image: data.twitter_image || '',
            schema_markup: data.schema_markup ? JSON.stringify(data.schema_markup, null, 2) : '',
            meta_viewport: data.meta_viewport || 'width=device-width, initial-scale=1',
            meta_theme_color: data.meta_theme_color || '',
            meta_apple_mobile_web_app_capable: data.meta_apple_mobile_web_app_capable || 'yes',
            meta_apple_mobile_web_app_status_bar_style: data.meta_apple_mobile_web_app_status_bar_style || 'default',
            meta_apple_mobile_web_app_title: data.meta_apple_mobile_web_app_title || '',
            google_analytics_id: data.google_analytics_id || '',
            google_search_console_verification: data.google_search_console_verification || '',
            bing_verification: data.bing_verification || '',
            facebook_pixel_id: data.facebook_pixel_id || '',
            sitemap_enabled: data.sitemap_enabled !== undefined ? data.sitemap_enabled : true,
            robots_txt_content: data.robots_txt_content || ''
          })
        } else {
          resetForm()
        }
      }
    } catch (error) {
      console.error('Error fetching SEO settings:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      meta_author: '',
      meta_robots: 'index, follow',
      canonical_url: '',
      og_title: '',
      og_description: '',
      og_image: '',
      og_type: 'website',
      og_url: '',
      og_site_name: '',
      og_locale: 'en_US',
      twitter_card: 'summary_large_image',
      twitter_site: '',
      twitter_creator: '',
      twitter_title: '',
      twitter_description: '',
      twitter_image: '',
      schema_markup: '',
      meta_viewport: 'width=device-width, initial-scale=1',
      meta_theme_color: '',
      meta_apple_mobile_web_app_capable: 'yes',
      meta_apple_mobile_web_app_status_bar_style: 'default',
      meta_apple_mobile_web_app_title: '',
      google_analytics_id: '',
      google_search_console_verification: '',
      bing_verification: '',
      facebook_pixel_id: '',
      sitemap_enabled: true,
      robots_txt_content: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCenterId) {
      toast.error('Please select a center first')
      return
    }

    setSaving(true)
    try {
      
      let schemaMarkupParsed = null
      if (formData.schema_markup.trim()) {
        try {
          schemaMarkupParsed = JSON.parse(formData.schema_markup)
        } catch (e) {
          toast.error('Invalid JSON in Schema Markup field')
          setSaving(false)
          return
        }
      }

      const response = await superAdminFetch('/api/super-admin/seo', { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          center_id: parseInt(selectedCenterId),
          ...formData,
          schema_markup: schemaMarkupParsed })
      })

      if (response.ok) {
        toast.success('SEO settings saved successfully!')
        fetchSEOSettings(selectedCenterId)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save SEO settings')
      }
    } catch (error) {
      console.error('Error saving SEO settings:', error)
      toast.error('Error saving SEO settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
<div className="flex items-center justify-center h-64">
          <div className="text-[var(--cm-color-text-muted)]">Loading settings</div>
        </div>
)
  }

  return (
<div className="space-y-6">
        {/* Center Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Select Center
          </label>
          <select
            value={selectedCenterId}
            onChange={(e) => setSelectedCenterId(e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Select a Center --</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCenterId && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Meta Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Basic Meta Tags</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Page Title"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.meta_description}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Page description (150-160 characters recommended)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meta Keywords
                  </label>
                  <input
                    type="text"
                    value={formData.meta_keywords}
                    onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meta Author
                  </label>
                  <input
                    type="text"
                    value={formData.meta_author}
                    onChange={(e) => setFormData({ ...formData, meta_author: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Author Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meta Robots
                  </label>
                  <select
                    value={formData.meta_robots}
                    onChange={(e) => setFormData({ ...formData, meta_robots: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="index, follow">Index, Follow</option>
                    <option value="index, nofollow">Index, NoFollow</option>
                    <option value="noindex, follow">NoIndex, Follow</option>
                    <option value="noindex, nofollow">NoIndex, NoFollow</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Canonical URL
                  </label>
                  <input
                    type="url"
                    value={formData.canonical_url}
                    onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="https://example.com/page"
                  />
                </div>
              </div>
            </div>

            {/* Open Graph Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Open Graph Tags (Facebook)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OG Title
                  </label>
                  <input
                    type="text"
                    value={formData.og_title}
                    onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OG Type
                  </label>
                  <select
                    value={formData.og_type}
                    onChange={(e) => setFormData({ ...formData, og_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="website">Website</option>
                    <option value="article">Article</option>
                    <option value="business.business">Business</option>
                    <option value="profile">Profile</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OG Description
                  </label>
                  <textarea
                    value={formData.og_description}
                    onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OG Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.og_image}
                    onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OG URL
                  </label>
                  <input
                    type="url"
                    value={formData.og_url}
                    onChange={(e) => setFormData({ ...formData, og_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OG Site Name
                  </label>
                  <input
                    type="text"
                    value={formData.og_site_name}
                    onChange={(e) => setFormData({ ...formData, og_site_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OG Locale
                  </label>
                  <input
                    type="text"
                    value={formData.og_locale}
                    onChange={(e) => setFormData({ ...formData, og_locale: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="en_US"
                  />
                </div>
              </div>
            </div>

            {/* Twitter Card Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Twitter Card Tags</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Twitter Card Type
                  </label>
                  <select
                    value={formData.twitter_card}
                    onChange={(e) => setFormData({ ...formData, twitter_card: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="summary">Summary</option>
                    <option value="summary_large_image">Summary Large Image</option>
                    <option value="app">App</option>
                    <option value="player">Player</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Twitter Site (@username)
                  </label>
                  <input
                    type="text"
                    value={formData.twitter_site}
                    onChange={(e) => setFormData({ ...formData, twitter_site: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Twitter Creator (@username)
                  </label>
                  <input
                    type="text"
                    value={formData.twitter_creator}
                    onChange={(e) => setFormData({ ...formData, twitter_creator: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Twitter Title
                  </label>
                  <input
                    type="text"
                    value={formData.twitter_title}
                    onChange={(e) => setFormData({ ...formData, twitter_title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Twitter Description
                  </label>
                  <textarea
                    value={formData.twitter_description}
                    onChange={(e) => setFormData({ ...formData, twitter_description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Twitter Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.twitter_image}
                    onChange={(e) => setFormData({ ...formData, twitter_image: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Schema Markup */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schema.org Structured Data (JSON-LD)</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schema Markup (JSON)
                </label>
                <textarea
                  value={formData.schema_markup}
                  onChange={(e) => setFormData({ ...formData, schema_markup: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder='{"@context": "https://schema.org", "@type": "Organization", ...}'
                />
                <p className="mt-2 text-xs text-gray-500">Enter valid JSON-LD structured data</p>
              </div>
            </div>

            {/* Analytics & Verification */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analytics & Verification</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Google Analytics ID
                  </label>
                  <input
                    type="text"
                    value={formData.google_analytics_id}
                    onChange={(e) => setFormData({ ...formData, google_analytics_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Facebook Pixel ID
                  </label>
                  <input
                    type="text"
                    value={formData.facebook_pixel_id}
                    onChange={(e) => setFormData({ ...formData, facebook_pixel_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Google Search Console Verification
                  </label>
                  <input
                    type="text"
                    value={formData.google_search_console_verification}
                    onChange={(e) => setFormData({ ...formData, google_search_console_verification: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="verification code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bing Verification
                  </label>
                  <input
                    type="text"
                    value={formData.bing_verification}
                    onChange={(e) => setFormData({ ...formData, bing_verification: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="verification code"
                  />
                </div>
              </div>
            </div>

            {/* Additional Meta Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Additional Meta Tags</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Viewport
                  </label>
                  <input
                    type="text"
                    value={formData.meta_viewport}
                    onChange={(e) => setFormData({ ...formData, meta_viewport: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Theme Color
                  </label>
                  <input
                    type="color"
                    value={formData.meta_theme_color || '#000000'}
                    onChange={(e) => setFormData({ ...formData, meta_theme_color: e.target.value })}
                    className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Apple Mobile Web App Capable
                  </label>
                  <select
                    value={formData.meta_apple_mobile_web_app_capable}
                    onChange={(e) => setFormData({ ...formData, meta_apple_mobile_web_app_capable: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Apple Mobile Web App Title
                  </label>
                  <input
                    type="text"
                    value={formData.meta_apple_mobile_web_app_title}
                    onChange={(e) => setFormData({ ...formData, meta_apple_mobile_web_app_title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Sitemap & Robots */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sitemap & Robots.txt</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sitemap_enabled"
                    checked={formData.sitemap_enabled}
                    onChange={(e) => setFormData({ ...formData, sitemap_enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="sitemap_enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Sitemap Generation
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Robots.txt Content
                  </label>
                  <textarea
                    value={formData.robots_txt_content}
                    onChange={(e) => setFormData({ ...formData, robots_txt_content: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    placeholder="User-agent: *&#10;Allow: /&#10;Disallow: /admin/"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => fetchSEOSettings(selectedCenterId)}
                className="admin-btn admin-btn--secondary admin-btn--md flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="admin-btn admin-btn--primary admin-btn--md flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save SEO Settings
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
)
}
