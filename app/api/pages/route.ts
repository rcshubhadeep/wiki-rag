// app/api/pages/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wikiPages } from '@/lib/db/schema/embeddings';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db
      .select({
        id: wikiPages.id,
        url: wikiPages.url,
        title: wikiPages.title,
        createdAt: wikiPages.createdAt,
      })
      .from(wikiPages)
      .orderBy(desc(wikiPages.createdAt));
    return NextResponse.json({ pages: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}