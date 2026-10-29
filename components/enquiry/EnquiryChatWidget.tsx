'use client'

import { useEffect, useState } from 'react'
import CenterEnquiryForm from '@/components/contact/CenterEnquiryForm'
import type { CenterEnquiryCourseOption } from '@/lib/center-enquiry-courses'

type EnquiryChatWidgetProps = {
  centerId: number
  centerSlug: string
  centerName: string
  courseOptions: CenterEnquiryCourseOption[]
  subtitle?: string
  formSource?: string
}

function shouldOpenFromHash() {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash.replace('#', '')
  return hash === 'contact' || hash === 'enquiry'
}

export default function EnquiryChatWidget({
  centerId,
  centerSlug,
  centerName,
  courseOptions,
  subtitle,
  formSource = 'Website - Enquiry widget',
}: EnquiryChatWidgetProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const openPanel = () => setOpen(true)
    const onHash = () => {
      if (shouldOpenFromHash()) openPanel()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const trigger = target.closest('[data-open-enquiry], a[href="#contact"], a[href="#enquiry"]')
      if (!trigger) return
      event.preventDefault()
      openPanel()
    }

    if (shouldOpenFromHash()) openPanel()
    window.addEventListener('cm-open-enquiry', openPanel)
    window.addEventListener('hashchange', onHash)
    window.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('cm-open-enquiry', openPanel)
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('enquiry-widget-open', open)
    const original = document.body.style.overflow
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.classList.remove('enquiry-widget-open')
      document.body.style.overflow = original
    }
  }, [open])

  return (
    <div className="enquiry-widget">
      <button
        type="button"
        className="enquiry-widget__fab"
        aria-expanded={open}
        aria-controls="enquiry-widget-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <i className={open ? 'ri-close-line' : 'ri-chat-smile-3-line'} aria-hidden />
        <span>{open ? 'Close' : 'Enquire now'}</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="enquiry-widget__backdrop"
            aria-label="Close enquiry form"
            onClick={() => setOpen(false)}
          />
          <section
            id="enquiry-widget-panel"
            className="enquiry-widget__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-widget-title"
          >
            <header className="enquiry-widget__head">
              <div>
                <p className="pub-eyebrow">Application</p>
                <h2 id="enquiry-widget-title">Send an enquiry</h2>
                <p>{subtitle ?? `Connect with EduSphere ${centerName} experts`}</p>
              </div>
              <button type="button" className="pub-icon-btn" aria-label="Close enquiry" onClick={() => setOpen(false)}>
                <i className="ri-close-line" />
              </button>
            </header>
            <div className="enquiry-widget__body">
              <CenterEnquiryForm
                centerSlug={centerSlug}
                centerName={centerName}
                centerManagerId={centerId}
                layout="widget"
                formSource={formSource}
                courseOptions={courseOptions}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
