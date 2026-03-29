import { db } from '@/db';
import { chunks } from '@/db/schema';
import { eq, and, gt, isNotNull } from 'drizzle-orm';
import { getFromS3 } from './s3';

interface ChunkContent {
  source_html: string;
  translated_html: string | null;
  tokens_json: string | null;
}

export async function rehydrateChunk(chunk: {
  id: number;
  s3_key: string;
}): Promise<ChunkContent> {
  const buffer = await getFromS3(chunk.s3_key);
  const content: ChunkContent = JSON.parse(buffer.toString('utf-8'));

  if (!content.source_html || typeof content.source_html !== 'string') {
    throw new Error(`Corrupt S3 data for ${chunk.s3_key}: missing source_html`);
  }

  await db
    .update(chunks)
    .set({
      source_html: content.source_html,
      translated_html: content.translated_html,
      tokens_json: content.tokens_json,
      s3_key: null,
      archived_at: null,
    })
    .where(eq(chunks.id, chunk.id));

  return content;
}

export function prefetchArchivedChunks(
  bookId: number,
  afterIndex: number
): void {
  (async () => {
    try {
      const archived = await db
        .select({ id: chunks.id, s3_key: chunks.s3_key })
        .from(chunks)
        .where(
          and(
            eq(chunks.book_id, bookId),
            gt(chunks.chunk_index, afterIndex),
            isNotNull(chunks.s3_key)
          )
        )
        .orderBy(chunks.chunk_index)
        .limit(3);

      for (const chunk of archived) {
        if (chunk.s3_key) {
          await rehydrateChunk({ id: chunk.id, s3_key: chunk.s3_key });
        }
      }
    } catch (err) {
      console.error('[prefetch] Failed to prefetch archived chunks:', err);
    }
  })();
}
