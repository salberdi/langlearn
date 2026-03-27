import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, chunks } from '@/db/schema';
import { parseEpub, parseTxt } from '@/lib/epub-parser';
import { chunkHtml } from '@/lib/chunker';
import { MODELS } from '@/lib/models';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

async function detectLanguage(text: string): Promise<string> {
  const sample = text.slice(0, 1000);
  const response = await anthropic.messages.create({
    model: MODELS.LANG_DETECTION,
    max_tokens: 20,
    messages: [
      {
        role: 'user',
        content: `What language is this text written in? Reply with ONLY the BCP-47 language code (e.g., "en", "es", "ja", "zh", "ru"). Text:\n\n${sample}`,
      },
    ],
  });
  const content = response.content[0];
  if (content.type === 'text') {
    return content.text.trim().toLowerCase().replace(/[^a-z-]/g, '');
  }
  return 'en';
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const studyLang = formData.get('study_lang') as string | null;
  const uiLang = (formData.get('ui_lang') as string) || 'en';
  const dialectNotes = formData.get('dialect_notes') as string | null;
  const styleNotes = formData.get('style_notes') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!studyLang) {
    return NextResponse.json(
      { error: 'study_lang is required' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large (max 50MB)' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name.toLowerCase();

  let parsed;
  if (filename.endsWith('.epub')) {
    parsed = parseEpub(buffer);
  } else if (filename.endsWith('.txt')) {
    parsed = parseTxt(buffer.toString('utf8'), file.name);
  } else {
    return NextResponse.json(
      { error: 'Unsupported file type. Upload EPUB or TXT.' },
      { status: 400 }
    );
  }

  if (parsed.drmDetected) {
    return NextResponse.json(
      {
        error:
          'This EPUB appears to be DRM-protected. Try a DRM-free source like Project Gutenberg.',
      },
      { status: 422 }
    );
  }

  if (parsed.chapters.length === 0) {
    return NextResponse.json(
      { error: 'No readable content found in file' },
      { status: 400 }
    );
  }

  // Combine all chapter HTML
  const fullHtml = parsed.chapters.map((ch) => ch.html).join('\n');

  // Detect document language
  const plainText = fullHtml.replace(/<[^>]+>/g, ' ').slice(0, 2000);
  const documentLang = await detectLanguage(plainText);

  // Chunk the content
  const contentChunks = chunkHtml(fullHtml);

  const now = new Date();

  // Determine RTL
  const { isRtl } = await import('@/lib/languages');
  const rtl = isRtl(studyLang);

  // Insert book
  const bookResult = db
    .insert(books)
    .values({
      title: parsed.title || file.name.replace(/\.[^.]+$/, ''),
      author: parsed.author || null,
      document_lang: documentLang,
      study_lang: studyLang,
      ui_lang: uiLang,
      is_rtl: rtl,
      dialect_notes: dialectNotes,
      style_notes: styleNotes,
      total_chunks: contentChunks.length,
      created_at: now,
      updated_at: now,
    })
    .returning()
    .get();

  // Insert chunks
  for (let i = 0; i < contentChunks.length; i++) {
    const chunk = contentChunks[i];
    db.insert(chunks)
      .values({
        book_id: bookResult.id,
        chunk_index: i,
        source_html: chunk.html,
        start_char_offset: chunk.startCharOffset,
        end_char_offset: chunk.endCharOffset,
        word_count: chunk.wordCount,
        created_at: now,
      })
      .run();
  }

  return NextResponse.json({
    id: bookResult.id,
    title: bookResult.title,
    author: bookResult.author,
    document_lang: documentLang,
    study_lang: studyLang,
    total_chunks: contentChunks.length,
  });
}
