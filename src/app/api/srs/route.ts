import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { srsCards, phrases } from '@/db/schema';
import { eq, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10);

  const now = new Date();

  // Due cards
  const dueCards = db
    .select({
      card_id: srsCards.id,
      phrase_id: srsCards.phrase_id,
      mode: srsCards.mode,
      due_at: srsCards.due_at,
      interval_days: srsCards.interval_days,
      ease_factor: srsCards.ease_factor,
      repetitions: srsCards.repetitions,
      phrase_text: phrases.phrase_text,
      phrase_lang: phrases.phrase_lang,
      translation: phrases.translation,
      pronunciation: phrases.pronunciation,
      grammar_note: phrases.grammar_note,
      context_html: phrases.context_html,
      examples: phrases.examples,
    })
    .from(srsCards)
    .innerJoin(phrases, eq(srsCards.phrase_id, phrases.id))
    .where(lte(srsCards.due_at, now))
    .limit(limit)
    .all();

  return NextResponse.json(dueCards);
}

// Create a new SRS card for a phrase
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phrase_id, mode } = body;

  if (!phrase_id || !mode) {
    return NextResponse.json(
      { error: 'phrase_id and mode required' },
      { status: 400 }
    );
  }

  const now = new Date();
  const dueAt = new Date(now.getTime() + 86400_000); // due in 1 day

  const result = db
    .insert(srsCards)
    .values({
      phrase_id,
      mode,
      due_at: dueAt,
      created_at: now,
    })
    .returning()
    .get();

  return NextResponse.json(result);
}
