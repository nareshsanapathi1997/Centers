/**
 * PostgreSQL → MySQL/MariaDB statement translator used by lib/db.ts.
 *
 * Application SQL is still written in the PostgreSQL dialect ($1 placeholders,
 * ::casts, ILIKE, ON CONFLICT, RETURNING …). Each statement is rewritten here
 * just before it is sent to MySQL. The connection runs with
 * sql_mode PIPES_AS_CONCAT,ANSI_QUOTES so `||` and "identifiers" keep their
 * PostgreSQL meaning and need no rewriting.
 *
 * Not handled (rewrite the query by hand): json_agg/json_build_object,
 * DISTINCT ON, date_trunc/to_char, date/timestamp arithmetic, ON CONFLICT …
 * DO UPDATE … WHERE.
 */

export type Translated = {
  sql: string;
  params: unknown[];
  /** Column list after a top-level RETURNING, already stripped from `sql`. */
  returning: string | null;
  kind: 'insert' | 'update' | 'delete' | 'other';
  /** Target table for insert/update/delete (unquoted). */
  table: string | null;
  /** Alias of the target table in UPDATE/DELETE, if any. */
  alias: string | null;
  /** Top-level WHERE clause of UPDATE/DELETE (translated) and its params. */
  where: { sql: string; params: unknown[] } | null;
  isUpsert: boolean;
};

const LIT = '\u0001';

/** Replace string literals with `\u0001n\u0001` tokens and drop comments. */
function mask(sql: string): { masked: string; literals: string[] } {
  const literals: string[] = [];
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") break;
        else j++;
      }
      literals.push(sql.slice(i, j + 1));
      out += `${LIT}${literals.length - 1}${LIT}`;
      i = j + 1;
    } else if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
    } else if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else {
      out += ch;
      i++;
    }
  }
  return { masked: out, literals };
}

function unmask(s: string, literals: string[]): string {
  return s.replace(new RegExp(`${LIT}(\\d+)${LIT}`, 'g'), (_, n) => literals[Number(n)]);
}

/** Index where the operand ending just before `end` starts. */
function operandStart(s: string, end: number): number {
  let i = end - 1;
  while (i >= 0 && /\s/.test(s[i])) i--;
  const closeFor: Record<string, string> = { ')': '(', ']': '[' };
  if (s[i] in closeFor) {
    const open = closeFor[s[i]];
    const close = s[i];
    let depth = 0;
    for (; i >= 0; i--) {
      if (s[i] === close) depth++;
      else if (s[i] === open && --depth === 0) break;
    }
    i--;
  } else if (s[i] === LIT) {
    i = s.lastIndexOf(LIT, i - 1) - 1;
    return i + 1;
  }
  while (i >= 0 && /[\w.$`"?]/.test(s[i])) i--;
  return i + 1;
}

/** Index of the `)` that closes the `(` at `open`. */
function matchParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')' && --depth === 0) return i;
  }
  throw new Error(`sql-translate: unbalanced parentheses in: ${s}`);
}

/** Positions of `keyword` at paren depth 0 (masked SQL only). */
function topLevelIndexes(s: string, keyword: RegExp): number[] {
  const hits: number[] = [];
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (depth === 0 && (i === 0 || /\W/.test(s[i - 1]))) {
      const m = s.slice(i).match(keyword);
      if (m && m.index === 0) hits.push(i);
    }
  }
  return hits;
}

const STRIP_CAST = /^(text|varchar|character varying|char|character|jsonb?|bool(ean)?|timestamp(tz)?( with(out)? time zone)?|interval|uuid|regclass|name)$/i;
const CAST_TARGET: Array<[RegExp, (args: string) => string]> = [
  [/^(int|integer|int2|int4|int8|bigint|smallint)$/i, () => 'SIGNED'],
  [/^(numeric|decimal)$/i, (a) => (a ? `DECIMAL${a}` : 'DECIMAL(30,6)')],
  [/^(float|float4|float8|real|double precision)$/i, () => 'DECIMAL(30,10)'],
  [/^date$/i, () => 'DATE'],
  [/^time( without time zone)?$/i, () => 'TIME'],
];

function rewriteCasts(s: string): string {
  const re = /::\s*([a-z]\w*(?:\s+(?:varying|precision|with(?:out)?\s+time\s+zone))?)(\s*\(\s*\d+\s*(?:,\s*\d+\s*)?\))?(\[\])?/i;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const [whole, type, args = '', arr] = m;
    const at = m.index;
    const tail = s.slice(at + whole.length);
    if (arr || STRIP_CAST.test(type)) {
      s = s.slice(0, at) + tail;
      continue;
    }
    const target = CAST_TARGET.find(([r]) => r.test(type));
    if (!target) throw new Error(`sql-translate: unsupported cast ::${type}`);
    const start = operandStart(s, at);
    s = `${s.slice(0, start)}CAST(${s.slice(start, at)} AS ${target[1](args.replace(/\s/g, ''))})${tail}`;
  }
  return s;
}

/** `AGG(x) FILTER (WHERE c)` → `AGG(CASE WHEN c THEN x END)` */
function rewriteFilter(s: string): string {
  const re = /\)\s*FILTER\s*\(\s*WHERE\b/i;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const aggClose = m.index;
    const fnStart = operandStart(s, aggClose + 1);
    const aggOpen = s.indexOf('(', fnStart);
    const fn = s.slice(fnStart, aggOpen);
    let args = s.slice(aggOpen + 1, aggClose).trim();
    const filterOpen = s.indexOf('(', aggClose + 1);
    const filterClose = matchParen(s, filterOpen);
    const cond = s.slice(filterOpen + 1, filterClose).replace(/^\s*WHERE\b/i, '').trim();
    let distinct = '';
    if (/^DISTINCT\s/i.test(args)) {
      distinct = 'DISTINCT ';
      args = args.replace(/^DISTINCT\s+/i, '');
    }
    const value = args === '*' ? '1' : args;
    s = `${s.slice(0, fnStart)}${fn}(${distinct}CASE WHEN ${cond} THEN ${value} END)${s.slice(filterClose + 1)}`;
  }
  return s;
}

/** MySQL sorts NULL lowest: only ASC NULLS LAST / DESC NULLS FIRST need work. */
function rewriteNullsOrder(s: string): string {
  const re = /(\s+(ASC|DESC))?\s+NULLS\s+(FIRST|LAST)\b/i;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const dir = (m[2] || 'ASC').toUpperCase();
    const nulls = m[3].toUpperCase();
    const start = operandStart(s, m.index);
    const expr = s.slice(start, m.index);
    const rest = s.slice(m.index + m[0].length);
    let replacement = `${expr} ${dir}`;
    if (dir === 'ASC' && nulls === 'LAST') replacement = `${expr} IS NULL, ${expr} ASC`;
    if (dir === 'DESC' && nulls === 'FIRST') replacement = `${expr} IS NULL DESC, ${expr} DESC`;
    s = s.slice(0, start) + replacement + rest;
  }
  return s;
}

function rewriteOnConflict(s: string): { sql: string; isUpsert: boolean } {
  const at = s.search(/\bON\s+CONFLICT\b/i);
  if (at === -1) return { sql: s, isUpsert: false };
  const after = s.slice(at);
  const nothing = after.match(/^ON\s+CONFLICT\b[\s\S]*?\bDO\s+NOTHING\b/i);
  if (nothing) {
    const body = s.slice(0, at).replace(/^\s*INSERT\s+INTO\b/i, 'INSERT IGNORE INTO');
    return { sql: body + after.slice(nothing[0].length), isUpsert: false };
  }
  const update = after.match(/^ON\s+CONFLICT\b[\s\S]*?\bDO\s+UPDATE\s+SET\b/i);
  if (!update) throw new Error(`sql-translate: unsupported ON CONFLICT clause: ${after}`);
  let set = after.slice(update[0].length);
  const returningAt = topLevelIndexes(set, /^RETURNING\b/i)[0];
  const setBody = returningAt === undefined ? set : set.slice(0, returningAt);
  if (topLevelIndexes(setBody, /^WHERE\b/i).length) {
    throw new Error('sql-translate: ON CONFLICT … DO UPDATE … WHERE is not supported; rewrite by hand');
  }
  set = set.replace(/\bEXCLUDED\.("?)(\w+)\1/gi, 'VALUES($2)');
  return { sql: `${s.slice(0, at)}ON DUPLICATE KEY UPDATE${set}`, isUpsert: true };
}

/** ISO-8601 instant with an explicit zone, e.g. `Date#toISOString()` output. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

function toMysqlParam(v: unknown): unknown {
  if (v === undefined) return null;
  if (v === null || v instanceof Date || Buffer.isBuffer(v)) return v;
  // DATETIME has no zone: store instants in the session's local time, the same
  // way they are read back, instead of letting MySQL drop the "Z".
  if (typeof v === 'string' && ISO_INSTANT.test(v)) return new Date(v);
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'bigint') return v.toString();
  return v;
}

/**
 * `$n` → `?`, expanding `= ANY($n)` into `IN (?)` with an array value.
 * Returns new params in placeholder order.
 */
function rewritePlaceholders(s: string, params: unknown[]): { sql: string; params: unknown[] } {
  s = s.replace(/=\s*ANY\s*\(\s*\$(\d+)\s*\)/gi, 'IN ($$$1@ARR)');
  s = s.replace(/(<>|!=)\s*ALL\s*\(\s*\$(\d+)\s*\)/gi, 'NOT IN ($$$2@ARR)');
  const out: unknown[] = [];
  const sql = s.replace(/\$(\d+)(@ARR)?/g, (_, n: string, arr: string | undefined, offset: number) => {
    const idx = Number(n) - 1;
    if (idx >= params.length) throw new Error(`sql-translate: missing value for $${n}`);
    const v = params[idx];
    if (arr) {
      const list = Array.isArray(v) ? v : [v];
      if (!list.length) return 'SELECT NULL FROM DUAL WHERE 1=0';
      out.push(list.map((x) => toMysqlParam(x)));
      return '?';
    }
    if (/\b(LIMIT|OFFSET)\s*$/i.test(s.slice(0, offset))) {
      out.push(Number(v));
      return '?';
    }
    out.push(toMysqlParam(v));
    return '?';
  });
  return { sql, params: out };
}

function rewriteIntervals(s: string, literals: string[]): string {
  return s.replace(new RegExp(`\\bINTERVAL\\s*${LIT}(\\d+)${LIT}`, 'gi'), (whole, n) => {
    const m = literals[Number(n)].match(/^'\s*(-?\d+)\s+([a-z]+?)s?\s*'$/i);
    if (!m) throw new Error(`sql-translate: unsupported interval ${literals[Number(n)]}`);
    return `INTERVAL ${m[1]} ${m[2].toUpperCase()}`;
  });
}

export function translate(sql: string, params: unknown[] = []): Translated {
  const { masked, literals } = mask(sql);
  let s = masked;
  s = rewriteIntervals(s, literals);
  // FILTER first so `COUNT(*) FILTER (…)::int` casts the whole aggregate.
  s = rewriteFilter(s);
  s = rewriteCasts(s);
  s = rewriteNullsOrder(s);
  s = s.replace(/\bNOT\s+ILIKE\b/gi, 'NOT LIKE').replace(/\bILIKE\b/gi, 'LIKE');
  s = s.replace(/\bRANDOM\s*\(\s*\)/gi, 'RAND()');
  s = s.replace(/\bBOOL_OR\s*\(/gi, 'MAX(').replace(/\bBOOL_AND\s*\(/gi, 'MIN(');
  const conflict = rewriteOnConflict(s);
  s = conflict.sql;

  let returning: string | null = null;
  const retAt = topLevelIndexes(s, /^RETURNING\b/i).pop();
  if (retAt !== undefined) {
    returning = s.slice(retAt).replace(/^RETURNING\s+/i, '').replace(/;?\s*$/, '');
    s = s.slice(0, retAt).trimEnd();
  }

  const head = s.trimStart();
  let kind: Translated['kind'] = 'other';
  let table: string | null = null;
  let alias: string | null = null;
  let m: RegExpMatchArray | null;
  if ((m = head.match(/^INSERT\s+(?:IGNORE\s+)?INTO\s+(?:public\.)?["`]?(\w+)["`]?/i))) {
    kind = 'insert';
    table = m[1];
  } else if ((m = head.match(/^UPDATE\s+(?:public\.)?["`]?(\w+)["`]?(?:\s+(?:AS\s+)?(?!SET\b)(\w+))?/i))) {
    kind = 'update';
    table = m[1];
    alias = m[2] || null;
  } else if ((m = head.match(/^DELETE\s+FROM\s+(?:public\.)?["`]?(\w+)["`]?(?:\s+(?:AS\s+)?(?!WHERE\b)(\w+))?/i))) {
    kind = 'delete';
    table = m[1];
    alias = m[2] || null;
  }

  let where: Translated['where'] = null;
  if (returning && (kind === 'update' || kind === 'delete')) {
    const at = topLevelIndexes(s, /^WHERE\b/i).pop();
    const whereMasked = at === undefined ? '1=1' : s.slice(at).replace(/^WHERE\s+/i, '');
    const placedWhere = rewritePlaceholders(whereMasked, params);
    where = { sql: unmask(placedWhere.sql, literals), params: placedWhere.params };
  }

  const placed = rewritePlaceholders(s, params);
  return {
    sql: unmask(placed.sql, literals),
    params: placed.params,
    returning: returning === null ? null : unmask(returning, literals),
    kind,
    table,
    alias,
    where,
    isUpsert: conflict.isUpsert,
  };
}
