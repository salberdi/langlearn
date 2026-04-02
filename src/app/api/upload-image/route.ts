import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, chunks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { chunkHtml } from '@/lib/chunker';
import { MODELS } from '@/lib/models';
import { getRequiredUser } from '@/lib/auth-helpers';
import { uploadToS3 } from '@/lib/s3';
import { isRtl } from '@/lib/languages';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB (Claude vision limit)
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type SupportedMediaType = (typeof SUPPORTED_TYPES)[number];

function isSupportedType(mime: string): mime is SupportedMediaType {
  return (SUPPORTED_TYPES as readonly string[]).includes(mime);
}

async function extractTextFromImage(
  base64Data: string,
  mediaType: SupportedMediaType
): Promise<{ html: string; title: string; detectedLang: string }> {
  const response = await anthropic.messages.create({
    model: MODELS.IMAGE_OCR,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: `Extract ALL visible text from this image. Format your response as follows:

TITLE: <a short descriptive title for this content, or "Untitled Image" if unclear>
LANG: <BCP-47 language code of the main text, e.g. "en", "es", "ja">
CONTENT:
<the extracted text, formatted as HTML paragraphs using <p> tags. Preserve paragraph breaks, headings (use <h1>-<h3>), lists (use <ul>/<li>), and other structure where visible. Do not add any commentary — only output the text exactly as it appears in the image.>`,
          },
        ],
      },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';

  const titleMatch = raw.match(/^TITLE:\s*(.+)$/m);
  const langMatch = raw.match(/^LANG:\s*([a-z-]+)/m);
  const contentMatch = raw.match(/^CONTENT:\s*\n([\s\S]+)$/m);

  const title = titleMatch?.[1]?.trim() || 'Untitled Image';
  const detectedLang = langMatch?.[1]?.trim().toLowerCase() || 'en';
  let html = contentMatch?.[1]?.trim() || raw;

  // If content isn't wrapped in block tags, wrap each line as a paragraph
  if (!/<(p|h[1-6]|ul|ol|blockquote)/i.test(html)) {
    html = html
      .split(/\n{2,}/)
      .map((line) => `<p>${line.trim()}</p>`)
      .filter((p) => p !== '<p></p>')
      .join('\n');
  }

  return { html, title, detectedLang };
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const formData = await request.formData();
  const files = formData.getAll('file').filter((f): f is File => f instanceof File);
  const studyLang = formData.get('study_lang') as string | null;
  const uiLang = (formData.get('ui_lang') as string) || 'en';
  const dialectNotes = formData.get('dialect_notes') as string | null;
  const styleNotes = formData.get('style_notes') as string | null;

  if (!files.length) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!studyLang) {
    return NextResponse.json({ error: 'study_lang is required' }, { status: 400 });
  }

  for (const file of files) {
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `"${file.name}" is too large (max 5MB per image)` },
        { status: 400 }
      );
    }
    if (!isSupportedType(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.' },
        { status: 400 }
      );
    }
  }

  // Read all file buffers
  const buffers = await Promise.all(files.map((f) => f.arrayBuffer().then((ab) => Buffer.from(ab))));

  // OCR all images concurrently via Claude vision
  let ocrResults: { html: string; title: string; detectedLang: string }[];
  try {
    ocrResults = await Promise.all(
      files.map((file, i) => extractTextFromImage(buffers[i].toString('base64'), file.type))
    );
  } catch (err) {
    console.error('[upload-image] OCR failed:', err);
    return NextResponse.json(
      { error: 'Failed to extract text from image. Please try a clearer image.' },
      { status: 422 }
    );
  }

  // Combine all OCR results into a single document
  const fullHtml = ocrResults.map((r) => r.html).join('\n');
  const title = ocrResults[0].title;
  const documentLang = ocrResults[0].detectedLang;

  if (!fullHtml.trim()) {
    return NextResponse.json(
      { error: 'No text found in the image(s).' },
      { status: 422 }
    );
  }

  const contentChunks = chunkHtml(fullHtml);
  const rtl = isRtl(studyLang);
  const now = new Date();

  const bookRows = await db
    .insert(books)
    .values({
      user_id: user.id,
      title,
      author: null,
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
    .returning();
  const bookResult = bookRows[0];

  // Archive all images to S3 (fire-and-forget, don't block response)
  Promise.allSettled(
    files.map(async (file, i) => {
      const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
      const s3Key = `uploads/${user.id}/${bookResult.id}/original_${i}.${ext}`;
      await uploadToS3(s3Key, buffers[i], file.type);
      if (i === 0) {
        await db.update(books).set({ upload_s3_key: s3Key }).where(eq(books.id, bookResult.id));
      }
    })
  ).catch((err) => console.error('[upload-image] S3 archival failed:', err));

  // Insert chunks
  await db.insert(chunks).values(
    contentChunks.map((chunk, i) => ({
      book_id: bookResult.id,
      chunk_index: i,
      source_html: chunk.html,
      start_char_offset: chunk.startCharOffset,
      end_char_offset: chunk.endCharOffset,
      word_count: chunk.wordCount,
      created_at: now,
    }))
  );

  return NextResponse.json({
    id: bookResult.id,
    title: bookResult.title,
    document_lang: documentLang,
    study_lang: studyLang,
    total_chunks: contentChunks.length,
  });
}
