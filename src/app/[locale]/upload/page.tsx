'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Language {
    code: string;
    name: string;
}

type Tab = 'book' | 'image';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export default function UploadPage() {
    const t = useTranslations('Upload');
    const router = useRouter();
    const [languages, setLanguages] = useState<Language[]>([]);
    const [tab, setTab] = useState<Tab>('book');

    // Shared
    const [studyLang, setStudyLang] = useState('es');
    const [dialectNotes, setDialectNotes] = useState('');
    const [styleNotes, setStyleNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // Book tab
    const [bookFile, setBookFile] = useState<File | null>(null);
    const [isBookDragOver, setIsBookDragOver] = useState(false);
    const bookInputRef = useRef<HTMLInputElement>(null);

    // Image tab
    const [imageEntries, setImageEntries] = useState<{ file: File; previewUrl: string }[]>([]);
    const [isImageDragOver, setIsImageDragOver] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Revoke all object URLs on unmount
    useEffect(() => {
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            imageEntries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetch('/api/languages')
            .then((r) => r.json())
            .then(setLanguages);
    }, []);

    function addImageFiles(newFiles: File[]) {
        const valid = newFiles.filter((f) => IMAGE_TYPES.includes(f.type));
        if (!valid.length) return;
        setImageEntries((prev) => {
            const existingKeys = new Set(prev.map((e) => `${e.file.name}:${e.file.size}`));
            const deduped = valid.filter((f) => !existingKeys.has(`${f.name}:${f.size}`));
            return [...prev, ...deduped.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }))];
        });
    }

    function removeImageEntry(index: number) {
        setImageEntries((prev) => {
            URL.revokeObjectURL(prev[index].previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    }

    async function handleBookSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!bookFile) return;
        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', bookFile);
        formData.append('study_lang', studyLang);
        if (dialectNotes) formData.append('dialect_notes', dialectNotes);
        if (styleNotes) formData.append('style_notes', styleNotes);

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) { setError(data.error || t('uploadFailed')); return; }
            router.push(`/read/${data.id}`);
        } catch {
            setError(t('uploadFailedRetry'));
        } finally {
            setUploading(false);
        }
    }

    async function handleImageSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!imageEntries.length) return;
        setUploading(true);
        setError('');

        const formData = new FormData();
        imageEntries.forEach((entry) => formData.append('file', entry.file));
        formData.append('study_lang', studyLang);
        if (dialectNotes) formData.append('dialect_notes', dialectNotes);
        if (styleNotes) formData.append('style_notes', styleNotes);

        try {
            const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) { setError(data.error || t('uploadFailed')); return; }
            router.push(`/read/${data.id}`);
        } catch {
            setError(t('uploadFailedRetry'));
        } finally {
            setUploading(false);
        }
    }

    function handleBookDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsBookDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped && (dropped.name.endsWith('.epub') || dropped.name.endsWith('.txt'))) {
            setBookFile(dropped);
        }
    }

    function handleImageDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsImageDragOver(false);
        addImageFiles(Array.from(e.dataTransfer.files));
    }

    const sharedFields = (
        <>
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
        </>
    );

    return (
        <div className="fade-up max-w-lg">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
                <p className="text-slate-500 text-sm mt-1">Upload a book or image to start reading & translating</p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => { setTab('book'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === 'book'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <span>📚</span> Book
                </button>
                <button
                    type="button"
                    onClick={() => { setTab('image'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === 'image'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <span>🖼️</span> Image
                </button>
            </div>

            {/* Book tab */}
            {tab === 'book' && (
                <form onSubmit={handleBookSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('fileLabel')}</label>
                        <div
                            onClick={() => bookInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setIsBookDragOver(true); }}
                            onDragLeave={() => setIsBookDragOver(false)}
                            onDrop={handleBookDrop}
                            className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-150 px-6 py-8 text-center ${
                                isBookDragOver
                                    ? 'border-blue-400 bg-blue-50'
                                    : bookFile
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                            }`}
                        >
                            <input
                                ref={bookInputRef}
                                type="file"
                                accept=".epub,.txt"
                                onChange={(e) => setBookFile(e.target.files?.[0] ?? null)}
                                className="sr-only"
                                required
                            />
                            {bookFile ? (
                                <div>
                                    <div className="text-3xl mb-2">📄</div>
                                    <p className="font-semibold text-emerald-700 text-sm">{bookFile.name}</p>
                                    <p className="text-emerald-500 text-xs mt-1">
                                        {(bookFile.size / 1024 / 1024).toFixed(2)} MB — click to change
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-3xl mb-2">📂</div>
                                    <p className="font-semibold text-slate-700 text-sm">
                                        {isBookDragOver ? 'Drop your file here' : 'Drag & drop or click to browse'}
                                    </p>
                                    <p className="text-slate-400 text-xs mt-1">EPUB or TXT files</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {sharedFields}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!bookFile || uploading}
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
            )}

            {/* Image tab */}
            {tab === 'image' && (
                <form onSubmit={handleImageSubmit} className="space-y-5">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-slate-700">
                                Images
                                {imageEntries.length > 0 && (
                                    <span className="ml-2 text-xs font-normal text-slate-400">
                                        {imageEntries.length} selected
                                    </span>
                                )}
                            </label>
                            {imageEntries.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => imageInputRef.current?.click()}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                                >
                                    + Add more
                                </button>
                            )}
                        </div>

                        <input
                            ref={imageInputRef}
                            type="file"
                            accept={IMAGE_EXTENSIONS.join(',')}
                            multiple
                            onChange={(e) => {
                                addImageFiles(Array.from(e.target.files || []));
                                e.target.value = '';
                            }}
                            className="sr-only"
                        />

                        {/* Image thumbnails grid */}
                        {imageEntries.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                {imageEntries.map((entry, i) => (
                                    <div key={`${entry.file.name}:${entry.file.size}:${i}`} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-square">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={entry.previewUrl}
                                            alt={entry.file.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImageEntry(i)}
                                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                            title="Remove"
                                        >
                                            ×
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5">
                                            <p className="text-white text-[10px] truncate">{entry.file.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Drop zone — always visible, shrinks when images are present */}
                        <div
                            onClick={() => imageInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setIsImageDragOver(true); }}
                            onDragLeave={() => setIsImageDragOver(false)}
                            onDrop={handleImageDrop}
                            className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-150 ${
                                isImageDragOver
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                            } ${imageEntries.length > 0 ? 'py-3' : 'px-6 py-8'}`}
                        >
                            <div className="text-center">
                                {imageEntries.length === 0 && <div className="text-3xl mb-2">🖼️</div>}
                                <p className="font-semibold text-slate-700 text-sm">
                                    {isImageDragOver
                                        ? 'Drop images here'
                                        : imageEntries.length > 0
                                        ? 'Drop more images here'
                                        : 'Drag & drop or click to browse'}
                                </p>
                                {imageEntries.length === 0 && (
                                    <p className="text-slate-400 text-xs mt-1">JPEG, PNG, WebP, or GIF · max 5 MB each</p>
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 mt-2">
                            Claude will read the text in your image{imageEntries.length > 1 ? 's' : ''} and translate {imageEntries.length > 1 ? 'them' : 'it'} for you.
                        </p>
                    </div>

                    {sharedFields}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!imageEntries.length || uploading}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Extracting text & translating...
                            </span>
                        ) : imageEntries.length > 1 ? (
                            `Extract & Translate ${imageEntries.length} Images`
                        ) : (
                            'Extract & Translate'
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
