import { sql } from 'drizzle-orm';
import {
  bigserial,
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  vector,
} from 'drizzle-orm/pg-core';
import { nanoid } from '@/lib/utils';
import { resources } from './resources';
import { env } from "@/lib/env.mjs";

/**
 * Drizzle schema for Wikipedia RAG with pgvector
 * - wikiPages: one row per Wikipedia URL
 * - wikiChunks: chunked content + embedding vector
 *
 * NOTE:
 * - DB already has `CREATE EXTENSION vector;` enabled
 * - Embedding dimension must match the model (1536 for text-embedding-3-small, 3072 for -large)
 */

// --- Pages table -----------------------------------------------------------
export const wikiPages = pgTable('wiki_pages', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  url: text('url').notNull().unique(),
  title: text('title'),
  lang: text('lang').notNull().default('en'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// --- Chunks table ----------------------------------------------------------
// Adjust `dimensions` to match embedding model.
const EMBEDDING_DIM: number = env.EMBEDDING_DIM;

export const wikiChunks = pgTable(
  'wiki_chunks',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    pageId: bigint('page_id', { mode: 'number' })
      .notNull()
      .references(() => wikiPages.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count'),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIM }).notNull(),
  },
  (table) => {
    return {
      // Useful filter index by page
      pageIdIdx: index('wiki_chunks_page_id_idx').on(table.pageId),
      embeddingIvfIdx: sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'wiki_chunks_embedding_ivf'
              AND n.nspname = 'public'
          ) THEN
            CREATE INDEX wiki_chunks_embedding_ivf
            ON "wiki_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
          END IF;
        END
        $$;
      `,
      // Optional HNSW index (requires recent pgvector):
      // embeddingHnswIdx: sql`
      //   DO $$
      //   BEGIN
      //     IF NOT EXISTS (
      //       SELECT 1 FROM pg_class c
      //       JOIN pg_namespace n ON n.oid = c.relnamespace
      //       WHERE c.relname = 'wiki_chunks_embedding_hnsw'
      //         AND n.nspname = 'public'
      //     ) THEN
      //       CREATE INDEX wiki_chunks_embedding_hnsw
      //       ON "wiki_chunks" USING hnsw ("embedding" vector_cosine_ops);
      //     END IF;
      //   END
      //   $$;
      // `,
    };
  }
);

// Types (optional)
export type WikiPage = {
  id: number;
  url: string;
  title: string | null;
  lang: string;
  createdAt: Date;
};

export type WikiChunk = {
  id: number;
  pageId: number;
  chunkIndex: number;
  content: string;
  tokenCount: number | null;
  // store as number[] when inserting/selecting via queries
  embedding: unknown;
};