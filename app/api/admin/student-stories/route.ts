import { createCenterCollectionRoute } from '@/lib/center-resource-route'
import { studentStoriesResource } from '@/lib/center-resources'

export const dynamic = 'force-dynamic'

export const { GET, POST } = createCenterCollectionRoute(studentStoriesResource)
