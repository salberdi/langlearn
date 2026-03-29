import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, chunks, readingProgress, translationMemory, termGlossary } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getRequiredUser, verifyBookOwnership } from '@/lib/auth-helpers';
import { deleteS3Prefix } from '@/lib/s3';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const bookId = parseInt(params.id, 10);
  const { book, error } = await verifyBookOwnership(bookId, user.id);
  if (error) return error;

  const progressRows = await db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.book_id, bookId))
    .limit(1);
  const progress = progressRows[0];

  const chunkRows = await db
    .select({ count: chunks.id })
    .from(chunks)
    .where(eq(chunks.book_id, bookId));
  const chunkCount = chunkRows.length;

  return NextResponse.json({
    ...book,
    current_chunk: progress?.chunk_index ?? 0,
    scroll_y: progress?.scroll_y ?? 0,
    chunk_count: chunkCount,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const bookId = parseInt(params.id, 10);
  const { error } = await verifyBookOwnership(bookId, user.id);
  if (error) return error;

  await db.delete(translationMemory).where(eq(translationMemory.book_id, bookId));
  await db.delete(termGlossary).where(eq(termGlossary.book_id, bookId));
  await db.delete(readingProgress).where(eq(readingProgress.book_id, bookId));
  await db.delete(chunks).where(eq(chunks.book_id, bookId));
  await db.delete(books).where(eq(books.id, bookId));

  // Clean up S3 objects (fire-and-forget)
  deleteS3Prefix(`uploads/${user.id}/${bookId}/`).catch((err) =>
    console.error('[delete] S3 upload cleanup failed:', err)
  );
  deleteS3Prefix(`chunks/${bookId}/`).catch((err) =>
    console.error('[delete] S3 chunk cleanup failed:', err)
  );

  return NextResponse.json({ success: true });
}
