import { createCenterItemRoute } from '@/lib/center-resource-route'
import { alertsResource } from '@/lib/center-resources'

export const dynamic = 'force-dynamic'

export const { GET, PATCH, DELETE } = createCenterItemRoute(alertsResource)
