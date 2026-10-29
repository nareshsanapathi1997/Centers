/**
 * Default corporate website header dropdown menu (About, Results, Centres, Courses, Jobs).
 * Used by migrate-website-home.js and Super Admin "Reset to defaults".
 */

async function queryMainCourseLink(client, patterns) {
  for (const pattern of patterns) {
    const result = await client.query(
      `SELECT id FROM course_masters
       WHERE level_type = 'main_course' AND is_active = true
         AND (title ILIKE $1 OR slug ILIKE $1)
       ORDER BY display_order, id
       LIMIT 1`,
      [pattern]
    )
    if (result.rows[0]?.id) {
      return `/courses/${result.rows[0].id}`
    }
  }
  return '/courses'
}

async function insertMenuItem(client, row) {
  const {
    menu_key,
    parent_id = null,
    title,
    icon_class = null,
    link_url = null,
    target_section = null,
    display_order = 0,
    is_active = true,
  } = row

  const result = await client.query(
    `INSERT INTO website_header_menu_items
       (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active]
  )
  return result.rows[0].id
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ reset?: boolean }} [options]
 */
async function runWebsiteHeaderMenuSeed(client, options = {}) {
  if (options.reset) {
    await client.query('DELETE FROM website_header_menu_items')
  } else {
    const existing = await client.query('SELECT COUNT(*)::int AS count FROM website_header_menu_items')
    if (existing.rows[0]?.count > 0) {
      console.log('Website header menu already has items — skip seed (use reset: true to replace).')
      return
    }
  }

  const courseLinks = {
    cat: await queryMainCourseLink(client, ['%cat%', '%mba%']),
    bank: await queryMainCourseLink(client, ['%bank%']),
    gate: await queryMainCourseLink(client, ['%gate%']),
    gmat: await queryMainCourseLink(client, ['%gmat%']),
    icet: await queryMainCourseLink(client, ['%icet%']),
    jee: await queryMainCourseLink(client, ['%jee%', '%engg%']),
    neet: await queryMainCourseLink(client, ['%neet%']),
    clat: await queryMainCourseLink(client, ['%clat%']),
    ipm: await queryMainCourseLink(client, ['%ipm%', '%bba%']),
  }

  const aboutId = await insertMenuItem(client, {
    menu_key: 'about_us',
    title: 'About Us',
    icon_class: 'ri-information-line',
    link_url: '/about',
    display_order: 1,
  })

  await insertMenuItem(client, {
    menu_key: 'about_us_overview',
    parent_id: aboutId,
    title: 'Overview',
    icon_class: 'ri-file-list-line',
    link_url: '/about',
    display_order: 1,
  })
  await insertMenuItem(client, {
    menu_key: 'about_us_philosophy',
    parent_id: aboutId,
    title: 'Our Philosophy',
    icon_class: 'ri-lightbulb-line',
    link_url: '/about/philosophy',
    display_order: 2,
  })
  await insertMenuItem(client, {
    menu_key: 'about_us_promoters',
    parent_id: aboutId,
    title: 'Meet the Promoters',
    icon_class: 'ri-team-line',
    link_url: '/about/promoters',
    display_order: 3,
  })

  const resultsId = await insertMenuItem(client, {
    menu_key: 'results',
    title: 'Our Results',
    icon_class: 'ri-trophy-line',
    link_url: '/results',
    display_order: 2,
  })

  const resultChildren = [
    ['results_cat', 'CAT/MBA', 'ri-graduation-cap-line', 'cat', 1],
    ['results_bank', 'Bank Exams', 'ri-bank-line', 'bank', 2],
    ['results_gate', 'GATE', 'ri-book-open-line', 'gate', 3],
    ['results_gmat', 'GMAT', 'ri-file-paper-line', 'gmat', 4],
    ['results_jee', 'JEE/Engg', 'ri-calculator-line', 'jee', 5],
    ['results_neet', 'NEET', 'ri-heart-pulse-line', 'neet', 6],
    ['results_clat', 'CLAT', 'ri-scales-line', 'clat', 7],
    ['results_ipm', 'IPM/BBA', 'ri-building-line', 'ipm', 8],
    ['results_icet', 'ICET', 'ri-file-list-3-line', 'icet', 9],
  ]
  for (const [key, title, icon, exam, order] of resultChildren) {
    await insertMenuItem(client, {
      menu_key: key,
      parent_id: resultsId,
      title,
      icon_class: icon,
      link_url: `/results?exam=${exam}`,
      display_order: order,
    })
  }

  await insertMenuItem(client, {
    menu_key: 'centers',
    title: 'Our Centres',
    icon_class: 'ri-map-pin-line',
    link_url: '/centers',
    display_order: 3,
  })

  const coursesId = await insertMenuItem(client, {
    menu_key: 'courses',
    title: 'Courses',
    icon_class: 'ri-book-open-line',
    link_url: '/#department',
    display_order: 4,
  })

  const collegeId = await insertMenuItem(client, {
    menu_key: 'courses_college_level',
    parent_id: coursesId,
    title: 'College Level Courses',
    display_order: 1,
  })

  const schoolId = await insertMenuItem(client, {
    menu_key: 'courses_school_level',
    parent_id: coursesId,
    title: 'School Level Courses',
    display_order: 2,
  })

  const collegeCourses = [
    ['courses_cat', 'CAT/MBA', 'ri-graduation-cap-line', courseLinks.cat, 1],
    ['courses_bank', 'Bank Exams', 'ri-bank-line', courseLinks.bank, 2],
    ['courses_gate', 'GATE', 'ri-book-open-line', courseLinks.gate, 3],
    ['courses_gmat', 'GMAT', 'ri-file-paper-line', courseLinks.gmat, 4],
    ['courses_icet', 'ICET', 'ri-file-list-3-line', courseLinks.icet, 5],
  ]
  for (const [key, title, icon, href, order] of collegeCourses) {
    await insertMenuItem(client, {
      menu_key: key,
      parent_id: collegeId,
      title,
      icon_class: icon,
      link_url: href,
      display_order: order,
    })
  }

  const schoolCourses = [
    ['courses_jee', 'JEE/Engg', 'ri-calculator-line', courseLinks.jee, 1],
    ['courses_neet', 'NEET', 'ri-heart-pulse-line', courseLinks.neet, 2],
    ['courses_clat', 'CLAT', 'ri-scales-line', courseLinks.clat, 3],
    ['courses_ipm', 'IPM/BBA', 'ri-building-line', courseLinks.ipm, 4],
  ]
  for (const [key, title, icon, href, order] of schoolCourses) {
    await insertMenuItem(client, {
      menu_key: key,
      parent_id: schoolId,
      title,
      icon_class: icon,
      link_url: href,
      display_order: order,
    })
  }

  await insertMenuItem(client, {
    menu_key: 'jobs',
    title: 'Careers@EduSphere',
    icon_class: 'ri-briefcase-line',
    link_url: '/vacancies',
    display_order: 5,
  })

  await insertMenuItem(client, {
    menu_key: 'blog',
    title: 'Blog',
    icon_class: 'ri-article-line',
    link_url: '/blog',
    display_order: 6,
  })

  await insertMenuItem(client, {
    menu_key: 'student_portal',
    title: 'Student Portal',
    icon_class: 'ri-graduation-cap-line',
    link_url: '/student',
    display_order: 7,
  })

  console.log('✅ Website header menu seeded.')
}

module.exports = { runWebsiteHeaderMenuSeed }
