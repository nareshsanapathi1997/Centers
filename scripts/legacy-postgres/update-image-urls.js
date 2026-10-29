const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function updateImages() {
  try {
    console.log('Updating image URLs in database...')

    // Update centers with logo URLs
    await pool.query(
      `UPDATE centers 
       SET logo_url = '/assets/img/logo.png',
           logo_dark_url = '/assets/img/logo-white.png',
           favicon_url = '/assets/img/favicon.png'
       WHERE logo_url IS NULL OR logo_dark_url IS NULL`
    )
    console.log('✓ Updated center logos')

    // Update hero slides with background images
    await pool.query(
      `UPDATE hero_slides 
       SET background_image_url = '/assets/img/hero/hero-slider-1.jpg'
       WHERE background_image_url IS NULL`
    )
    console.log('✓ Updated hero slide backgrounds')

    // Update leadership with director image
    await pool.query(
      `UPDATE leadership 
       SET image_url = '/assets/img/director.jpg'
       WHERE image_url IS NULL`
    )
    console.log('✓ Updated leadership images')

    // Check if we need to add result images
    const resultCount = await pool.query('SELECT COUNT(*) FROM result_images')
    if (parseInt(resultCount.rows[0].count) === 0) {
      // Get first center ID
      const centerResult = await pool.query('SELECT id FROM centers LIMIT 1')
      if (centerResult.rows.length > 0) {
        const centerId = centerResult.rows[0].id
        await pool.query(
          `INSERT INTO result_images (center_id, title, image_url, display_order)
           VALUES
             ($1, 'BANK 2025 Results', '/assets/img/results.jpg', 1),
             ($2, 'CAT 2024 Results', '/assets/img/results2.jpg', 2),
             ($3, 'GATE 2024 Results', '/assets/img/results3.jpg', 3),
             ($4, 'CLAT 2024 Results', '/assets/img/results4.jpg', 4)`,
          [centerId, centerId, centerId, centerId]
        )
        console.log('✓ Added result images')
      }
    }

    // Check if we need to add gallery images
    const galleryCount = await pool.query('SELECT COUNT(*) FROM gallery_images')
    if (parseInt(galleryCount.rows[0].count) === 0) {
      const centerResult = await pool.query('SELECT id FROM centers LIMIT 1')
      if (centerResult.rows.length > 0) {
        const centerId = centerResult.rows[0].id
        await pool.query(
          `INSERT INTO gallery_images (center_id, title, image_url, gallery_type, display_order)
           VALUES
             ($1, 'Gallery Image One', '/assets/img/gallery-img.jpg', 'general', 1),
             ($2, 'Gallery Image Two', '/assets/img/gallery-img.jpg', 'general', 2),
             ($3, 'Gallery Image Three', '/assets/img/gallery-img.jpg', 'general', 3)`,
          [centerId, centerId, centerId]
        )
        console.log('✓ Added gallery images')
      }
    }

    // Update blog posts with featured images
    await pool.query(
      `UPDATE blog_posts 
       SET featured_image_url = CASE 
         WHEN id % 3 = 1 THEN '/assets/img/blog1.jpg'
         WHEN id % 3 = 2 THEN '/assets/img/blog2.jpg'
         ELSE '/assets/img/blog3.jpg'
       END
       WHERE featured_image_url IS NULL`
    )
    console.log('✓ Updated blog post featured images')

    console.log('\n✅ All image URLs updated successfully!')
  } catch (error) {
    console.error('Error updating images:', error)
  } finally {
    await pool.end()
  }
}

updateImages()

