'use client';

import { openDB, type IDBPDatabase } from 'idb';

interface DictEntry {
  word: string;
  translation: string;
  pronunciation?: string;
}

const DB_NAME = 'langlearn-dict';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: ['word', 'lang'],
          });
          store.createIndex('by-lang', 'lang');
        }
      },
    });
  }
  return dbPromise;
}

export async function lookupLocal(
  word: string,
  lang: string
): Promise<DictEntry | null> {
  try {
    const db = await getDB();
    const entry = await db.get(STORE_NAME, [word.toLowerCase(), lang]);
    return entry ?? null;
  } catch {
    return null;
  }
}

export async function batchInsertDict(
  entries: Array<DictEntry & { lang: string }>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const entry of entries) {
    tx.store.put({
      word: entry.word.toLowerCase(),
      lang: entry.lang,
      translation: entry.translation,
      pronunciation: entry.pronunciation,
    });
  }
  await tx.done;
}

export async function getDictSize(lang: string): Promise<number> {
  const db = await getDB();
  const count = await db.countFromIndex(STORE_NAME, 'by-lang', lang);
  return count;
}
