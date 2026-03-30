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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-slate-900 leading-tight" dir="auto">
              {phrase}
            </h3>
            {fields.pronunciation && (
              <p className="text-slate-400 text-sm mt-1" dir="auto">
                {fields.pronunciation}
              </p>
            )}
          </div>
          <button
            onClick={handleSpeak}
            className="shrink-0 flex items-center gap-1.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            🔊 {t('listen')}
          </button>
        </div>

        {/* Translation */}
        {fields.translation && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">
              Translation
            </p>
            <p className="text-lg font-semibold text-blue-900">
              {fields.translation}
            </p>
          </div>
        )}

        {/* Grammar */}
        {fields.grammar && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('grammar')}</p>
            <p className="text-sm text-slate-700">{fields.grammar}</p>
          </div>
        )}

        {/* Register + Frequency tags */}
        {(fields.register || fields.frequency) && (
          <div className="flex flex-wrap gap-2">
            {fields.register && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1 font-medium">
                {t('register')}: {fields.register}
              </span>
            )}
            {fields.frequency && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1 font-medium">
                {t('level')}: {fields.frequency}
              </span>
            )}
          </div>
        )}

        {/* Mnemonic */}
        {fields.mnemonic && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">
              💡 {t('memoryHook')}
            </p>
            <p className="text-sm text-amber-900">{fields.mnemonic}</p>
          </div>
        )}

        {/* Examples */}
        {fields.examples && fields.examples.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              {t('examples')}
            </p>
            <div className="space-y-2.5">
              {fields.examples.map((ex, i) => (
                <div key={i} className="border-l-2 border-blue-200 pl-3">
                  <p dir="auto" className="text-sm font-medium text-slate-800">
                    {ex.sentence}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{ex.translation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
            {t('analyzing')}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saved}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
            saved
              ? 'bg-slate-100 text-slate-400 cursor-default'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm'
          }`}
        >
          {saved ? `✓ ${t('saved')}` : t('save')}
        </button>
      </div>
    </BottomSheet>
  );
}
