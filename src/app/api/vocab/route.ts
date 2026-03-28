import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userVocab } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getRequiredUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const lang = request.nextUrl.searchParams.get('lang');

  const query = lang
    ? await db
        .select()
        .from(userVocab)
        .where(and(eq(userVocab.user_id, user.id), eq(userVocab.phrase_lang, lang)))
    : await db.select().from(userVocab).where(eq(userVocab.user_id, user.id));

  return NextResponse.json(query);
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

  return NextResponse.json({ success: true });
}
