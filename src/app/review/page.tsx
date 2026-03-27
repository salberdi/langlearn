'use client';

import { useState, useEffect } from 'react';

interface VocabEntry {
  id: number;
  phrase_text: string;
  phrase_lang: string;
  status: string;
  created_at: string;
}

export default function ReviewPage() {
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

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

  if (loading) {
    return <p className="text-gray-500">Loading vocabulary...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Vocabulary</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['all', 'new', 'learning', 'known', 'ignored'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all'
              ? ` (${vocab.length})`
              : ` (${vocab.filter((v) => v.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No vocabulary items yet. Tap words while reading to save them.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium" dir="auto">
                  {v.phrase_text}
                </p>
                <p className="text-xs text-gray-400">{v.phrase_lang}</p>
              </div>
              <select
                value={v.status}
                onChange={(e) =>
                  updateStatus(v.phrase_text, v.phrase_lang, e.target.value)
                }
                className="text-sm border border-gray-200 rounded px-2 py-1"
              >
                <option value="new">New</option>
                <option value="learning">Learning</option>
                <option value="known">Known</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
