require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const COLUMNS = [
    { name: 'price', sql: 'DECIMAL(12, 2)' },
    { name: 'discount_percent', sql: 'DECIMAL(5, 2)' },
    { name: 'discount_amount', sql: 'DECIMAL(12, 2)' },
    { name: 'coupon_code', sql: 'VARCHAR(100)' },
    { name: 'coupon_enabled', sql: 'BOOLEAN DEFAULT false' },
    { name: 'installment_config', sql: "JSONB DEFAULT '[]'::jsonb" },
]

async function migrate() {
    try {
        console.log('Adding batch pricing Columns to course_master_batches...')
        for (const col of COLUMNS) {
            await pool.query(
                `ALTER TABLE course_master_batches ADD COLUMN IF NOT EXISTS ${col.name} ${col.sql}`
            )
            console.log(`  + ${col.name}`)
        }
        console.log('✅ Batch pricing columns ready')
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
