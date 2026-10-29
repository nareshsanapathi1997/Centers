import { notFound, redirect } from 'next/navigation'
import WebsiteHomeResourceManager from '@/components/admin/website-home/WebsiteHomeResourceManager'
import WebsiteHomeFeaturedCentersPage from '@/components/admin/website-home/WebsiteHomeFeaturedCentersPage'
import WebsiteHomeHeroAdmin from '@/components/admin/website-home/WebsiteHomeHeroAdmin'
import WebsiteHomeResultsAdmin from '@/components/admin/website-home/WebsiteHomeResultsAdmin'
import { getWebsiteHomeResource } from '@/lib/website-home-resource-registry'

export default function SuperAdminWebsiteHomeResourcePage({
  params,
}: {
  params: { resource: string }
}) {
  if (params.resource === 'centers') {
    return <WebsiteHomeFeaturedCentersPage />
  }

  const def = getWebsiteHomeResource(params.resource)
  if (!def) notFound()

  if (params.resource === 'hero') {
    return <WebsiteHomeHeroAdmin resource={def} />
  }

  if (params.resource === 'about') {
    redirect('/super-admin/website-home/about-us')
  }

  if (params.resource === 'results') {
    return <WebsiteHomeResultsAdmin />
  }

  return <WebsiteHomeResourceManager resource={def} />
}
