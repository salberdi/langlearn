import { NextResponse } from 'next/server';
import { db } from '@/db';
import { books, readingProgress } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getRequiredUser } from '@/lib/auth-helpers';

export async function GET() {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const allBooks = await db
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
    .where(eq(books.user_id, user.id))
    .orderBy(desc(books.updated_at));

  return NextResponse.json(allBooks);
}
