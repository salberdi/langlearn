'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Language {
    code: string;
    name: string;
}

export default function UploadPage() {
    const t = useTranslations('Upload');
    const router = useRouter();
    const [languages, setLanguages] = useState<Language[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [studyLang, setStudyLang] = useState('es');
    const [dialectNotes, setDialectNotes] = useState('');
    const [styleNotes, setStyleNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch('/api/languages')
            .then((r) => r.json())
            .then(setLanguages);
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('study_lang', studyLang);
        if (dialectNotes) formData.append('dialect_notes', dialectNotes);
        if (styleNotes) formData.append('style_notes', styleNotes);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || t('uploadFailed'));
                return;
            }

            router.push(`/read/${data.id}`);
        } catch {
            setError(t('uploadFailedRetry'));
        } finally {
            setUploading(false);
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped && (dropped.name.endsWith('.epub') || dropped.name.endsWith('.txt'))) {
            setFile(dropped);
        }
    }

    return (
        <div className="fade-up max-w-lg">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
                <p className="text-slate-500 text-sm mt-1">Upload an EPUB or TXT file to start reading</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* File drop zone */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('fileLabel')}</label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-150 px-6 py-8 text-center ${
                            isDragOver
                                ? 'border-blue-400 bg-blue-50'
                                : file
                                ? 'border-emerald-300 bg-emerald-50'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".epub,.txt"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="sr-only"
                            required
                        />
                        {file ? (
                            <div>
                                <div className="text-3xl mb-2">📄</div>
                                <p className="font-semibold text-emerald-700 text-sm">{file.name}</p>
                                <p className="text-emerald-500 text-xs mt-1">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB — click to change
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className="text-3xl mb-2">📂</div>
                                <p className="font-semibold text-slate-700 text-sm">
                                    {isDragOver ? 'Drop your file here' : 'Drag & drop or click to browse'}
                                </p>
                                <p className="text-slate-400 text-xs mt-1">EPUB or TXT files</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Study language */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {t('studyLangLabel')}
                    </label>
                    <select
                        value={studyLang}
                        onChange={(e) => setStudyLang(e.target.value)}
                        className="block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                    >
                        {languages.map((l) => (
                            <option key={l.code} value={l.code}>
                                {l.name} ({l.code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Optional fields */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Optional hints</p>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            {t('dialectLabel')}
                        </label>
                        <input
                            type="text"
                            value={dialectNotes}
                            onChange={(e) => setDialectNotes(e.target.value)}
                            placeholder={t('dialectPlaceholder')}
                            className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            {t('styleLabel')}
                        </label>
                        <input
                            type="text"
                            value={styleNotes}
                            onChange={(e) => setStyleNotes(e.target.value)}
                            placeholder={t('stylePlaceholder')}
                            className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!file || uploading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    {uploading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('uploading')}
                        </span>
                    ) : (
                        t('uploadBtn')
                    )}
                </button>
            </form>
        </div>
    );
}
