'use client';

import { useEffect, useRef } from 'react';

export function usePrefetch(bookId: number, currentChunkIndex: number, totalChunks: number) {
  const prefetched = useRef(new Set<number>());

  useEffect(() => {
    const nextIndex = currentChunkIndex + 1;
    if (nextIndex >= totalChunks) return;
    if (prefetched.current.has(nextIndex)) return;

    prefetched.current.add(nextIndex);

    // Fire prefetch — the server will start translation if needed
    fetch(`/api/chunks/${bookId}/${nextIndex}`)
      .catch(() => {});
  }, [bookId, currentChunkIndex, totalChunks]);
}
