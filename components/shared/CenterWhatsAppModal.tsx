'use client'

import { useEffect, useRef, useState } from 'react'
import {
  buildCenterLocationWhatsAppMessage,
  resolveCenterSharePayloadFromTrigger,
  type CenterSharePayload,
} from '@/lib/center-location-share'

interface CenterWhatsAppModalProps {
  /** Used when the trigger button has no data-share-payload (e.g. header/footer). */
  defaultPayload?: CenterSharePayload | null
}

function getCenterLabel(payload: CenterSharePayload | null | undefined): string {
  return String(payload?.name ?? '').trim() || 'EduSphere Centre'
}

/**
 * Site-wide “Get Address on WhatsApp” modal. Each trigger button sets data-share-payload
 * so the selected centre’s address is sent (Our Centers cards, header, footer).
 */
export default function CenterWhatsAppModal({ defaultPayload = null }: CenterWhatsAppModalProps) {
  const activePayloadRef = useRef<CenterSharePayload | null>(defaultPayload)
  const [selectedCenterName, setSelectedCenterName] = useState(() => getCenterLabel(defaultPayload))
  const [selectedCenterAddress, setSelectedCenterAddress] = useState(
    () => String(defaultPayload?.address ?? '').trim(),
  )

  const applyPayload = (payload: CenterSharePayload | null) => {
    const nextPayload = payload ?? defaultPayload
    activePayloadRef.current = nextPayload
    setSelectedCenterName(getCenterLabel(nextPayload))
    setSelectedCenterAddress(String(nextPayload?.address ?? '').trim())
  }

  useEffect(() => {
    applyPayload(defaultPayload)
  }, [defaultPayload])

  useEffect(() => {
    const modalEl = document.getElementById('whatsappAddressModal')
    if (!modalEl) return

    const onTriggerClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!target.closest('[data-bs-target="#whatsappAddressModal"]')) return

      const payload = resolveCenterSharePayloadFromTrigger(target)
      if (payload) {
        applyPayload(payload)
      }
    }

    const onShow = (event: Event) => {
      const bsEvent = event as Event & { relatedTarget?: HTMLElement | null }
      const payload = resolveCenterSharePayloadFromTrigger(bsEvent.relatedTarget ?? null)
      if (payload) {
        applyPayload(payload)
      } else if (!activePayloadRef.current) {
        applyPayload(defaultPayload)
      }
    }

    document.addEventListener('click', onTriggerClick, true)
    modalEl.addEventListener('show.bs.modal', onShow)
    return () => {
      document.removeEventListener('click', onTriggerClick, true)
      modalEl.removeEventListener('show.bs.modal', onShow)
    }
  }, [defaultPayload])

  useEffect(() => {
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLElement | null
      if (!form?.classList?.contains('whatsapp-address-form')) return
      e.preventDefault()

      const numberEl = document.getElementById('whatsappNumber') as HTMLInputElement | null
      const number = (numberEl?.value || '').replace(/\D/g, '')
      if (number.length !== 10) {
        alert('Please enter a valid 10-digit mobile number.')
        return
      }

      const whatsappMessage = buildCenterLocationWhatsAppMessage(activePayloadRef.current ?? {})
      if (!whatsappMessage) {
        alert('Centre contact details are not available right now.')
        return
      }

      window.open(`https://wa.me/91${number}?text=${encodeURIComponent(whatsappMessage)}`, '_blank')

      const modalEl = document.getElementById('whatsappAddressModal')
      const Bootstrap = (window as unknown as {
        bootstrap?: { Modal: { getInstance: (el: HTMLElement) => { hide: () => void } | null } }
      }).bootstrap
      if (modalEl && Bootstrap?.Modal) {
        Bootstrap.Modal.getInstance(modalEl)?.hide()
      }
      if (numberEl) numberEl.value = ''
    }

    document.addEventListener('submit', onSubmit)
    return () => document.removeEventListener('submit', onSubmit)
  }, [])

  return (
    <div
      className="modal fade"
      id="whatsappAddressModal"
      tabIndex={-1}
      aria-labelledby="whatsappAddressModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content whatsapp-address-modal">
          <div className="modal-header">
            <h5 className="modal-title" id="whatsappAddressModalLabel">
              <i className="ri-whatsapp-fill cp-modal-wa-icon" aria-hidden="true" />
              Get Address on WhatsApp
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
          </div>
          <div className="modal-body">
            <div className="whatsapp-address-selected-center">
              <p className="whatsapp-address-selected-center__label">Sending details for</p>
              <p className="whatsapp-address-selected-center__name">{selectedCenterName}</p>
              {selectedCenterAddress ? (
                <p className="whatsapp-address-selected-center__address">{selectedCenterAddress}</p>
              ) : null}
            </div>
            <form className="whatsapp-address-form">
              <div className="mb-3">
                <label htmlFor="whatsappNumber" className="form-label">
                  Enter your WhatsApp number
                </label>
                <div className="input-group">
                  <span className="input-group-text">+91</span>
                  <input
                    type="tel"
                    className="form-control"
                    id="whatsappNumber"
                    placeholder="9876543210"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="form-text mb-0">
                  We will send this centre&apos;s address, contact number, and Google Maps link to your WhatsApp.
                </p>
              </div>
              <button type="submit" className="cp-vacancy-wa-btn cp-vacancy-wa-btn--block get-address-btn">
                <i className="ri-whatsapp-fill" aria-hidden="true" />
                <span>Send on WhatsApp</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
