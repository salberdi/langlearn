import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';

export const books = sqliteTable('books', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  author: text('author'),
  document_lang: text('document_lang').notNull(),
  study_lang: text('study_lang').notNull(),
  ui_lang: text('ui_lang').notNull().default('en'),
  is_rtl: integer('is_rtl', { mode: 'boolean' }).default(false),
  dialect_notes: text('dialect_notes'),
  style_notes: text('style_notes'),
  total_chunks: integer('total_chunks').default(0),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const chunks = sqliteTable('chunks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  book_id: integer('book_id').notNull().references(() => books.id),
  chunk_index: integer('chunk_index').notNull(),
  source_html: text('source_html').notNull(),
  translated_html: text('translated_html'),
  tokens_json: text('tokens_json'),
  translation_status: text('translation_status').default('pending'),
  translation_started_at: integer('translation_started_at'),
  tm_extracted: integer('tm_extracted', { mode: 'boolean' }).default(false),
  start_char_offset: integer('start_char_offset').notNull(),
  end_char_offset: integer('end_char_offset').notNull(),
  word_count: integer('word_count').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (t) => ({
  uniqueChunk: unique().on(t.book_id, t.chunk_index),
}));

export const phrases = sqliteTable('phrases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phrase_text: text('phrase_text').notNull(),
  phrase_lang: text('phrase_lang').notNull(),
  first_book_id: integer('first_book_id').references(() => books.id, { onDelete: 'set null' }),
  context_html: text('context_html'),
  translation: text('translation'),
  pronunciation: text('pronunciation'),
  grammar_note: text('grammar_note'),
  register: text('register'),
  frequency_tier: text('frequency_tier'),
  mnemonic: text('mnemonic'),
  morpheme_breakdown: text('morpheme_breakdown'),
  examples: text('examples'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (t) => ({
  uniquePhrase: unique().on(t.phrase_text, t.phrase_lang),
}));

export const userVocab = sqliteTable('user_vocab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phrase_text: text('phrase_text').notNull(),
  phrase_lang: text('phrase_lang').notNull(),
  status: text('status').notNull().default('new'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (t) => ({
  uniqueVocab: unique().on(t.phrase_text, t.phrase_lang),
}));

export const srsCards = sqliteTable('srs_cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phrase_id: integer('phrase_id').notNull().references(() => phrases.id),
  mode: text('mode').notNull(),
  due_at: integer('due_at', { mode: 'timestamp' }).notNull(),
  interval_days: real('interval_days').default(1),
  ease_factor: real('ease_factor').default(2.5),
  repetitions: integer('repetitions').default(0),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const translationMemory = sqliteTable('translation_memory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  book_id: integer('book_id').notNull().references(() => books.id),
  source_phrase: text('source_phrase').notNull(),
  translated_phrase: text('translated_phrase').notNull(),
  frequency: integer('frequency').default(1),
}, (t) => ({
  uniqueTM: unique().on(t.book_id, t.source_phrase),
}));

export const termGlossary = sqliteTable('term_glossary', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  book_id: integer('book_id').notNull().references(() => books.id),
  source_term: text('source_term').notNull(),
  preferred_translation: text('preferred_translation').notNull(),
  notes: text('notes'),
}, (t) => ({
  uniqueTerm: unique().on(t.book_id, t.source_term),
}));

export const readingProgress = sqliteTable('reading_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  book_id: integer('book_id').notNull().references(() => books.id),
  chunk_index: integer('chunk_index').notNull(),
  scroll_y: integer('scroll_y').default(0),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (t) => ({
  uniqueProgress: unique().on(t.book_id),
}));

export const streaks = sqliteTable('streaks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  current_streak: integer('current_streak').default(0),
  longest_streak: integer('longest_streak').default(0),
  last_active_date: text('last_active_date'),
});
