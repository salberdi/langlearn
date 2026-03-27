import { NextResponse } from 'next/server';
import { db } from '@/db';
import { books, readingProgress } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  const allBooks = db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      document_lang: books.document_lang,
      study_lang: books.study_lang,
      total_chunks: books.total_chunks,
      created_at: books.created_at,
      chunk_index: readingProgress.chunk_index,
    })
    .from(books)
    .leftJoin(readingProgress, eq(books.id, readingProgress.book_id))
    .orderBy(desc(books.updated_at))
    .all();

  return NextResponse.json(allBooks);
}
