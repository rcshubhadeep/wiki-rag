CREATE TABLE IF NOT EXISTS "wiki_chunks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"page_id" bigint NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer,
	"embedding" vector(1536) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wiki_pages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"lang" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_pages_url_unique" UNIQUE("url")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wiki_chunks" ADD CONSTRAINT "wiki_chunks_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wiki_chunks_page_id_idx" ON "wiki_chunks" USING btree ("page_id");
--> statement-breakpoint
-- Optional: Create IVFFlat index for pgvector cosine similarity (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  c.relname = 'wiki_chunks_embedding_ivf'
    AND    n.nspname = 'public'
  ) THEN
    CREATE INDEX "wiki_chunks_embedding_ivf"
    ON "wiki_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
  END IF;
END
$$;
--> statement-breakpoint
-- Analyze to train IVFFlat lists for better recall/speed
ANALYZE "wiki_chunks";
-- Optional (requires recent pgvector): HNSW index alternative
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_class c
--     JOIN pg_namespace n ON n.oid = c.relnamespace
--     WHERE c.relname = 'wiki_chunks_embedding_hnsw'
--       AND n.nspname = 'public'
--   ) THEN
--     CREATE INDEX "wiki_chunks_embedding_hnsw"
--     ON "wiki_chunks" USING hnsw ("embedding" vector_cosine_ops);
--   END IF;
-- END
-- $$;