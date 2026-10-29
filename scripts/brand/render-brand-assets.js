/**
 * Renders the brand images in public/assets/img/ from the SVG/HTML sources below.
 * Edit the colours/text here and re-run:  node scripts/brand/render-brand-assets.js
 * (uses the Chromium that @playwright/test installs: `npx playwright install chromium`)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const OUT = path.join(__dirname, '..', '..', 'public', 'assets', 'img');
const C = {
  indigo: '#4F46E5',
  violet: '#8B5CF6',
  amber: '#F59E0B',
  ink: '#0F172A',
  muted: '#64748B',
};
const FONT = "'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif";

/** Sphere with an orbit ring — the brand mark. */
function mark(cx, cy, r, id) {
  return `
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.indigo}"/><stop offset="1" stop-color="${C.violet}"/>
    </linearGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r * 1.32}" ry="${r * 0.46}" fill="none" stroke="#FFFFFF"
    stroke-width="${r * 0.11}" transform="rotate(-24 ${cx} ${cy})" opacity="0.95"/>
  <path d="M${cx - r * 0.42} ${cy + r * 0.05} q${r * 0.42} ${-r * 0.5} ${r * 0.84} 0" fill="none"
    stroke="#FFFFFF" stroke-width="${r * 0.12}" stroke-linecap="round" opacity="0.9"/>
  <circle cx="${cx + r * 1.12}" cy="${cy - r * 0.52}" r="${r * 0.17}" fill="${C.amber}"/>`;
}

function logo({ text, sub, accent }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="290" height="120" viewBox="0 0 290 120">
  ${mark(50, 60, 30, 'g')}
  <text x="98" y="66" font-family="${FONT}" font-size="38" font-weight="700" letter-spacing="-0.5">
    <tspan fill="${text}">Edu</tspan><tspan fill="${accent}">Sphere</tspan>
  </text>
  <text x="100" y="90" font-family="${FONT}" font-size="13" font-weight="600" letter-spacing="6.2" fill="${sub}">ACADEMY</text>
</svg>`;
}

function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${C.ink}"/>
  ${mark(30, 33, 17, 'f')}
</svg>`;
}

function banner({ eyebrow, title, highlight, date, offer, footnote, bg }) {
  return `<html><body style="margin:0">
  <div style="width:849px;height:464px;box-sizing:border-box;padding:44px 52px;font-family:${FONT};
    color:#fff;background:${bg};position:relative;overflow:hidden;border-radius:18px">
    <div style="position:absolute;right:-90px;top:-90px;width:380px;height:380px;border-radius:50%;
      background:rgba(255,255,255,.08)"></div>
    <div style="position:absolute;right:60px;bottom:-140px;width:300px;height:300px;border-radius:50%;
      background:rgba(255,255,255,.06)"></div>
    <svg width="210" height="87" viewBox="0 0 290 120" style="position:relative">${logo({ text: '#FFFFFF', sub: 'rgba(255,255,255,.75)', accent: '#C7D2FE' }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
    <div style="position:relative;margin-top:18px;font-size:17px;font-weight:600;letter-spacing:2px;
      text-transform:uppercase;color:#C7D2FE">${eyebrow}</div>
    <div style="position:relative;margin-top:8px;font-size:46px;line-height:1.08;font-weight:800;max-width:600px">
      ${title} <span style="color:${C.amber}">${highlight}</span></div>
    <div style="position:relative;margin-top:22px;display:inline-block;padding:10px 18px;border-radius:999px;
      background:rgba(255,255,255,.14);font-size:18px;font-weight:600">${date}</div>
    <div style="position:relative;margin-top:20px;font-size:19px;color:#E0E7FF">${offer}</div>
    <div style="position:absolute;left:52px;bottom:22px;font-size:12px;color:rgba(255,255,255,.6)">${footnote}</div>
  </div></body></html>`;
}

async function main() {
  const sources = {
    'logo.svg': logo({ text: C.ink, sub: C.muted, accent: C.indigo }),
    'logo-white.svg': logo({ text: '#FFFFFF', sub: 'rgba(255,255,255,0.78)', accent: '#C7D2FE' }),
    'favicon.svg': favicon(),
  };
  for (const [name, svg] of Object.entries(sources)) fs.writeFileSync(path.join(OUT, name), svg);

  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const shoot = async (html, file, w, h) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html);
    await page.screenshot({ path: path.join(OUT, file), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    console.log(`  ${file} (${w}x${h})`);
  };
  const bare = (svg) => `<html><body style="margin:0;background:transparent">${svg}</body></html>`;
  await shoot(bare(sources['logo.svg']), 'logo.png', 290, 120);
  await shoot(bare(sources['logo-white.svg']), 'logo-white.png', 290, 120);
  await shoot(bare(sources['favicon.svg']), 'favicon.png', 64, 64);
  await shoot(banner({
    eyebrow: 'Admissions open · CAT 2027',
    title: 'Crack CAT with India’s',
    highlight: 'smartest prep',
    date: 'Free Scholarship Test · Every Sunday, 10:00 AM',
    offer: 'Score in the top band and get up to 100% off on course fees.',
    footnote: '*Scholarship subject to test performance. Terms apply.',
    bg: `linear-gradient(135deg, ${C.indigo} 0%, ${C.violet} 100%)`,
  }), 'slider1.png', 849, 464);
  await shoot(banner({
    eyebrow: 'New batches · Banking & SSC',
    title: 'Your government job starts',
    highlight: 'here',
    date: 'Weekend & evening batches · Starting 1st of every month',
    offer: 'Live classes, 50+ mock tests and doubt-clearing with expert faculty.',
    footnote: '*Batch timings vary by centre.',
    bg: `linear-gradient(135deg, ${C.ink} 0%, #1E1B4B 55%, ${C.indigo} 100%)`,
  }), 'slider2.png', 849, 464);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
