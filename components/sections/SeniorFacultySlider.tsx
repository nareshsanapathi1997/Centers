'use client'

import React from 'react'
import PublicImage from '@/components/website/PublicImage'
import type { SeniorFaculty } from '@/types'

export interface SeniorFacultyMember {
  id: number
  name: string
  role?: string
  designation?: string
  description?: string | null
  image_url?: string | null
}

interface SeniorFacultySliderProps {
  faculty: (SeniorFaculty | SeniorFacultyMember)[]
  layout?: 'grid' | 'slider' | string
}

const FALLBACK_FACULTY = [
  '/assets/demo/man-senior-1.jpg',
  '/assets/demo/woman-2.jpg',
  '/assets/demo/man-senior-2.jpg',
  '/assets/demo/woman-3.jpg',
]

export default function SeniorFacultySlider({
  faculty,
}: SeniorFacultySliderProps) {
  if (!faculty || faculty.length === 0) return null

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
      {faculty.map((member, index) => {
        const roleLabel =
          ('role' in member && member.role) ||
          ('designation' in member && member.designation) ||
          'Senior Faculty'
        return (
          <article key={member.id} className="faculty-card">
            <div className="faculty-card__media">
              <PublicImage
                src={member.image_url}
                fallbackSrc={FALLBACK_FACULTY[index % FALLBACK_FACULTY.length]}
                alt={member.name}
                loading="eager"
              />
            </div>
            <div className="team-info">
              <span>{roleLabel}</span>
              <h3>{member.name}</h3>
              {member.description && (
                <p className="text-pub-muted text-sm m-0 mt-1.5 line-clamp-3">{member.description}</p>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
