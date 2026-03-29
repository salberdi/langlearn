'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface VocabEntry {
    id: number;
    phrase_text: string;
    phrase_lang: string;
    status: string;
    created_at: string;
    translation: string | null;
    pronunciation: string | null;
    grammar_note: string | null;
    examples: string | null;
    mnemonic: string | null;
    register: string | null;
    frequency_tier: string | null;
}

const STATUS_KEYS = ['all', 'new', 'learning', 'known', 'ignored'] as const;

export default function ReviewPage() {
    const t = useTranslations('Review');
    const [vocab, setVocab] = useState<VocabEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        fetch('/api/vocab')
            .then((r) => r.json())
            .then(setVocab)
            .finally(() => setLoading(false));
    }, []);

    const filtered = filter === 'all' ? vocab : vocab.filter((v) => v.status === filter);

    async function updateStatus(phraseText: string, phraseLang: string, status: string) {
        await fetch('/api/vocab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phrase_text: phraseText,
                phrase_lang: phraseLang,
                status,
            }),
        });
        setVocab((prev) =>
            prev.map((v) =>
                v.phrase_text === phraseText && v.phrase_lang === phraseLang
                    ? { ...v, status }
                    : v
            )
        );
    }

    function parseExamples(examples: string | null): { sentence: string; translation: string }[] {
        if (!examples) return [];
        try {
            return JSON.parse(examples);
        } catch {
            return [];
        }
    }

    if (loading) {
        return <p className="text-gray-500">{t('loading')}</p>;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>

            <div className="flex gap-2 mb-4 overflow-x-auto">
                {STATUS_KEYS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${filter === f
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        {t(f)}
                        {f === 'all'
                            ? ` (${vocab.length})`
                            : ` (${vocab.filter((v) => v.status === f).length})`}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                    {t('noVocab')}
                </p>
            ) : (
                <div className="space-y-2">
                    {filtered.map((v) => (
                        <div
                            key={v.id}
                            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                        >
                            <div
                                className="p-3 flex items-center justify-between cursor-pointer"
                                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="min-w-0">
                                        <p className="font-medium truncate" dir="auto">
                                            {v.phrase_text}
                                        </p>
                                        {v.translation && (
                                            <p className="text-sm text-gray-500 truncate">{v.translation}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <select
                                        value={v.status}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) =>
                                            updateStatus(v.phrase_text, v.phrase_lang, e.target.value)
                                        }
                                        className="text-sm border border-gray-200 rounded px-2 py-1"
                                    >
                                        <option value="new">{t('new')}</option>
                                        <option value="learning">{t('learning')}</option>
                                        <option value="known">{t('known')}</option>
                                        <option value="ignored">{t('ignored')}</option>
                                    </select>
                                    <span className="text-gray-400 text-sm">
                                        {expandedId === v.id ? '▲' : '▼'}
                                    </span>
                                </div>
                            </div>

                            {expandedId === v.id && (v.translation || v.pronunciation || v.grammar_note) && (
                                <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-2 text-sm">
                                    {v.pronunciation && (
                                        <p className="text-gray-500 italic">{v.pronunciation}</p>
                                    )}
                                    {v.translation && (
                                        <div>
                                            <span className="font-medium text-gray-700">{t('translation')}: </span>
                                            {v.translation}
                                        </div>
                                    )}
                                    {v.grammar_note && (
                                        <div>
                                            <span className="font-medium text-gray-700">{t('grammar')}: </span>
                                            {v.grammar_note}
                                        </div>
                                    )}
                                    {v.register && (
                                        <div>
                                            <span className="font-medium text-gray-700">{t('register')}: </span>
                                            {v.register}
                                        </div>
                                    )}
                                    {v.frequency_tier && (
                                        <div>
                                            <span className="font-medium text-gray-700">{t('frequency')}: </span>
                                            {v.frequency_tier}
                                        </div>
                                    )}
                                    {v.mnemonic && (
                                        <div>
                                            <span className="font-medium text-gray-700">{t('mnemonic')}: </span>
                                            {v.mnemonic}
                                        </div>
                                    )}
                                    {parseExamples(v.examples).length > 0 && (
                                        <div>
                                            <p className="font-medium text-gray-700 mb-1">{t('examples')}:</p>
                                            <ul className="space-y-1 pl-3">
                                                {parseExamples(v.examples).map((ex, i) => (
                                                    <li key={i} className="text-gray-600">
                                                        <p dir="auto">{ex.sentence}</p>
                                                        <p className="text-gray-400">{ex.translation}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
