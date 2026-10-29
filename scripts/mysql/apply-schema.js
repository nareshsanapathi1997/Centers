/**
 * Creates the MySQL database (if missing) and loads migrations/mysql/schema.sql.
 * DESTRUCTIVE: every table in the schema is dropped and recreated.
 *
 *   node scripts/mysql/apply-schema.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const db = process.env.DB_DATABASE;
  if (!db) throw new Error('DB_DATABASE is not set');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${db}\``);
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'migrations', 'mysql', 'schema.sql'), 'utf8');
  await conn.query(sql);
  const [[{ n }]] = await conn.query(
    'SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema = ?', [db]);
  console.log(`Schema applied to ${db}: ${n} tables`);
  await conn.end();
}

main().catch((e) => { console.error(e.sqlMessage || e.message); process.exit(1); });
