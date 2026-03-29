'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import BottomSheet from '@/components/ui/BottomSheet';
import type { AnalysisField } from '@/types';

interface AnalysisSheetProps {
  open: boolean;
  onClose: () => void;
  phrase: string;
  lang: string;
  context: string;
  onSaveVocab?: (phrase: string, lang: string) => void;
}

export default function AnalysisSheet({
  open,
  onClose,
  phrase,
  lang,
  context,
  onSaveVocab,
}: AnalysisSheetProps) {
  const t = useTranslations('Analysis');
  const [fields, setFields] = useState<AnalysisField>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!phrase || !open) return;

    setFields({});
    setLoading(true);
    setSaved(false);

    // Close any existing connection
    eventSourceRef.current?.close();

    const params = new URLSearchParams({
      phrase,
      lang,
      context: context.slice(0, 500),
    });

    const es = new EventSource(`/api/analyze?${params}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const line = event.data;
      if (line.startsWith('TRANSLATION:')) {
        setFields((f) => ({ ...f, translation: line.slice(12).trim() }));
      } else if (line.startsWith('PRONUNCIATION:')) {
        setFields((f) => ({ ...f, pronunciation: line.slice(14).trim() }));
      } else if (line.startsWith('GRAMMAR:')) {
        setFields((f) => ({ ...f, grammar: line.slice(8).trim() }));
      } else if (line.startsWith('REGISTER:')) {
        setFields((f) => ({ ...f, register: line.slice(9).trim() }));
      } else if (line.startsWith('FREQUENCY:')) {
        setFields((f) => ({ ...f, frequency: line.slice(10).trim() }));
      } else if (line.startsWith('MNEMONIC:')) {
        setFields((f) => ({ ...f, mnemonic: line.slice(9).trim() }));
      } else if (line.startsWith('EXAMPLE_')) {
        const parts = line.slice(line.indexOf(':') + 1).trim().split('|||');
        if (parts.length === 2) {
          setFields((f) => ({
            ...f,
            examples: [
              ...(f.examples ?? []),
              { sentence: parts[0].trim(), translation: parts[1].trim() },
            ],
          }));
        }
      } else if (line === 'DONE') {
        es.close();
        setLoading(false);
      }
    };

    es.onerror = () => {
      es.close();
      setLoading(false);
    };
  }, [phrase, lang, context, open]);

  useEffect(() => {
    fetchAnalysis();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [fetchAnalysis]);

  function handleSave() {
    onSaveVocab?.(phrase, lang);
    setSaved(true);
  }

  function handleSpeak() {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = lang;
      speechSynthesis.speak(utterance);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold" dir="auto">
            {phrase}
          </h3>
          <button
            onClick={handleSpeak}
            className="text-blue-600 text-sm ml-2 shrink-0"
          >
            {t('listen')}
          </button>
        </div>

        {fields.pronunciation && (
          <p className="text-gray-500 text-sm" dir="auto">
            {fields.pronunciation}
          </p>
        )}

        {fields.translation && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-800">
              {fields.translation}
            </p>
          </div>
        )}

        {fields.grammar && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase">{t('grammar')}</p>
            <p className="text-sm">{fields.grammar}</p>
          </div>
        )}

        {fields.register && (
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">
              {t('register')}: <span className="text-gray-900">{fields.register}</span>
            </span>
            {fields.frequency && (
              <span className="text-gray-500">
                {t('level')}: <span className="text-gray-900">{fields.frequency}</span>
              </span>
            )}
          </div>
        )}

        {fields.mnemonic && (
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-xs font-medium text-yellow-800 uppercase mb-1">
              {t('memoryHook')}
            </p>
            <p className="text-sm text-yellow-900">{fields.mnemonic}</p>
          </div>
        )}

        {fields.examples && fields.examples.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-2">
              {t('examples')}
            </p>
            <div className="space-y-2">
              {fields.examples.map((ex, i) => (
                <div key={i} className="text-sm">
                  <p dir="auto" className="font-medium">
                    {ex.sentence}
                  </p>
                  <p className="text-gray-500">{ex.translation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <p className="text-sm text-gray-400 animate-pulse">{t('analyzing')}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saved}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
        >
          {saved ? t('saved') : t('save')}
        </button>
      </div>
    </BottomSheet>
  );
}
