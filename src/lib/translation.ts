import { db } from '@/db';
import { books, chunks, translationMemory, termGlossary } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { MODELS } from './models';
import { getLanguageName } from './languages';
import Anthropic from '@anthropic-ai/sdk';
import type { TranslateResult } from '@/types';

const anthropic = new Anthropic();

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractTM(
  chunk: { source_html: string; translated_html: string | null; id: number },
  book: { id: number; document_lang: string; study_lang: string }
): Promise<void> {
  if (!chunk.translated_html) return;

  const sourceText = chunk.source_html.replace(/<[^>]+>/g, ' ').slice(0, 3000);
  const translatedText = chunk.translated_html.replace(/<[^>]+>/g, ' ').slice(0, 3000);

  const response = await anthropic.messages.create({
    model: MODELS.TM_EXTRACTION,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Extract key term pairs from these parallel texts. Return ONLY lines in the format: SOURCE_TERM ||| TRANSLATED_TERM (one per line, max 20 pairs). Focus on proper nouns, recurring terms, and domain-specific vocabulary.

Source (${getLanguageName(book.document_lang)}):
${sourceText}

Translation (${getLanguageName(book.study_lang)}):
${translatedText}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') return;

  const pairs = content.text
    .split('\n')
    .map((line) => line.split('|||').map((s) => s.trim()))
    .filter((pair) => pair.length === 2 && pair[0] && pair[1]);

  for (const [source, translated] of pairs) {
    db.insert(translationMemory)
      .values({
        book_id: book.id,
        source_phrase: source,
        translated_phrase: translated,
      })
      .onConflictDoUpdate({
        target: [translationMemory.book_id, translationMemory.source_phrase],
        set: {
          frequency: db
            .select({ f: translationMemory.frequency })
            .from(translationMemory)
            .where(
              and(
                eq(translationMemory.book_id, book.id),
                eq(translationMemory.source_phrase, source)
              )
            )
            .get()
            ? undefined
            : undefined,
        },
      })
      .run();
  }
}

async function callClaudeTranslation(
  sourceHtml: string,
  book: {
    document_lang: string;
    study_lang: string;
    dialect_notes: string | null;
    style_notes: string | null;
  },
  tmEntries: Array<{ source_phrase: string; translated_phrase: string }>,
  glossaryEntries: Array<{
    source_term: string;
    preferred_translation: string;
  }>
): Promise<string> {
  const systemParts: string[] = [
    `You are a professional literary translator.`,
    `Source language: ${getLanguageName(book.document_lang)}`,
    `Target language: ${getLanguageName(book.study_lang)}`,
  ];

  if (book.dialect_notes) {
    systemParts.push(book.dialect_notes);
  }
  if (book.style_notes) {
    systemParts.push(book.style_notes);
  }

  if (glossaryEntries.length > 0) {
    systemParts.push(
      '\nUSER GLOSSARY (highest priority — always use these):'
    );
    for (const g of glossaryEntries) {
      systemParts.push(`${g.source_term} → ${g.preferred_translation}`);
    }
  }

  if (tmEntries.length > 0) {
    systemParts.push(
      '\nCONSISTENCY GLOSSARY (from translation memory — use these unless overridden above):'
    );
    for (const tm of tmEntries) {
      systemParts.push(`${tm.source_phrase} → ${tm.translated_phrase}`);
    }
  }

  const response = await anthropic.messages.create({
    model: MODELS.TRANSLATION,
    max_tokens: 8192,
    system: systemParts.join('\n'),
    messages: [
      {
        role: 'user',
        content: `Translate the following HTML. Rules:
- Preserve ALL HTML tags exactly (<p>, <em>, <strong>, <blockquote>, <h1>–<h6>)
- Translate only text content inside tags
- Do NOT add markdown asterisks, underscores, or extra formatting
- Return only the translated HTML, no preamble or commentary

${sourceHtml}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response format from Claude');
}

async function pollForTranslation(
  chunkId: number
): Promise<TranslateResult> {
  const STALE_SECONDS = 300;
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    const c = db.select().from(chunks).where(eq(chunks.id, chunkId)).get()!;
    if (c.translation_status === 'complete') {
      return {
        translatedHtml: c.translated_html!,
        tokensJson: c.tokens_json,
      };
    }
    if (c.translation_status === 'error') {
      throw new Error('Translation failed');
    }
    if (
      c.translation_status === 'in_progress' &&
      (c.translation_started_at ?? 0) < unixNow() - STALE_SECONDS
    ) {
      // Stale lock — reset and retry
      db.update(chunks)
        .set({ translation_status: 'pending' })
        .where(eq(chunks.id, chunkId))
        .run();
      return translateChunk(chunkId);
    }
  }
  throw new Error('Translation polling timeout');
}

export async function translateChunk(
  chunkId: number
): Promise<TranslateResult> {
  // Optimistic lock
  const locked = db
    .update(chunks)
    .set({
      translation_status: 'in_progress',
      translation_started_at: unixNow(),
    })
    .where(and(eq(chunks.id, chunkId), eq(chunks.translation_status, 'pending')))
    .run();

  if (locked.changes === 0) {
    // Another process is translating — check if complete or poll
    const existing = db
      .select()
      .from(chunks)
      .where(eq(chunks.id, chunkId))
      .get();
    if (existing?.translation_status === 'complete') {
      return {
        translatedHtml: existing.translated_html!,
        tokensJson: existing.tokens_json,
      };
    }
    return pollForTranslation(chunkId);
  }

  try {
    const chunk = db.select().from(chunks).where(eq(chunks.id, chunkId)).get()!;
    const book = db
      .select()
      .from(books)
      .where(eq(books.id, chunk.book_id))
      .get()!;

    // Lazy TM extraction for previous chunk
    const prevChunk = db
      .select()
      .from(chunks)
      .where(
        and(
          eq(chunks.book_id, book.id),
          eq(chunks.chunk_index, chunk.chunk_index - 1),
          eq(chunks.tm_extracted, false)
        )
      )
      .get();

    if (prevChunk?.translated_html) {
      await extractTM(prevChunk, book);
      db.update(chunks)
        .set({ tm_extracted: true })
        .where(eq(chunks.id, prevChunk.id))
        .run();
    }

    // Build TM + glossary for prompt
    const tmEntries = db
      .select()
      .from(translationMemory)
      .where(eq(translationMemory.book_id, book.id))
      .orderBy(desc(translationMemory.frequency))
      .limit(30)
      .all();
    const glossaryEntries = db
      .select()
      .from(termGlossary)
      .where(eq(termGlossary.book_id, book.id))
      .all();

    // Translate
    const translatedHtml = await callClaudeTranslation(
      chunk.source_html,
      book,
      tmEntries,
      glossaryEntries
    );

    // Pre-compute tokens for CJK
    let tokensJson: string | null = null;
    const langBase = book.study_lang.split('-')[0];
    if (langBase === 'ja') {
      const { tokenizeJapaneseServer } = await import('./tokenizer-server');
      const stripped = translatedHtml.replace(/<[^>]+>/g, ' ');
      tokensJson = JSON.stringify(await tokenizeJapaneseServer(stripped));
    } else if (langBase === 'zh') {
      const { tokenizeChineseServer } = await import('./tokenizer-server');
      const stripped = translatedHtml.replace(/<[^>]+>/g, ' ');
      tokensJson = JSON.stringify(await tokenizeChineseServer(stripped));
    }

    // Persist
    db.update(chunks)
      .set({
        translated_html: translatedHtml,
        tokens_json: tokensJson,
        translation_status: 'complete',
      })
      .where(eq(chunks.id, chunkId))
      .run();

    return { translatedHtml, tokensJson };
  } catch (error) {
    db.update(chunks)
      .set({ translation_status: 'error' })
      .where(eq(chunks.id, chunkId))
      .run();
    throw error;
  }
}
