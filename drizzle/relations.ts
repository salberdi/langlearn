import { relations } from "drizzle-orm/relations";
import { users, books, chunks, phrases, readingProgress, srsCards, streaks, termGlossary, translationMemory, userVocab, accounts } from "./schema";

export const booksRelations = relations(books, ({one, many}) => ({
	user: one(users, {
		fields: [books.userId],
		references: [users.id]
	}),
	chunks: many(chunks),
	phrases: many(phrases),
	readingProgresses: many(readingProgress),
	termGlossaries: many(termGlossary),
	translationMemories: many(translationMemory),
}));

export const usersRelations = relations(users, ({many}) => ({
	books: many(books),
	srsCards: many(srsCards),
	streaks: many(streaks),
	userVocabs: many(userVocab),
	accounts: many(accounts),
}));

export const chunksRelations = relations(chunks, ({one}) => ({
	book: one(books, {
		fields: [chunks.bookId],
		references: [books.id]
	}),
}));

export const phrasesRelations = relations(phrases, ({one, many}) => ({
	book: one(books, {
		fields: [phrases.firstBookId],
		references: [books.id]
	}),
	srsCards: many(srsCards),
}));

export const readingProgressRelations = relations(readingProgress, ({one}) => ({
	book: one(books, {
		fields: [readingProgress.bookId],
		references: [books.id]
	}),
}));

export const srsCardsRelations = relations(srsCards, ({one}) => ({
	user: one(users, {
		fields: [srsCards.userId],
		references: [users.id]
	}),
	phrase: one(phrases, {
		fields: [srsCards.phraseId],
		references: [phrases.id]
	}),
}));

export const streaksRelations = relations(streaks, ({one}) => ({
	user: one(users, {
		fields: [streaks.userId],
		references: [users.id]
	}),
}));

export const termGlossaryRelations = relations(termGlossary, ({one}) => ({
	book: one(books, {
		fields: [termGlossary.bookId],
		references: [books.id]
	}),
}));

export const translationMemoryRelations = relations(translationMemory, ({one}) => ({
	book: one(books, {
		fields: [translationMemory.bookId],
		references: [books.id]
	}),
}));

export const userVocabRelations = relations(userVocab, ({one}) => ({
	user: one(users, {
		fields: [userVocab.userId],
		references: [users.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));