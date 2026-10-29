import { createCenterItemRoute } from '@/lib/center-resource-route'
import { ctaSlidersResource } from '@/lib/center-resources'

export const dynamic = 'force-dynamic'

export const { GET, PATCH, DELETE } = createCenterItemRoute(ctaSlidersResource)
