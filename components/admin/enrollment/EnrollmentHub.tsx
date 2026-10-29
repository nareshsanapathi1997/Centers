'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BadgePercent, CalendarClock, Pencil, CheckCircle2, Gift, GraduationCap, LayoutGrid, ListChecks, Plus, RefreshCw,
  Repeat, Save, Send, Settings2, Trash2, Undo2, Users, XCircle,
} from 'lucide-react'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import FormModal from '@/components/admin/FormModal'
import PageHeader from '@/components/ui/PageHeader'
import { authenticatedFetch } from '@/lib/admin-api'
import { superAdminFetch } from '@/lib/super-admin-api'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import type { CheckoutFormField, EnrollmentSettings, IconText } from '@/lib/enrollment-settings'

type Mode = 'centre' | 'super'
type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type TabKey = 'overview' | 'settings' | 'promos' | 'seats' | 'approvals' | 'scholarships' | 'referrals' | 'refunds' | 'reminders'

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutGrid className="h-4 w-4" /> },
  { key: 'settings', label: 'Checkout & Content', icon: <Settings2 className="h-4 w-4" /> },
  { key: 'promos', label: 'Promo Codes', icon: <BadgePercent className="h-4 w-4" /> },
  { key: 'seats', label: 'Seats & Waitlist', icon: <Users className="h-4 w-4" /> },
  { key: 'approvals', label: 'Approvals', icon: <ListChecks className="h-4 w-4" /> },
  { key: 'scholarships', label: 'Scholarships', icon: <GraduationCap className="h-4 w-4" /> },
  { key: 'referrals', label: 'Referrals', icon: <Gift className="h-4 w-4" /> },
  { key: 'refunds', label: 'Refunds & Transfers', icon: <Undo2 className="h-4 w-4" /> },
  { key: 'reminders', label: 'Reminders', icon: <CalendarClock className="h-4 w-4" /> },
]

const inr = (n: unknown) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const fmtDate = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const toLocalInput = (v: unknown) => (v ? String(v).replace(' ', 'T').slice(0, 16) : '')

function Pill({ tone = 'slate', children }: { tone?: 'green' | 'amber' | 'red' | 'indigo' | 'slate'; children: ReactNode }) {
  const map = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
    red: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300',
    slate: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300',
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${map[tone]}`}>{children}</span>
}

function Card({ title, description, actions, children }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="admin-card space-y-4 p-5">
      {title || actions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-base font-semibold text-[var(--cm-color-text)]">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-[var(--cm-color-text-muted)]">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--cm-color-border)] p-3 transition hover:border-indigo-300 dark:hover:border-indigo-500/50">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-[var(--cm-color-text)]">{label}</span>
        {hint ? <span className="block text-xs text-[var(--cm-color-text-muted)]">{hint}</span> : null}
      </span>
    </label>
  )
}

const listToText = (l: IconText[]) => l.map((x) => `${x.icon} | ${x.text}`).join('\n')
const textToList = (t: string): IconText[] =>
  t.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [a, ...rest] = line.split('|')
    return rest.length ? { icon: a.trim() || 'ri-check-line', text: rest.join('|').trim() } : { icon: 'ri-check-line', text: a.trim() }
  })

type Api = (resource: string, init?: { method?: string; body?: unknown; qs?: Record<string, string | number> }) => Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any

export default function EnrollmentHub({ mode, centerId: fixedCentre }: { mode: Mode; centerId?: number }) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [centres, setCentres] = useState<{ id: number; name: string }[]>([])
  const [pickedCentre, setPickedCentre] = useState<number | null>(null)
  const centerId = mode === 'centre' ? fixedCentre ?? null : pickedCentre

  const api: Api = useCallback(
    async (resource, init = {}) => {
      const qs = new URLSearchParams()
      if (mode === 'super' && centerId) qs.set('centerId', String(centerId))
      for (const [k, v] of Object.entries(init.qs || {})) qs.set(k, String(v))
      const url = mode === 'centre' ? `/api/admin/enrollment/${centerId}/${resource}` : `/api/super-admin/enrollment/${resource}`
      const opts: RequestInit = { method: init.method || 'GET', headers: { 'Content-Type': 'application/json' } }
      if (init.body !== undefined) opts.body = JSON.stringify(init.body)
      const full = `${url}${qs.toString() ? `?${qs}` : ''}`
      const res = mode === 'centre' ? await authenticatedFetch(full, opts) : await superAdminFetch(full, opts)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      return data
    },
    [mode, centerId]
  )

  useEffect(() => {
    if (mode !== 'super') return
    superAdminFetch('/api/super-admin/centers')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.centers || d.rows || []
        setCentres(list.map((c: Row) => ({ id: Number(c.id), name: String(c.name) })))
      })
      .catch(() => setCentres([]))
  }, [mode])

  const scopeLabel = mode === 'centre' ? 'This centre' : centerId ? centres.find((c) => c.id === centerId)?.name || `Centre #${centerId}` : 'All centres · Super Admin defaults'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollment & Offers"
        description={
          mode === 'super'
            ? 'Set network-wide defaults for checkout content, scholarships and reminders. Pick a centre to manage its promos, seats, approvals and refunds.'
            : 'Manage checkout content, promo codes, seats, approvals, scholarships, referrals, refunds and reminders for your centre. Unset values inherit Super Admin defaults.'
        }
        actions={
          mode === 'super' ? (
            <select aria-label="Centre scope" className="admin-form-control min-w-[240px]" value={pickedCentre ?? ''} onChange={(e) => setPickedCentre(e.target.value ? Number(e.target.value) : null)}>
              <option value="">All centres · defaults</option>
              {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : null
        }
      />

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--cm-color-border)] bg-[var(--cm-color-surface)] p-1" aria-label="Enrollment sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--cm-color-text-muted)] hover:bg-slate-100 hover:text-[var(--cm-color-text)] dark:hover:bg-slate-800'
            }`}
            aria-current={tab === t.key ? 'page' : undefined}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      <div key={`${tab}-${centerId ?? 0}`}>
        {tab === 'overview' && <OverviewTab api={api} scopeLabel={scopeLabel} go={setTab} />}
        {tab === 'settings' && <SettingsTab api={api} scoped={!!centerId} mode={mode} />}
        {tab === 'promos' && <PromosTab api={api} centres={centres} centerId={centerId} />}
        {tab === 'seats' && <SeatsTab api={api} centerId={centerId} />}
        {tab === 'approvals' && <ApprovalsTab api={api} />}
        {tab === 'scholarships' && <ScholarshipsTab api={api} centerId={centerId} />}
        {tab === 'referrals' && <ReferralsTab api={api} centerId={centerId} />}
        {tab === 'refunds' && <RefundsTab api={api} />}
        {tab === 'reminders' && <RemindersTab api={api} />}
      </div>
    </div>
  )
}

function useResource(api: Api, resource: string, qs?: Record<string, string | number>) {
  const [data, setData] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const key = JSON.stringify(qs || {})
  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api(resource, { qs: JSON.parse(key) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [api, resource, key])
  useEffect(() => { void reload() }, [reload])
  return { data, loading, error, reload }
}

function NeedCentre() {
  return (
    <Card>
      <p className="text-sm text-[var(--cm-color-text-muted)]">Pick a centre from the scope selector above to manage this section. Seat limits are always centre-specific.</p>
    </Card>
  )
}

async function run(fn: () => Promise<unknown>, ok: string) {
  try {
    await fn()
    toast.success(ok)
    return true
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Action failed')
    return false
  }
}

function OverviewTab({ api, scopeLabel, go }: { api: Api; scopeLabel: string; go: (t: TabKey) => void }) {
  const { data, loading, error } = useResource(api, 'overview')
  const stats: { label: string; value: ReactNode; tab: TabKey; tone: string }[] = data
    ? [
        { label: 'Pending approvals', value: data.pending_approvals, tab: 'approvals', tone: 'from-amber-500/15' },
        { label: 'Waitlist (waiting)', value: data.waitlist, tab: 'seats', tone: 'from-sky-500/15' },
        { label: 'Active promo codes', value: data.active_promos, tab: 'promos', tone: 'from-indigo-500/15' },
        { label: 'Active referral codes', value: data.referral_codes, tab: 'referrals', tone: 'from-fuchsia-500/15' },
        { label: 'Queued notifications', value: data.queued_notifications, tab: 'reminders', tone: 'from-emerald-500/15' },
        { label: 'Refunded (total)', value: inr(data.refunds_total), tab: 'refunds', tone: 'from-rose-500/15' },
      ]
    : []
  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--cm-color-text-muted)]">Scope: <span className="font-medium text-[var(--cm-color-text)]">{scopeLabel}</span></p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading && !data
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="admin-card h-28 animate-pulse p-5" />)
          : stats.map((s) => (
              <button key={s.label} type="button" onClick={() => go(s.tab)} className={`admin-card bg-gradient-to-br ${s.tone} to-transparent p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md`}>
                <p className="text-sm text-[var(--cm-color-text-muted)]">{s.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--cm-color-text)]">{s.value}</p>
              </button>
            ))}
      </div>
      {data ? (
        <Card title="Notification channels" description="Reminders and alerts queue safely; a channel without API keys is marked skipped instead of failing.">
          <div className="flex flex-wrap gap-2">
            {(['email', 'sms', 'whatsapp'] as const).map((c) => (
              <Pill key={c} tone={data.channels[c] ? 'green' : 'slate'}>{c.toUpperCase()} · {data.channels[c] ? 'configured' : 'not configured (no-op)'}</Pill>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

/* ----------------------------------------------------------------- settings */
function SettingsTab({ api, scoped, mode }: { api: Api; scoped: boolean; mode: Mode }) {
  const { data, loading, error, reload } = useResource(api, 'settings')
  const [s, setS] = useState<EnrollmentSettings | null>(null)
  const [texts, setTexts] = useState({ perks: '', trust_badges: '', checkout_trust: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data) return
    const eff = data.effective as EnrollmentSettings
    setS(eff)
    setTexts({ perks: listToText(eff.perks), trust_badges: listToText(eff.trust_badges), checkout_trust: listToText(eff.checkout_trust) })
  }, [data])

  if (loading && !s) return <div className="admin-card h-64 animate-pulse" />
  if (error) return <Card><p className="text-sm text-rose-600">{error}</p></Card>
  if (!s) return null

  const set = <K extends keyof EnrollmentSettings>(k: K, v: EnrollmentSettings[K]) => setS({ ...s, [k]: v })
  const setField = (i: number, patch: Partial<CheckoutFormField>) => set('form_fields', s.form_fields.map((f, j) => (j === i ? { ...f, ...patch } : f)))

  const save = async () => {
    setSaving(true)
    const payload = { ...s, perks: textToList(texts.perks), trust_badges: textToList(texts.trust_badges), checkout_trust: textToList(texts.checkout_trust) }
    await run(() => api('settings', { method: 'PUT', body: { settings: payload } }), scoped ? 'Centre settings saved' : 'Default settings saved')
    setSaving(false)
    void reload()
  }
  const reset = async () => {
    if (!(await confirmDialog({ message: `${scoped ? 'Reset to defaults?' : 'Clear Super Admin defaults?'} ${scoped ? 'This centre will inherit Super Admin defaults again.' : 'All centres without overrides fall back to built-in values.'}`, destructive: true }))) return
    await run(() => api('settings', { method: 'DELETE' }), 'Settings reset')
    void reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--cm-color-text-muted)]">
          {scoped ? (data?.override ? <Pill tone="indigo">Centre override active</Pill> : <Pill>Inheriting {mode === 'super' ? 'network' : 'Super Admin'} defaults</Pill>) : <Pill tone="indigo">Editing network defaults</Pill>}
        </p>
        <div className="flex gap-2">
          <AdminButton variant="secondary" size="sm" icon={<Undo2 className="h-4 w-4" />} onClick={reset}>Reset</AdminButton>
          <AdminButton size="sm" icon={<Save className="h-4 w-4" />} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</AdminButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Course page content" description="One item per line: icon | text (Remix icon names, e.g. ri-video-line).">
          <AdminFormField label="Perks"><textarea className="admin-form-control min-h-[110px] font-mono text-xs" value={texts.perks} onChange={(e) => setTexts({ ...texts, perks: e.target.value })} /></AdminFormField>
          <AdminFormField label="Trust badges"><textarea className="admin-form-control min-h-[90px] font-mono text-xs" value={texts.trust_badges} onChange={(e) => setTexts({ ...texts, trust_badges: e.target.value })} /></AdminFormField>
          <AdminFormField label="Checkout trust strip"><textarea className="admin-form-control min-h-[90px] font-mono text-xs" value={texts.checkout_trust} onChange={(e) => setTexts({ ...texts, checkout_trust: e.target.value })} /></AdminFormField>
          <AdminFormField label="Contact-for-fee text" hint="Shown when a programme has no fee configured."><input className="admin-form-control" value={s.contact_fee_text} onChange={(e) => set('contact_fee_text', e.target.value)} /></AdminFormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminFormField label="Counselling title"><input className="admin-form-control" value={s.counselling_title} onChange={(e) => set('counselling_title', e.target.value)} /></AdminFormField>
            <AdminFormField label="Counselling text"><input className="admin-form-control" value={s.counselling_text} onChange={(e) => set('counselling_text', e.target.value)} /></AdminFormField>
          </div>
        </Card>

        <Card title="Checkout messages & payment rules">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminFormField label="Success title"><input className="admin-form-control" value={s.success_title} onChange={(e) => set('success_title', e.target.value)} /></AdminFormField>
            <AdminFormField label="Max installments" hint="1–12; caps plans shown at checkout.">
              <input type="number" min={1} max={12} className="admin-form-control" value={s.max_installments} onChange={(e) => set('max_installments', Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
            </AdminFormField>
          </div>
          <AdminFormField label="Success text"><textarea className="admin-form-control min-h-[70px]" value={s.success_text} onChange={(e) => set('success_text', e.target.value)} /></AdminFormField>
          <AdminFormField label="Approval-pending text"><textarea className="admin-form-control min-h-[70px]" value={s.approval_pending_text} onChange={(e) => set('approval_pending_text', e.target.value)} /></AdminFormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle checked={s.approval_required} onChange={(v) => set('approval_required', v)} label="Require admin approval" hint="Paid enrollments wait in the Approvals queue." />
            <Toggle checked={s.allow_stacking} onChange={(v) => set('allow_stacking', v)} label="Allow discount stacking" hint="Promo + scholarship + referral together." />
            <Toggle checked={s.show_seats_left} onChange={(v) => set('show_seats_left', v)} label="Show seats left" />
            <Toggle checked={s.waitlist_enabled} onChange={(v) => set('waitlist_enabled', v)} label="Enable waitlist when full" />
            <Toggle checked={s.scholarship_enabled} onChange={(v) => set('scholarship_enabled', v)} label="Scholarships" />
            <Toggle checked={s.referral_enabled} onChange={(v) => set('referral_enabled', v)} label="Referral codes" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminFormField label="Low-seats threshold"><input type="number" min={0} className="admin-form-control" value={s.low_seats_threshold} onChange={(e) => set('low_seats_threshold', Number(e.target.value) || 0)} /></AdminFormField>
            <AdminFormField label="Referral reward">
              <select className="admin-form-control" value={s.referral_reward_type} onChange={(e) => set('referral_reward_type', e.target.value as 'percent' | 'fixed')}><option value="percent">Percent</option><option value="fixed">Fixed ₹</option></select>
            </AdminFormField>
            <AdminFormField label="Reward value"><input type="number" min={0} className="admin-form-control" value={s.referral_reward_value} onChange={(e) => set('referral_reward_value', Number(e.target.value) || 0)} /></AdminFormField>
          </div>
          <Toggle checked={s.referral_auto_issue} onChange={(v) => set('referral_auto_issue', v)} label="Auto-issue a referral code to every enrolled student" />
        </Card>

        <Card title="Billing & GST" description="Printed on receipt PDFs.">
          <AdminFormField label="Legal name"><input className="admin-form-control" value={s.legal_name} onChange={(e) => set('legal_name', e.target.value)} /></AdminFormField>
          <AdminFormField label="GSTIN" hint="15 characters; leave blank if not registered."><input className="admin-form-control uppercase" maxLength={15} value={s.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} /></AdminFormField>
          <AdminFormField label="Billing address"><textarea className="admin-form-control min-h-[70px]" value={s.billing_address} onChange={(e) => set('billing_address', e.target.value)} /></AdminFormField>
        </Card>

        <Card title="Terms & refund policy" description="Basic HTML allowed (p, ul, li, strong, a).">
          <Toggle checked={s.require_terms} onChange={(v) => set('require_terms', v)} label="Students must accept terms before paying" />
          <AdminFormField label="Terms"><textarea className="admin-form-control min-h-[110px] font-mono text-xs" value={s.terms_html} onChange={(e) => set('terms_html', e.target.value)} /></AdminFormField>
          <AdminFormField label="Refund policy"><textarea className="admin-form-control min-h-[110px] font-mono text-xs" value={s.refund_policy_html} onChange={(e) => set('refund_policy_html', e.target.value)} /></AdminFormField>
        </Card>
      </div>

      <Card title="Checkout form fields" description="Turn fields on or off, mark them required, and rename labels." actions={
        <AdminButton variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => set('form_fields', [...s.form_fields, { key: `custom_${s.form_fields.length + 1}`, label: 'New field', type: 'text', enabled: true, required: false }])}>Add field</AdminButton>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-[var(--cm-color-text-muted)]">
              <tr><th className="py-2 pr-3">Key</th><th className="py-2 pr-3">Label</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Options (select)</th><th className="py-2 pr-3">On</th><th className="py-2 pr-3">Required</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-[var(--cm-color-border)]">
              {s.form_fields.map((f, i) => {
                const core = ['name', 'mobile', 'email'].includes(f.key)
                return (
                  <tr key={i}>
                    <td className="py-2 pr-3"><input className="admin-form-control font-mono text-xs" value={f.key} disabled={core} onChange={(e) => setField(i, { key: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase() })} /></td>
                    <td className="py-2 pr-3"><input className="admin-form-control" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} /></td>
                    <td className="py-2 pr-3">
                      <select className="admin-form-control" value={f.type} disabled={core} onChange={(e) => setField(i, { type: e.target.value as CheckoutFormField['type'] })}>
                        {['text', 'email', 'tel', 'select', 'textarea', 'date'].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3"><input className="admin-form-control" disabled={f.type !== 'select'} value={(f.options || []).join(', ')} onChange={(e) => setField(i, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></td>
                    <td className="py-2 pr-3"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={f.enabled} disabled={f.key === 'name' || f.key === 'mobile'} onChange={(e) => setField(i, { enabled: e.target.checked })} /></td>
                    <td className="py-2 pr-3"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={f.required} disabled={f.key === 'name' || f.key === 'mobile'} onChange={(e) => setField(i, { required: e.target.checked })} /></td>
                    <td className="py-2 text-right">{core ? null : <AdminButton variant="icon-danger" size="xs" aria-label="Remove field" icon={<Trash2 className="h-4 w-4" />} onClick={() => set('form_fields', s.form_fields.filter((_, j) => j !== i))} />}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------- promos */
const emptyPromo = { id: 0, name: '', coupon_code: '', course_master_id: '', center_id: '', discount_type: 'percent', discount_value: '', starts_at: '', ends_at: '', usage_limit: '', per_mobile_limit: '', min_amount: '', is_active: true }

function PromosTab({ api, centres, centerId }: { api: Api; centres: { id: number; name: string }[]; centerId: number | null }) {
  const { data, loading, reload } = useResource(api, 'promos')
  const [form, setForm] = useState<Row | null>(null)
  const [err, setErr] = useState('')

  const save = async () => {
    setErr('')
    try {
      await api('promos', { method: form!.id ? 'PUT' : 'POST', body: form })
      toast.success('Promo saved')
      setForm(null)
      void reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    }
  }
  const status = (r: Row) => {
    const now = Date.now()
    if (!Number(r.is_active)) return <Pill>Inactive</Pill>
    if (r.ends_at && new Date(r.ends_at).getTime() < now) return <Pill tone="red">Expired</Pill>
    if (r.starts_at && new Date(r.starts_at).getTime() > now) return <Pill tone="amber">Scheduled</Pill>
    if (r.usage_limit && Number(r.used_count) >= Number(r.usage_limit)) return <Pill tone="red">Limit reached</Pill>
    return <Pill tone="green">Live</Pill>
  }
  const columns: AdminTableColumn<Row>[] = [
    { key: 'code', header: 'Code', render: (r) => <div><p className="font-mono font-semibold text-[var(--cm-color-text)]">{r.coupon_code || <span className="text-xs text-[var(--cm-color-text-muted)]">Auto-applied</span>}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.name}</p></div> },
    { key: 'course', header: 'Programme', render: (r) => <div><p>{r.course_title}</p>{!centerId ? <p className="text-xs text-[var(--cm-color-text-muted)]">{r.center_name}</p> : null}</div> },
    { key: 'value', header: 'Discount', render: (r) => (r.discount_type === 'percent' ? `${Number(r.discount_value)}%` : inr(r.discount_value)) },
    { key: 'window', header: 'Valid', render: (r) => <span className="text-xs">{fmtDate(r.starts_at)} → {fmtDate(r.ends_at)}</span> },
    { key: 'usage', header: 'Used', render: (r) => `${r.used_count}${r.usage_limit ? ` / ${r.usage_limit}` : ''}` },
    { key: 'status', header: 'Status', render: status },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        <AdminButton variant="icon-edit" size="xs" aria-label="Edit promo" icon={<Pencil className="h-4 w-4" />} onClick={() => setForm({ ...emptyPromo, ...r, starts_at: toLocalInput(r.starts_at), ends_at: toLocalInput(r.ends_at), is_active: !!Number(r.is_active) })} />
        {Number(r.is_active) ? <AdminButton variant="icon-danger" size="xs" aria-label="Deactivate promo" icon={<XCircle className="h-4 w-4" />} onClick={async () => { if (await confirmDialog({ message: `${'Deactivate promo?'} ${`${r.coupon_code || r.name} will stop applying.`}`, destructive: true })) { await run(() => api('promos', { method: 'DELETE', qs: { id: r.id } }), 'Promo deactivated'); void reload() } }} /> : null}
      </div>
    ) },
  ]
  const f = form
  return (
    <Card title="Promo codes" description="Every promo is scoped to one centre and one programme, with optional dates and usage limits." actions={
      <AdminButton size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ ...emptyPromo, center_id: centerId || '' })}>New promo</AdminButton>
    }>
      <AdminDataTable columns={columns} rows={data?.rows || []} rowKey={(r) => String(r.id)} loading={loading} emptyMessage="No promo codes yet." caption="Promo codes" />
      <FormModal isOpen={!!f} onClose={() => setForm(null)} title={f?.id ? 'Edit promo' : 'New promo'} description="Leave the code empty for an automatic offer." formError={err} footer={
        <div className="flex justify-end gap-2"><AdminButton variant="secondary" onClick={() => setForm(null)}>Cancel</AdminButton><AdminButton onClick={save}>Save promo</AdminButton></div>
      }>
        {f ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {!centerId ? (
              <AdminFormField label="Centre" required className="sm:col-span-2">
                <select className="admin-form-control" value={f.center_id} onChange={(e) => setForm({ ...f, center_id: e.target.value })}><option value="">Select centre</option>{centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </AdminFormField>
            ) : null}
            <AdminFormField label="Programme" required className="sm:col-span-2">
              <select className="admin-form-control" value={f.course_master_id} onChange={(e) => setForm({ ...f, course_master_id: e.target.value })}><option value="">Select programme</option>{(data?.courses || []).map((c: Row) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            </AdminFormField>
            <AdminFormField label="Name"><input className="admin-form-control" value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} /></AdminFormField>
            <AdminFormField label="Code"><input className="admin-form-control font-mono uppercase" value={f.coupon_code || ''} onChange={(e) => setForm({ ...f, coupon_code: e.target.value.toUpperCase() })} /></AdminFormField>
            <AdminFormField label="Type"><select className="admin-form-control" value={f.discount_type} onChange={(e) => setForm({ ...f, discount_type: e.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed ₹</option></select></AdminFormField>
            <AdminFormField label="Value" required><input type="number" min={0} className="admin-form-control" value={f.discount_value} onChange={(e) => setForm({ ...f, discount_value: e.target.value })} /></AdminFormField>
            <AdminFormField label="Starts"><input type="datetime-local" className="admin-form-control" value={f.starts_at} onChange={(e) => setForm({ ...f, starts_at: e.target.value })} /></AdminFormField>
            <AdminFormField label="Ends"><input type="datetime-local" className="admin-form-control" value={f.ends_at} onChange={(e) => setForm({ ...f, ends_at: e.target.value })} /></AdminFormField>
            <AdminFormField label="Total uses" hint="Blank = unlimited"><input type="number" min={1} className="admin-form-control" value={f.usage_limit ?? ''} onChange={(e) => setForm({ ...f, usage_limit: e.target.value })} /></AdminFormField>
            <AdminFormField label="Uses per mobile"><input type="number" min={1} className="admin-form-control" value={f.per_mobile_limit ?? ''} onChange={(e) => setForm({ ...f, per_mobile_limit: e.target.value })} /></AdminFormField>
            <AdminFormField label="Minimum amount ₹"><input type="number" min={0} className="admin-form-control" value={f.min_amount ?? ''} onChange={(e) => setForm({ ...f, min_amount: e.target.value })} /></AdminFormField>
            <div className="flex items-end"><Toggle checked={!!f.is_active} onChange={(v) => setForm({ ...f, is_active: v })} label="Active" /></div>
          </div>
        ) : null}
      </FormModal>
    </Card>
  )
}

/* -------------------------------------------------------- seats & waitlist */
function SeatsTab({ api, centerId }: { api: Api; centerId: number | null }) {
  const seats = useResource(api, centerId ? 'seats' : 'overview')
  const wait = useResource(api, 'waitlist')
  const [caps, setCaps] = useState<Record<number, string>>({})
  const saveCap = async (r: Row) => {
    const v = caps[r.id]
    if (await run(() => api('seats', { method: 'PUT', body: { batch_id: r.id, capacity: v === '' || v == null ? null : Number(v) } }), 'Seat limit saved')) void seats.reload()
  }
  const setWait = async (r: Row, status: string) => {
    if (await run(() => api('waitlist', { method: 'PUT', body: { id: r.id, status } }), status === 'notified' ? 'Student notified' : 'Waitlist updated')) void wait.reload()
  }
  const seatCols: AdminTableColumn<Row>[] = [
    { key: 'batch', header: 'Batch', render: (r) => <div><p className="font-medium text-[var(--cm-color-text)]">{r.batch_name || `Batch #${r.id}`}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.course_title} · {fmtDate(r.start_date)}</p></div> },
    { key: 'taken', header: 'Enrolled', align: 'right', render: (r) => r.taken ?? 0 },
    { key: 'left', header: 'Seats left', render: (r) => (r.left == null ? <Pill>Unlimited</Pill> : r.left === 0 ? <Pill tone="red">Full</Pill> : <Pill tone={r.left <= 5 ? 'amber' : 'green'}>{r.left} left</Pill>) },
    { key: 'wl', header: 'Waitlist', align: 'right', render: (r) => r.waitlist ?? 0 },
    { key: 'cap', header: 'Centre capacity', render: (r) => (
      <div className="flex items-center gap-2">
        <input type="number" min={0} className="admin-form-control w-28" placeholder={r.base_capacity ? `Default ${r.base_capacity}` : 'Unlimited'} value={caps[r.id] ?? (r.override ?? '')} onChange={(e) => setCaps({ ...caps, [r.id]: e.target.value })} />
        <AdminButton size="xs" variant="secondary" icon={<Save className="h-3.5 w-3.5" />} onClick={() => saveCap(r)}>Save</AdminButton>
      </div>
    ) },
  ]
  const waitCols: AdminTableColumn<Row>[] = [
    { key: 'student', header: 'Student', render: (r) => <div><p className="font-medium text-[var(--cm-color-text)]">{r.student_name}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.student_mobile}{r.student_email ? ` · ${r.student_email}` : ''}</p></div> },
    { key: 'course', header: 'Programme / batch', render: (r) => <div><p>{r.course_title}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.batch_name || '—'}{!centerId ? ` · ${r.center_name}` : ''}</p></div> },
    { key: 'joined', header: 'Joined', render: (r) => fmtDate(r.created_at) },
    { key: 'status', header: 'Status', render: (r) => <Pill tone={r.status === 'waiting' ? 'amber' : r.status === 'notified' ? 'indigo' : r.status === 'enrolled' ? 'green' : 'slate'}>{r.status}</Pill> },
    { key: 'a', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        {r.status === 'waiting' ? <AdminButton size="xs" variant="secondary" icon={<Send className="h-3.5 w-3.5" />} onClick={() => setWait(r, 'notified')}>Notify</AdminButton> : null}
        {r.status !== 'enrolled' ? <AdminButton size="xs" variant="ghost" onClick={() => setWait(r, 'enrolled')}>Mark enrolled</AdminButton> : null}
        <AdminButton size="xs" variant="icon-danger" aria-label="Remove" icon={<Trash2 className="h-4 w-4" />} onClick={async () => { if (await run(() => api('waitlist', { method: 'DELETE', qs: { id: r.id } }), 'Removed')) void wait.reload() }} />
      </div>
    ) },
  ]
  return (
    <div className="space-y-6">
      {centerId ? (
        <Card title="Seat limits" description="Override batch capacity for this centre. Blank uses the programme default; no default means unlimited." actions={<AdminButton size="sm" variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={() => seats.reload()}>Refresh</AdminButton>}>
          <AdminDataTable columns={seatCols} rows={seats.data?.rows || []} rowKey={(r) => String(r.id)} loading={seats.loading} emptyMessage="No batches for this centre's programmes." caption="Seat limits" />
        </Card>
      ) : <NeedCentre />}
      <Card title="Waitlist" description="Students who asked for a seat in a full batch.">
        <AdminDataTable columns={waitCols} rows={wait.data?.rows || []} rowKey={(r) => String(r.id)} loading={wait.loading} emptyMessage="Nobody is waiting." caption="Waitlist" />
      </Card>
    </div>
  )
}

/* ---------------------------------------------------------------- approvals */
function ApprovalsTab({ api }: { api: Api }) {
  const [status, setStatus] = useState('pending')
  const qs = useMemo(() => ({ status }), [status])
  const { data, loading, reload } = useResource(api, 'approvals', qs)
  const decide = async (r: Row, action: 'approve' | 'reject') => {
    const note = action === 'reject' ? window.prompt('Reason for rejection (shared with the student):') : ''
    if (action === 'reject' && note === null) return
    if (await run(() => api('approvals', { method: 'POST', body: { payment_id: r.id, action, note } }), action === 'approve' ? 'Enrollment approved' : 'Enrollment rejected')) void reload()
  }
  const cols: AdminTableColumn<Row>[] = [
    { key: 'student', header: 'Student', render: (r) => <div><p className="font-medium text-[var(--cm-color-text)]">{r.student_name}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.student_mobile}</p></div> },
    { key: 'course', header: 'Programme', render: (r) => <div><p>{r.course_title}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.batch_name || '—'} · {r.center_name}</p></div> },
    { key: 'amt', header: 'Paid', align: 'right', render: (r) => <div><p>{inr(r.amount_paid)}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.receipt_no}</p></div> },
    { key: 'date', header: 'Date', render: (r) => fmtDate(r.created_at) },
    { key: 'a', header: '', align: 'right', render: (r) => status === 'pending' ? (
      <div className="flex justify-end gap-1">
        <AdminButton size="xs" variant="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => decide(r, 'approve')}>Approve</AdminButton>
        <AdminButton size="xs" variant="ghost-danger" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => decide(r, 'reject')}>Reject</AdminButton>
      </div>
    ) : <span className="text-xs text-[var(--cm-color-text-muted)]">{r.approval_note || ''}</span> },
  ]
  return (
    <Card title="Enrollment approvals" description="Turn on 'Require admin approval' in Checkout settings to hold paid enrollments here." actions={
      <select className="admin-form-control" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Approval status"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
    }>
      <AdminDataTable columns={cols} rows={data?.rows || []} rowKey={(r) => String(r.id)} loading={loading} emptyMessage={`No ${status} enrollments.`} caption="Approvals" />
    </Card>
  )
}

/* ------------------------------------------------------------- scholarships */
function ScholarshipsTab({ api, centerId }: { api: Api; centerId: number | null }) {
  const tiers = useResource(api, 'scholarship-tiers')
  const results = useResource(api, 'scholarship-results')
  const [tier, setTier] = useState<Row | null>(null)
  const [err, setErr] = useState('')
  const [csv, setCsv] = useState('')
  const saveTier = async () => {
    setErr('')
    try { await api('scholarship-tiers', { method: tier!.id ? 'PUT' : 'POST', body: tier }); toast.success('Tier saved'); setTier(null); void tiers.reload() } catch (e) { setErr(e instanceof Error ? e.message : 'Save failed') }
  }
  const importCsv = async () => {
    const rows = csv.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [student_mobile, student_name, score, max_score, test_name] = l.split(',').map((x) => x.trim())
      return { student_mobile, student_name, score, max_score: max_score || 100, test_name }
    })
    if (!rows.length) return
    if (await run(() => api('scholarship-results', { method: 'POST', body: { rows } }), `${rows.length} result(s) imported`)) { setCsv(''); void results.reload() }
  }
  const tierCols: AdminTableColumn<Row>[] = [
    { key: 'name', header: 'Tier', render: (r) => <div className="flex items-center gap-2"><span className="font-medium text-[var(--cm-color-text)]">{r.name}</span>{r.inherited ? <Pill>Default</Pill> : null}{!Number(r.is_active) ? <Pill tone="red">Off</Pill> : null}</div> },
    { key: 'band', header: 'Score band', render: (r) => `${Number(r.min_score)}% – ${Number(r.max_score)}%` },
    { key: 'disc', header: 'Discount', render: (r) => (r.discount_type === 'percent' ? `${Number(r.discount_value)}%` : inr(r.discount_value)) },
    { key: 'course', header: 'Programme', render: (r) => r.course_title || 'All programmes' },
    { key: 'a', header: '', align: 'right', render: (r) => r.inherited ? null : (
      <div className="flex justify-end gap-1">
        <AdminButton variant="icon-edit" size="xs" aria-label="Edit tier" icon={<Pencil className="h-4 w-4" />} onClick={() => setTier({ ...r, is_active: !!Number(r.is_active) })} />
        <AdminButton variant="icon-danger" size="xs" aria-label="Delete tier" icon={<Trash2 className="h-4 w-4" />} onClick={async () => { if (await run(() => api('scholarship-tiers', { method: 'DELETE', qs: { id: r.id } }), 'Tier deleted')) void tiers.reload() }} />
      </div>
    ) },
  ]
  const resCols: AdminTableColumn<Row>[] = [
    { key: 's', header: 'Student', render: (r) => <div><p className="font-medium text-[var(--cm-color-text)]">{r.student_name || '—'}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.student_mobile}</p></div> },
    { key: 't', header: 'Test', render: (r) => r.test_name || '—' },
    { key: 'sc', header: 'Score', align: 'right', render: (r) => `${Number(r.score)} / ${Number(r.max_score)} (${Math.round((Number(r.score) / Number(r.max_score)) * 100)}%)` },
    { key: 'v', header: 'Valid until', render: (r) => fmtDate(r.valid_until) },
    { key: 'a', header: '', align: 'right', render: (r) => <AdminButton variant="icon-danger" size="xs" aria-label="Delete result" icon={<Trash2 className="h-4 w-4" />} onClick={async () => { if (await run(() => api('scholarship-results', { method: 'DELETE', qs: { id: r.id } }), 'Result deleted')) void results.reload() }} /> },
  ]
  const t = tier
  return (
    <div className="space-y-6">
      <Card title="Scholarship tiers" description={centerId ? 'Centre tiers take priority over Super Admin default tiers.' : 'Default tiers apply to every centre unless a centre defines its own.'} actions={
        <AdminButton size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setTier({ id: 0, name: '', min_score: 0, max_score: 100, discount_type: 'percent', discount_value: '', course_master_id: '', is_active: true })}>New tier</AdminButton>
      }>
        <AdminDataTable columns={tierCols} rows={tiers.data?.rows || []} rowKey={(r) => String(r.id)} loading={tiers.loading} emptyMessage="No tiers yet." caption="Scholarship tiers" />
      </Card>
      {centerId ? (
        <Card title="Test results" description="Scholarship is applied automatically at checkout when the student's mobile matches a valid result.">
          <AdminFormField label="Import results (CSV)" hint="One per line: mobile, name, score, max score, test name">
            <textarea className="admin-form-control min-h-[90px] font-mono text-xs" placeholder="9876543210, Asha Rao, 82, 100, Scholarship Test Oct" value={csv} onChange={(e) => setCsv(e.target.value)} />
          </AdminFormField>
          <div className="flex justify-end"><AdminButton size="sm" onClick={importCsv} disabled={!csv.trim()}>Import</AdminButton></div>
          <AdminDataTable columns={resCols} rows={results.data?.rows || []} rowKey={(r) => String(r.id)} loading={results.loading} emptyMessage="No results imported." caption="Scholarship results" />
        </Card>
      ) : <NeedCentre />}
      <FormModal isOpen={!!t} onClose={() => setTier(null)} title={t?.id ? 'Edit tier' : 'New tier'} formError={err} footer={
        <div className="flex justify-end gap-2"><AdminButton variant="secondary" onClick={() => setTier(null)}>Cancel</AdminButton><AdminButton onClick={saveTier}>Save tier</AdminButton></div>
      }>
        {t ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminFormField label="Name" required className="sm:col-span-2"><input className="admin-form-control" value={t.name} onChange={(e) => setTier({ ...t, name: e.target.value })} /></AdminFormField>
            <AdminFormField label="Min score %"><input type="number" min={0} max={100} className="admin-form-control" value={t.min_score} onChange={(e) => setTier({ ...t, min_score: e.target.value })} /></AdminFormField>
            <AdminFormField label="Max score %"><input type="number" min={0} max={100} className="admin-form-control" value={t.max_score} onChange={(e) => setTier({ ...t, max_score: e.target.value })} /></AdminFormField>
            <AdminFormField label="Type"><select className="admin-form-control" value={t.discount_type} onChange={(e) => setTier({ ...t, discount_type: e.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed ₹</option></select></AdminFormField>
            <AdminFormField label="Value" required><input type="number" min={0} className="admin-form-control" value={t.discount_value} onChange={(e) => setTier({ ...t, discount_value: e.target.value })} /></AdminFormField>
            <div className="sm:col-span-2"><Toggle checked={!!t.is_active} onChange={(v) => setTier({ ...t, is_active: v })} label="Active" /></div>
          </div>
        ) : null}
      </FormModal>
    </div>
  )
}

/* ---------------------------------------------------------------- referrals */
function ReferralsTab({ api, centerId }: { api: Api; centerId: number | null }) {
  const { data, loading, reload } = useResource(api, 'referrals')
  const [form, setForm] = useState<Row | null>(null)
  const [err, setErr] = useState('')
  const save = async () => {
    setErr('')
    try { await api('referrals', { method: form!.id ? 'PUT' : 'POST', body: form }); toast.success('Referral code saved'); setForm(null); void reload() } catch (e) { setErr(e instanceof Error ? e.message : 'Save failed') }
  }
  const cols: AdminTableColumn<Row>[] = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-mono font-semibold text-[var(--cm-color-text)]">{r.code}</span> },
    { key: 'owner', header: 'Referrer', render: (r) => <div><p>{r.owner_name || '—'}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.owner_mobile || ''}{!centerId ? ` · ${r.center_name || ''}` : ''}</p></div> },
    { key: 'disc', header: 'Friend gets', render: (r) => (r.discount_type === 'percent' ? `${Number(r.discount_value)}%` : inr(r.discount_value)) },
    { key: 'used', header: 'Used', render: (r) => `${r.used_count}${r.usage_limit ? ` / ${r.usage_limit}` : ''}` },
    { key: 'exp', header: 'Expires', render: (r) => fmtDate(r.expires_at) },
    { key: 'st', header: 'Status', render: (r) => (Number(r.is_active) ? <Pill tone="green">Active</Pill> : <Pill>Inactive</Pill>) },
    { key: 'a', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        <AdminButton variant="icon-edit" size="xs" aria-label="Edit code" icon={<Pencil className="h-4 w-4" />} onClick={() => setForm({ ...r, expires_at: r.expires_at ? String(r.expires_at).slice(0, 10) : '', is_active: !!Number(r.is_active) })} />
        {Number(r.is_active) ? <AdminButton variant="icon-danger" size="xs" aria-label="Deactivate code" icon={<XCircle className="h-4 w-4" />} onClick={async () => { if (await run(() => api('referrals', { method: 'DELETE', qs: { id: r.id } }), 'Code deactivated')) void reload() }} /> : null}
      </div>
    ) },
  ]
  const f = form
  return (
    <Card title="Referral codes" description="Codes are issued automatically on enrollment when enabled in settings, or created here." actions={
      centerId ? <AdminButton size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ id: 0, code: '', owner_name: '', owner_mobile: '', discount_type: 'percent', discount_value: '', usage_limit: '', expires_at: '', is_active: true })}>New code</AdminButton> : null
    }>
      <AdminDataTable columns={cols} rows={data?.rows || []} rowKey={(r) => String(r.id)} loading={loading} emptyMessage="No referral codes yet." caption="Referral codes" />
      <FormModal isOpen={!!f} onClose={() => setForm(null)} title={f?.id ? 'Edit referral code' : 'New referral code'} formError={err} footer={
        <div className="flex justify-end gap-2"><AdminButton variant="secondary" onClick={() => setForm(null)}>Cancel</AdminButton><AdminButton onClick={save}>Save code</AdminButton></div>
      }>
        {f ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminFormField label="Code" required><input className="admin-form-control font-mono uppercase" value={f.code} onChange={(e) => setForm({ ...f, code: e.target.value.toUpperCase() })} /></AdminFormField>
            <AdminFormField label="Referrer name"><input className="admin-form-control" value={f.owner_name || ''} onChange={(e) => setForm({ ...f, owner_name: e.target.value })} /></AdminFormField>
            <AdminFormField label="Referrer mobile"><input className="admin-form-control" value={f.owner_mobile || ''} onChange={(e) => setForm({ ...f, owner_mobile: e.target.value })} /></AdminFormField>
            <AdminFormField label="Expires"><input type="date" className="admin-form-control" value={f.expires_at || ''} onChange={(e) => setForm({ ...f, expires_at: e.target.value })} /></AdminFormField>
            <AdminFormField label="Type"><select className="admin-form-control" value={f.discount_type} onChange={(e) => setForm({ ...f, discount_type: e.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed ₹</option></select></AdminFormField>
            <AdminFormField label="Value" required><input type="number" min={0} className="admin-form-control" value={f.discount_value} onChange={(e) => setForm({ ...f, discount_value: e.target.value })} /></AdminFormField>
            <AdminFormField label="Usage limit" hint="Blank = unlimited"><input type="number" min={1} className="admin-form-control" value={f.usage_limit ?? ''} onChange={(e) => setForm({ ...f, usage_limit: e.target.value })} /></AdminFormField>
            <div className="flex items-end"><Toggle checked={!!f.is_active} onChange={(v) => setForm({ ...f, is_active: v })} label="Active" /></div>
          </div>
        ) : null}
      </FormModal>
    </Card>
  )
}

/* ------------------------------------------------------ refunds & transfers */
function RefundsTab({ api }: { api: Api }) {
  const refunds = useResource(api, 'refunds')
  const transfers = useResource(api, 'transfers')
  const [q, setQ] = useState('')
  const [lookup, setLookup] = useState<Row | null>(null)
  const [action, setAction] = useState<{ kind: 'refund' | 'transfer'; pay: Row; amount: string; reason: string; method: string; reference: string; to_batch_id: string } | null>(null)
  const [err, setErr] = useState('')
  const search = async () => {
    try { setLookup(await api('payments', { qs: { q } })) } catch (e) { toast.error(e instanceof Error ? e.message : 'Search failed') }
  }
  const submit = async () => {
    if (!action) return
    setErr('')
    try {
      if (action.kind === 'refund') await api('refunds', { method: 'POST', body: { payment_id: action.pay.id, amount: Number(action.amount), reason: action.reason, method: action.method, reference: action.reference } })
      else await api('transfers', { method: 'POST', body: { payment_id: action.pay.id, to_batch_id: Number(action.to_batch_id), reason: action.reason } })
      toast.success(action.kind === 'refund' ? 'Refund recorded' : 'Student transferred')
      setAction(null)
      void refunds.reload(); void transfers.reload(); void search()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Action failed') }
  }
  const payCols: AdminTableColumn<Row>[] = [
    { key: 'r', header: 'Receipt', render: (r) => <span className="font-mono text-xs">{r.receipt_no}</span> },
    { key: 's', header: 'Student', render: (r) => <div><p className="font-medium text-[var(--cm-color-text)]">{r.student_name}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.student_mobile}</p></div> },
    { key: 'c', header: 'Programme / batch', render: (r) => <div><p>{r.course_title}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.batch_name || '—'}</p></div> },
    { key: 'p', header: 'Paid / refunded', align: 'right', render: (r) => <div><p>{inr(r.amount_paid)}</p>{Number(r.refunded_amount) ? <p className="text-xs text-rose-600">−{inr(r.refunded_amount)}</p> : null}</div> },
    { key: 'a', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        <AdminButton size="xs" variant="secondary" icon={<Undo2 className="h-3.5 w-3.5" />} disabled={Number(r.refunded_amount) >= Number(r.amount_paid)} onClick={() => setAction({ kind: 'refund', pay: r, amount: '', reason: '', method: 'bank_transfer', reference: '', to_batch_id: '' })}>Refund</AdminButton>
        <AdminButton size="xs" variant="ghost" icon={<Repeat className="h-3.5 w-3.5" />} onClick={() => setAction({ kind: 'transfer', pay: r, amount: '', reason: '', method: '', reference: '', to_batch_id: '' })}>Transfer</AdminButton>
      </div>
    ) },
  ]
  const refundCols: AdminTableColumn<Row>[] = [
    { key: 'd', header: 'Date', render: (r) => fmtDate(r.created_at) },
    { key: 'r', header: 'Receipt', render: (r) => <div><p className="font-mono text-xs">{r.receipt_no}</p><p className="text-xs text-[var(--cm-color-text-muted)]">{r.student_name}</p></div> },
    { key: 'a', header: 'Amount', align: 'right', render: (r) => <span className="font-medium text-rose-600">{inr(r.amount)}</span> },
    { key: 'm', header: 'Method / ref', render: (r) => <span className="text-xs">{r.method || '—'} {r.reference ? `· ${r.reference}` : ''}</span> },
    { key: 'why', header: 'Reason', render: (r) => <span className="text-xs">{r.reason || '—'}</span> },
  ]
  const transferCols: AdminTableColumn<Row>[] = [
    { key: 'd', header: 'Date', render: (r) => fmtDate(r.created_at) },
    { key: 's', header: 'Student', render: (r) => r.student_mobile },
    { key: 'c', header: 'Programme', render: (r) => r.course_title },
    { key: 'm', header: 'Move', render: (r) => <span className="text-xs">{r.from_batch || '—'} → <span className="font-medium">{r.to_batch}</span></span> },
    { key: 'why', header: 'Reason', render: (r) => <span className="text-xs">{r.reason || '—'}</span> },
  ]
  const a = action
  const batchOpts = a?.kind === 'transfer' ? (lookup?.batches || []).filter((b: Row) => Number(b.course_master_id) === Number(a.pay.course_master_id) && Number(b.id) !== Number(a.pay.batch_id)) : []
  return (
    <div className="space-y-6">
      <Card title="Find a payment" description="Search by receipt number, student name or mobile, then refund part of it or move the student to another batch.">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void search() }}>
          <input className="admin-form-control flex-1" placeholder="Receipt no., name or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
          <AdminButton type="submit">Search</AdminButton>
        </form>
        {lookup ? <AdminDataTable columns={payCols} rows={lookup.rows || []} rowKey={(r) => String(r.id)} emptyMessage="No completed payments match." caption="Payments" /> : null}
      </Card>
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <Card title="Refund history"><AdminDataTable columns={refundCols} rows={refunds.data?.rows || []} rowKey={(r) => String(r.id)} loading={refunds.loading} emptyMessage="No refunds recorded." caption="Refunds" /></Card>
        <Card title="Batch transfers"><AdminDataTable columns={transferCols} rows={transfers.data?.rows || []} rowKey={(r) => String(r.id)} loading={transfers.loading} emptyMessage="No transfers yet." caption="Transfers" /></Card>
      </div>
      <FormModal isOpen={!!a} onClose={() => setAction(null)} title={a?.kind === 'refund' ? 'Record partial refund' : 'Transfer to another batch'} description={a ? `${a.pay.student_name} · ${a.pay.receipt_no}` : ''} formError={err} footer={
        <div className="flex justify-end gap-2"><AdminButton variant="secondary" onClick={() => setAction(null)}>Cancel</AdminButton><AdminButton variant={a?.kind === 'refund' ? 'danger' : 'primary'} onClick={submit}>{a?.kind === 'refund' ? 'Record refund' : 'Transfer'}</AdminButton></div>
      }>
        {a ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {a.kind === 'refund' ? (
              <>
                <AdminFormField label="Amount ₹" required hint={`Refundable: ${inr(Number(a.pay.amount_paid) - Number(a.pay.refunded_amount || 0))}`}><input type="number" min={1} className="admin-form-control" value={a.amount} onChange={(e) => setAction({ ...a, amount: e.target.value })} /></AdminFormField>
                <AdminFormField label="Method"><select className="admin-form-control" value={a.method} onChange={(e) => setAction({ ...a, method: e.target.value })}><option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="gateway">Payment gateway</option><option value="cash">Cash</option></select></AdminFormField>
                <AdminFormField label="Reference" className="sm:col-span-2"><input className="admin-form-control" value={a.reference} onChange={(e) => setAction({ ...a, reference: e.target.value })} /></AdminFormField>
              </>
            ) : (
              <AdminFormField label="New batch" required className="sm:col-span-2">
                <select className="admin-form-control" value={a.to_batch_id} onChange={(e) => setAction({ ...a, to_batch_id: e.target.value })}><option value="">Select batch</option>{batchOpts.map((b: Row) => <option key={b.id} value={b.id}>{b.batch_name || `Batch #${b.id}`} · {fmtDate(b.start_date)}</option>)}</select>
              </AdminFormField>
            )}
            <AdminFormField label="Reason" className="sm:col-span-2"><textarea className="admin-form-control min-h-[70px]" value={a.reason} onChange={(e) => setAction({ ...a, reason: e.target.value })} /></AdminFormField>
          </div>
        ) : null}
      </FormModal>
    </div>
  )
}

/* ---------------------------------------------------------------- reminders */
function RemindersTab({ api }: { api: Api }) {
  const { data, loading, reload } = useResource(api, 'reminders')
  const [busy, setBusy] = useState(false)
  const runNow = async () => {
    setBusy(true)
    try {
      const r = await api('reminders', { method: 'POST' })
      toast.success(`Queued ${r.queued ?? 0}, sent ${r.sent ?? 0}, skipped ${r.skipped ?? 0}`)
      void reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Run failed') } finally { setBusy(false) }
  }
  const cols: AdminTableColumn<Row>[] = [
    { key: 'd', header: 'Created', render: (r) => fmtDate(r.created_at) },
    { key: 'c', header: 'Channel', render: (r) => <Pill tone="indigo">{String(r.channel).toUpperCase()}</Pill> },
    { key: 'to', header: 'Recipient', render: (r) => <span className="text-xs">{r.recipient}</span> },
    { key: 'k', header: 'Kind', render: (r) => <span className="text-xs">{r.kind}</span> },
    { key: 's', header: 'Status', render: (r) => <Pill tone={r.status === 'sent' ? 'green' : r.status === 'failed' ? 'red' : r.status === 'skipped' ? 'slate' : 'amber'}>{r.status}</Pill> },
    { key: 'e', header: 'Note', render: (r) => <span className="text-xs text-[var(--cm-color-text-muted)]">{r.last_error || ''}</span> },
  ]
  const stats = data?.stats || {}
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {['pending', 'sent', 'skipped', 'failed'].map((k) => (
          <div key={k} className="admin-card p-4"><p className="text-xs uppercase tracking-wide text-[var(--cm-color-text-muted)]">{k}</p><p className="mt-1 text-2xl font-semibold text-[var(--cm-color-text)]">{stats[k] || 0}</p></div>
        ))}
      </div>
      <Card title="Installment reminders" description="Schedule and channels are set in Checkout & Content → reminders (inherits defaults). The cron runs `npm run reminders:run`; channels without API keys are skipped safely." actions={
        <AdminButton size="sm" icon={<Send className="h-4 w-4" />} onClick={runNow} disabled={busy}>{busy ? 'Running…' : 'Run now'}</AdminButton>
      }>
        <div className="flex flex-wrap gap-2">
          {data ? (['email', 'sms', 'whatsapp'] as const).map((c) => <Pill key={c} tone={data.channels[c] ? 'green' : 'slate'}>{c.toUpperCase()} {data.channels[c] ? 'ready' : 'no keys'}</Pill>) : null}
        </div>
        <AdminDataTable columns={cols} rows={data?.rows || []} rowKey={(r) => String(r.id)} loading={loading} emptyMessage="Queue is empty." caption="Notification queue" />
      </Card>
    </div>
  )
}
