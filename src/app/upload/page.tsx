'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Language {
  code: string;
  name: string;
}

export default function UploadPage() {
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
        setError(data.error || 'Upload failed');
        return;
      }

      router.push(`/read/${data.id}`);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Upload a Book</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">File (EPUB or TXT)</label>
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
            Translate into (study language)
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
            Dialect notes (optional)
          </label>
          <input
            type="text"
            value={dialectNotes}
            onChange={(e) => setDialectNotes(e.target.value)}
            placeholder="e.g., Use Mexican Spanish, River Plate Spanish..."
            className="block w-full border border-gray-300 rounded-lg p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Style notes (optional)
          </label>
          <input
            type="text"
            value={styleNotes}
            onChange={(e) => setStyleNotes(e.target.value)}
            placeholder="e.g., 19th-century formal register..."
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
          {uploading ? 'Uploading & processing...' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
