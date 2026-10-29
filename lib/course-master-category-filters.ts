export type CourseMasterTreeNode = {
  id: number
  parent_id: number | null
  level_type: string
  title: string
  display_order: number
}

export type CourseMasterCategoryFilters = {
  typeRows: { id: number; name: string }[]
  subTypesByTypeId: Record<string, { id: number; name: string }[]>
  typeNameByIdEntries: [number, string][]
}

function findAncestorId(
  startId: number,
  nodeById: Map<number, CourseMasterTreeNode>,
  levelType: string
): number | null {
  let current = nodeById.get(startId)
  const visited = new Set<number>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    if (current.level_type === levelType) return current.id
    if (current.parent_id == null) break
    current = nodeById.get(current.parent_id)
  }
  return null
}

export function attachCourseMasterFilterIds(
  leafId: number,
  nodeById: Map<number, CourseMasterTreeNode>
): { mapped_type_id: number | null; mapped_sub_type_id: number | null } {
  return {
    mapped_type_id: findAncestorId(leafId, nodeById, 'sub_variant'),
    mapped_sub_type_id: findAncestorId(leafId, nodeById, 'sub_sub_variant'),
  }
}

export function buildCourseMasterCategoryFilters(
  nodeById: Map<number, CourseMasterTreeNode>,
  courses: Record<string, unknown>[]
): CourseMasterCategoryFilters {
  const typeMeta = new Map<number, { name: string; display_order: number }>()
  const subTypesByTypeId = new Map<number, Map<number, string>>()

  for (const course of courses) {
    const typeId =
      typeof course.mapped_type_id === 'number' && Number.isFinite(course.mapped_type_id)
        ? course.mapped_type_id
        : null
    const subTypeId =
      typeof course.mapped_sub_type_id === 'number' && Number.isFinite(course.mapped_sub_type_id)
        ? course.mapped_sub_type_id
        : null

    if (typeId == null) continue

    const typeNode = nodeById.get(typeId)
    if (typeNode) {
      typeMeta.set(typeId, {
        name: typeNode.title,
        display_order: typeNode.display_order,
      })
    }

    if (subTypeId == null) continue

    const subNode = nodeById.get(subTypeId)
    if (!subNode) continue

    if (!subTypesByTypeId.has(typeId)) {
      subTypesByTypeId.set(typeId, new Map())
    }
    subTypesByTypeId.get(typeId)!.set(subTypeId, subNode.title)
  }

  const typeRows = Array.from(typeMeta.entries())
    .map(([id, meta]) => ({ id, name: meta.name, display_order: meta.display_order }))
    .sort(
      (a, b) =>
        a.display_order - b.display_order ||
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
    .map(({ id, name }) => ({ id, name }))

  const subTypesByTypeIdRecord: Record<string, { id: number; name: string }[]> = {}
  for (const [typeId, subMap] of Array.from(subTypesByTypeId.entries())) {
    const rows = Array.from(subMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    if (rows.length > 0) {
      subTypesByTypeIdRecord[String(typeId)] = rows
    }
  }

  const typeNameByIdEntries: [number, string][] = []
  for (const row of typeRows) {
    typeNameByIdEntries.push([row.id, row.name])
  }
  for (const subs of Object.values(subTypesByTypeIdRecord)) {
    for (const sub of subs) {
      typeNameByIdEntries.push([sub.id, sub.name])
    }
  }

  return {
    typeRows,
    subTypesByTypeId: subTypesByTypeIdRecord,
    typeNameByIdEntries,
  }
}
