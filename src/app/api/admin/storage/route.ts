import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

const DB_LIMIT_MB = 20 * 1024; // 20GB in MB

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbSizeResult = await db.execute(
    sql`SELECT pg_database_size(current_database()) as size_bytes`
  );
  const sizeMb = Number(dbSizeResult.rows[0].size_bytes) / (1024 * 1024);

  const chunkStatsResult = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE s3_key IS NOT NULL) as archived,
      COUNT(*) FILTER (WHERE s3_key IS NULL AND source_html IS NOT NULL) as hot,
      COUNT(*) FILTER (WHERE translation_status = 'complete') as translated
    FROM chunks
  `);
  const chunkStats = chunkStatsResult.rows[0];

  const bookStatsResult = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(upload_s3_key) as upload_archived
    FROM books
  `);
  const bookStats = bookStatsResult.rows[0];

  return NextResponse.json({
    database_size_mb: Math.round(sizeMb * 10) / 10,
    database_limit_mb: DB_LIMIT_MB,
    database_used_pct: Math.round((sizeMb / DB_LIMIT_MB) * 1000) / 10,
    chunks: {
      total: Number(chunkStats.total),
      hot: Number(chunkStats.hot),
      archived: Number(chunkStats.archived),
      translated: Number(chunkStats.translated),
    },
    books: {
      total: Number(bookStats.total),
      upload_archived: Number(bookStats.upload_archived),
    },
  });
}
