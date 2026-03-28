CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"document_lang" text NOT NULL,
	"study_lang" text NOT NULL,
	"ui_lang" text DEFAULT 'en' NOT NULL,
	"is_rtl" boolean DEFAULT false,
	"dialect_notes" text,
	"style_notes" text,
	"total_chunks" integer DEFAULT 0,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"source_html" text NOT NULL,
	"translated_html" text,
	"tokens_json" text,
	"translation_status" text DEFAULT 'pending',
	"translation_started_at" integer,
	"tm_extracted" boolean DEFAULT false,
	"start_char_offset" integer NOT NULL,
	"end_char_offset" integer NOT NULL,
	"word_count" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "chunks_book_id_chunk_index_unique" UNIQUE("book_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "phrases" (
	"id" serial PRIMARY KEY NOT NULL,
	"phrase_text" text NOT NULL,
	"phrase_lang" text NOT NULL,
	"first_book_id" integer,
	"context_html" text,
	"translation" text,
	"pronunciation" text,
	"grammar_note" text,
	"register" text,
	"frequency_tier" text,
	"mnemonic" text,
	"morpheme_breakdown" text,
	"examples" text,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "phrases_phrase_text_phrase_lang_unique" UNIQUE("phrase_text","phrase_lang")
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"scroll_y" integer DEFAULT 0,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "reading_progress_book_id_unique" UNIQUE("book_id")
);
--> statement-breakpoint
CREATE TABLE "srs_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phrase_id" integer NOT NULL,
	"mode" text NOT NULL,
	"due_at" timestamp NOT NULL,
	"interval_days" double precision DEFAULT 1,
	"ease_factor" double precision DEFAULT 2.5,
	"repetitions" integer DEFAULT 0,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_active_date" text,
	CONSTRAINT "streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "term_glossary" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"source_term" text NOT NULL,
	"preferred_translation" text NOT NULL,
	"notes" text,
	CONSTRAINT "term_glossary_book_id_source_term_unique" UNIQUE("book_id","source_term")
);
--> statement-breakpoint
CREATE TABLE "translation_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"source_phrase" text NOT NULL,
	"translated_phrase" text NOT NULL,
	"frequency" integer DEFAULT 1,
	CONSTRAINT "translation_memory_book_id_source_phrase_unique" UNIQUE("book_id","source_phrase")
);
--> statement-breakpoint
CREATE TABLE "user_vocab" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phrase_text" text NOT NULL,
	"phrase_lang" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_vocab_user_id_phrase_text_phrase_lang_unique" UNIQUE("user_id","phrase_text","phrase_lang")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_first_book_id_books_id_fk" FOREIGN KEY ("first_book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_phrase_id_phrases_id_fk" FOREIGN KEY ("phrase_id") REFERENCES "public"."phrases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_glossary" ADD CONSTRAINT "term_glossary_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_memory" ADD CONSTRAINT "translation_memory_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocab" ADD CONSTRAINT "user_vocab_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;