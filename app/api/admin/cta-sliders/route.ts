import { createCenterCollectionRoute } from '@/lib/center-resource-route'
import { ctaSlidersResource } from '@/lib/center-resources'

export const dynamic = 'force-dynamic'

export const { GET, POST } = createCenterCollectionRoute(ctaSlidersResource)
