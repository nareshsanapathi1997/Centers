/**
 * Logs in as each role, follows in-app links breadth-first and visits one URL per
 * route pattern. Reports HTTP errors, page/console errors and failed API calls,
 * saves a screenshot per page and lists routes that were never reached.
 *
 *   node scripts/qa/crawl-pages.js [baseUrl] [outDir]
 * Requires a running server and the demo data from `npm run db:seed`.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const BASE = process.argv[2] || 'http://localhost:2500';
const OUT = process.argv[3] || path.join(process.cwd(), 'test-results', 'crawl');
const ROOT = path.join(__dirname, '..', '..');

// Route patterns derived from every app/.../page.tsx (route groups removed).
function routePatterns() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'page.tsx') {
        const route = '/' + path.relative(path.join(ROOT, 'app'), dir).split(path.sep).filter((s) => !/^\(.*\)$/.test(s)).join('/');
        out.push(route === '/' ? '/' : route.replace(/\/$/, ''));
      }
    }
  })(path.join(ROOT, 'app'));
  return out.map((r) => ({
    route: r,
    // static segments outrank dynamic ones when several patterns match
    weight: r.split('/').filter((s) => s && !s.startsWith('[')).length,
    re: new RegExp('^' + r.replace(/\[[^\]]+\]/g, '[^/]+') + '/?$'),
  }));
}
const PATTERNS = routePatterns();
const patternOf = (pathname) =>
  PATTERNS.filter((p) => p.re.test(pathname)).sort((a, b) => b.weight - a.weight)[0]?.route ?? null;

const ROLES = [
  { name: 'public', start: ['/', '/chennai-central', '/student', '/centers', '/about', '/results', '/chennai-central/program/cat-2027-weekend-classroom', '/courses/program/cat-2027-weekend-classroom', '/chennai-central/payment/cat-2027-weekend-classroom'], allow: (p) => /^\/admin\/(login|forgot-password|reset-password)$/.test(p) || !/^\/(admin|super-admin)\b|\/student\/(?!login|register|forgot|reset-password)/.test(p) },
  { name: 'student', login: { url: '/chennai-central/student/login', user: '9110000000', pass: 'Student@123' }, start: ['/chennai-central/student/dashboard', '/chennai-central/student/assessments/2'], allow: (p) => /^\/chennai-central\/(student|payment)\b/.test(p) },
  { name: 'admin', login: { url: '/admin/login', user: 'chennai-central-admin', pass: 'Admin@123' }, start: ['/admin/1/dashboard', '/admin/1/enrollment'], allow: (p) => /^\/admin\/1\b/.test(p) },
  { name: 'super-admin', login: { url: '/super-admin/login', user: 'superadmin', pass: 'SuperAdmin@123' }, start: ['/super-admin/dashboard', '/super-admin/enrollment'], allow: (p) => /^\/super-admin\b/.test(p) },
];

async function login(page, { url, user, pass }) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  const userInput = page.locator('input:not([type=password]):not([type=hidden]):not([type=checkbox]):visible').first();
  await userInput.fill(user);
  await page.locator('input[type=password]:visible').first().fill(pass);
  // Prefer a real submit button: password fields often contain a show/hide toggle button.
  const submit = (await page.locator('button[type=submit]:visible').count())
    ? page.locator('button[type=submit]:visible').first()
    : page.locator('form button:visible').last();
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20000 }).catch(() => {}),
    submit.click(),
  ]);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
  return !page.url().endsWith('/login');
}

async function crawlRole(browser, role, visitedPatterns, report) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  if (role.login && !(await login(page, role.login))) {
    report.push({ role: role.name, url: role.login.url, problems: ['LOGIN FAILED'] });
    await ctx.close();
    return;
  }
  // Seed every route of this role whose params we can fill in; links discover the rest.
  const fill = (r) => r.replace('[centerId]', '1').replace('[slug]', 'chennai-central');
  const seeded = PATTERNS.map((p) => fill(p.route)).filter((r) => !r.includes('[') && role.allow(r) && !/\/logout$/.test(r) && (!role.login || !/\/login$/.test(r)));
  const queue = [...new Set([...role.start, ...seeded])];
  const seen = new Set(queue);
  fs.mkdirSync(path.join(OUT, role.name), { recursive: true });

  while (queue.length) {
    const url = queue.shift();
    const pattern = patternOf(new URL(url, BASE).pathname);
    if (pattern && visitedPatterns.has(`${role.name}:${pattern}`)) continue;
    if (pattern) visitedPatterns.add(`${role.name}:${pattern}`);

    const problems = [];
    const onPageError = (e) => problems.push(`pageerror: ${e.message.split('\n')[0].slice(0, 160)}`);
    const onConsole = (m) => {
      if (m.type() === 'error' && !/favicon|Download the React DevTools|net::ERR_ABORTED/.test(m.text())) problems.push(`console: ${m.text().slice(0, 160)}`);
    };
    const onResponse = (r) => {
      const u = new URL(r.url());
      if (u.origin === BASE && r.status() >= 400 && !u.pathname.startsWith('/_next/')) problems.push(`HTTP ${r.status()} ${r.request().method()} ${u.pathname}${u.search}`.slice(0, 180));
    };
    page.on('pageerror', onPageError);
    page.on('console', onConsole);
    page.on('response', onResponse);
    let status = 0;
    try {
      // Not 'networkidle': pages that poll notifications never go idle.
      const res = await page.goto(BASE + url, { waitUntil: 'load', timeout: 45000 });
      status = res ? res.status() : 0;
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(800);
    } catch (e) {
      problems.push(`navigation: ${e.message.split('\n')[0]}`);
    }
    const title = await page.title().catch(() => '');
    const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 4000);
    if (/Application error|Something went wrong|Unhandled Runtime Error|Internal server error/i.test(bodyText)) problems.push('error text on page');
    if (/T\.I\.M\.E|time4education/i.test(bodyText + title)) problems.push('OLD BRAND visible');
    const shot = `${String(report.length).padStart(3, '0')}-${(pattern || url).replace(/[^a-z0-9]+/gi, '_').slice(0, 80)}.jpg`;
    await page.screenshot({ path: path.join(OUT, role.name, shot), type: 'jpeg', quality: 55 }).catch(() => {});
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    page.off('response', onResponse);
    report.push({ role: role.name, url, pattern, status, title, problems: [...new Set(problems)], shot: `${role.name}/${shot}` });
    process.stdout.write(problems.length || status >= 400 ? 'x' : '.');

    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href'))).catch(() => []);
    for (const h of hrefs) {
      if (!h || h.startsWith('#') || /^(mailto|tel|javascript|https?:)/.test(h)) continue;
      const u = new URL(h, BASE + url);
      if (u.origin !== BASE || /\.(pdf|jpg|png|zip|xlsx|csv)$/i.test(u.pathname)) continue;
      const p = u.pathname.replace(/\/$/, '') || '/';
      if (!role.allow(p) || /logout|sign-?out/i.test(p)) continue;
      const key = p + u.search;
      const pat = patternOf(p);
      if (seen.has(key) || (pat && visitedPatterns.has(`${role.name}:${pat}`))) continue;
      seen.add(key);
      queue.push(key);
    }
  }
  await ctx.close();
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const browser = await chromium.launch();
  const visited = new Set();
  const report = [];
  for (const role of ROLES) {
    process.stdout.write(`\n${role.name}: `);
    await crawlRole(browser, role, visited, report);
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  const bad = report.filter((r) => r.problems.length || r.status >= 400);
  const covered = new Set([...visited].map((v) => v.split(':')[1]));
  const missing = PATTERNS.map((p) => p.route).filter((r) => !covered.has(r));
  console.log(`\n\nVisited ${report.length} pages (${covered.size}/${PATTERNS.length} route patterns). ${bad.length} with problems:\n`);
  for (const r of bad) console.log(`[${r.role}] ${r.url}  (${r.status})\n    ${r.problems.join('\n    ')}`);
  console.log(`\nNot reached (${missing.length}):\n  ${missing.join('\n  ')}`);
})();

