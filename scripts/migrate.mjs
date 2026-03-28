import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// /app/drizzle in production (runner stage); /app/drizzle via volume mount in dev
await migrate(db, { migrationsFolder: '/app/drizzle' });
await pool.end();

console.log('[migrate] Done.');
