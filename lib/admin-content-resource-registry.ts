import type { AdminFieldRules } from '@/lib/admin-form-validation'
import { ADMIN_CONTENT_FORM_RULES } from '@/lib/admin-content-form-rules'

export type AdminContentFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'

export type AdminContentFieldDef = {
  key: string
  label: string
  type: AdminContentFieldType
  required?: boolean
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  helpText?: string
  col?: 'full' | 'half'
}

export type AdminContentColumnDef = {
  key: string
  label: string
  render?: 'text' | 'boolean' | 'truncate'
}

export type AdminContentCrudDef = {
  slug: string
  title: string
  description?: string
  apiPath: string
  cacheKeyPrefix: string
  listColumns: AdminContentColumnDef[]
  searchKeys: string[]
  fields: AdminContentFieldDef[]
  formRules: AdminFieldRules
  defaults?: Record<string, unknown>
  includeCenterIdOnCreate?: boolean
  features?: {
    bulk?: boolean
    pagination?: boolean
    pageSize?: number
  }
}

export const VACANCIES_CRUD: AdminContentCrudDef = {
  slug: 'vacancies',
  title: 'Vacancies',
  description: 'Manage job openings shown on the public Vacancies page.',
  apiPath: 'vacancies',
  cacheKeyPrefix: 'admin-vacancies',
  searchKeys: ['title', 'description', 'nature', 'experience'],
  listColumns: [
    { key: 'title', label: 'Role', render: 'truncate' },
    { key: 'experience', label: 'Experience' },
    { key: 'ctc', label: 'CTC' },
    { key: 'nature', label: 'Nature' },
    { key: 'is_active', label: 'Status', render: 'boolean' },
  ],
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g. Faculty – CAT/Quantitative Aptitude' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Short summary about the role' },
    { key: 'experience', label: 'Experience', type: 'text', col: 'half', placeholder: 'e.g. 2+ years' },
    { key: 'ctc', label: 'CTC', type: 'text', col: 'half', placeholder: 'e.g. Best in industry' },
    { key: 'nature', label: 'Nature', type: 'text', col: 'half', placeholder: 'e.g. Full-time, Chennai' },
    { key: 'contact_phone', label: 'Contact Phone', type: 'text', col: 'half', placeholder: 'e.g. 8939972103' },
    { key: 'is_active', label: 'Active (show on public page)', type: 'boolean' },
  ],
  formRules: ADMIN_CONTENT_FORM_RULES.vacancies,
  defaults: {
    title: '',
    description: '',
    experience: '',
    ctc: '',
    nature: '',
    contact_phone: '',
    display_order: 0,
    is_active: true,
  },
}

export const FAQ_CRUD: AdminContentCrudDef = {
  slug: 'faq',
  title: 'FAQ',
  description: 'Questions and answers shown on the public FAQ section.',
  apiPath: 'faq',
  cacheKeyPrefix: 'admin-faq',
  searchKeys: ['question', 'answer'],
  listColumns: [
    { key: 'question', label: 'Question', render: 'truncate' },
    { key: 'display_order', label: 'Order' },
    { key: 'is_active', label: 'Status', render: 'boolean' },
  ],
  fields: [
    { key: 'question', label: 'Question', type: 'text', required: true },
    { key: 'answer', label: 'Answer', type: 'textarea', required: true },
    { key: 'display_order', label: 'Display order', type: 'number', col: 'half' },
    { key: 'is_active', label: 'Active', type: 'boolean' },
  ],
  formRules: ADMIN_CONTENT_FORM_RULES.faq,
  defaults: {
    question: '',
    answer: '',
    display_order: 0,
    is_active: true,
  },
}

export const CENTER_ADMIN_CONTENT_RESOURCES = [VACANCIES_CRUD, FAQ_CRUD] as const
