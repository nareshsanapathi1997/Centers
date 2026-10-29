# Legacy PostgreSQL scripts

The application ran on PostgreSQL until October 2026 and now runs on MySQL / MariaDB.
These one-off migration and seed scripts target the old PostgreSQL database and are
kept only for reference. They are not wired into `package.json`, and `pg` is no longer
a dependency — run `npm i --no-save pg` first if you ever need one.

- Current schema: `migrations/mysql/schema.sql` (`npm run db:setup`)
- Demo data: `npm run db:seed`
- `generate-schema-from-pg.js` produced the MySQL schema from the live PostgreSQL catalog.
