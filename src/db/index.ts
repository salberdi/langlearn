import fs from 'fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const sslConfig = fs.existsSync('/app/certs/global-bundle.pem')
  ? { rejectUnauthorized: true, ca: fs.readFileSync('/app/certs/global-bundle.pem').toString() }
  : undefined;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: sslConfig });
export const db = drizzle(pool, { schema });
export type DB = typeof db;
