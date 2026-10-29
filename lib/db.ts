import mysql from 'mysql2/promise';
import type { FieldPacket, Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import meta from './mysql-schema-meta.json';
import { translate } from './sql-translate';

/**
 * MySQL / MariaDB pool with a node-postgres compatible surface:
 * `pool.query(sql, params) → { rows, rowCount }` and `pool.connect()` for
 * transactions. Queries stay in PostgreSQL dialect and are rewritten by
 * lib/sql-translate.ts; RETURNING is emulated here.
 */

export type QueryResult<R = any> = { rows: R[]; rowCount: number };

export interface PoolClient {
  query<R = any>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
  release(): void;
}

for (const key of ['DB_DATABASE', 'DB_USERNAME'] as const) {
  if (!process.env[key]) throw new Error(`${key} environment variable is not set`);
}

const jsonColumns = meta.jsonColumns as Record<string, string[]>;
const autoIncrement = meta.autoIncrement as Record<string, string>;
const MYSQL_JSON_TYPE = 245;

/** MySQL errno → PostgreSQL SQLSTATE, so existing `err.code === '23505'` checks keep working. */
const PG_CODES: Record<number, string> = {
  1062: '23505', // duplicate key
  1586: '23505',
  1451: '23503', // foreign key (parent row)
  1452: '23503', // foreign key (child row)
  1048: '23502', // not null
  1364: '23502',
  3819: '23514', // check constraint (MySQL)
  4025: '23514', // check constraint (MariaDB)
  1146: '42P01', // unknown table
  1054: '42703', // unknown column
  1213: '40P01', // deadlock
  1205: '55P03', // lock wait timeout
};

/**
 * TLS config. `rejectUnauthorized: false` encrypts the connection but does not
 * authenticate the server, which leaves it open to a man-in-the-middle, so it
 * is only allowed outside production and when explicitly opted into.
 *
 * Supply DATABASE_CA_CERT (PEM) to verify the server certificate properly.
 */
function resolveSsl() {
  if (process.env.DATABASE_SSL !== 'true') return undefined;

  const ca = process.env.DATABASE_CA_CERT?.trim();
  if (ca) {
    return { ca, rejectUnauthorized: true };
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.DATABASE_SSL_ALLOW_UNVERIFIED === 'true') {
      console.warn(
        '[db] DATABASE_SSL_ALLOW_UNVERIFIED=true — database TLS is unauthenticated and vulnerable to MITM. Set DATABASE_CA_CERT instead.'
      );
      return { rejectUnauthorized: false };
    }
    throw new Error(
      'DATABASE_SSL=true in production requires DATABASE_CA_CERT (or DATABASE_SSL_ALLOW_UNVERIFIED=true to accept the risk).'
    );
  }

  return { rejectUnauthorized: false };
}

function createPool(): Pool {
  const p = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: resolveSsl(),
    charset: 'utf8mb4',
    connectionLimit: Number(process.env.DB_POOL_MAX || 10),
    connectTimeout: 10_000,
    idleTimeout: 30_000,
    decimalNumbers: true,
    supportBigNumbers: true,
    typeCast(field, next) {
      if (field.type === 'TINY' && field.length === 1) {
        const v = field.string();
        return v === null ? null : v === '1';
      }
      return next();
    },
  });
  // `||` concatenates and "x" quotes identifiers, as in PostgreSQL.
  p.pool.on('connection', (conn) => {
    conn.query("SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',PIPES_AS_CONCAT,ANSI_QUOTES')");
    conn.query("SET SESSION time_zone = 'SYSTEM'");
  });
  return p;
}

const globalForDb = globalThis as typeof globalThis & { __centerManagerMysqlPool?: Pool };
const mysqlPool = globalForDb.__centerManagerMysqlPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  globalForDb.__centerManagerMysqlPool = mysqlPool;
}

function toPgError(err: any, sql: string): Error {
  if (err && typeof err.errno === 'number') {
    err.mysqlCode = err.code;
    err.code = PG_CODES[err.errno] ?? err.code;
    err.detail = err.sqlMessage;
    const key = /for key '(?:[^.']+\.)?([^']+)'/.exec(err.sqlMessage || '');
    if (key) err.constraint = key[1];
    err.query = sql;
  }
  return err;
}

/** JSON columns come back from MariaDB as text; parse them like node-postgres does. */
function parseJsonColumns(rows: any[], fields: FieldPacket[]) {
  const targets = fields.filter(
    (f) => f.columnType !== MYSQL_JSON_TYPE && f.orgTable && jsonColumns[f.orgTable]?.includes(f.orgName)
  );
  if (!targets.length) return rows;
  for (const row of rows) {
    for (const f of targets) {
      const v = row[f.name];
      if (typeof v === 'string') {
        try {
          row[f.name] = JSON.parse(v);
        } catch {
          /* leave non-JSON text as-is */
        }
      }
    }
  }
  return rows;
}

async function exec(conn: PoolConnection, sql: string, values: unknown[]) {
  try {
    const [res, fields] = await conn.query({ sql, values });
    if (Array.isArray(res)) {
      const rows = parseJsonColumns(res as any[], fields);
      return { rows, rowCount: rows.length, header: null };
    }
    const header = res as ResultSetHeader;
    return { rows: [] as any[], rowCount: header.affectedRows, header };
  } catch (err) {
    throw toPgError(err, sql);
  }
}

const q = (id: string) => '`' + id + '`';

async function run(conn: PoolConnection, text: string, values: unknown[] = [], inTransaction = false): Promise<QueryResult> {
  const t = translate(text, values);
  if (!t.returning) {
    const { rows, rowCount } = await exec(conn, t.sql, t.params);
    return { rows, rowCount };
  }

  const pk = t.table ? autoIncrement[t.table] : undefined;
  if (!t.table || !pk) {
    throw new Error(`[db] RETURNING is only emulated for tables with an auto-increment key (got: ${t.table}). Rewrite: ${text}`);
  }
  const target = t.alias ? `${q(t.table)} ${t.alias}` : q(t.table);
  const ref = t.alias || q(t.table);
  const selectByIds = (ids: unknown[]) =>
    exec(conn, `SELECT ${t.returning} FROM ${target} WHERE ${ref}.${q(pk)} IN (?) ORDER BY ${ref}.${q(pk)}`, [ids]);

  if (t.kind === 'insert') {
    const sql = t.isUpsert ? `${t.sql}, ${q(pk)} = LAST_INSERT_ID(${q(pk)})` : t.sql;
    const { header } = await exec(conn, sql, t.params);
    if (!header || header.affectedRows === 0) return { rows: [], rowCount: 0 };
    const count = t.isUpsert ? 1 : header.affectedRows;
    const ids = Array.from({ length: count }, (_, i) => header.insertId + i);
    const { rows } = await selectByIds(ids);
    return { rows, rowCount: rows.length };
  }

  if (t.kind !== 'update' && t.kind !== 'delete') {
    throw new Error(`[db] RETURNING not supported for: ${text}`);
  }

  // Lock the affected rows, mutate, then read back by primary key.
  const ownTx = !inTransaction;
  if (ownTx) await conn.query('START TRANSACTION');
  try {
    const where = t.where!;
    const { rows: hit } = await exec(conn, `SELECT ${ref}.${q(pk)} AS id FROM ${target} WHERE ${where.sql} FOR UPDATE`, where.params);
    const ids = hit.map((r) => r.id);
    let rows: any[] = [];
    if (t.kind === 'delete' && ids.length) rows = (await selectByIds(ids)).rows;
    if (ids.length) await exec(conn, t.sql, t.params);
    if (t.kind === 'update' && ids.length) rows = (await selectByIds(ids)).rows;
    if (ownTx) await conn.query('COMMIT');
    return { rows, rowCount: ids.length };
  } catch (err) {
    if (ownTx) await conn.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

async function query<R = any>(text: string, values?: unknown[]): Promise<QueryResult<R>> {
  const conn = await mysqlPool.getConnection();
  try {
    return await run(conn, text, values);
  } finally {
    conn.release();
  }
}

async function connect(): Promise<PoolClient> {
  const conn = await mysqlPool.getConnection();
  let inTransaction = false;
  return {
    async query<R = any>(text: string, values?: unknown[]): Promise<QueryResult<R>> {
      const verb = text.trim().toUpperCase();
      if (/^(BEGIN|START TRANSACTION)\b/.test(verb)) inTransaction = true;
      const result = await run(conn, text, values, inTransaction);
      if (/^(COMMIT|ROLLBACK)\b/.test(verb)) inTransaction = false;
      return result as QueryResult<R>;
    },
    release() {
      conn.release();
    },
  };
}

const pool = {
  query,
  connect,
  end: () => mysqlPool.end(),
};

export default pool;
