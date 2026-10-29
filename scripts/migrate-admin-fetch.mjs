import fs from 'fs'
import path from 'path'

const sectionsPage = path.join(process.cwd(), 'app/admin/[centerId]/sections/page.tsx')
if (!fs.existsSync(sectionsPage)) process.exit(0)

let src = fs.readFileSync(sectionsPage, 'utf8')
if (!src.includes('useAdminFetch')) {
  src = src.replace(
    "import { useEffect, useState } from 'react'",
    "import { useEffect, useState } from 'react'\nimport { useAdminFetch } from '@/lib/use-admin-fetch'",
  )
  src = src.replace(
    `  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchSections()
  }, [params.centerId, router])

  const fetchSections = async () => {
    try {
      const response = await fetch(withBasePath(\`/api/admin/sections?centerId=\${params.centerId}\`))
      const data = await response.json()
      if (Array.isArray(data)) {
        setSections(data)
      } else {
        setSections(Array.isArray(data.sections) ? data.sections : [])
      }
    } catch (error) {
      console.error('Error fetching sections:', error)
    } finally {
      setLoading(false)
    }
  }`,
    `  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
    }
  }, [router])

  const { data: sectionsData, loading, refetch: fetchSections } = useAdminFetch<any[]>(
    \`admin-sections-\${params.centerId}\`,
    \`/api/admin/sections?centerId=\${params.centerId}\`,
    {
      parse: (json) =>
        Array.isArray(json) ? json : Array.isArray(json?.sections) ? json.sections : [],
    },
  )
  const sections = sectionsData ?? []`,
  )
  src = src.replace('fetchSections()', 'fetchSections(true)')
  fs.writeFileSync(sectionsPage, src)
  console.log('migrated sections')
}
