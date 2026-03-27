'use client';

import type { ClientToken } from '@/types';

export function tokenizeLatin(text: string): ClientToken[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  return Array.from(segmenter.segment(text)).map((seg) => ({
    surface: seg.segment,
    lookup: seg.segment.toLowerCase().replace(new RegExp('[^\\p{L}\\p{N}]', 'gu'), ''),
    isWord: seg.isWordLike ?? false,
    startOffset: seg.index,
  }));
}

export function tokensFromPrecomputed(tokensJson: string): ClientToken[] {
  return JSON.parse(tokensJson) as ClientToken[];
}
