import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getRequiredUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return {
    user: session.user as { id: string; email: string; name?: string | null },
    errorResponse: null,
  };
}

export async function verifyBookOwnership(bookId: number, userId: string) {
  const rows = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
  const book = rows[0] ?? null;
  if (!book) {
    return { book: null, error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  if (book.user_id !== userId) {
    return { book: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { book, error: null };
}
