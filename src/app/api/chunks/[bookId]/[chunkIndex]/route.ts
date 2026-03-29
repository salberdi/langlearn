import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chunks, readingProgress } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { translateChunk } from '@/lib/translation';
import { getRequiredUser, verifyBookOwnership } from '@/lib/auth-helpers';
import { rehydrateChunk, prefetchArchivedChunks } from '@/lib/rehydrate-chunk';

export async function GET(
  _request: NextRequest,
  { params }: { params: { bookId: string; chunkIndex: string } }
) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const bookId = parseInt(params.bookId, 10);
  const chunkIndex = parseInt(params.chunkIndex, 10);

  const { error } = await verifyBookOwnership(bookId, user.id);
  if (error) return error;

  const chunkRows = await db
    .select()
    .from(chunks)
    .where(and(eq(chunks.book_id, bookId), eq(chunks.chunk_index, chunkIndex)))
    .limit(1);
  const chunk = chunkRows[0];

  if (!chunk) {
    return NextResponse.json({ error: 'Chunk not found' }, { status: 404 });
  }

  // Rehydrate archived chunks from S3
  if (chunk.source_html === null && chunk.s3_key) {
    try {
      const content = await rehydrateChunk({ id: chunk.id, s3_key: chunk.s3_key });
      prefetchArchivedChunks(bookId, chunkIndex);
      return NextResponse.json({
        id: chunk.id,
        chunk_index: chunk.chunk_index,
        source_html: content.source_html,
        translated_html: content.translated_html,
        tokens_json: content.tokens_json,
        translation_status: chunk.translation_status,
      });
    } catch (err) {
      console.error('[chunks] Rehydration failed:', err);
      return NextResponse.json(
        { error: 'Book content temporarily unavailable, please try again' },
        { status: 503 }
      );
    }
  }

  if (chunk.source_html === null && !chunk.s3_key) {
    return NextResponse.json({ error: 'Chunk data is missing' }, { status: 500 });
  }

  // If already translated, return immediately
  if (chunk.translation_status === 'complete' && chunk.translated_html) {
    return NextResponse.json({
      id: chunk.id,
      chunk_index: chunk.chunk_index,
      source_html: chunk.source_html,
      translated_html: chunk.translated_html,
      tokens_json: chunk.tokens_json,
      translation_status: chunk.translation_status,
    });
  }

  // Trigger translation if pending
  if (chunk.translation_status === 'pending' || chunk.translation_status === 'error') {
    // Reset error status to pending before retrying
    if (chunk.translation_status === 'error') {
      await db.update(chunks)
        .set({ translation_status: 'pending' })
        .where(eq(chunks.id, chunk.id));
    }

    try {
      const result = await translateChunk(chunk.id);
      return NextResponse.json({
        id: chunk.id,
        chunk_index: chunk.chunk_index,
        source_html: chunk.source_html,
        translated_html: result.translatedHtml,
        tokens_json: result.tokensJson,
        translation_status: 'complete',
      });
    } catch {
      return NextResponse.json(
        { error: 'Translation failed', translation_status: 'error' },
        { status: 500 }
      );
    }
  }

  // In progress — return status for client to poll
  return NextResponse.json({
    id: chunk.id,
    chunk_index: chunk.chunk_index,
    source_html: chunk.source_html,
    translated_html: null,
    tokens_json: null,
    translation_status: chunk.translation_status,
  });
}

// Save reading progress
export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string; chunkIndex: string } }
) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const bookId = parseInt(params.bookId, 10);
  const chunkIndex = parseInt(params.chunkIndex, 10);

  const { error } = await verifyBookOwnership(bookId, user.id);
  if (error) return error;
  const body = await request.json();
  const scrollY = body.scroll_y ?? 0;

  await db.insert(readingProgress)
    .values({
      book_id: bookId,
      chunk_index: chunkIndex,
      scroll_y: scrollY,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: [readingProgress.book_id],
      set: {
        chunk_index: chunkIndex,
        scroll_y: scrollY,
        updated_at: new Date(),
      },
    });

  return NextResponse.json({ success: true });
}
