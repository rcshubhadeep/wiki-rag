import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { scrapeWikipedia } from '@/lib/scrape';
import { chunkText } from '@/lib/chunk';
import { embedTexts } from '@/lib/embed';
import { wikiPages, wikiChunks } from '@/lib/db/schema/embeddings';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const { title, text } = await scrapeWikipedia(url);
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'No main text extracted from the page' }, { status: 422 });
  }
  const chunks = chunkText(text);

  const embeddings = await embedTexts(chunks);

  try {
    const result = await db.transaction(async (tx) => {
      // Upsert page (url is unique); return id
      const [page] = await tx
        .insert(wikiPages)
        .values({ url, title })
        .onConflictDoUpdate({
          target: wikiPages.url,
          set: { title },
        })
        .returning({ id: wikiPages.id });

      const pageId = page.id as number;

      // Cleanup old chunks for the same page
      await tx.delete(wikiChunks).where(eq(wikiChunks.pageId, pageId));

      // Batch insert chunks with embeddings
      const rows = chunks.map((content, i) => ({
        pageId,
        chunkIndex: i,
        content,
        tokenCount: content.length, // we can replace with real token count if needed
        embedding: embeddings[i] as unknown as number[], // pgvector expects number[]
      }));

      if (rows.length) {
        await tx.insert(wikiChunks).values(rows);
      }

      // Analyze to "train" ivfflat lists (safe even without ivf)
      await tx.execute(sql`ANALYZE "wiki_chunks";`);

      return { pageId, title, chunkCount: chunks.length };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}