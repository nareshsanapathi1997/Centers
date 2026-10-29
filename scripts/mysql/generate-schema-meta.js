/**
 * Regenerates lib/mysql-schema-meta.json from the live MySQL schema.
 * Run after any schema change:  npm run db:meta
 *
 *   jsonColumns:   { table: [col, …] }  JSON columns that lib/db.ts parses into objects
 *   autoIncrement: { table: pkColumn }  used to emulate INSERT/UPDATE/DELETE … RETURNING
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });
  const db = process.env.DB_DATABASE;
  // MariaDB stores JSON as LONGTEXT with a json_valid() CHECK; MySQL reports data_type 'json'.
  const [json] = await conn.query(
    `SELECT c.table_name AS t, c.column_name AS c FROM information_schema.columns c
     WHERE c.table_schema = ? AND (c.data_type = 'json' OR EXISTS (
       SELECT 1 FROM information_schema.check_constraints k
       WHERE k.constraint_schema = c.table_schema AND k.table_name = c.table_name
         AND k.check_clause LIKE CONCAT('%json_valid(\`', c.column_name, '\`)%')))
     ORDER BY c.table_name, c.ordinal_position`, [db]);
  const [auto] = await conn.query(
    `SELECT table_name AS t, column_name AS c FROM information_schema.columns
     WHERE table_schema = ? AND extra LIKE '%auto_increment%' ORDER BY table_name`, [db]);
  await conn.end();

  const jsonColumns = {};
  for (const r of json) (jsonColumns[r.t] ||= []).push(r.c);
  const autoIncrement = Object.fromEntries(auto.map((r) => [r.t, r.c]));
  const out = path.join(__dirname, '..', '..', 'lib', 'mysql-schema-meta.json');
  fs.writeFileSync(out, JSON.stringify({ jsonColumns, autoIncrement }, null, 2) + '\n');
  console.log(`lib/mysql-schema-meta.json: ${json.length} JSON columns, ${auto.length} auto-increment tables`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
