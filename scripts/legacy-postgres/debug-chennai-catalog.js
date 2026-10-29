require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function norm(s) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function tokenize(name) {
  return norm(name)
    .split(/[\s&/+\-,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function score(assignedName, courseName) {
  const want = norm(assignedName)
  const cat = norm(courseName)
  if (!want || !cat) return 0
  if (want === cat) return 100
  if (cat.includes(want) || want.includes(cat)) return 85
  const wantTokens = tokenize(assignedName)
  const catTokens = new Set(tokenize(courseName))
  let overlap = 0
  for (const token of wantTokens) if (catTokens.has(token)) overlap++
  if (!overlap) return 0
  return 40 + Math.round((overlap / wantTokens.length) * 40)
}

function resolveBest(assignedName, refs, leafCounts) {
  let best = null
  for (const cat of refs) {
    const s = score(assignedName, cat.course_name)
    if (!s) continue
    const candidate = { id: cat.id, score: s, count: leafCounts.get(cat.id) || 0 }
    if (!best) {
      best = candidate
      continue
    }
    if (candidate.count > 0 && best.count === 0 && candidate.score >= 70) best = candidate
    else if (candidate.score > best.score) best = candidate
    else if (candidate.score === best.score && candidate.count > best.count) best = candidate
  }
  return best?.id
}

async function main() {
  const centerId = 1
  const assigned = await pool.query(
    'SELECT name FROM courses WHERE center_id = $1 AND is_active = true ORDER BY display_order',
    [centerId]
  )
  const mains = await pool.query(
    "SELECT id, title AS course_name FROM course_masters WHERE level_type = 'main_course' AND is_active = true"
  )
  const leaf = await pool.query(`
    WITH RECURSIVE tree AS (
      SELECT id AS root_id, id, parent_id, level_type, is_active FROM course_masters WHERE level_type = 'main_course'
      UNION ALL
      SELECT t.root_id, cm.id, cm.parent_id, cm.level_type, cm.is_active FROM course_masters cm INNER JOIN tree t ON cm.parent_id = t.id
    )
    SELECT root_id, COUNT(*)::int AS leaf_count FROM tree
    WHERE level_type IN ('course','leaf_course') AND is_active = true GROUP BY root_id`)
  const leafCounts = new Map(leaf.rows.map((r) => [r.root_id, r.leaf_count]))

  console.log('=== Improved mapping for Chennai ===')
  for (const row of assigned.rows) {
    const id = resolveBest(row.name, mains.rows, leafCounts)
    console.log(`"${row.name}" → id ${id ?? 'UNMAPPED'} (${leafCounts.get(id) || 0} programs)`)
  }
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
