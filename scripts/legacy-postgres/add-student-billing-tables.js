require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const ENROLLMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS student_enrollments (
    id SERIAL PRIMARY KEY,
    regno VARCHAR(50) UNIQUE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    address TEXT,
    state VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(20),
    course_id INTEGER REFERENCES course_masters(id) ON DELETE SET NULL,
    course_name VARCHAR(255),
    batch_code VARCHAR(255),
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    -- Historical: what was typed at enrolment time. center_id is the tenant key.
    center_name VARCHAR(255),
    payment_type VARCHAR(50), -- lumpsum, installment
    original_amount DECIMAL(12, 2),
    discount_amount DECIMAL(12, 2),
    final_amount DECIMAL(12, 2),
    payment_method VARCHAR(50),
    coupon_code VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

const INSTALLMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS student_installments (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE CASCADE,
    installment_no INTEGER NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    paid_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, paid
    transaction_id VARCHAR(255),
    payment_mode VARCHAR(50), -- online, offline_cash, offline_cheque, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

const CUSTOM_DISCOUNTS_TABLE = `
CREATE TABLE IF NOT EXISTS student_custom_discounts (
    id SERIAL PRIMARY KEY,
    student_identity VARCHAR(255) NOT NULL, -- email or mobile number
    course_id INTEGER REFERENCES course_masters(id) ON DELETE CASCADE,
    discount_type VARCHAR(50) NOT NULL, -- percentage, monetary
    discount_value DECIMAL(12, 2) NOT NULL,
    coupon_code VARCHAR(100),
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

async function migrate() {
    try {
        console.log('Creating student enrollment and payment tables...')
        await pool.query(ENROLLMENTS_TABLE)
        console.log('  + student_enrollments table created')
        await pool.query(INSTALLMENTS_TABLE)
        console.log('  + student_installments table created')
        await pool.query(CUSTOM_DISCOUNTS_TABLE)
        console.log('  + student_custom_discounts table created')

        // Seed some mock enrollments for demonstration
        const checkCount = await pool.query('SELECT COUNT(*)::int as count FROM student_enrollments')
        if (checkCount.rows[0].count === 0) {
            console.log('Seeding initial mock student enrollment data...')

            // Let's get an active course master id to link
            const courseRes = await pool.query('SELECT id, title FROM course_masters WHERE level_type = \'course\' LIMIT 1')
            const courseId = courseRes.rows[0]?.id || null
            const courseName = courseRes.rows[0]?.title || 'CAT 2026 Comprehensive'

            // Seed rows need a real center: the student portal filters legacy
            // enrolments by center_id, so a made-up center name would produce
            // mock data that is invisible everywhere.
            const centerRes = await pool.query('SELECT id, name FROM centers ORDER BY id LIMIT 1')
            if (centerRes.rowCount === 0) {
                console.warn('  ! no centers exist yet — skipping enrollment seed')
                return
            }
            const centerId = centerRes.rows[0].id
            const centerName = centerRes.rows[0].name

            const insertEnrollmentQuery = `
        INSERT INTO student_enrollments (
          regno, student_name, father_name, email, mobile, address, state, city, pincode,
          course_id, course_name, batch_code, center_id, center_name, payment_type, original_amount,
          discount_amount, final_amount, payment_method, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING id
      `

            // Insert student 1: Lump Sum
            const s1 = await pool.query(insertEnrollmentQuery, [
                'REG2026001', 'Arjun Sharma', 'Rajesh Sharma', 'arjun.sharma@example.com', '9876543210',
                '123, Green Avenue', 'Maharashtra', 'Mumbai', '400001', courseId, courseName, 'BATCH_CAT_A',
                centerId, centerName, 'lumpsum', 45000.00, 5000.00, 40000.00, 'online', 'active'
            ])

            // Insert student 2: Installment
            const s2 = await pool.query(insertEnrollmentQuery, [
                'REG2026002', 'Priya Patel', 'Amit Patel', 'priya.patel@example.com', '9123456789',
                'Suite 404, Park Street', 'Gujarat', 'Ahmedabad', '380001', courseId, courseName, 'BATCH_CAT_B',
                centerId, centerName, 'installment', 50000.00, 10000.00, 40000.00, 'online', 'active'
            ])

            const s2Id = s2.rows[0].id

            // Insert installments for student 2
            await pool.query(`
        INSERT INTO student_installments (enrollment_id, installment_no, amount, due_date, paid_amount, paid_date, status, transaction_id, payment_mode)
        VALUES 
          ($1, 1, 20000.00, CURRENT_DATE - INTERVAL '15 days', 20000.00, CURRENT_TIMESTAMP - INTERVAL '15 days', 'paid', 'TXN998877', 'online'),
          ($1, 2, 10000.00, CURRENT_DATE + INTERVAL '15 days', 0, null, 'unpaid', null, null),
          ($1, 3, 10000.00, CURRENT_DATE + INTERVAL '45 days', 0, null, 'unpaid', null, null)
      `, [s2Id])

            // Insert custom student discount
            await pool.query(`
        INSERT INTO student_custom_discounts (student_identity, course_id, discount_type, discount_value, coupon_code, is_used)
        VALUES 
          ('arjun.sharma@example.com', $1, 'percentage', 10.00, 'SPECIAL10', true),
          ('vip.student@example.com', $1, 'monetary', 2500.00, 'VIP2500', false)
      `, [courseId])

            console.log('✅ Mock data seeded successfully!')
        }

        console.log('✅ Migration succeeded!')
    } catch (error) {
        console.error('Migration failed:', error)
        process.exit(1)
    } finally {
        await pool.end()
    }
}

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
}

migrate()
