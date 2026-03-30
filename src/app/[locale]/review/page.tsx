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

const STATUS_STYLES: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    learning: 'bg-amber-50 text-amber-700 border-amber-200',
    known: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ignored: 'bg-slate-50 text-slate-500 border-slate-200',
};

const STATUS_DOT: Record<string, string> = {
    new: 'bg-blue-500',
    learning: 'bg-amber-400',
    known: 'bg-emerald-500',
    ignored: 'bg-slate-300',
};

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
        return (
            <div className="fade-up space-y-4">
                <div className="skeleton h-8 w-36 rounded-lg" />
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="skeleton h-8 w-20 rounded-full" />
                    ))}
                </div>
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="skeleton h-16 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="fade-up">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-5">{t('title')}</h1>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {STATUS_KEYS.map((f) => {
                    const count = f === 'all' ? vocab.length : vocab.filter((v) => v.status === f).length;
                    const isActive = filter === f;
                    return (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {f !== 'all' && (
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/70' : STATUS_DOT[f]}`} />
                            )}
                            {t(f)}
                            <span className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-slate-500">{t('noVocab')}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((v) => (
                        <div
                            key={v.id}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                        >
                            <div
                                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[v.status] ?? 'bg-slate-300'}`} />
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900 truncate" dir="auto">
                                            {v.phrase_text}
                                        </p>
                                        {v.translation && (
                                            <p className="text-sm text-slate-400 truncate">{v.translation}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                    <select
                                        value={v.status}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) =>
                                            updateStatus(v.phrase_text, v.phrase_lang, e.target.value)
                                        }
                                        className={`text-xs border rounded-full px-2.5 py-1 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                            STATUS_STYLES[v.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}
                                    >
                                        <option value="new">{t('new')}</option>
                                        <option value="learning">{t('learning')}</option>
                                        <option value="known">{t('known')}</option>
                                        <option value="ignored">{t('ignored')}</option>
                                    </select>
                                    <span className="text-slate-300 text-xs">
                                        {expandedId === v.id ? '▲' : '▼'}
                                    </span>
                                </div>
                            </div>

                            {expandedId === v.id && (v.translation || v.pronunciation || v.grammar_note) && (
                                <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-2.5 text-sm">
                                    {v.pronunciation && (
                                        <p className="text-slate-400 italic">{v.pronunciation}</p>
                                    )}
                                    {v.translation && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                                                {t('translation')}
                                            </span>
                                            <p className="text-blue-900 font-medium mt-0.5">{v.translation}</p>
                                        </div>
                                    )}
                                    {v.grammar_note && (
                                        <div>
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('grammar')}</span>
                                            <p className="text-slate-700 mt-0.5">{v.grammar_note}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3">
                                        {v.register && (
                                            <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 font-medium">
                                                {t('register')}: {v.register}
                                            </span>
                                        )}
                                        {v.frequency_tier && (
                                            <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 font-medium">
                                                {t('frequency')}: {v.frequency_tier}
                                            </span>
                                        )}
                                    </div>
                                    {v.mnemonic && (
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">{t('mnemonic')}</span>
                                            <p className="text-amber-900 text-sm mt-0.5">{v.mnemonic}</p>
                                        </div>
                                    )}
                                    {parseExamples(v.examples).length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{t('examples')}</p>
                                            <ul className="space-y-2">
                                                {parseExamples(v.examples).map((ex, i) => (
                                                    <li key={i} className="border-l-2 border-slate-200 pl-3">
                                                        <p dir="auto" className="text-slate-800">{ex.sentence}</p>
                                                        <p className="text-slate-400 text-xs mt-0.5">{ex.translation}</p>
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
