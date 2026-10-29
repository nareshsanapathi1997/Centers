import { createCenterItemRoute } from '@/lib/center-resource-route'
import { studentStoriesResource } from '@/lib/center-resources'

export const dynamic = 'force-dynamic'

export const { GET, PATCH, DELETE } = createCenterItemRoute(studentStoriesResource)
