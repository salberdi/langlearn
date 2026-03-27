import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { termGlossary } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  const bookId = parseInt(params.bookId, 10);

  const entries = db
    .select()
    .from(termGlossary)
    .where(eq(termGlossary.book_id, bookId))
    .all();

  return NextResponse.json(entries);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  const bookId = parseInt(params.bookId, 10);
  const body = await request.json();
  const { source_term, preferred_translation, notes } = body;

  if (!source_term || !preferred_translation) {
    return NextResponse.json(
      { error: 'source_term and preferred_translation required' },
      { status: 400 }
    );
  }

  db.insert(termGlossary)
    .values({
      book_id: bookId,
      source_term,
      preferred_translation,
      notes: notes ?? null,
    })
    .onConflictDoUpdate({
      target: [termGlossary.book_id, termGlossary.source_term],
      set: { preferred_translation, notes: notes ?? null },
    })
    .run();

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  const bookId = parseInt(params.bookId, 10);
  const { source_term } = await request.json();

  if (!source_term) {
    return NextResponse.json(
      { error: 'source_term required' },
      { status: 400 }
    );
  }

  db.delete(termGlossary)
    .where(
      and(
        eq(termGlossary.book_id, bookId),
        eq(termGlossary.source_term, source_term)
      )
    )
    .run();

  return NextResponse.json({ success: true });
}
