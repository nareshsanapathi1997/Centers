/**
 * Confirms the self-hosted fonts and the image optimizer actually serve bytes,
 * rather than just appearing in the markup.
 */
const BASE = process.env.SMOKE_BASE || 'http://localhost:2500'
const SLUG = process.env.SMOKE_SLUG || 'naresh'

async function run() {
  const html = await (await fetch(`${BASE}/${SLUG}`)).text()

  const htmlTag = html.match(/<html[^>]*>/)
  console.log('html tag:', htmlTag ? htmlTag[0] : '(none)')

  // In dev, next/font injects @font-face into a CSS chunk instead of emitting
  // preload links, so the woff2 references have to be chased through the CSS.
  const cssHrefs = [...new Set([...html.matchAll(/\/_next\/static\/css\/[^"']+\.css/g)].map((m) => m[0]))]
  const fontFiles = new Set()
  for (const href of cssHrefs) {
    const css = await (await fetch(`${BASE}${href}`)).text()
    for (const m of css.matchAll(/\/_next\/static\/media\/[\w-]+\.p?\.?woff2?/g)) fontFiles.add(m[0])
  }
  for (const m of html.matchAll(/\/_next\/static\/media\/[\w-]+\.woff2?/g)) fontFiles.add(m[0])

  console.log(`self-hosted font files referenced: ${fontFiles.size}`)
  for (const file of [...fontFiles].slice(0, 4)) {
    const res = await fetch(`${BASE}${file}`)
    console.log(`  ${res.status} ${res.headers.get('content-type')} ${file}`)
  }

  // Stop at whitespace and commas: srcset packs several URLs into one attribute.
  const imageUrls = [
    ...new Set(
      [...html.matchAll(/\/_next\/image\?[^"'\s,]+/g)].map((m) => m[0].replace(/&amp;/g, '&'))
    ),
  ]
  console.log(`optimized image URLs: ${imageUrls.length}`)
  let ok = 0
  let bad = 0
  for (const url of imageUrls.slice(0, 6)) {
    const res = await fetch(`${BASE}${url}`)
    const type = res.headers.get('content-type') || ''
    if (res.status === 200 && type.startsWith('image/')) ok++
    else {
      bad++
      console.log(`  FAIL ${res.status} ${type} ${decodeURIComponent(url).slice(0, 110)}`)
    }
  }
  console.log(`  ${ok} served as images, ${bad} failed`)

  if (bad > 0) process.exitCode = 1
}

run()
