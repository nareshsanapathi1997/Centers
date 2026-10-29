'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type ContactPageRedirectProps = {
  centerSlug: string
}

/** Legacy /contact URLs — send users to Our Centers on the home page. */
export default function ContactPageRedirect({ centerSlug }: ContactPageRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    document.documentElement.setAttribute('data-hash-restore-pending', '1')
    router.replace(`/${centerSlug}#centers`)
  }, [centerSlug, router])

  return null
}
