/**
 * Renders demo-only assets used by `npm run db:seed`:
 *   public/assets/demo/results/*.png  — topper result cards
 *   public/assets/demo/docs/*.pdf     — sample study materials
 * Run once (needs Chromium from `npx playwright install chromium`):
 *   node scripts/brand/render-demo-assets.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const DEMO = path.join(__dirname, '..', '..', 'public', 'assets', 'demo');
const FONT = "'Segoe UI', 'Inter', Arial, sans-serif";

const RESULTS = [
  ['ananya-iyer', 'Ananya Iyer', '99.92', 'percentile', 'CAT 2025', 'Chennai Central', 'woman-1'],
  ['rahul-menon', 'Rahul Menon', '99.81', 'percentile', 'CAT 2025', 'Bengaluru Koramangala', 'man-1'],
  ['sneha-reddy', 'Sneha Reddy', 'AIR 46', 'rank', 'GATE CS 2026', 'Hyderabad Ameerpet', 'woman-3'],
  ['arjun-kulkarni', 'Arjun Kulkarni', 'AIR 112', 'rank', 'JEE Advanced 2026', 'Pune Deccan', 'man-4'],
  ['meera-joshi', 'Meera Joshi', '695/720', 'score', 'NEET 2026', 'Delhi Laxmi Nagar', 'woman-4'],
  ['vikram-singh', 'Vikram Singh', 'Selected', 'IBPS PO', 'SBI PO 2026', 'Delhi Laxmi Nagar', 'man-2'],
  ['priya-das', 'Priya Das', 'AIR 18', 'rank', 'CLAT 2026', 'Kolkata Salt Lake', 'woman-6'],
  ['karthik-raman', 'Karthik Raman', '755', 'score', 'GMAT Focus 2026', 'Chennai Central', 'man-3'],
  ['divya-nair', 'Divya Nair', '99.4', 'percentile', 'IPM Indore 2026', 'Bengaluru Koramangala', 'woman-2'],
  ['aditya-rao', 'Aditya Rao', 'Rank 7', 'state rank', 'TS ICET 2026', 'Hyderabad Ameerpet', 'man-senior-2'],
  ['fatima-sheikh', 'Fatima Sheikh', '99.67', 'percentile', 'CAT 2025', 'Pune Deccan', 'woman-5'],
  ['rohan-gupta', 'Rohan Gupta', 'AIR 203', 'rank', 'GATE ME 2026', 'Kolkata Salt Lake', 'man-senior-1'],
];

function resultCard([, name, score, unit, exam, centre, photo]) {
  const img = fs.readFileSync(path.join(DEMO, `${photo}.jpg`)).toString('base64');
  return `<html><body style="margin:0">
  <div style="width:600px;height:750px;box-sizing:border-box;font-family:${FONT};position:relative;overflow:hidden;
    background:linear-gradient(160deg,#EEF2FF 0%,#FFFFFF 55%);color:#0F172A;display:flex;flex-direction:column;align-items:center">
    <div style="position:absolute;inset:0 0 auto 0;height:300px;background:linear-gradient(135deg,#4F46E5,#8B5CF6)"></div>
    <div style="position:relative;margin-top:34px;font-size:15px;letter-spacing:3px;font-weight:700;color:#E0E7FF">EDUSPHERE ACADEMY · TOPPER</div>
    <div style="position:relative;margin-top:26px;width:260px;height:260px;border-radius:50%;border:8px solid #fff;
      box-shadow:0 18px 40px rgba(15,23,42,.25);background:url(data:image/jpeg;base64,${img}) center/cover"></div>
    <div style="position:relative;margin-top:26px;font-size:40px;font-weight:800">${name}</div>
    <div style="margin-top:6px;font-size:20px;color:#64748B">${exam}</div>
    <div style="margin-top:22px;padding:14px 34px;border-radius:999px;background:#4F46E5;color:#fff;font-size:44px;font-weight:800">
      ${score}<span style="font-size:20px;font-weight:600;margin-left:10px;opacity:.85">${unit}</span></div>
    <div style="margin-top:auto;margin-bottom:30px;font-size:16px;color:#475569">EduSphere ${centre}</div>
  </div></body></html>`;
}

const DOCS = [
  ['quant-formula-sheet', 'Quantitative Aptitude — Formula Sheet', [
    ['Percentages', 'x% of y = y% of x. Successive changes a% and b%: net = a + b + ab/100.'],
    ['Profit & Loss', 'Profit% = (SP − CP)/CP × 100. Marked price × (1 − d/100) = SP.'],
    ['Time & Work', 'If A takes a days and B takes b days, together they take ab/(a + b) days.'],
    ['Simple & Compound Interest', 'SI = PRT/100. CI amount = P(1 + R/100)^T.'],
  ]],
  ['varc-practice-set', 'Verbal Ability — Practice Set 1', [
    ['Reading strategy', 'Skim the passage for structure first, then read the questions before a detailed read.'],
    ['Para-jumbles', 'Find the opening sentence (no pronoun references), then link pairs by connectors.'],
    ['Summary questions', 'Pick the option that covers the main idea without adding new information.'],
  ]],
  ['reasoning-workbook', 'Logical Reasoning — Workbook', [
    ['Seating arrangement', 'Fix the most certain clue first; draw both possible cases when a clue is ambiguous.'],
    ['Syllogisms', 'Use Venn diagrams; a conclusion is valid only if it holds in every possible diagram.'],
    ['Blood relations', 'Draw a family tree with gender markers; resolve the question from the subject outward.'],
  ]],
  ['biology-quick-revision', 'Biology — Quick Revision Notes', [
    ['Cell biology', 'Mitochondria: site of aerobic respiration. Ribosomes: protein synthesis.'],
    ['Genetics', 'Mendel\'s monohybrid ratio 3 : 1; dihybrid ratio 9 : 3 : 3 : 1.'],
    ['Human physiology', 'Normal blood pressure is about 120/80 mm Hg; SA node is the pacemaker.'],
  ]],
];

function doc([, title, sections]) {
  return `<html><body style="font-family:${FONT};color:#0F172A;margin:48px">
    <div style="color:#4F46E5;font-weight:700;letter-spacing:2px;font-size:12px">EDUSPHERE ACADEMY · STUDY MATERIAL</div>
    <h1 style="font-size:28px;margin:10px 0 24px">${title}</h1>
    ${sections.map(([h, p]) => `<h2 style="font-size:17px;color:#4338CA;margin:22px 0 6px">${h}</h2><p style="line-height:1.6;margin:0">${p}</p>`).join('')}
    <p style="margin-top:48px;color:#64748B;font-size:12px">Demo material for EduSphere CenterHub.</p>
  </body></html>`;
}

async function main() {
  fs.mkdirSync(path.join(DEMO, 'results'), { recursive: true });
  fs.mkdirSync(path.join(DEMO, 'docs'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 600, height: 750 } });
  for (const r of RESULTS) {
    await page.setContent(resultCard(r));
    await page.screenshot({ path: path.join(DEMO, 'results', `${r[0]}.png`) });
  }
  for (const d of DOCS) {
    await page.setContent(doc(d));
    await page.pdf({ path: path.join(DEMO, 'docs', `${d[0]}.pdf`), format: 'A4' });
  }
  await browser.close();
  console.log(`Rendered ${RESULTS.length} result cards and ${DOCS.length} PDFs into public/assets/demo/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
