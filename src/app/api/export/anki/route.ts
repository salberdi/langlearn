import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { phrases, userVocab } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang');

  // Get all saved vocab with their phrase analysis
  const vocabEntries = lang
    ? db.select().from(userVocab).where(eq(userVocab.phrase_lang, lang)).all()
    : db.select().from(userVocab).all();

  if (vocabEntries.length === 0) {
    return NextResponse.json({ error: 'No vocabulary to export' }, { status: 404 });
  }

  // Fetch phrase data for each vocab entry
  const rows: string[] = [];

  // CSV header
  rows.push('Front,Back,Pronunciation,Grammar,Examples');

  for (const v of vocabEntries) {
    const phrase = db
      .select()
      .from(phrases)
      .where(
        and(
          eq(phrases.phrase_text, v.phrase_text),
          eq(phrases.phrase_lang, v.phrase_lang)
        )
      )
      .get();

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
