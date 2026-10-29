/**
 * Write-path smoke test: drives create/update/delete flows through the real API as
 * centre admin, super admin and student, then removes everything it created.
 * Needs a running server and the demo data (`npm run db:seed`).
 *
 *   node scripts/qa/smoke-writes.js [baseUrl]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');

const BASE = process.argv[2] || 'http://localhost:2500';
const MARK = '__smoke';
let failures = 0;

function make1280x720Png() {
  const width = 1280, height = 720;
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function session() {
  const jar = new Map();
  return async function call(method, url, body) {
    const isForm = body instanceof FormData;
    const headers = { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    if (!isForm && body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(BASE + url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
  };
}

async function step(name, fn) {
  try {
    const detail = await fn();
    console.log(`  ✔ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    failures++;
    console.log(`  ✘ ${name}\n      ${String(e.message).slice(0, 300)}`);
  }
}

function ok(r, what) {
  if (r.status >= 300) throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 240)}`);
  return r.json;
}
const idOf = (j) => j?.id ?? j?.data?.id ?? j?.item?.id ?? j?.employee?.id ?? j?.expense?.id ?? j?.role?.id ?? j?.admin?.id ?? j?.student?.id ?? j?.payment?.id;

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
  });
  const one = async (sql, p = []) => (await db.query(sql, p))[0][0];
  const centerId = (await one("SELECT id FROM centers WHERE slug = 'chennai-central'")).id;
  const today = new Date().toISOString().slice(0, 10);

  const admin = session();
  console.log('Centre admin');
  await step('login', async () => ok(await admin('POST', '/api/admin/login', { username: 'chennai-central-admin', password: 'Admin@123' }), 'login') && null);

  await step('news: create → update → delete', async () => {
    const created = ok(await admin('POST', '/api/admin/news', { center_id: centerId, title: `${MARK} news`, content: 'x', is_active: true }), 'create');
    const id = idOf(created);
    if (!id) throw new Error(`no id in ${JSON.stringify(created).slice(0, 200)}`);
    ok(await admin('PATCH', `/api/admin/news/${id}`, { title: `${MARK} news edited`, content: 'y', is_active: false }), 'update');
    const row = await one('SELECT title, is_active FROM news_items WHERE id = ?', [id]);
    if (row.title !== `${MARK} news edited` || row.is_active !== 0) throw new Error(`update not persisted: ${JSON.stringify(row)}`);
    ok(await admin('DELETE', `/api/admin/news/${id}?centerId=${centerId}`), 'delete');
    return `id ${id}`;
  });

  await step('faq: create → delete', async () => {
    const id = idOf(ok(await admin('POST', '/api/admin/faq', { center_id: centerId, question: `${MARK} question?`, answer: 'answer', is_active: true }), 'create'));
    ok(await admin('DELETE', `/api/admin/faq/${id}?centerId=${centerId}`), 'delete');
    return `id ${id}`;
  });

  await step('results: bulk upload → bulk status → bulk delete', async () => {
    const form = new FormData();
    form.append('center_id', String(centerId));
    form.append('images', new Blob([make1280x720Png()], { type: 'image/png' }), `${MARK}-result.png`);
    const uploaded = ok(await admin('POST', '/api/admin/results/bulk-upload', form), 'bulk-upload');
    const ids = (uploaded?.items || []).map((i) => i.id);
    if (ids.length !== 1) throw new Error(`expected 1 uploaded result, got ${JSON.stringify(uploaded).slice(0, 200)}`);
    ok(await admin('POST', `/api/admin/results/bulk?centerId=${centerId}`, { ids, action: 'status', is_active: false }), 'bulk-deactivate');
    const row = await one('SELECT is_active, image_url FROM result_images WHERE id = ?', [ids[0]]);
    if (!row || row.is_active !== 0) throw new Error(`bulk status not persisted: ${JSON.stringify(row)}`);
    ok(await admin('POST', `/api/admin/results/bulk?centerId=${centerId}`, { ids, action: 'delete' }), 'bulk-delete');
    const gone = await one('SELECT id FROM result_images WHERE id = ?', [ids[0]]);
    if (gone) throw new Error(`bulk delete left row ${ids[0]}`);
    if (row.image_url) {
      const diskPath = path.join(__dirname, '..', '..', 'public', row.image_url.replace(/^\//, ''));
      try { if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath); } catch {}
    }
    return `id ${ids[0]}`;
  });

  let employeeId;
  await step('employees: two with empty mobile/code (unique keys ignore "")', async () => {
    for (const n of ['A', 'B']) {
      const j = ok(await admin('POST', '/api/admin/employees', { centerId, fullName: `${MARK} employee ${n}`, mobile: '', employeeCode: '', email: '' }), `create ${n}`);
      employeeId ||= idOf(j);
    }
    return `first id ${employeeId}`;
  });

  await step('expenses: create → submit → delete', async () => {
    const emp = employeeId || (await one('SELECT id FROM employees WHERE center_id = ? LIMIT 1', [centerId])).id;
    const id = idOf(ok(await admin('POST', '/api/admin/expenses', { centerId, employeeId: emp, category: 'travel', amount: 450, expenseDate: today, description: `${MARK} cab` }), 'create'));
    ok(await admin('PATCH', `/api/admin/expenses/${id}`, { centerId, status: 'pending' }), 'update');
    ok(await admin('DELETE', `/api/admin/expenses/${id}?centerId=${centerId}`), 'delete');
    return `id ${id}`;
  });

  await step('students: create account', async () => {
    const j = ok(await admin('POST', '/api/admin/students', { centerId, fullName: `${MARK} Student`, mobile: '9999900001', email: 'smoke.student@example.com', password: 'Smoke@1234' }), 'create');
    return `regno ${j?.student?.regno ?? j?.regno ?? '?'}`;
  });

  await step('student payment: record cash payment (receipt sequence)', async () => {
    const leaf = await one(`SELECT f.course_master_id AS id FROM course_center_fees f WHERE f.center_id = ? AND f.status = 'approved' LIMIT 1`, [centerId]);
    const quote = ok(await admin('POST', '/api/admin/student-payments/quote', { center_id: centerId, course_master_id: leaf.id, payment_type: 'lumpsum' }), 'quote');
    const before = (await one('SELECT last_seq FROM payment_receipt_sequences WHERE center_id = ?', [centerId])).last_seq;
    const j = ok(await admin('POST', '/api/admin/student-payments', {
      center_id: centerId, course_master_id: leaf.id, student_name: `${MARK} Student`, student_mobile: '9999900001', student_email: 'smoke.student@example.com',
      payment_type: 'lumpsum', payment_method: 'cash', amount_paid: quote.amount_due, notes: MARK,
    }), 'create');
    const after = (await one('SELECT last_seq FROM payment_receipt_sequences WHERE center_id = ?', [centerId])).last_seq;
    if (after !== before + 1) throw new Error(`receipt sequence ${before} → ${after}`);
    return `receipt ${j?.receipt_no ?? j?.payment?.receipt_no ?? `#${after}`}`;
  });

  await step('attendance: save the same day twice (upsert)', async () => {
    const batch = await one(`SELECT b.id FROM course_batches b WHERE b.center_id = ? AND b.status = 'active' LIMIT 1`, [centerId]);
    const roster = (await db.query('SELECT student_id FROM course_batch_enrollments WHERE batch_id = ? LIMIT 3', [batch.id]))[0];
    for (const status of ['present', 'late']) {
      ok(await admin('POST', '/api/admin/attendance', { centerId, batchId: batch.id, attendanceDate: today, entries: roster.map((r) => ({ studentId: r.student_id, status })) }), `save ${status}`);
    }
    const rows = (await db.query('SELECT status FROM attendance_records WHERE batch_id = ? AND attendance_date = ?', [batch.id, today]))[0];
    if (rows.length !== roster.length || rows.some((r) => r.status !== 'late')) throw new Error(`unexpected rows ${JSON.stringify(rows)}`);
    return `${rows.length} records`;
  });

  await step('roles: create with permissions → delete', async () => {
    const perms = (await db.query("SELECT id FROM permissions WHERE resource = 'news'"))[0].map((r) => r.id);
    const id = idOf(ok(await admin('POST', '/api/admin/roles', { centerId, name: `${MARK} role`, description: 'tmp', permission_ids: perms }), 'create'));
    const n = (await one('SELECT COUNT(*) AS n FROM role_permissions WHERE role_id = ?', [id])).n;
    if (n !== perms.length) throw new Error(`role has ${n} permissions, expected ${perms.length}`);
    ok(await admin('DELETE', `/api/admin/roles/${id}?centerId=${centerId}`), 'delete');
    return `id ${id}, ${n} permissions`;
  });

  await step('centre admins: create staff login with role', async () => {
    const role = (await one("SELECT id FROM roles WHERE name = 'Counsellor'")).id;
    const id = idOf(ok(await admin('POST', '/api/admin/center-admins', { centerId, username: `${MARK}_staff`, email: 'smoke.staff@example.com', password: 'Smoke@12345', full_name: 'Smoke Staff', role_id: role }), 'create'));
    return `id ${id}`;
  });

  const sa = session();
  console.log('Super admin');
  await step('login', async () => ok(await sa('POST', '/api/super-admin/login', { username: 'superadmin', password: 'SuperAdmin@123' }), 'login') && null);
  await step('global settings: update a value', async () => {
    const current = (await one("SELECT setting_value FROM global_settings WHERE setting_key = 'website_site_tagline'")).setting_value;
    ok(await sa('PUT', '/api/super-admin/global-settings', { setting_key: 'website_site_tagline', setting_value: current }), 'update');
  });
  await step('website header menu: reset to defaults', async () => {
    ok(await sa('POST', '/api/super-admin/website-home/header-menu/seed-defaults'), 'reset');
    return `${(await one('SELECT COUNT(*) AS n FROM website_header_menu_items')).n} items`;
  });

  const student = session();
  console.log('Student');
  await step('login', async () => ok(await student('POST', '/api/student/login', { login: '9110000000', mobile: '9110000000', password: 'Student@123' }), 'login') && null);
  await step('ranked exam: start → answer → submit → ranked', async () => {
    const quizRow = await one("SELECT id, mode FROM assessments WHERE center_id = ? AND mode = 'practice' LIMIT 1", [centerId]);
    const quiz = quizRow.id;
    await db.query("UPDATE assessments SET mode = 'live' WHERE id = ?", [quiz]);
    let attemptId;
    try {
      const started = ok(await student('POST', `/api/student/assessments/${quiz}/start`, { centerId }), 'start');
      attemptId = started?.attempt?.id ?? started?.attemptId;
      if (!attemptId) throw new Error(`no attempt id in ${JSON.stringify(started).slice(0, 200)}`);
      const qs = (await db.query('SELECT id, correct_option_id FROM assessment_questions WHERE assessment_id = ?', [quiz]))[0];
      ok(await student('PUT', `/api/student/assessments/attempts/${attemptId}`, { centerId, answers: qs.map((q) => ({ questionId: q.id, selectedOptionId: q.correct_option_id })) }), 'answer');
      const submitted = ok(await student('POST', `/api/student/assessments/attempts/${attemptId}/submit`, { centerId }), 'submit');
      const row = await one('SELECT status, score, `rank` FROM assessment_attempts WHERE id = ?', [attemptId]);
      if (row.status !== 'submitted' || row.rank == null) throw new Error(`attempt not ranked: ${JSON.stringify(row)} / ${JSON.stringify(submitted).slice(0, 160)}`);
      return `score ${row.score}, rank ${row.rank}`;
    } finally {
      if (attemptId) {
        await db.query('DELETE FROM assessment_answers WHERE attempt_id = ?', [attemptId]);
        await db.query('DELETE FROM assessment_attempts WHERE id = ?', [attemptId]);
      }
      await db.query('UPDATE assessments SET mode = ? WHERE id = ?', [quizRow.mode, quiz]);
    }
  });

  // Cleanup everything tagged with the marker.
  await db.query(`DELETE FROM attendance_records WHERE attendance_date = ? AND center_id = ?`, [today, centerId]);
  await db.query(`DELETE FROM student_fee_payments WHERE notes = ?`, [MARK]);
  await db.query(`UPDATE payment_receipt_sequences SET last_seq = last_seq - 1 WHERE center_id = ?`, [centerId]);
  await db.query(`DELETE FROM students WHERE full_name = ?`, [`${MARK} Student`]);
  await db.query(`DELETE ar FROM admin_roles ar JOIN center_admins ca ON ca.id = ar.admin_id WHERE ca.username = ?`, [`${MARK}_staff`]);
  await db.query(`DELETE FROM center_admins WHERE username = ?`, [`${MARK}_staff`]);
  await db.query(`DELETE FROM employees WHERE full_name LIKE ?`, [`${MARK}%`]);
  await db.query(`DELETE FROM activity_logs WHERE entity_name LIKE ? OR details LIKE ?`, [`%${MARK}%`, `%${MARK}%`]);
  await db.end();

  console.log(failures ? `\n${failures} step(s) failed.` : '\nAll write paths passed.');
  process.exitCode = failures ? 1 : 0;
})();