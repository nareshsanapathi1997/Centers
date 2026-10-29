/**
 * One-off converter: reads the live PostgreSQL catalog and writes an equivalent
 * MySQL / MariaDB schema.
 *
 *   PG_URL=postgresql://postgres:pw@localhost:5432/centres node scripts/mysql/generate-schema-from-pg.js
 *
 * Outputs:
 *   migrations/mysql/schema.sql      – CREATE TABLE … for every public table, FKs last
 *   lib/mysql-schema-meta.json       – jsonColumns: { table: [col, …] } of jsonb / array columns
 *                                      (lib/db.ts parses them back into objects);
 *                                      autoIncrement: { table: pkColumn } (RETURNING emulation)
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const PG_URL = process.env.PG_URL || 'postgresql://postgres:123456@localhost:5432/centres';
const ROOT = path.join(__dirname, '..', '..');  // run from scripts/legacy-postgres
const OUT_SQL = path.join(ROOT, 'migrations', 'mysql', 'schema.sql');
const OUT_JSON = path.join(ROOT, 'lib', 'mysql-schema-meta.json');

const q = (id) => '`' + id + '`';

function mapType(col, indexedCols) {
  const key = `${col.table_name}.${col.column_name}`;
  const isSerial = /^nextval\(/.test(col.column_default || '');
  switch (col.data_type) {
    case 'integer':
      return isSerial ? 'INT NOT NULL AUTO_INCREMENT' : 'INT';
    case 'bigint':
      return isSerial ? 'BIGINT NOT NULL AUTO_INCREMENT' : 'BIGINT';
    case 'smallint':
      return 'SMALLINT';
    case 'character varying': {
      const n = col.character_maximum_length || 255;
      return `VARCHAR(${n})`;
    }
    case 'character':
      return `CHAR(${col.character_maximum_length || 1})`;
    case 'text':
      // TEXT cannot be indexed without a prefix; indexed text becomes VARCHAR.
      return indexedCols.has(key) ? 'VARCHAR(255)' : 'TEXT';
    case 'boolean':
      return 'TINYINT(1)';
    case 'numeric':
      return col.numeric_precision
        ? `DECIMAL(${col.numeric_precision},${col.numeric_scale || 0})`
        : 'DECIMAL(18,4)';
    case 'real':
      return 'FLOAT';
    case 'double precision':
      return 'DOUBLE';
    case 'date':
      return 'DATE';
    case 'timestamp without time zone':
    case 'timestamp with time zone':
      return 'DATETIME';
    case 'time without time zone':
      return 'TIME';
    case 'jsonb':
    case 'json':
    case 'ARRAY':
      return 'JSON';
    case 'uuid':
      return 'CHAR(36)';
    default:
      throw new Error(`Unmapped type ${col.data_type} on ${key}`);
  }
}

function mapDefault(col, mysqlType) {
  const d = col.column_default;
  if (d == null || /^nextval\(/.test(d)) return '';
  if (/^(CURRENT_TIMESTAMP|now\(\))$/i.test(d)) {
    return mysqlType === 'DATE' ? ' DEFAULT (CURRENT_DATE)' : ' DEFAULT CURRENT_TIMESTAMP';
  }
  if (d === 'true') return ' DEFAULT 1';
  if (d === 'false') return ' DEFAULT 0';
  if (/^-?\d+(\.\d+)?$/.test(d)) return ` DEFAULT ${d}`;
  const lit = d.match(/^'((?:[^']|'')*)'::/);
  if (lit) {
    const v = lit[1];
    // TEXT/JSON literal defaults must be parenthesised expressions in MySQL 8.
    if (mysqlType === 'JSON' || mysqlType === 'TEXT') return ` DEFAULT ('${v}')`;
    return ` DEFAULT '${v}'`;
  }
  console.warn(`  ! dropped default ${d} on ${col.table_name}.${col.column_name}`);
  return '';
}

/** `(x)::text = ANY (ARRAY['a'::varchar, 'b'::varchar])` → `x IN ('a','b')` */
function mapCheck(def) {
  let s = def.replace(/^CHECK\s*/, '');
  s = s.replace(/::[a-z ]+(\[\])?/gi, '');
  // Both `= ANY ((ARRAY[...])::text[])` and `= ANY (ARRAY[...])` (casts already stripped).
  s = s.replace(/=\s*ANY\s*\(\(ARRAY\[([^\]]*)\]\)\)/gi, (_, list) => `IN (${list.replace(/[()]/g, '')})`);
  s = s.replace(/=\s*ANY\s*\(ARRAY\[([^\]]*)\]\)/gi, (_, list) => `IN (${list.replace(/[()]/g, '')})`);
  const balanced = (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length;
  if (!balanced || /ANY|ARRAY|~|\|\|/i.test(s)) return null;
  return `CHECK ${s.startsWith('(') ? s : `(${s})`}`;
}

/**
 * Partial unique indexes have no MySQL equivalent. `col IS NOT NULL` / `<> ''`
 * predicates are dropped (MySQL unique indexes already ignore NULLs). Value
 * predicates become a generated column holding the key only when it applies.
 */
function mapIndex(idx, colTypes) {
  const m = idx.indexdef.match(/^CREATE (UNIQUE )?INDEX (\S+) ON public\.(\S+) USING (\w+) \((.*?)\)(?: WHERE \((.*)\))?$/);
  if (!m) return { skip: `unparsed: ${idx.indexdef}` };
  const [, unique, name, table, method, colsRaw, where] = m;
  if (method === 'gin') return { skip: `GIN index ${name} (JSON column, no btree equivalent)` };

  const cols = colsRaw.split(',').map((c) => {
    const lower = c.trim().match(/^lower\(\((\w+)\)::text\)$/);
    return (lower ? lower[1] : c.trim()).replace(/"/g, '');
  });

  const extra = [];
  if (unique && where) {
    const nullOnly = /^(\(?\w+ IS NOT NULL\)?( AND )?|\(\(\w+\)::text <> ''::text\)( AND )?|\(|\))+$/.test(where.trim());
    const valueMatch = where.match(/\(?\(?(\w+)\)?(?:::text)? = '([^']+)'(?:::text)?\)?/);
    const nullMatch = where.match(/^\(?(\w+) IS NULL\)?$/);
    if (!nullOnly && valueMatch) {
      const gen = `${valueMatch[1]}_${valueMatch[2]}_key`;
      extra.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q(gen)} TINYINT AS (IF(${q(valueMatch[1])} = '${valueMatch[2]}', 1, NULL)) VIRTUAL INVISIBLE;`);
      cols.push(gen);
    } else if (!nullOnly && nullMatch) {
      const gen = `${nullMatch[1]}_is_null_key`;
      extra.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q(gen)} TINYINT AS (IF(${q(nullMatch[1])} IS NULL, 1, NULL)) VIRTUAL INVISIBLE;`);
      cols.push(gen);
    }
  }

  // InnoDB key limit is 3072 bytes (utf8mb4 = 4 bytes/char): prefix long varchars.
  const parts = cols.map((raw) => {
    const [c, dir] = raw.split(/\s+/);
    const len = colTypes.get(`${table}.${c}`);
    const col = len && len > 191 && cols.length > 1 ? `${q(c)}(191)` : len > 768 ? `${q(c)}(768)` : q(c);
    return dir ? `${col} ${dir}` : col;
  });
  return {
    table,
    extra,
    sql: `CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${q(name)} ON ${q(table)} (${parts.join(', ')});`,
  };
}

async function main() {
  const c = new Client({ connectionString: PG_URL });
  await c.connect();
  const rows = async (sql) => (await c.query(sql)).rows;

  const tables = (await rows(`SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`)).map((r) => r.table_name);
  const columns = await rows(`SELECT * FROM information_schema.columns WHERE table_schema='public'
    ORDER BY table_name, ordinal_position`);
  const indexes = await rows(`SELECT i.indexname, i.indexdef FROM pg_indexes i
    WHERE i.schemaname='public' AND i.indexname NOT IN (
      SELECT conname FROM pg_constraint WHERE contype IN ('p','u') AND connamespace='public'::regnamespace)`);
  const cons = await rows(`SELECT con.conname, con.contype, rel.relname tbl, pg_get_constraintdef(con.oid) def
    FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid
    WHERE con.connamespace='public'::regnamespace ORDER BY rel.relname, con.conname`);

  const indexedCols = new Set();
  for (const k of cons.filter((k) => 'puf'.includes(k.contype))) {
    const m = k.def.match(/(?:KEY|UNIQUE) \(([^)]*)\)/);
    m && m[1].split(',').forEach((col) => indexedCols.add(`${k.tbl}.${col.trim().replace(/"/g, '')}`));
  }
  for (const i of indexes) {
    const m = i.indexdef.match(/ON public\.(\S+) USING btree \((.*?)\)/);
    m && m[2].split(',').forEach((col) => {
      const lower = col.trim().match(/lower\(\((\w+)\)/);
      indexedCols.add(`${m[1]}.${(lower ? lower[1] : col.trim()).replace(/"/g, '')}`);
    });
  }

  const colTypes = new Map();
  const jsonColumns = {};
  const autoIncrement = {};
  const out = [
    '-- Generated by scripts/mysql/generate-schema-from-pg.js from the PostgreSQL schema.',
    '-- Target: MySQL 8.0+ / MariaDB 10.4+, utf8mb4.',
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ];
  const fks = [];
  const tail = [];

  for (const t of tables) {
    const lines = [];
    for (const col of columns.filter((x) => x.table_name === t)) {
      const type = mapType(col, indexedCols);
      if (/^VARCHAR\((\d+)\)$/.test(type)) colTypes.set(`${t}.${col.column_name}`, Number(RegExp.$1));
      if (type === 'JSON') (jsonColumns[t] ||= []).push(col.column_name);
      if (type.includes('AUTO_INCREMENT')) autoIncrement[t] = col.column_name;
      const notNull = col.is_nullable === 'NO' && !type.includes('NOT NULL') ? ' NOT NULL' : '';
      lines.push(`  ${q(col.column_name)} ${type}${notNull}${mapDefault(col, type)}`);
    }
    for (const k of cons.filter((k) => k.tbl === t)) {
      if (k.contype === 'p') lines.push(`  PRIMARY KEY ${k.def.replace(/^PRIMARY KEY /, '').replace(/"/g, '`')}`);
      else if (k.contype === 'u') {
        const cols = k.def.match(/UNIQUE \((.*)\)/)[1].split(',').map((x) => x.trim().replace(/"/g, ''));
        const parts = cols.map((cn) => {
          const len = colTypes.get(`${t}.${cn}`);
          return len && len > 191 && cols.length > 1 ? `${q(cn)}(191)` : q(cn);
        });
        lines.push(`  UNIQUE KEY ${q(k.conname.slice(0, 64))} (${parts.join(', ')})`);
      } else if (k.contype === 'c') {
        const chk = mapCheck(k.def);
        chk ? lines.push(`  CONSTRAINT ${q(k.conname.slice(0, 64))} ${chk}`) : console.warn(`  ! dropped check ${k.conname}: ${k.def}`);
      } else if (k.contype === 'f') {
        const def = k.def.replace(/"/g, '').replace(/REFERENCES (\w+)\(/, (_, r) => `REFERENCES ${q(r)}(`);
        fks.push(`ALTER TABLE ${q(t)} ADD CONSTRAINT ${q(k.conname.slice(0, 64))} ${def};`);
      }
    }
    out.push(`DROP TABLE IF EXISTS ${q(t)};`);
    out.push(`CREATE TABLE ${q(t)} (\n${lines.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n`);
  }

  for (const i of indexes) {
    const r = mapIndex(i, colTypes);
    if (r.skip) { console.warn(`  ! skipped ${r.skip}`); continue; }
    tail.push(...r.extra, r.sql);
  }

  out.push('-- Indexes', ...tail, '', '-- Foreign keys', ...fks, '', 'SET FOREIGN_KEY_CHECKS = 1;', '');
  fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true });
  fs.writeFileSync(OUT_SQL, out.join('\n'));
  fs.writeFileSync(OUT_JSON, JSON.stringify({ jsonColumns, autoIncrement }, null, 2) + '\n');
  console.log(`Wrote ${tables.length} tables, ${tail.length} index statements, ${fks.length} FKs -> ${path.relative(ROOT, OUT_SQL)}`);
  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
