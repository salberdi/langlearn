const TARGET_WORD_COUNT = 2000;
const MIN_WORD_COUNT = 500;

interface Chunk {
  html: string;
  wordCount: number;
  startCharOffset: number;
  endCharOffset: number;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

export function chunkHtml(fullHtml: string): Chunk[] {
  // Split on paragraph boundaries
  const paragraphPattern = /(<(?:p|h[1-6]|blockquote|div)[^>]*>[\s\S]*?<\/(?:p|h[1-6]|blockquote|div)>)/gi;
  const parts = fullHtml.split(paragraphPattern).filter((s) => s.trim());

  const chunks: Chunk[] = [];
  let currentHtml = '';
  let currentWords = 0;
  let charOffset = 0;
  let chunkStartOffset = 0;

  for (const part of parts) {
    const partWords = countWords(stripTags(part));

    if (
      currentWords + partWords > TARGET_WORD_COUNT &&
      currentWords >= MIN_WORD_COUNT
    ) {
      chunks.push({
        html: currentHtml.trim(),
        wordCount: currentWords,
        startCharOffset: chunkStartOffset,
        endCharOffset: charOffset,
      });
      chunkStartOffset = charOffset;
      currentHtml = '';
      currentWords = 0;
    }

    currentHtml += part;
    currentWords += partWords;
    charOffset += part.length;
  }

  if (currentHtml.trim()) {
    // Merge tiny trailing chunk with previous
    if (currentWords < MIN_WORD_COUNT && chunks.length > 0) {
      const prev = chunks[chunks.length - 1];
      prev.html += currentHtml;
      prev.wordCount += currentWords;
      prev.endCharOffset = charOffset;
    } else {
      chunks.push({
        html: currentHtml.trim(),
        wordCount: currentWords,
        startCharOffset: chunkStartOffset,
        endCharOffset: charOffset,
      });
    }
  }

  return chunks;
}
