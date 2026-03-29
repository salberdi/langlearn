ALTER TABLE "chunks" ALTER COLUMN "source_html" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "upload_s3_key" text;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "s3_key" text;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "archived_at" timestamp;