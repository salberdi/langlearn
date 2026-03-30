'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getLanguageName } from '@/lib/languages';

interface Book {
    id: number;
    title: string;
    author: string | null;
    document_lang: string;
    study_lang: string;
    total_chunks: number;
    created_at: string;
    chunk_index: number | null;
}

// Generate a consistent accent color from a string
function getAccentColor(str: string): string {
    const colors = [
        'from-blue-500 to-blue-600',
        'from-violet-500 to-violet-600',
        'from-emerald-500 to-emerald-600',
        'from-rose-500 to-rose-600',
        'from-amber-500 to-amber-600',
        'from-cyan-500 to-cyan-600',
        'from-indigo-500 to-indigo-600',
        'from-teal-500 to-teal-600',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export default function LibraryPage() {
    const t = useTranslations('Library');
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/books')
            .then((r) => r.json())
            .then(setBooks)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="fade-up">
                <div className="flex items-center justify-between mb-6">
                    <div className="skeleton h-8 w-32" />
                    <div className="skeleton h-9 w-28 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton h-40 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="fade-up">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
                <a
                    href="/upload"
                    className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
                >
                    <span className="text-base leading-none">+</span>
                    {t('uploadBook')}
                </a>
            </div>

            {books.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">📖</div>
                    <p className="text-lg font-semibold text-slate-700 mb-1">{t('noBooks')}</p>
                    <p className="text-slate-400 text-sm">{t('noBooksHint')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {books.map((book) => {
                        const progress = book.chunk_index ?? 0;
                        const percent =
                            book.total_chunks > 0
                                ? Math.round((progress / book.total_chunks) * 100)
                                : 0;
                        const accent = getAccentColor(book.title);
                        const initials = book.title
                            .split(' ')
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase();

                        return (
                            <a
                                key={book.id}
                                href={`/read/${book.id}`}
                                className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                                {/* Colored header strip */}
                                <div className={`bg-gradient-to-r ${accent} px-4 py-3 flex items-center gap-3`}>
                                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white text-sm leading-tight truncate">
                                            {book.title}
                                        </p>
                                        {book.author && (
                                            <p className="text-white/70 text-xs truncate">{book.author}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Card body */}
                                <div className="px-4 py-3 flex-1">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5 font-medium">
                                            {getLanguageName(book.document_lang)}
                                            <span className="text-slate-300">→</span>
                                            {getLanguageName(book.study_lang)}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500">{percent}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5">
                                        {progress} / {book.total_chunks} sections
                                    </p>
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
