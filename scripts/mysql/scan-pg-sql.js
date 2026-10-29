/**
 * Static check for SQL the MySQL adapter cannot translate.
 * Extracts SQL string/template literals from app/ and lib/, runs each through
 * lib/sql-translate.ts and flags PostgreSQL-only constructs.
 *
 *   node scripts/mysql/scan-pg-sql.js          # summary + findings
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..', '..');
const meta = require(path.join(ROOT, 'lib', 'mysql-schema-meta.json'));

function loadTranslate() {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'sql-translate.ts'), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
  return mod.exports.translate;
}
const translate = loadTranslate();

const MANUAL = [
  [/\bjson_agg\b|\bjsonb?_build_object\b|\bjsonb?_object_agg\b|\bjsonb_set\b|\bjsonb?_array_elements/i, 'JSON aggregate/function'],
  [/\bDISTINCT\s+ON\b/i, 'DISTINCT ON'],
  [/\bdate_trunc\b|\bto_char\s*\(|\bto_date\s*\(|\bage\s*\(/i, 'date formatting function'],
  [/::\s*interval|\bmake_interval\b/i, 'dynamic interval'],
  [/\b(CURRENT_DATE|NOW\(\)|CURRENT_TIMESTAMP)\s*[-+]\s*(\$\d+|\d+)\b(?!\s*\*)/i, 'date ± number arithmetic'],
  [/\bEXTRACT\s*\(\s*(EPOCH|DOW|ISODOW|DOY)\b/i, 'EXTRACT field'],
  [/->>|#>>|@>|<@|\?\|/, 'JSON operator'],
  [/\bunnest\s*\(|\bARRAY\s*\[|\barray_(agg|length|to_string|position|remove|append)\b|\bstring_agg\b/i, 'array function'],
  [/\bgenerate_series\b|\bLATERAL\b|\bSKIP\s+LOCKED\b/i, 'unsupported clause'],
  [/^\s*UPDATE\b[\s\S]*\bSET\b[\s\S]*\bFROM\b(?![\s\S]*\bWHERE\b[\s\S]*\(\s*SELECT)/i, 'UPDATE … FROM'],
  [/^\s*WITH\b[\s\S]*\)\s*(UPDATE|DELETE|INSERT)\b/i, 'data-modifying WITH'],
  [/(?<!["`\w.])rank\b(?!\s*\()(?=\s*(,|=|\bFROM\b|$))|\.rank\b/i, 'unquoted rank column (MySQL 8 reserved)'],
  [/^\s*DELETE\s+FROM\s+\w+[\s\S]*\bUSING\b/i, 'DELETE … USING'],
  [/table_schema\s*=\s*'public'|\bpg_\w+|to_regclass|current_schema\(\)/i, 'PostgreSQL catalog'],
  [/\bIS\s+(NOT\s+)?DISTINCT\s+FROM\b/i, 'IS DISTINCT FROM'],
  [/\bSPLIT_PART\b|\bINITCAP\b|\bREGEXP_REPLACE\b|\bSUBSTRING\s*\([^)]*\bFROM\b/i, 'string function'],
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/** String/template literals that look like SQL; `${…}` becomes `__X__`. */
function sqlLiterals(code) {
  const found = [];
  const re = /`((?:[^`\\]|\\.)*)`|'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
  let m;
  while ((m = re.exec(code))) {
    let body = m[1] ?? m[2] ?? m[3];
    if (m[1] !== undefined) body = replaceInterpolations(body);
    body = body.replace(/\\(['"`\\])/g, '$1');
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\s/i.test(body) && !/^\s*Select\s+(an?|the|one|some|all|your)\s/i.test(body) && /\b(FROM|INTO|SET|VALUES)\b/i.test(body) && !/\bINNER\s+JOIN\s+tree\s+t\b/i.test(body)) {
      found.push({ sql: body, line: code.slice(0, m.index).split('\n').length });
    }
  }
  return found;
}

function replaceInterpolations(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '$' && s[i + 1] === '{') {
      let depth = 0;
      for (; i < s.length; i++) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}' && --depth === 0) break;
      }
      out += '__X__';
    } else out += s[i];
  }
  return out;
}

const findings = [];
let total = 0;
for (const file of [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'lib'))]) {
  if (/sql-translate|mysql-schema-meta|[\\/]mssql|mssql-|teems/i.test(file)) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  for (const { sql, line } of sqlLiterals(fs.readFileSync(file, 'utf8'))) {
    total++;
    const issues = MANUAL.filter(([re]) => re.test(sql)).map(([, label]) => label);
    try {
      const params = Array.from({ length: 60 }, () => 1);
      const t = translate(sql, params);
      if (t.returning && t.table && !meta.autoIncrement[t.table] && t.table !== '__X__') {
        issues.push(`RETURNING on non-auto-increment table ${t.table}`);
      }
    } catch (e) {
      issues.push(`translator: ${e.message.split('\n')[0].slice(0, 120)}`);
    }
    if (issues.length) findings.push({ where: `${rel}:${line}`, issues, sql: sql.replace(/\s+/g, ' ').trim().slice(0, 140) });
  }
}

for (const f of findings) console.log(`${f.where}\n   [${f.issues.join('; ')}]\n   ${f.sql}`);
console.log(`\nScanned ${total} SQL literals; ${findings.length} need attention.`);
process.exitCode = findings.length ? 1 : 0;

/**
 * --explain: EXPLAIN every translated statement that has no `${…}` interpolation
 * against the configured database (params bound as NULL), catching syntax
 * errors and unknown tables/columns without executing anything.
 */
if (process.argv.includes('--explain')) {
  require('dotenv').config({ path: path.join(ROOT, '.env') });
  const mysql = require('mysql2/promise');
  (async () => {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
    });
    await conn.query("SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',PIPES_AS_CONCAT,ANSI_QUOTES')");
    let checked = 0, skipped = 0;
    const failures = [];
    for (const file of [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'lib'))]) {
      if (/sql-translate|[\\/]mssql|mssql-|teems/i.test(file)) continue;
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      for (const { sql, line } of sqlLiterals(fs.readFileSync(file, 'utf8'))) {
        if (sql.includes('__X__')) { skipped++; continue; }
        let t;
        try { t = translate(sql, Array.from({ length: 60 }, () => null)); } catch { continue; }
        checked++;
        try { await conn.query(`EXPLAIN ${t.sql}`, t.params); }
        catch (e) { failures.push(`${rel}:${line}\n   ${e.sqlMessage || e.message}\n   ${t.sql.replace(/\s+/g, ' ').slice(0, 160)}`); }
      }
    }
    await conn.end();
    console.log(failures.join('\n'));
    console.log(`\nEXPLAIN checked ${checked} statements (${skipped} with interpolation skipped); ${failures.length} failed.`);
    if (failures.length) process.exitCode = 1;
  })();
}
