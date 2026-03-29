import { pgTable, text, integer, boolean, timestamp, doublePrecision, serial, unique, primaryKey } from 'drizzle-orm/pg-core';

// ── Auth tables (required by @auth/drizzle-adapter) ─────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
});

export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => ({
  compoundKey: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}));

// ── App tables ──────────────────────────────────────────────────────────────

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  author: text('author'),
  document_lang: text('document_lang').notNull(),
  study_lang: text('study_lang').notNull(),
  ui_lang: text('ui_lang').notNull().default('en'),
  is_rtl: boolean('is_rtl').default(false),
  dialect_notes: text('dialect_notes'),
  style_notes: text('style_notes'),
  total_chunks: integer('total_chunks').default(0),
  upload_s3_key: text('upload_s3_key'),
  created_at: timestamp('created_at').notNull(),
  updated_at: timestamp('updated_at').notNull(),
});

export const chunks = pgTable('chunks', {
  id: serial('id').primaryKey(),
  book_id: integer('book_id').notNull().references(() => books.id),
  chunk_index: integer('chunk_index').notNull(),
  source_html: text('source_html'),
  translated_html: text('translated_html'),
  tokens_json: text('tokens_json'),
  translation_status: text('translation_status').default('pending'),
  translation_started_at: integer('translation_started_at'),
  tm_extracted: boolean('tm_extracted').default(false),
  start_char_offset: integer('start_char_offset').notNull(),
  end_char_offset: integer('end_char_offset').notNull(),
  word_count: integer('word_count').notNull(),
  s3_key: text('s3_key'),
  archived_at: timestamp('archived_at'),
  created_at: timestamp('created_at').notNull(),
}, (t) => ({
  uniqueChunk: unique().on(t.book_id, t.chunk_index),
}));

export const phrases = pgTable('phrases', {
  id: serial('id').primaryKey(),
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
  created_at: timestamp('created_at').notNull(),
}, (t) => ({
  uniquePhrase: unique().on(t.phrase_text, t.phrase_lang),
}));

export const userVocab = pgTable('user_vocab', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  phrase_text: text('phrase_text').notNull(),
  phrase_lang: text('phrase_lang').notNull(),
  status: text('status').notNull().default('new'),
  created_at: timestamp('created_at').notNull(),
  updated_at: timestamp('updated_at').notNull(),
}, (t) => ({
  uniqueVocab: unique().on(t.user_id, t.phrase_text, t.phrase_lang),
}));

export const srsCards = pgTable('srs_cards', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  phrase_id: integer('phrase_id').notNull().references(() => phrases.id),
  mode: text('mode').notNull(),
  due_at: timestamp('due_at').notNull(),
  interval_days: doublePrecision('interval_days').default(1),
  ease_factor: doublePrecision('ease_factor').default(2.5),
  repetitions: integer('repetitions').default(0),
  created_at: timestamp('created_at').notNull(),
}, (t) => ({
  uniqueCard: unique().on(t.user_id, t.phrase_id, t.mode),
}));

export const translationMemory = pgTable('translation_memory', {
  id: serial('id').primaryKey(),
  book_id: integer('book_id').notNull().references(() => books.id),
  source_phrase: text('source_phrase').notNull(),
  translated_phrase: text('translated_phrase').notNull(),
  frequency: integer('frequency').default(1),
}, (t) => ({
  uniqueTM: unique().on(t.book_id, t.source_phrase),
}));

export const termGlossary = pgTable('term_glossary', {
  id: serial('id').primaryKey(),
  book_id: integer('book_id').notNull().references(() => books.id),
  source_term: text('source_term').notNull(),
  preferred_translation: text('preferred_translation').notNull(),
  notes: text('notes'),
}, (t) => ({
  uniqueTerm: unique().on(t.book_id, t.source_term),
}));

export const readingProgress = pgTable('reading_progress', {
  id: serial('id').primaryKey(),
  book_id: integer('book_id').notNull().references(() => books.id),
  chunk_index: integer('chunk_index').notNull(),
  scroll_y: integer('scroll_y').default(0),
  updated_at: timestamp('updated_at').notNull(),
}, (t) => ({
  uniqueProgress: unique().on(t.book_id),
}));

export const streaks = pgTable('streaks', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  current_streak: integer('current_streak').default(0),
  longest_streak: integer('longest_streak').default(0),
  last_active_date: text('last_active_date'),
}, (t) => ({
  uniqueUser: unique().on(t.user_id),
}));
