import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, chunks, readingProgress } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bookId = parseInt(params.id, 10);
  const book = db.select().from(books).where(eq(books.id, bookId)).get();

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const progress = db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.book_id, bookId))
    .get();

  const chunkCount = db
    .select({ count: chunks.id })
    .from(chunks)
    .where(eq(chunks.book_id, bookId))
    .all().length;

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
  const bookId = parseInt(params.id, 10);

  db.delete(readingProgress)
    .where(eq(readingProgress.book_id, bookId))
    .run();
  db.delete(chunks).where(eq(chunks.book_id, bookId)).run();
  db.delete(books).where(eq(books.id, bookId)).run();

  return NextResponse.json({ success: true });
}
