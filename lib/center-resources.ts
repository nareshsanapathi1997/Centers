import { z } from 'zod'
import {
  displayOrderColumn,
  isActiveColumn,
  nullableText,
  type CenterResource,
} from './center-resource-route'

/**
 * Descriptors for the center-admin content resources served by the generated
 * routes in `lib/center-resource-route.ts`.
 *
 * Kept in one file so the writable column set of every resource is reviewable at
 * a glance — that list is the boundary between request body and SQL.
 */

export const alertsResource: CenterResource = {
  table: 'alerts',
  entityType: 'alert',
  label: 'Alert',
  labelColumn: 'title',
  cacheAreas: ['alerts'],
  orderBy: 'display_order, created_at DESC',
  approvalSectionKey: 'alert',
  columns: [
    { name: 'title', schema: z.string().trim().min(1, 'Title is required').max(300) },
    { name: 'message', schema: z.string().trim().min(1, 'Message is required').max(5000) },
    {
      name: 'alert_type',
      schema: z.enum(['info', 'success', 'warning', 'danger']),
      createDefault: 'info',
    },
    displayOrderColumn,
    isActiveColumn,
  ],
}

export const ctaSlidersResource: CenterResource = {
  table: 'cta_sliders',
  entityType: 'cta_slider',
  label: 'CTA Slider',
  labelColumn: 'text',
  cacheAreas: ['cta_sliders'],
  columns: [
    { name: 'text', schema: z.string().trim().min(1, 'Text is required').max(500) },
    nullableText('link_url', 1000),
    displayOrderColumn,
    isActiveColumn,
  ],
}

export const studentStoriesResource: CenterResource = {
  table: 'student_stories',
  entityType: 'student_story',
  label: 'Student Story',
  labelColumn: 'student_name',
  cacheAreas: ['student_stories'],
  orderBy: 'display_order, created_at DESC',
  columns: [
    { name: 'student_name', schema: z.string().trim().min(1, 'Student name is required').max(255) },
    // NOT NULL in the schema, so it is required rather than nullable. The old
    // handler silently substituted the student's name when it was blank.
    { name: 'story_content', schema: z.string().trim().min(1, 'Story is required').max(10000) },
    { name: 'video_url', schema: z.string().trim().min(1, 'Video URL is required').max(1000) },
    nullableText('student_image_url', 1000),
    nullableText('course_name', 255),
    nullableText('batch_year', 50),
    nullableText('achievement_title', 255),
    nullableText('testimonial_quote', 2000),
    displayOrderColumn,
    { name: 'is_featured', schema: z.coerce.boolean(), createDefault: false },
    isActiveColumn,
  ],
}
