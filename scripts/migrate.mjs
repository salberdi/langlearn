import fs from 'fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const certPath = '/app/certs/global-bundle.pem';
const sslConfig = fs.existsSync(certPath)
  ? { rejectUnauthorized: true, ca: fs.readFileSync(certPath).toString() }
  : undefined;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: sslConfig });
const db = drizzle(pool);

// /app/drizzle in production (runner stage); /app/drizzle via volume mount in dev
await migrate(db, { migrationsFolder: '/app/drizzle' });
await pool.end();

console.log('[migrate] Done.');
