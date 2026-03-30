'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { SRSQuality } from '@/types';

interface StudyCard {
    card_id: number;
    phrase_id: number;
    mode: string;
    phrase_text: string;
    phrase_lang: string;
    translation: string | null;
    pronunciation: string | null;
    grammar_note: string | null;
    context_html: string | null;
    examples: string | null;
}

export default function StudyPage() {
    const t = useTranslations('Study');
    const [cards, setCards] = useState<StudyCard[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sessionDone, setSessionDone] = useState(false);
    const [reviewed, setReviewed] = useState(0);

    useEffect(() => {
        fetch('/api/srs?limit=20')
            .then((r) => r.json())
            .then((data) => {
                setCards(data);
                if (data.length === 0) setSessionDone(true);
            })
            .finally(() => setLoading(false));
    }, []);

    const gradeCard = useCallback(
        async (quality: SRSQuality) => {
            const card = cards[currentIdx];
            await fetch('/api/srs/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ card_id: card.card_id, quality }),
            });

            setReviewed((r) => r + 1);
            setRevealed(false);

            if (currentIdx + 1 >= cards.length) {
                setSessionDone(true);
            } else {
                setCurrentIdx((i) => i + 1);
            }
        },
        [cards, currentIdx]
    );

    if (loading) {
        return (
            <div className="fade-up space-y-4">
                <div className="skeleton h-8 w-48 rounded-lg" />
                <div className="skeleton h-72 rounded-xl" />
            </div>
        );
    }

    if (sessionDone) {
        return (
            <div className="fade-up flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-4">{reviewed > 0 ? '🎉' : '✅'}</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('sessionComplete')}</h1>
                <p className="text-slate-500 mb-6 max-w-xs">
                    {reviewed > 0
                        ? t('reviewedCards', { count: reviewed })
                        : t('noCardsDue')}
                </p>
                <a
                    href="/"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    ← {t('backToLibrary')}
                </a>
            </div>
        );
    }

    const card = cards[currentIdx];
    const isCloze = card.mode === 'cloze';
    const progressPercent = Math.round((currentIdx / cards.length) * 100);

    return (
        <div className="fade-up">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-base font-semibold text-slate-700">{t('title')}</h1>
                <span className="text-sm font-medium text-slate-400">
                    {currentIdx + 1} / {cards.length}
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-5">
                <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Front — phrase */}
                <div className="px-6 py-8 text-center min-h-[180px] flex flex-col items-center justify-center border-b border-slate-100">
                    {isCloze && card.context_html ? (
                        <p className="text-lg text-slate-800 leading-relaxed" dir="auto">
                            {card.context_html.replace(card.phrase_text, '______')}
                        </p>
                    ) : (
                        <p className="text-3xl font-bold text-slate-900 tracking-tight" dir="auto">
                            {card.phrase_text}
                        </p>
                    )}
                    {card.pronunciation && !revealed && (
                        <p className="text-slate-400 text-sm mt-3">{card.pronunciation}</p>
                    )}
                </div>

                {/* Back (revealed) */}
                <div className="px-6 py-5">
                    {revealed ? (
                        <div className="space-y-4">
                            {/* Translation highlight */}
                            <div className="bg-blue-50 rounded-xl px-4 py-3.5 text-center border border-blue-100">
                                <p className="text-lg font-semibold text-blue-800">
                                    {card.translation}
                                </p>
                            </div>

                            {card.pronunciation && (
                                <p className="text-sm text-slate-400 text-center italic">{card.pronunciation}</p>
                            )}

                            {card.grammar_note && (
                                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                    {card.grammar_note}
                                </p>
                            )}

                            {card.examples && (() => {
                                try {
                                    const exs = JSON.parse(card.examples) as Array<{ sentence: string; translation: string }>;
                                    return (
                                        <div className="space-y-2 text-sm">
                                            {exs.slice(0, 2).map((ex, i) => (
                                                <div key={i} className="border-l-2 border-slate-200 pl-3">
                                                    <p dir="auto" className="font-medium text-slate-800">{ex.sentence}</p>
                                                    <p className="text-slate-400 mt-0.5">{ex.translation}</p>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                } catch {
                                    return null;
                                }
                            })()}

                            {/* Grading buttons */}
                            <div className="grid grid-cols-4 gap-2 pt-2">
                                <button
                                    onClick={() => gradeCard(1)}
                                    className="py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-semibold hover:bg-red-100 active:scale-95 transition-all"
                                >
                                    {t('again')}
                                </button>
                                <button
                                    onClick={() => gradeCard(3)}
                                    className="py-2.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-sm font-semibold hover:bg-amber-100 active:scale-95 transition-all"
                                >
                                    {t('hard')}
                                </button>
                                <button
                                    onClick={() => gradeCard(4)}
                                    className="py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-sm font-semibold hover:bg-emerald-100 active:scale-95 transition-all"
                                >
                                    {t('good')}
                                </button>
                                <button
                                    onClick={() => gradeCard(5)}
                                    className="py-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-sm font-semibold hover:bg-blue-100 active:scale-95 transition-all"
                                >
                                    {t('easy')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setRevealed(true)}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 active:scale-[0.99] transition-all"
                        >
                            {t('reveal')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
