import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { phrases, userVocab } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getRequiredUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const lang = request.nextUrl.searchParams.get('lang');

  // Get all saved vocab with their phrase analysis
  const vocabEntries = lang
    ? await db.select().from(userVocab).where(and(eq(userVocab.user_id, user.id), eq(userVocab.phrase_lang, lang)))
    : await db.select().from(userVocab).where(eq(userVocab.user_id, user.id));

  if (vocabEntries.length === 0) {
    return NextResponse.json({ error: 'No vocabulary to export' }, { status: 404 });
  }

  // Fetch all phrase data in one query
  const phraseKeys = vocabEntries.map((v) => v.phrase_text);
  const phraseRows = await db
    .select()
    .from(phrases)
    .where(
      and(
        inArray(phrases.phrase_text, phraseKeys),
        lang ? eq(phrases.phrase_lang, lang) : undefined
      )
    );
  const phraseMap = new Map(phraseRows.map((p) => [`${p.phrase_text}|${p.phrase_lang}`, p]));

  // CSV header
  const rows: string[] = ['Front,Back,Pronunciation,Grammar,Examples'];

  for (const v of vocabEntries) {
    const phrase = phraseMap.get(`${v.phrase_text}|${v.phrase_lang}`);

    const front = csvEscape(v.phrase_text);
    const back = csvEscape(phrase?.translation ?? '');
    const pronunciation = csvEscape(phrase?.pronunciation ?? '');
    const grammar = csvEscape(phrase?.grammar_note ?? '');

    let examples = '';
    if (phrase?.examples) {
      try {
        const exArr = JSON.parse(phrase.examples) as Array<{
          sentence: string;
          translation: string;
        }>;
        examples = csvEscape(
          exArr.map((e) => `${e.sentence} — ${e.translation}`).join('<br>')
        );
      } catch {}
    }

    rows.push(`${front},${back},${pronunciation},${grammar},${examples}`);
  }

  const csv = rows.join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="langlearn-vocab-${lang ?? 'all'}.csv"`,
    },
  });
}

function csvEscape(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
