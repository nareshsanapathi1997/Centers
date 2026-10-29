'use client'

import { useEffect } from 'react'

function getSelector(el: Element, attr: string): string | null {
  const value = el.getAttribute(attr)
  if (!value) return null
  return value
}

function queryTarget(selector: string): HTMLElement | null {
  try {
    return document.querySelector<HTMLElement>(selector)
  } catch {
    return null
  }
}

function toggleCollapse(trigger: HTMLElement, targetSelector: string, parentSelector?: string | null) {
  const target = queryTarget(targetSelector)
  if (!target) return

  const willOpen = !target.classList.contains('show')

  if (parentSelector) {
    const parent = queryTarget(parentSelector)
    parent?.querySelectorAll('.collapse.show').forEach((openEl) => {
      if (openEl !== target) {
        openEl.classList.remove('show')
        const openId = openEl.id
        if (openId) {
          document
            .querySelectorAll(`[data-bs-target="#${openId}"], [data-bs-target="#${CSS.escape(openId)}"]`)
            .forEach((btn) => {
              btn.classList.add('collapsed')
              btn.setAttribute('aria-expanded', 'false')
            })
        }
      }
    })
  }

  target.classList.toggle('show', willOpen)
  trigger.classList.toggle('collapsed', !willOpen)
  trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false')
}

function toggleDropdown(trigger: HTMLElement) {
  const menu = trigger.parentElement?.querySelector<HTMLElement>('.dropdown-menu')
  if (!menu) return

  const willOpen = !menu.classList.contains('show')

  document.querySelectorAll('.dropdown-menu.show').forEach((openMenu) => {
    if (openMenu !== menu) openMenu.classList.remove('show')
  })
  document.querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]').forEach((openTrigger) => {
    if (openTrigger !== trigger) {
      openTrigger.setAttribute('aria-expanded', 'false')
    }
  })

  menu.classList.toggle('show', willOpen)
  trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false')
}

function openModal(targetSelector: string) {
  const modal = queryTarget(targetSelector)
  if (!modal) return

  document.body.classList.add('modal-open')
  modal.style.display = 'block'
  modal.classList.add('show')
  modal.removeAttribute('aria-hidden')

  let backdrop = document.querySelector<HTMLElement>('.modal-backdrop.template-modal-backdrop')
  if (!backdrop) {
    backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop fade show template-modal-backdrop'
    document.body.appendChild(backdrop)
  }
}

function closeModal(modal: HTMLElement) {
  modal.classList.remove('show')
  modal.style.display = 'none'
  modal.setAttribute('aria-hidden', 'true')

  document.querySelector('.modal-backdrop.template-modal-backdrop')?.remove()
  if (!document.querySelector('.modal.show')) {
    document.body.classList.remove('modal-open')
  }
}

function activateTab(trigger: HTMLElement, targetSelector: string) {
  const target = queryTarget(targetSelector)
  if (!target) return

  const tabContent = target.closest('.tab-content')
  const tabList = trigger.closest('[role="tablist"], .nav-tabs, .nav-pills, .hw-tablist')

  tabList?.querySelectorAll('[data-bs-toggle="tab"], [role="tab"]').forEach((tabTrigger) => {
    const isActive = tabTrigger === trigger
    tabTrigger.classList.toggle('active', isActive)
    tabTrigger.setAttribute('aria-selected', isActive ? 'true' : 'false')
  })

  tabContent?.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.remove('show', 'active')
  })

  trigger.classList.add('active')
  trigger.setAttribute('aria-selected', 'true')
  target.classList.add('show', 'active')
}

/** Minimal Bootstrap JS behaviors used by center template markup. */
export default function TemplateBootstrapBridge() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (!target) return

      const dismissModal = target.closest('[data-bs-dismiss="modal"]')
      if (dismissModal) {
        event.preventDefault()
        const modal = dismissModal.closest('.modal')
        if (modal instanceof HTMLElement) closeModal(modal)
        return
      }

      const collapseTrigger = target.closest('[data-bs-toggle="collapse"]')
      if (collapseTrigger instanceof HTMLElement) {
        event.preventDefault()
        const targetSelector = getSelector(collapseTrigger, 'data-bs-target')
        if (!targetSelector) return
        toggleCollapse(
          collapseTrigger,
          targetSelector,
          getSelector(collapseTrigger, 'data-bs-parent'),
        )
        return
      }

      const dropdownTrigger = target.closest('[data-bs-toggle="dropdown"]')
      if (dropdownTrigger instanceof HTMLElement) {
        event.preventDefault()
        toggleDropdown(dropdownTrigger)
        return
      }

      const modalTrigger = target.closest('[data-bs-toggle="modal"]')
      if (modalTrigger instanceof HTMLElement) {
        event.preventDefault()
        const targetSelector = getSelector(modalTrigger, 'data-bs-target')
        if (targetSelector) openModal(targetSelector)
        return
      }

      const tabTrigger = target.closest('[data-bs-toggle="tab"]')
      if (tabTrigger instanceof HTMLElement) {
        event.preventDefault()
        const targetSelector = getSelector(tabTrigger, 'data-bs-target')
        if (targetSelector) activateTab(tabTrigger, targetSelector)
      }
    }

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (!target?.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach((menu) => menu.classList.remove('show'))
        document
          .querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]')
          .forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'))
      }

      if (target?.classList.contains('template-modal-backdrop')) {
        document.querySelectorAll<HTMLElement>('.modal.show').forEach((modal) => closeModal(modal))
      }
    }

    document.addEventListener('click', onClick)
    document.addEventListener('click', onDocumentClick)

    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('click', onDocumentClick)
      document.querySelector('.modal-backdrop.template-modal-backdrop')?.remove()
      document.body.classList.remove('modal-open')
    }
  }, [])

  return null
}
