'use client';

import { useState, useEffect } from 'react';
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

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium mb-1">{t('fileLabel')}</label>
                    <input
                        type="file"
                        accept=".epub,.txt"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm border border-gray-300 rounded-lg p-2"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        {t('studyLangLabel')}
                    </label>
                    <select
                        value={studyLang}
                        onChange={(e) => setStudyLang(e.target.value)}
                        className="block w-full border border-gray-300 rounded-lg p-2 text-sm"
                    >
                        {languages.map((l) => (
                            <option key={l.code} value={l.code}>
                                {l.name} ({l.code})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        {t('dialectLabel')}
                    </label>
                    <input
                        type="text"
                        value={dialectNotes}
                        onChange={(e) => setDialectNotes(e.target.value)}
                        placeholder={t('dialectPlaceholder')}
                        className="block w-full border border-gray-300 rounded-lg p-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        {t('styleLabel')}
                    </label>
                    <input
                        type="text"
                        value={styleNotes}
                        onChange={(e) => setStyleNotes(e.target.value)}
                        placeholder={t('stylePlaceholder')}
                        className="block w-full border border-gray-300 rounded-lg p-2 text-sm"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!file || uploading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? t('uploading') : t('uploadBtn')}
                </button>
            </form>
        </div>
    );
}
