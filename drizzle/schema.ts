import { pgTable, unique, text, timestamp, foreignKey, serial, boolean, integer, doublePrecision, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: timestamp("email_verified", { mode: 'string' }),
	image: text(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const books = pgTable("books", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	author: text(),
	documentLang: text("document_lang").notNull(),
	studyLang: text("study_lang").notNull(),
	uiLang: text("ui_lang").default('en').notNull(),
	isRtl: boolean("is_rtl").default(false),
	dialectNotes: text("dialect_notes"),
	styleNotes: text("style_notes"),
	totalChunks: integer("total_chunks").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "books_user_id_users_id_fk"
		}),
]);

export const chunks = pgTable("chunks", {
	id: serial().primaryKey().notNull(),
	bookId: integer("book_id").notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	sourceHtml: text("source_html").notNull(),
	translatedHtml: text("translated_html"),
	tokensJson: text("tokens_json"),
	translationStatus: text("translation_status").default('pending'),
	translationStartedAt: integer("translation_started_at"),
	tmExtracted: boolean("tm_extracted").default(false),
	startCharOffset: integer("start_char_offset").notNull(),
	endCharOffset: integer("end_char_offset").notNull(),
	wordCount: integer("word_count").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "chunks_book_id_books_id_fk"
		}),
	unique("chunks_book_id_chunk_index_unique").on(table.bookId, table.chunkIndex),
]);

export const phrases = pgTable("phrases", {
	id: serial().primaryKey().notNull(),
	phraseText: text("phrase_text").notNull(),
	phraseLang: text("phrase_lang").notNull(),
	firstBookId: integer("first_book_id"),
	contextHtml: text("context_html"),
	translation: text(),
	pronunciation: text(),
	grammarNote: text("grammar_note"),
	register: text(),
	frequencyTier: text("frequency_tier"),
	mnemonic: text(),
	morphemeBreakdown: text("morpheme_breakdown"),
	examples: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.firstBookId],
			foreignColumns: [books.id],
			name: "phrases_first_book_id_books_id_fk"
		}).onDelete("set null"),
	unique("phrases_phrase_text_phrase_lang_unique").on(table.phraseText, table.phraseLang),
]);

export const readingProgress = pgTable("reading_progress", {
	id: serial().primaryKey().notNull(),
	bookId: integer("book_id").notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	scrollY: integer("scroll_y").default(0),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "reading_progress_book_id_books_id_fk"
		}),
	unique("reading_progress_book_id_unique").on(table.bookId),
]);

export const srsCards = pgTable("srs_cards", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	phraseId: integer("phrase_id").notNull(),
	mode: text().notNull(),
	dueAt: timestamp("due_at", { mode: 'string' }).notNull(),
	intervalDays: doublePrecision("interval_days").default(1),
	easeFactor: doublePrecision("ease_factor").default(2.5),
	repetitions: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "srs_cards_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.phraseId],
			foreignColumns: [phrases.id],
			name: "srs_cards_phrase_id_phrases_id_fk"
		}),
	unique("srs_cards_user_id_phrase_id_mode_unique").on(table.userId, table.phraseId, table.mode),
]);

export const streaks = pgTable("streaks", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	currentStreak: integer("current_streak").default(0),
	longestStreak: integer("longest_streak").default(0),
	lastActiveDate: text("last_active_date"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "streaks_user_id_users_id_fk"
		}),
	unique("streaks_user_id_unique").on(table.userId),
]);

export const termGlossary = pgTable("term_glossary", {
	id: serial().primaryKey().notNull(),
	bookId: integer("book_id").notNull(),
	sourceTerm: text("source_term").notNull(),
	preferredTranslation: text("preferred_translation").notNull(),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "term_glossary_book_id_books_id_fk"
		}),
	unique("term_glossary_book_id_source_term_unique").on(table.bookId, table.sourceTerm),
]);

export const translationMemory = pgTable("translation_memory", {
	id: serial().primaryKey().notNull(),
	bookId: integer("book_id").notNull(),
	sourcePhrase: text("source_phrase").notNull(),
	translatedPhrase: text("translated_phrase").notNull(),
	frequency: integer().default(1),
}, (table) => [
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "translation_memory_book_id_books_id_fk"
		}),
	unique("translation_memory_book_id_source_phrase_unique").on(table.bookId, table.sourcePhrase),
]);

export const userVocab = pgTable("user_vocab", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	phraseText: text("phrase_text").notNull(),
	phraseLang: text("phrase_lang").notNull(),
	status: text().default('new').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_vocab_user_id_users_id_fk"
		}),
	unique("user_vocab_user_id_phrase_text_phrase_lang_unique").on(table.userId, table.phraseText, table.phraseLang),
]);

export const accounts = pgTable("accounts", {
	userId: text("user_id").notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text("provider_account_id").notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.provider, table.providerAccountId], name: "accounts_provider_provider_account_id_pk"}),
]);
