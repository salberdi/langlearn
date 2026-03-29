import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userVocab, phrases, srsCards } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getRequiredUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const lang = request.nextUrl.searchParams.get('lang');

  const baseWhere = lang
    ? and(eq(userVocab.user_id, user.id), eq(userVocab.phrase_lang, lang))
    : eq(userVocab.user_id, user.id);

  const rows = await db
    .select({
      id: userVocab.id,
      phrase_text: userVocab.phrase_text,
      phrase_lang: userVocab.phrase_lang,
      status: userVocab.status,
      created_at: userVocab.created_at,
      translation: phrases.translation,
      pronunciation: phrases.pronunciation,
      grammar_note: phrases.grammar_note,
      examples: phrases.examples,
      mnemonic: phrases.mnemonic,
      register: phrases.register,
      frequency_tier: phrases.frequency_tier,
    })
    .from(userVocab)
    .leftJoin(
      phrases,
      and(
        eq(userVocab.phrase_text, phrases.phrase_text),
        eq(userVocab.phrase_lang, phrases.phrase_lang)
      )
    )
    .where(baseWhere);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { phrase_text, phrase_lang, status } = body;

  if (!phrase_text || !phrase_lang) {
    return NextResponse.json(
      { error: 'phrase_text and phrase_lang required' },
      { status: 400 }
    );
  }

  const now = new Date();
  const newStatus = status ?? 'new';

  await db.insert(userVocab)
    .values({
      user_id: user.id,
      phrase_text,
      phrase_lang,
      status: newStatus,
      created_at: now,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: [userVocab.user_id, userVocab.phrase_text, userVocab.phrase_lang],
      set: { status: newStatus, updated_at: now },
    });

  // Auto-create SRS card if a phrase analysis exists and no card yet
  const [phrase] = await db
    .select({ id: phrases.id })
    .from(phrases)
    .where(and(eq(phrases.phrase_text, phrase_text), eq(phrases.phrase_lang, phrase_lang)))
    .limit(1);

  if (phrase) {
    if (newStatus === 'new') {
      // Reset SRS scheduling so card becomes due immediately
      await db.insert(srsCards).values({
        user_id: user.id,
        phrase_id: phrase.id,
        mode: 'recognition',
        due_at: now,
        interval_days: 1,
        ease_factor: 2.5,
        repetitions: 0,
        created_at: now,
      }).onConflictDoUpdate({
        target: [srsCards.user_id, srsCards.phrase_id, srsCards.mode],
        set: { due_at: now, interval_days: 1, ease_factor: 2.5, repetitions: 0 },
      });
    } else {
      await db.insert(srsCards).values({
        user_id: user.id,
        phrase_id: phrase.id,
        mode: 'recognition',
        due_at: now,
        created_at: now,
      }).onConflictDoNothing();
    }
  }

  return NextResponse.json({ success: true });
}
