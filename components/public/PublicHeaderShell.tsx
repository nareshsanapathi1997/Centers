'use client'

import { useEffect, useState, type ReactNode } from 'react'

type PublicHeaderShellProps = {
  utility?: ReactNode
  brand: ReactNode
  nav: ReactNode
  tools: ReactNode
  mobileTools?: ReactNode
  mobileExtras?: ReactNode
}

export default function PublicHeaderShell({
  utility,
  brand,
  nav,
  tools,
  mobileTools,
  mobileExtras,
}: PublicHeaderShellProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const close = () => setOpen(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('cm-close-public-nav', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('cm-close-public-nav', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('pub-nav-open', open)
    return () => document.documentElement.classList.remove('pub-nav-open')
  }, [open])

  return (
    <header className="pub-header premium-header website-header header-wrap">
      {utility}
      <div className="pub-container flex h-[4.5rem] items-center gap-4">
        <div className="shrink-0">{brand}</div>
        <nav className="hidden min-w-0 flex-1 items-center justify-center xl:flex" aria-label="Primary">
          <ul className="m-0 flex list-none flex-nowrap items-center justify-center gap-0.5 overflow-x-auto p-0">{nav}</ul>
        </nav>
        <div className="ml-auto hidden items-center gap-2 xl:flex">{tools}</div>
        <div className="ml-auto flex items-center gap-2 xl:hidden">
          {mobileTools}
          <button
            type="button"
            className="pub-icon-btn"
            aria-expanded={open}
            aria-controls="public-mobile-nav"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <i className={open ? 'ri-close-line' : 'ri-menu-3-line'} aria-hidden />
          </button>
        </div>
      </div>
      {open ? (
        <div
          id="public-mobile-nav"
          className="border-t border-pub-line bg-pub-cream px-5 py-4 xl:hidden"
        >
          <nav aria-label="Mobile">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">{nav}</ul>
          </nav>
          {mobileExtras ? <div className="mt-4 grid gap-2">{mobileExtras}</div> : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">{tools}</div>
        </div>
      ) : null}
    </header>
  )
}
