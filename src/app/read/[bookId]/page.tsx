'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import ChunkRenderer from '@/components/reader/ChunkRenderer';
import AnalysisSheet from '@/components/reader/AnalysisSheet';
import { useChunk } from '@/hooks/useChunk';
import { usePrefetch } from '@/hooks/usePrefetch';

interface BookData {
  id: number;
  title: string;
  author: string;
  document_lang: string;
  study_lang: string;
  ui_lang: string;
  is_rtl: boolean;
  total_chunks: number;
  current_chunk: number;
  scroll_y: number;
}

export default function ReaderPage() {
  const params = useParams();
  const bookId = parseInt(params.bookId as string, 10);

  const [book, setBook] = useState<BookData | null>(null);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [vocabStatuses, setVocabStatuses] = useState<Record<string, string>>({});

  // Analysis sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState('');
  const [selectedLang, setSelectedLang] = useState('');
  const [selectedContext, setSelectedContext] = useState('');

  const scrollRestored = useRef(false);

  // Load book data
  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then((r) => r.json())
      .then((data) => {
        setBook(data);
        setChunkIndex(data.current_chunk ?? 0);
      });
  }, [bookId]);

  const { chunk, loading, error, saveProgress } = useChunk(bookId, chunkIndex);

  // Prefetch next chunk
  usePrefetch(bookId, chunkIndex, book?.total_chunks ?? 0);

  // Restore scroll position
  useEffect(() => {
    if (chunk?.translated_html && book && !scrollRestored.current) {
      scrollRestored.current = true;
      if (book.scroll_y > 0) {
        setTimeout(() => window.scrollTo(0, book.scroll_y), 100);
      }
    }
  }, [chunk, book]);

  // Save progress on scroll (debounced)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function handleScroll() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        saveProgress(window.scrollY);
      }, 2000);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, [saveProgress]);

  // Fetch vocab statuses when chunk loads
  useEffect(() => {
    if (!chunk?.translated_html || !book) return;
    fetch(`/api/vocab?lang=${book.study_lang}`)
      .then((r) => r.json())
      .then((data: Array<{ phrase_text: string; status: string }>) => {
        const map: Record<string, string> = {};
        for (const v of data) {
          map[v.phrase_text.toLowerCase()] = v.status;
        }
        setVocabStatuses(map);
      })
      .catch(() => {});
  }, [chunk, book]);

  const handlePhraseSelect = useCallback(
    (phrase: string, lang: string, context: string) => {
      setSelectedPhrase(phrase);
      setSelectedLang(lang);
      setSelectedContext(context);
      setSheetOpen(true);
    },
    []
  );

  const handleSaveVocab = useCallback(
    async (phrase: string, lang: string) => {
      await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase_text: phrase, phrase_lang: lang }),
      });
      setVocabStatuses((prev) => ({
        ...prev,
        [phrase.toLowerCase()]: 'new',
      }));
    },
    []
  );

  function goToChunk(index: number) {
    setSheetOpen(false);
    scrollRestored.current = false;
    setChunkIndex(index);
    window.scrollTo(0, 0);
  }

  if (!book) {
    return <p className="text-gray-500">Loading book...</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">{book.title}</h1>
        <p className="text-sm text-gray-500">
          Chunk {chunkIndex + 1} of {book.total_chunks}
        </p>
      </div>

      {loading && !chunk?.translated_html && (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Translating...</p>
          <p className="text-xs text-gray-400 mt-1">
            This may take a minute for the first chunk
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {chunk?.translated_html && (
        <ChunkRenderer
          translatedHtml={chunk.translated_html}
          tokensJson={chunk.tokens_json}
          studyLang={book.study_lang}
          isRtl={book.is_rtl}
          vocabStatuses={vocabStatuses}
          onPhraseSelect={handlePhraseSelect}
        />
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8 py-4 border-t">
        <button
          onClick={() => goToChunk(chunkIndex - 1)}
          disabled={chunkIndex === 0}
          className="px-4 py-2 text-sm bg-gray-100 rounded-lg disabled:opacity-30"
        >
          Previous
        </button>
        <span className="text-xs text-gray-400">
          {chunkIndex + 1} / {book.total_chunks}
        </span>
        <button
          onClick={() => goToChunk(chunkIndex + 1)}
          disabled={chunkIndex >= book.total_chunks - 1}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-30"
        >
          Next
        </button>
      </div>

      <AnalysisSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        phrase={selectedPhrase}
        lang={selectedLang}
        context={selectedContext}
        onSaveVocab={handleSaveVocab}
      />
    </div>
  );
}
