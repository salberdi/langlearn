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
        return <p className="text-gray-500">{t('loading')}</p>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <a
                    href="/upload"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                    {t('uploadBook')}
                </a>
            </div>

            {books.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <p className="text-lg mb-2">{t('noBooks')}</p>
                    <p>{t('noBooksHint')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {books.map((book) => {
                        const progress = book.chunk_index ?? 0;
                        const percent =
                            book.total_chunks > 0
                                ? Math.round((progress / book.total_chunks) * 100)
                                : 0;

                        return (
                            <a
                                key={book.id}
                                href={`/read/${book.id}`}
                                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="font-semibold">{book.title}</h2>
                                        {book.author && (
                                            <p className="text-sm text-gray-500">{book.author}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {getLanguageName(book.document_lang)} →{' '}
                                            {getLanguageName(book.study_lang)}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-400">{percent}%</span>
                                </div>
                                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
