import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, chunks, readingProgress } from '@/db/schema';
import { eq, and, isNull, isNotNull, sql, lt } from 'drizzle-orm';
import { uploadToS3 } from '@/lib/s3';

const PER_RUN_CAP = 500;
const BATCH_SIZE = 20;
const COLD_DAYS = 30;

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!process.env.ARCHIVE_CRON_SECRET || secret !== process.env.ARCHIVE_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - COLD_DAYS * 24 * 60 * 60 * 1000);

  // Find archivable chunks in a single query
  const archivable = await db
    .select({
      id: chunks.id,
      book_id: chunks.book_id,
      chunk_index: chunks.chunk_index,
      source_html: chunks.source_html,
      translated_html: chunks.translated_html,
      tokens_json: chunks.tokens_json,
    })
    .from(chunks)
    .innerJoin(books, eq(chunks.book_id, books.id))
    .leftJoin(readingProgress, eq(readingProgress.book_id, books.id))
    .where(
      and(
        eq(chunks.translation_status, 'complete'),
        isNull(chunks.s3_key),
        isNotNull(chunks.source_html),
        lt(chunks.created_at, cutoff),
        sql`(${readingProgress.updated_at} < ${cutoff} OR ${readingProgress.updated_at} IS NULL)`
      )
    )
    .orderBy(chunks.book_id, chunks.chunk_index)
    .limit(PER_RUN_CAP);

  let chunksArchived = 0;
  let chunksFailed = 0;
  const booksProcessed = new Set<number>();

  // Process in batches
  for (let i = 0; i < archivable.length; i += BATCH_SIZE) {
    const batch = archivable.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (chunk) => {
        const s3Key = `chunks/${chunk.book_id}/${chunk.chunk_index}.json`;
        const payload = JSON.stringify({
          source_html: chunk.source_html,
          translated_html: chunk.translated_html,
          tokens_json: chunk.tokens_json,
        });

        // Upload to S3 first — never null DB before confirming S3 write
        await uploadToS3(s3Key, payload, 'application/json');

        // Only after successful upload: null out DB columns
        await db
          .update(chunks)
          .set({
            source_html: null,
            translated_html: null,
            tokens_json: null,
            s3_key: s3Key,
            archived_at: new Date(),
          })
          .where(eq(chunks.id, chunk.id));

        booksProcessed.add(chunk.book_id);
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        chunksArchived++;
      } else {
        chunksFailed++;
        console.error('[archive] Chunk archival failed:', result.reason);
      }
    }
  }

  // Count remaining archivable chunks
  const remainingRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(chunks)
    .innerJoin(books, eq(chunks.book_id, books.id))
    .leftJoin(readingProgress, eq(readingProgress.book_id, books.id))
    .where(
      and(
        eq(chunks.translation_status, 'complete'),
        isNull(chunks.s3_key),
        isNotNull(chunks.source_html),
        lt(chunks.created_at, cutoff),
        sql`(${readingProgress.updated_at} < ${cutoff} OR ${readingProgress.updated_at} IS NULL)`
      )
    );
  const chunksRemaining = Number(remainingRows[0]?.count ?? 0);

  return NextResponse.json({
    booksProcessed: booksProcessed.size,
    chunksArchived,
    chunksFailed,
    chunksRemaining,
  });
}
