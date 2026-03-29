'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ChunkData {
  id: number;
  chunk_index: number;
  source_html: string;
  translated_html: string | null;
  tokens_json: string | null;
  translation_status: string;
}

export function useChunk(bookId: number, chunkIndex: number) {
  const [chunk, setChunk] = useState<ChunkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchChunk = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/chunks/${bookId}/${chunkIndex}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load chunk');
        return;
      }

      if (data.translation_status === 'in_progress') {
        setChunk(data);
        timerRef.current = setTimeout(fetchChunk, 3000);
        return;
      }

      setChunk(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [bookId, chunkIndex]);

  useEffect(() => {
    fetchChunk();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchChunk]);

  // Save reading progress
  const saveProgress = useCallback(
    (scrollY: number) => {
      fetch(`/api/chunks/${bookId}/${chunkIndex}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scroll_y: scrollY }),
      }).catch(() => {});
    },
    [bookId, chunkIndex]
  );

  return { chunk, loading, error, saveProgress };
}
