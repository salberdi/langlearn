CREATE TABLE `books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`document_lang` text NOT NULL,
	`study_lang` text NOT NULL,
	`ui_lang` text DEFAULT 'en' NOT NULL,
	`is_rtl` integer DEFAULT false,
	`dialect_notes` text,
	`style_notes` text,
	`total_chunks` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chunks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`chunk_index` integer NOT NULL,
	`source_html` text NOT NULL,
	`translated_html` text,
	`tokens_json` text,
	`translation_status` text DEFAULT 'pending',
	`translation_started_at` integer,
	`tm_extracted` integer DEFAULT false,
	`start_char_offset` integer NOT NULL,
	`end_char_offset` integer NOT NULL,
	`word_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chunks_book_id_chunk_index_unique` ON `chunks` (`book_id`,`chunk_index`);--> statement-breakpoint
CREATE TABLE `phrases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phrase_text` text NOT NULL,
	`phrase_lang` text NOT NULL,
	`first_book_id` integer,
	`context_html` text,
	`translation` text,
	`pronunciation` text,
	`grammar_note` text,
	`register` text,
	`frequency_tier` text,
	`mnemonic` text,
	`morpheme_breakdown` text,
	`examples` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`first_book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phrases_phrase_text_phrase_lang_unique` ON `phrases` (`phrase_text`,`phrase_lang`);--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`chunk_index` integer NOT NULL,
	`scroll_y` integer DEFAULT 0,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_progress_book_id_unique` ON `reading_progress` (`book_id`);--> statement-breakpoint
CREATE TABLE `srs_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phrase_id` integer NOT NULL,
	`mode` text NOT NULL,
	`due_at` integer NOT NULL,
	`interval_days` real DEFAULT 1,
	`ease_factor` real DEFAULT 2.5,
	`repetitions` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`phrase_id`) REFERENCES `phrases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `streaks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`current_streak` integer DEFAULT 0,
	`longest_streak` integer DEFAULT 0,
	`last_active_date` text
);
--> statement-breakpoint
CREATE TABLE `term_glossary` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`source_term` text NOT NULL,
	`preferred_translation` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `term_glossary_book_id_source_term_unique` ON `term_glossary` (`book_id`,`source_term`);--> statement-breakpoint
CREATE TABLE `translation_memory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`source_phrase` text NOT NULL,
	`translated_phrase` text NOT NULL,
	`frequency` integer DEFAULT 1,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translation_memory_book_id_source_phrase_unique` ON `translation_memory` (`book_id`,`source_phrase`);--> statement-breakpoint
CREATE TABLE `user_vocab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phrase_text` text NOT NULL,
	`phrase_lang` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_vocab_phrase_text_phrase_lang_unique` ON `user_vocab` (`phrase_text`,`phrase_lang`);