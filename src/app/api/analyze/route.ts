import { NextRequest } from 'next/server';
import { db } from '@/db';
import { phrases } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { MODELS } from '@/lib/models';
import { getLanguageName } from '@/lib/languages';
import { getRequiredUser } from '@/lib/auth-helpers';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function GET(request: NextRequest) {
  const { errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const phrase = searchParams.get('phrase') ?? '';
  const lang = searchParams.get('lang') ?? '';
  const context = searchParams.get('context') ?? '';
  const uiLang = searchParams.get('ui_lang') ?? 'en';

  if (!phrase || !lang) {
    return new Response('Missing phrase or lang', { status: 400 });
  }

  // Check phrase cache first
  const cachedRows = await db
    .select()
    .from(phrases)
    .where(and(eq(phrases.phrase_text, phrase), eq(phrases.phrase_lang, lang)))
    .limit(1);
  const cached = cachedRows[0];

  if (cached?.translation) {
    // Return cached result as SSE burst
    const lines = [
      `TRANSLATION: ${cached.translation}`,
      cached.pronunciation ? `PRONUNCIATION: ${cached.pronunciation}` : null,
      cached.grammar_note ? `GRAMMAR: ${cached.grammar_note}` : null,
      cached.register ? `REGISTER: ${cached.register}` : null,
      cached.frequency_tier ? `FREQUENCY: ${cached.frequency_tier}` : null,
      cached.mnemonic ? `MNEMONIC: ${cached.mnemonic}` : null,
    ].filter(Boolean);

    if (cached.examples) {
      try {
        const examples = JSON.parse(cached.examples) as Array<{
          sentence: string;
          translation: string;
        }>;
        examples.forEach((ex, i) => {
          lines.push(`EXAMPLE_${i + 1}: ${ex.sentence}|||${ex.translation}`);
        });
      } catch {}
    }

    lines.push('DONE');

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(
            encoder.encode(`data: ${line}\n\n`)
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // Call Claude — Haiku for single word, Sonnet for multi-word
  const isMultiWord = phrase.trim().includes(' ');
  const model = isMultiWord ? MODELS.PHRASE_ANALYSIS : MODELS.WORD_DEFINITION;

  const langName = getLanguageName(lang);
  const uiLangName = getLanguageName(uiLang);

  const systemPrompt = `You are a language learning assistant analyzing ${langName} for a ${uiLangName}-speaking learner.
Output EXACTLY the following format. Each section on its own line. Nothing else.

TRANSLATION: <${uiLangName} translation>
PRONUNCIATION: <IPA or pinyin with tone marks or romanization, empty if Latin-script>
GRAMMAR: <1-2 sentence note naming the construction. Written for a learner.>
REGISTER: <formal|neutral|colloquial|vulgar>
FREQUENCY: <CEFR level and 5-word description>
MNEMONIC: <1-sentence memory hook or etymology>
EXAMPLE_1: <${langName} sentence>|||<${uiLangName} translation>
EXAMPLE_2: <${langName} sentence>|||<${uiLangName} translation>
EXAMPLE_3: <${langName} sentence>|||<${uiLangName} translation>`;

  const userMessage = context && context !== phrase
    ? `Analyze "${phrase}" as used in this context: "${context}"`
    : `Analyze "${phrase}"`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          stream: true,
        });

        let buffer = '';
        const emittedLines: string[] = [];

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            buffer += event.delta.text;

            // Emit completed lines
            const lines = buffer.split('\n');
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (line) {
                controller.enqueue(encoder.encode(`data: ${line}\n\n`));
                emittedLines.push(line);
              }
            }
            buffer = lines[lines.length - 1];
          }
        }

        // Emit any remaining line
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(`data: ${buffer.trim()}\n\n`));
          emittedLines.push(buffer.trim());
        }

        controller.enqueue(encoder.encode(`data: DONE\n\n`));

        // Cache the full result (fire-and-forget)
        void cacheAnalysis(phrase, lang, emittedLines);
      } catch {
        controller.enqueue(
          encoder.encode(`data: ERROR: Analysis failed\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function cacheAnalysis(phraseText: string, phraseLang: string, lines: string[]): Promise<void> {
  const fields: Record<string, string> = {};
  const examples: Array<{ sentence: string; translation: string }> = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();

    if (key === 'TRANSLATION') fields.translation = value;
    else if (key === 'PRONUNCIATION') fields.pronunciation = value;
    else if (key === 'GRAMMAR') fields.grammar = value;
    else if (key === 'REGISTER') fields.register = value;
    else if (key === 'FREQUENCY') fields.frequency = value;
    else if (key === 'MNEMONIC') fields.mnemonic = value;
    else if (key.startsWith('EXAMPLE_')) {
      const parts = value.split('|||');
      if (parts.length === 2) {
        examples.push({ sentence: parts[0].trim(), translation: parts[1].trim() });
      }
    }
  }

  if (!fields.translation) return;

  try {
    await db.insert(phrases)
      .values({
        phrase_text: phraseText,
        phrase_lang: phraseLang,
        translation: fields.translation,
        pronunciation: fields.pronunciation || null,
        grammar_note: fields.grammar || null,
        register: fields.register || null,
        frequency_tier: fields.frequency || null,
        mnemonic: fields.mnemonic || null,
        examples: examples.length > 0 ? JSON.stringify(examples) : null,
        created_at: new Date(),
      })
      .onConflictDoNothing();
  } catch {}
}
