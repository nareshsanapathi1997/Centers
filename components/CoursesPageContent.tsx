'use client'
import { withBasePath } from '@/lib/with-base-path'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import SectionHeading from '@/components/ui/SectionHeading'
import CourseCategoryCardActions from '@/components/CourseCategoryCardActions'
import { getCourseCategoryIconClass } from '@/lib/course-category-icons'
import { getCategoryIdForCourseName } from '@/lib/category-name-utils'
import { Center, Course } from '@/types'

interface CoursesPageContentProps {
  center: Center
  courses: Course[]
  categoryIdByCourseName?: Record<string, number>
}

export default function CoursesPageContent({
  center,
  courses,
  categoryIdByCourseName = {},
}: CoursesPageContentProps) {
  const catalogRedirectDone = useRef(false)
  const [level, setLevel] = useState('college_level')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined' || catalogRedirectDone.current) return
    const open = new URLSearchParams(window.location.search).get('open')
    if (!open) return

    const categoryId = getCategoryIdForCourseName(categoryIdByCourseName, open)
    if (categoryId != null && Number.isFinite(categoryId)) {
      catalogRedirectDone.current = true
      window.location.replace(withBasePath(`/${center.slug}/category/${categoryId}`))
    }
  }, [center.slug, categoryIdByCourseName])

  const trackClick = async (courseId: number) => {
    try {
      await fetch(withBasePath('/api/analytics/track'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId: center.id,
          itemType: 'course',
          itemId: courseId,
          actionType: 'click',
        }),
      })
    } catch {
      /* ignore */
    }
  }


  const visibleCourses = courses.filter(course => course.category === level && course.name.toLowerCase().includes(search.trim().toLowerCase()))
  return (
    <section className="pub-section chapter-center-catalog">
      <div className="pub-container">
        <SectionHeading variant="lines" badge="Your centre. Your ambitions." title="Find your starting point." description={`Explore the programmes available at ${center.name} and speak with our team about your next step.`} />
        <div className="chapter-center-tools">
          <div className="chapter-center-levels" role="group" aria-label="Programme level">
            <button type="button" aria-pressed={level === 'college_level'} onClick={() => setLevel('college_level')}>College programmes</button>
            <button type="button" aria-pressed={level === 'school_level'} onClick={() => setLevel('school_level')}>School programmes</button>
          </div>
          <label className="chapter-center-search"><span className="visually-hidden">Search centre programmes</span><i className="ri-search-line" aria-hidden="true" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find your exam or programme" /></label>
        </div>
        <p className="chapter-center-count" role="status">{visibleCourses.length} {visibleCourses.length === 1 ? 'programme' : 'programmes'} to explore</p>
        {visibleCourses.length ? <div className="chapter-course-grid">{visibleCourses.map(course => <article className="chapter-center-course" key={course.id}>
          <span className="chapter-center-course__icon"><i className={getCourseCategoryIconClass(course.name, course.icon_class)} aria-hidden="true" /></span>
          <h2>{course.name}</h2>
          <p>Discover the programme and find a batch that fits your goals.</p>
          <CourseCategoryCardActions centerSlug={center.slug} course={course} categoryIdByCourseName={categoryIdByCourseName} onTrackedClick={trackClick} />
        </article>)}</div> : <div className="public-empty-state"><span className="public-empty-state__icon"><i className="ri-search-line" aria-hidden="true" /></span><h2>No matching programmes</h2><p>Try a different search or programme level. Our counsellors can help you explore more options.</p>{search && <button type="button" className="chapter-button" onClick={() => setSearch('')}>Clear search</button>} <Link href={`/${center.slug}/contact`} className="chapter-text-link">Talk to our team</Link></div>}
      </div>
    </section>
  )
}
