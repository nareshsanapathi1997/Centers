'use client'

import TemplateBootstrapBridge from './TemplateBootstrapBridge'
import StickyHeader from './StickyHeader'
import NavbarCollapseReset from './NavbarCollapseReset'

/** Client-only template behaviors previously provided by jQuery / Bootstrap JS / main.js. */
export default function TemplateRuntime() {
  return (
    <>
      <StickyHeader />
      <TemplateBootstrapBridge />
      <NavbarCollapseReset />
    </>
  )
}
