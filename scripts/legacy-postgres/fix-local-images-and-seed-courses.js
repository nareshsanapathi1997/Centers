/**
 * Point broken /uploads URLs at files that exist locally, then seed
 * course + sub-course trees for every Chennai programme.
 *
 * Usage: node scripts/fix-local-images-and-seed-courses.js
 */
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const ROOT = path.join(__dirname, '..')
const UPLOAD_ROOTS = [path.join(ROOT, 'uploads'), path.join(ROOT, 'public', 'uploads')]

const ASSETS = {
  logo: '/assets/img/logo.png',
  logoDark: '/assets/img/logo-white.png',
  favicon: '/assets/img/favicon.png',
  hero: '/assets/img/hero/hero-slider-1.jpg',
  director: '/assets/img/director.jpg',
  about: '/assets/img/about-img.jpg',
  gallery: '/assets/img/gallery-img.jpg',
  center: '/assets/img/center.jpg',
  blog: ['/assets/img/blog1.jpg', '/assets/img/blog2.jpg', '/assets/img/blog3.jpg'],
  results: [
    '/assets/img/results.jpg',
    '/assets/img/results2.jpg',
    '/assets/img/results3.jpg',
    '/assets/img/results4.jpg',
  ],
}

function fileExistsForUrl(url) {
  if (!url) return false
  if (url.startsWith('/assets/')) return fs.existsSync(path.join(ROOT, 'public', url))
  if (!url.startsWith('/uploads/')) return true
  const rel = url.replace(/^\/uploads\//, '')
  return UPLOAD_ROOTS.some((root) => fs.existsSync(path.join(root, rel)))
}

function listUploadUrls(subdir) {
  const urls = []
  for (const root of UPLOAD_ROOTS) {
    const dir = path.join(root, subdir)
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name)
      if (fs.statSync(full).isFile()) {
        urls.push(`/uploads/${subdir.replace(/\\/g, '/')}/${name}`)
      }
    }
  }
  return [...new Set(urls)]
}

function pickPool(kind, index) {
  const pools = {
    hero: [...listUploadUrls('hero/center_1'), ASSETS.hero],
    results: [...listUploadUrls('results/center_1'), ...ASSETS.results],
    gallery: [...listUploadUrls('gallery/center_1'), ASSETS.gallery],
    blog: [...listUploadUrls('blog/center_1'), ...ASSETS.blog],
    leadership: [
      ...listUploadUrls('leadership/center_1'),
      ...listUploadUrls('images/center_1'),
      ASSETS.director,
    ],
    faculty: [...listUploadUrls('images/center_1'), ASSETS.director],
    about: [...listUploadUrls('about/center_1'), ASSETS.about],
    center: [ASSETS.center, ...listUploadUrls('images/center_1')],
    course: [
      ASSETS.hero,
      ...ASSETS.blog,
      ASSETS.about,
      ASSETS.gallery,
      ...ASSETS.results,
    ],
  }
  const list = pools[kind] || pools.course
  return list[index % list.length]
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function remapTable(client, table, column, kind, where = 'center_id = 1') {
  const rows = await client.query(`SELECT id, ${column} AS url FROM ${table} WHERE ${where}`)
  let updated = 0
  for (const [index, row] of rows.rows.entries()) {
    if (fileExistsForUrl(row.url)) continue
    const next = pickPool(kind, index)
    await client.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [next, row.id])
    updated += 1
    console.log(`  ${table}#${row.id} → ${next}`)
  }
  return updated
}

async function remapCourseMasterImages(client) {
  const rows = await client.query(`SELECT id, title, image_url FROM course_masters ORDER BY id`)
  let updated = 0
  for (const row of rows.rows) {
    const broken =
      !row.image_url ||
      String(row.image_url).includes('unsplash.com') ||
      !fileExistsForUrl(row.image_url)
    if (!broken) continue
    const next = pickPool('course', row.id)
    await client.query(`UPDATE course_masters SET image_url = $1 WHERE id = $2`, [next, row.id])
    updated += 1
    console.log(`  course_masters#${row.id} ${row.title} → ${next}`)
  }
  return updated
}

async function ensureCourseTree(client, main) {
  const image = pickPool('course', main.id)
  if (!main.image_url || !fileExistsForUrl(main.image_url) || String(main.image_url).includes('unsplash.com')) {
    await client.query(`UPDATE course_masters SET image_url = $1 WHERE id = $2`, [image, main.id])
  }

  const kids = await client.query(
    `SELECT id, level_type, slug FROM course_masters WHERE parent_id = $1 AND is_active = true`,
    [main.id]
  )
  const hasSub = kids.rows.some((row) => row.level_type === 'sub_variant')
  const hasLeaf = await client.query(
    `WITH RECURSIVE tree AS (
       SELECT id, level_type FROM course_masters WHERE id = $1
       UNION ALL
       SELECT cm.id, cm.level_type FROM course_masters cm JOIN tree t ON cm.parent_id = t.id
     )
     SELECT count(*)::int AS c FROM tree WHERE level_type IN ('course', 'leaf_course')`,
    [main.id]
  )
  if (hasSub && (hasLeaf.rows[0]?.c || 0) > 0) {
    console.log(`  skip tree ${main.title} (already has subcourses)`)
    return
  }

  const classroomSlug = `local-${main.slug}-classroom`
  const weekendSlug = `local-${main.slug}-weekend`
  const regularSlug = `local-${main.slug}-2026-regular`
  const weekendCourseSlug = `local-${main.slug}-2026-weekend`

  async function upsert(parentId, levelType, title, slug, extra = {}) {
    const existing = await client.query(`SELECT id FROM course_masters WHERE slug = $1`, [slug])
    if (existing.rows[0]) return existing.rows[0].id
    const highlights = JSON.stringify(
      extra.highlights || [
        'Structured classroom teaching',
        'All-India mock tests',
        'Printed study material',
        'Doubt-clearing support',
      ]
    )
    const features = JSON.stringify(
      extra.features || ['Small batches', 'Mentor connect', 'Performance tracking', 'Recorded backups']
    )
    const outcomes = JSON.stringify(
      extra.outcomes || [
        `Build a complete ${main.title} preparation plan`,
        'Improve speed and accuracy with mocks',
        'Get personal mentoring before the exam',
      ]
    )
    const eligibility = JSON.stringify(
      extra.eligibility || ['Students and working professionals targeting this exam', 'Basic qualifying eligibility as per the official notification']
    )
    const inserted = await client.query(
      `INSERT INTO course_masters (
         parent_id, level_type, title, slug, short_description, detailed_description, image_url,
         highlights, features, learning_outcomes, eligibility_criteria,
         duration, mode, price, display_order, is_active, meta_title, meta_description
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15,true,$16,$17)
       RETURNING id`,
      [
        parentId,
        levelType,
        title,
        slug,
        extra.short || `${title} at T.I.M.E.`,
        extra.detail || `<p>${title} with structured classes, practice tests, and mentor support.</p>`,
        extra.image || image,
        highlights,
        features,
        outcomes,
        eligibility,
        extra.duration || null,
        extra.mode || 'offline',
        extra.price || null,
        extra.order || 0,
        extra.metaTitle || title,
        extra.metaDesc || extra.short || `${title} coaching at T.I.M.E.`,
      ]
    )
    console.log(`  + ${levelType}: ${title}`)
    return inserted.rows[0].id
  }

  const classroomId = await upsert(main.id, 'sub_variant', 'Classroom Program', classroomSlug, {
    short: `Face-to-face ${main.title} coaching with daily practice.`,
    order: 1,
  })
  const weekendId = await upsert(main.id, 'sub_variant', 'Weekend Program', weekendSlug, {
    short: `Saturday–Sunday ${main.title} batch for working students.`,
    order: 2,
  })
  await upsert(classroomId, 'course', `${main.title} 2026 Regular Course`, regularSlug, {
    short: `Full ${main.title} classroom course with mocks and mentoring.`,
    duration: '12 months',
    mode: 'offline',
    price: 65000,
    order: 1,
  })
  await upsert(weekendId, 'course', `${main.title} 2026 Weekend Course`, weekendCourseSlug, {
    short: `Weekend ${main.title} course with recorded backup and mocks.`,
    duration: '10 months',
    mode: 'hybrid',
    price: 52000,
    order: 1,
  })
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    console.log('Remapping broken images to local files...')

    await client.query(
      `UPDATE centers
       SET logo_url = COALESCE(NULLIF(logo_url, ''), $1),
           logo_dark_url = COALESCE(NULLIF(logo_dark_url, ''), $2),
           favicon_url = COALESCE(NULLIF(favicon_url, ''), $3),
           center_image_url = COALESCE(NULLIF(center_image_url, ''), $4)
       WHERE id = 1`,
      [ASSETS.logo, ASSETS.logoDark, ASSETS.favicon, ASSETS.center]
    )

    const allCenters = await client.query(
      `SELECT id, slug, logo_url, logo_dark_url, favicon_url, center_image_url FROM centers ORDER BY id`
    )
    for (const [index, row] of allCenters.rows.entries()) {
      const logo = fileExistsForUrl(row.logo_url) ? row.logo_url : ASSETS.logo
      const logoDark = fileExistsForUrl(row.logo_dark_url) ? row.logo_dark_url : ASSETS.logoDark
      const favicon = fileExistsForUrl(row.favicon_url) ? row.favicon_url : ASSETS.favicon
      const centerImage = fileExistsForUrl(row.center_image_url)
        ? row.center_image_url
        : pickPool('center', index)
      await client.query(
        `UPDATE centers
         SET logo_url = $1, logo_dark_url = $2, favicon_url = $3, center_image_url = $4
         WHERE id = $5`,
        [logo, logoDark, favicon, centerImage, row.id]
      )
      console.log(`  center ${row.slug} image → ${centerImage}`)
    }

    const settings = await client.query(
      `SELECT setting_key, setting_value FROM global_settings
       WHERE setting_key IN ('global_logo_light','global_logo_dark','global_favicon','global_logo_footer')`
    )
    for (const row of settings.rows) {
      if (fileExistsForUrl(row.setting_value)) continue
      const next =
        row.setting_key === 'global_logo_dark' || row.setting_key === 'global_logo_footer'
          ? ASSETS.logoDark
          : row.setting_key === 'global_favicon'
            ? ASSETS.favicon
            : ASSETS.logo
      await client.query(`UPDATE global_settings SET setting_value = $1 WHERE setting_key = $2`, [
        next,
        row.setting_key,
      ])
      console.log(`  setting ${row.setting_key} → ${next}`)
    }

    await remapTable(client, 'hero_slides', 'slider_image_url', 'hero')
    await remapTable(client, 'result_images', 'image_url', 'results')
    await remapTable(client, 'gallery_images', 'image_url', 'gallery')
    await remapTable(client, 'blog_posts', 'featured_image_url', 'blog')
    await remapTable(client, 'leadership', 'image_url', 'leadership')
    await remapTable(client, 'senior_faculty', 'image_url', 'faculty')
    await remapTable(client, 'about_sections', 'image_url', 'about')

    try {
      await remapTable(client, 'website_hero_slides', 'slider_image_url', 'hero', 'true')
      await remapTable(client, 'website_result_images', 'image_url', 'results', 'true')
      await remapTable(client, 'website_gallery_images', 'image_url', 'gallery', 'true')
      await remapTable(client, 'website_blog_posts', 'featured_image_url', 'blog', 'true')
    } catch (error) {
      console.log('  website tables skipped:', error.message)
    }

    const nearby = await client.query(`SELECT count(*)::int AS c FROM nearby_centers WHERE center_id = 1`)
    if ((nearby.rows[0]?.c || 0) === 0) {
      const others = await client.query(`SELECT id FROM centers WHERE id <> 1 AND is_active = true ORDER BY id LIMIT 6`)
      let order = 1
      for (const row of others.rows) {
        await client.query(
          `INSERT INTO nearby_centers (center_id, nearby_center_id, display_order)
           VALUES (1, $1, $2)
           ON CONFLICT DO NOTHING`,
          [row.id, order++]
        )
      }
      console.log(`  nearby centres linked: ${others.rowCount}`)
    }

    console.log('\nRemapping course master images...')
    await remapCourseMasterImages(client)

    console.log('\nSeeding course / sub-course trees for every main course...')
    const mains = await client.query(
      `SELECT id, title, slug, image_url
       FROM course_masters
       WHERE level_type = 'main_course' AND is_active = true
       ORDER BY id`
    )
    for (const main of mains.rows) {
      await ensureCourseTree(client, main)
    }

    await client.query('COMMIT')
    console.log('\nDone. Hard-refresh /chennai to see local images and course trees.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
