import fs from 'fs'
import path from 'path'

const root = path.join(process.cwd(), 'app/admin/[centerId]')

/** Standard list-page migrations: GET /api/admin/{api}?centerId= */
const LIST_PAGES = [
  { dir: 'news', api: 'news', data: 'items', filtered: 'filteredItems', fetch: 'fetchNews' },
  { dir: 'blog', api: 'blog', data: 'posts', filtered: 'filteredPosts', fetch: 'fetchPosts' },
  { dir: 'gallery', api: 'gallery', data: 'images', filtered: 'filteredImages', fetch: 'fetchImages' },
  { dir: 'faq', api: 'faq', data: 'faqs', filtered: 'filteredFaqs', fetch: 'fetchFaqs', auth: true },
  { dir: 'leadership', api: 'leadership', data: 'leaders', filtered: 'filteredLeaders', fetch: 'fetchLeaders' },
  { dir: 'results', api: 'results', data: 'images', filtered: 'filteredImages', fetch: 'fetchImages' },
  { dir: 'student-stories', api: 'student-stories', data: 'stories', filtered: 'filteredStories', fetch: 'fetchStories' },
  { dir: 'custom-sections', api: 'custom-sections', data: 'sections', filtered: 'filteredSections', fetch: 'fetchSections' },
  { dir: 'cta-sliders', api: 'cta-sliders', data: 'sliders', filtered: 'filteredSliders', fetch: 'fetchSliders' },
]

function ensureImport(src) {
  if (src.includes('useAdminFetch')) return src
  return src.replace(
    "import { useEffect, useState } from 'react'",
    "import { useEffect, useState } from 'react'\nimport { useAdminFetch } from '@/lib/use-admin-fetch'",
  )
}

function migrateListPage(file, cfg) {
  let src = fs.readFileSync(file, 'utf8')
  if (src.includes('useAdminFetch')) {
    console.log('skip (already migrated):', cfg.dir)
    return
  }

  const fetchBlock = new RegExp(
    `useEffect\\(\\(\\) => \\{\\s*${cfg.fetch}\\(\\)\\s*\\}, \\[params\\.centerId\\]\\)\\s*` +
      `const ${cfg.fetch} = async \\(\\) => \\{[\\s\\S]*?\\n  \\}\\s*`,
    'm',
  )

  if (!fetchBlock.test(src)) {
    console.log('skip (pattern not found):', cfg.dir)
    return
  }

  const authOpt = cfg.auth ? ', auth: true' : ''
  const hook = `
  const { data: ${cfg.data}Data, loading, refetch: ${cfg.fetch} } = useAdminFetch<any[]>(
    \`admin-${cfg.api}-\${params.centerId}\`,
    \`/api/admin/${cfg.api}?centerId=\${params.centerId}\`,
    {${authOpt} },
  )
  const ${cfg.data} = ${cfg.data}Data ?? []`

  src = ensureImport(src)
  src = src.replace(fetchBlock, hook.trim() + '\n\n')
  src = src.replace(
    new RegExp(`const \\[${cfg.data}, set\\w+\\] = useState<any\\[\\]>\\(\\[\\]\\)\\s*`, 'm'),
    '',
  )
  src = src.replace(/\n  const \[loading, setLoading\] = useState\(true\)\n/, '\n')

  src = src.replace(new RegExp(`${cfg.fetch}\\(\\)`, 'g'), `${cfg.fetch}(true)`)

  fs.writeFileSync(file, src)
  console.log('migrated:', cfg.dir)
}

for (const cfg of LIST_PAGES) {
  const file = path.join(root, cfg.dir, 'page.tsx')
  if (fs.existsSync(file)) migrateListPage(file, cfg)
}

// Vacancies — auth + error handling preserved via parse
const vacanciesFile = path.join(root, 'vacancies/page.tsx')
if (fs.existsSync(vacanciesFile)) {
  let src = fs.readFileSync(vacanciesFile, 'utf8')
  if (!src.includes('useAdminFetch')) {
    const block =
      /const fetchList = async \(\) => \{[\s\S]*?\n  \}\s*\n\s*useEffect\(\(\) => \{\s*fetchList\(\)\s*\}, \[params\.centerId\]\)/
    if (block.test(src)) {
      src = ensureImport(src)
      src = src.replace(
        block,
        `const { data: listData, loading, refetch: fetchList, error: fetchError } = useAdminFetch<any[]>(
    \`admin-vacancies-\${params.centerId}\`,
    \`/api/admin/vacancies?centerId=\${params.centerId}\`,
    {
      auth: true,
      parse: (json) => (Array.isArray(json) ? json : []),
    },
  )
  const list = listData ?? []

  useEffect(() => {
    if (fetchError) setError(fetchError.message)
  }, [fetchError])`,
      )
      src = src.replace(/\n  const \[list, setList\] = useState<any\[\]>\(\[\]\)\n/, '\n')
      src = src.replace(/\n  const \[loading, setLoading\] = useState\(true\)\n/, '\n')
      src = src.replace(/fetchList\(\)/g, 'fetchList(true)')
      fs.writeFileSync(vacanciesFile, src)
      console.log('migrated: vacancies')
    }
  }
}

// About — single object
const aboutFile = path.join(root, 'about/page.tsx')
if (fs.existsSync(aboutFile)) {
  let src = fs.readFileSync(aboutFile, 'utf8')
  if (!src.includes('useAdminFetch')) {
    const block =
      /useEffect\(\(\) => \{\s*fetchAbout\(\)\s*\}, \[params\.centerId\]\)\s*const fetchAbout = async \(\) => \{[\s\S]*?\n  \}\s*/
    if (block.test(src)) {
      src = ensureImport(src)
      src = src.replace(
        block,
        `const { data: aboutData, loading, refetch: fetchAbout } = useAdminFetch<any>(
    \`admin-about-\${params.centerId}\`,
    \`/api/admin/about?centerId=\${params.centerId}\`,
    { auth: true },
  )
`,
      )
      src = src.replace(/\n  const \[loading, setLoading\] = useState\(true\)\n/, '\n')
      src = src.replace(/fetchAbout\(\)/g, 'fetchAbout(true)')
      fs.writeFileSync(aboutFile, src)
      console.log('migrated: about')
    }
  }
}

// Notifications
const notifFile = path.join(root, 'notifications/page.tsx')
if (fs.existsSync(notifFile)) {
  let src = fs.readFileSync(notifFile, 'utf8')
  if (!src.includes('useAdminFetch')) {
    const block =
      /useEffect\(\(\) => \{\s*fetchNotifications\(\)\s*\}, \[params\.centerId\]\)\s*const fetchNotifications = async \(\) => \{[\s\S]*?\n  \}\s*/
    if (block.test(src)) {
      src = ensureImport(src)
      src = src.replace(
        block,
        `const { data: notificationsData, loading, refetch: fetchNotifications } = useAdminFetch<any[]>(
    \`admin-notifications-\${params.centerId}\`,
    \`/api/admin/notifications?centerId=\${params.centerId}&limit=100\`,
    {
      auth: true,
      parse: (json) => (Array.isArray(json) ? json : (json as { notifications?: unknown[] }).notifications ?? []),
    },
  )
  const notifications = notificationsData ?? []
`,
      )
      src = src.replace(/\n  const \[notifications, setNotifications\] = useState<any\[\]>\(\[\]\)\n/, '\n')
      src = src.replace(/\n  const \[loading, setLoading\] = useState\(true\)\n/, '\n')
      src = src.replace(/fetchNotifications\(\)/g, 'fetchNotifications(true)')
      fs.writeFileSync(notifFile, src)
      console.log('migrated: notifications')
    }
  }
}

// Image library
const imgFile = path.join(root, 'image-library/page.tsx')
if (fs.existsSync(imgFile)) {
  let src = fs.readFileSync(imgFile, 'utf8')
  if (!src.includes('useAdminFetch')) {
    const block =
      /useEffect\(\(\) => \{\s*fetchImages\(\)\s*\}, \[params\.centerId\]\)\s*const fetchImages = async \(\) => \{[\s\S]*?\n  \}\s*/
    if (block.test(src)) {
      src = ensureImport(src)
      src = src.replace(
        block,
        `const { data: imagesData, loading, refetch: fetchImages } = useAdminFetch<any[]>(
    \`admin-image-library-\${params.centerId}\`,
    \`/api/admin/image-library?centerId=\${params.centerId}\`,
    { auth: true },
  )
  const images = imagesData ?? []
`,
      )
      src = src.replace(/\n  const \[images, setImages\] = useState<any\[\]>\(\[\]\)\n/, '\n')
      src = src.replace(/\n  const \[loading, setLoading\] = useState\(true\)\n/, '\n')
      src = src.replace(/fetchImages\(\)/g, 'fetchImages(true)')
      fs.writeFileSync(imgFile, src)
      console.log('migrated: image-library')
    }
  }
}

// Profile
const profileFile = path.join(root, 'profile/page.tsx')
if (fs.existsSync(profileFile)) {
  let src = fs.readFileSync(profileFile, 'utf8')
  if (!src.includes('useAdminFetch')) {
    const block =
      /useEffect\(\(\) => \{\s*fetchProfile\(\)\s*\}, \[params\.centerId\]\)\s*const fetchProfile = async \(\) => \{[\s\S]*?\n  \}\s*/
    if (block.test(src)) {
      src = ensureImport(src)
      src = src.replace(
        block,
        `const { data: profile, loading, refetch: fetchProfile } = useAdminFetch<any>(
    \`admin-profile-\${params.centerId}\`,
    \`/api/admin/profile?centerId=\${params.centerId}\`,
    { auth: true },
  )
`,
      )
      src = src.replace(/\n  const \[profile, setProfile\] = useState<any>\(null\)\n/, '\n')
      src = src.replace(/\n  const \[loading, setLoading\] = useState\(true\)\n/, '\n')
      src = src.replace(/fetchProfile\(\)/g, 'fetchProfile(true)')
      fs.writeFileSync(profileFile, src)
      console.log('migrated: profile')
    }
  }
}
