// Enforce server-only usage at build time.
import 'server-only';

import OpenAI from 'openai';
import { db } from './db';
import { eq, sql, cosineDistance, desc } from 'drizzle-orm';
import { wikiChunks } from './db/schema/embeddings';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';

/**
 * Retrieve top-k chunks for a page using pgvector cosine distance.
 * Drizzle doesn't have first-class vector ops yet, so we use `sql` fragments
 * for the distance/order-by expression while keeping the rest in Drizzle style.
 */
export async function retrieveChunks(
  pageId: number,
  queryEmbedding: number[],
  k = 6
) {
  // Optional per-session tuning:
  // await db.execute(sql`SET ivfflat.probes = 10`);

  const similarity = sql<number>`1 - (${cosineDistance(
    wikiChunks.embedding,
    queryEmbedding
  )})`;

  const rows = await db
    .select({
      id: wikiChunks.id,
      content: wikiChunks.content,
      score: similarity,
    })
    .from(wikiChunks)
    .where(eq(wikiChunks.pageId, pageId))
    .orderBy(() => desc(similarity))
    .limit(k);

  // Normalize return type
  return rows as { id: number; content: string; score: number }[];
}

export async function answerWithContext(question: string, contexts: string[]) {
  const system =
    'You are a helpful assistant that answers strictly using the provided Wikipedia context. If unsure, say you do not know.';

  const contextBlock = contexts.map((c, i) => `[${i + 1}] ${c}`).join('\n\n');

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Context:\n${contextBlock}\n\nQuestion: ${question}`,
    },
  ];

  const res = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.2,
  });

  return res.choices[0]?.message?.content?.trim() ?? '';
}