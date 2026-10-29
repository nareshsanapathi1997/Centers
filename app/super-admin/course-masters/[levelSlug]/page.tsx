'use client'

import { Suspense, useEffect } from 'react'
import { notFound, useRouter } from 'next/navigation'
import CourseMastersLevelPanel from '@/components/admin/CourseMastersLevelPanel'
import { courseMasterLevelFromSlug } from '@/lib/course-masters'

function CourseMastersLevelPageContent({ levelSlug }: { levelSlug: string }) {
  const router = useRouter()

  useEffect(() => {
    if (levelSlug === 'final-courses') {
      router.replace('/super-admin/course-masters/courses')
    }
  }, [levelSlug, router])

  if (levelSlug === 'final-courses') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400" />
      </div>
    )
  }

  const levelType = courseMasterLevelFromSlug(levelSlug)
  if (!levelType) notFound()

  return <CourseMastersLevelPanel levelType={levelType} />
}

export default function CourseMastersLevelPage({
  params,
}: {
  params: { levelSlug: string }
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400" />
        </div>
      }
    >
      <CourseMastersLevelPageContent levelSlug={params.levelSlug} />
    </Suspense>
  )
}
