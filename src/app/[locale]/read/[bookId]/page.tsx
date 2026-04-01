'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
    const t = useTranslations('Reader');
    const params = useParams();
    const bookId = parseInt(params.bookId as string, 10);

    const [book, setBook] = useState<BookData | null>(null);
    const [chunkIndex, setChunkIndex] = useState(0);
    const [vocabStatuses, setVocabStatuses] = useState<Record<string, string>>({});

    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedPhrase, setSelectedPhrase] = useState('');
    const [selectedLang, setSelectedLang] = useState('');
    const [selectedContext, setSelectedContext] = useState('');

    const scrollRestored = useRef(false);

    useEffect(() => {
        fetch(`/api/books/${bookId}`)
            .then((r) => r.json())
            .then((data) => {
                setBook(data);
                setChunkIndex(data.current_chunk ?? 0);
            });
    }, [bookId]);

    const { chunk, loading, error, saveProgress } = useChunk(bookId, chunkIndex);

    usePrefetch(bookId, chunkIndex, book?.total_chunks ?? 0);

    useEffect(() => {
        if (chunk?.translated_html && book && !scrollRestored.current) {
            scrollRestored.current = true;
            if (book.scroll_y > 0) {
                setTimeout(() => window.scrollTo(0, book.scroll_y), 100);
            }
        }
    }, [chunk, book]);

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
            .catch(() => { });
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
        return (
            <div className="fade-up space-y-3">
                <div className="skeleton h-6 w-48 rounded-lg" />
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-64 rounded-xl mt-4" />
            </div>
        );
    }

    const progressPercent = book.total_chunks > 0
        ? Math.round((chunkIndex / book.total_chunks) * 100)
        : 0;

    return (
        <div className={`fade-up transition-[margin] duration-300 ${sheetOpen ? 'md:mr-[410px]' : ''}`}>
            {/* Book header */}
            <div className="mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold text-slate-900 leading-tight truncate">{book.title}</h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            {t('chunkOf', { current: chunkIndex + 1, total: book.total_chunks })}
                        </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">
                        {progressPercent}%
                    </span>
                </div>
                <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {loading && !chunk?.translated_html && (
                <div className="text-center py-16">
                    <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">{t('translating')}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                        {t('translatingHint')}
                    </p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                    <span className="shrink-0">⚠️</span>
                    <span>{error}</span>
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
            <div className="flex justify-between items-center mt-10 pt-5 border-t border-slate-100">
                <button
                    onClick={() => goToChunk(chunkIndex - 1)}
                    disabled={chunkIndex === 0}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    ← {t('previous')}
                </button>
                <span className="text-xs text-slate-400 font-medium">
                    {chunkIndex + 1} / {book.total_chunks}
                </span>
                <button
                    onClick={() => goToChunk(chunkIndex + 1)}
                    disabled={chunkIndex >= book.total_chunks - 1}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    {t('next')} →
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
