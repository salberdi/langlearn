import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userVocab } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang');

  const query = lang
    ? db
        .select()
        .from(userVocab)
        .where(eq(userVocab.phrase_lang, lang))
        .all()
    : db.select().from(userVocab).all();

  return NextResponse.json(query);
}

export async function POST(request: NextRequest) {
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

  db.insert(userVocab)
    .values({
      phrase_text,
      phrase_lang,
      status: newStatus,
      created_at: now,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: [userVocab.phrase_text, userVocab.phrase_lang],
      set: { status: newStatus, updated_at: now },
    })
    .run();

  return NextResponse.json({ success: true });
}
