'use client';

import { useState, useEffect, useCallback } from 'react';
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
    return <p className="text-gray-500">Loading study session...</p>;
  }

  if (sessionDone) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Session Complete</h1>
        <p className="text-gray-500 mb-2">
          {reviewed > 0
            ? `You reviewed ${reviewed} card${reviewed !== 1 ? 's' : ''}.`
            : 'No cards due for review.'}
        </p>
        <a
          href="/"
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Library
        </a>
      </div>
    );
  }

  const card = cards[currentIdx];
  const isCloze = card.mode === 'cloze';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-semibold">Study</h1>
        <span className="text-sm text-gray-400">
          {currentIdx + 1} / {cards.length}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[300px] flex flex-col justify-between">
        {/* Front */}
        <div className="text-center">
          {isCloze && card.context_html ? (
            <p className="text-lg" dir="auto">
              {card.context_html.replace(
                card.phrase_text,
                '______'
              )}
            </p>
          ) : (
            <p className="text-2xl font-bold" dir="auto">
              {card.phrase_text}
            </p>
          )}
          {card.pronunciation && !revealed && (
            <p className="text-gray-400 mt-2">{card.pronunciation}</p>
          )}
        </div>

        {/* Back (revealed) */}
        {revealed ? (
          <div className="mt-6 space-y-3">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-lg font-medium text-blue-800">
                {card.translation}
              </p>
            </div>
            {card.grammar_note && (
              <p className="text-sm text-gray-600">{card.grammar_note}</p>
            )}
            {card.examples && (() => {
              try {
                const exs = JSON.parse(card.examples) as Array<{ sentence: string; translation: string }>;
                return (
                  <div className="text-sm space-y-1">
                    {exs.slice(0, 2).map((ex, i) => (
                      <div key={i}>
                        <p dir="auto" className="font-medium">{ex.sentence}</p>
                        <p className="text-gray-500">{ex.translation}</p>
                      </div>
                    ))}
                  </div>
                );
              } catch {
                return null;
              }
            })()}

            {/* Grading buttons */}
            <div className="grid grid-cols-4 gap-2 pt-4">
              <button
                onClick={() => gradeCard(1)}
                className="py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium"
              >
                Again
              </button>
              <button
                onClick={() => gradeCard(3)}
                className="py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium"
              >
                Hard
              </button>
              <button
                onClick={() => gradeCard(4)}
                className="py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium"
              >
                Good
              </button>
              <button
                onClick={() => gradeCard(5)}
                className="py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
              >
                Easy
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="mt-6 w-full py-3 bg-gray-100 rounded-lg text-gray-700 font-medium hover:bg-gray-200"
          >
            Reveal
          </button>
        )}
      </div>
    </div>
  );
}
