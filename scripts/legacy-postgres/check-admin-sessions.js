require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const t = await pool.query(`SELECT to_regclass('public.admin_sessions') AS t`)
  console.log('admin_sessions:', t.rows[0])
  if (!t.rows[0].t) return
  const c = await pool.query('SELECT COUNT(*)::int AS n FROM admin_sessions')
  console.log('session count', c.rows[0])
  const recent = await pool.query(
    `SELECT id, user_type, user_id, left(token_jti, 8) AS jti, revoked_at, expires_at, created_at
     FROM admin_sessions ORDER BY id DESC LIMIT 5`
  )
  console.log(recent.rows)
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end())
