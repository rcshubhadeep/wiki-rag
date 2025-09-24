import { NextRequest, NextResponse } from 'next/server';
import { embedOne } from '@/lib/embed';
import { retrieveChunks, answerWithContext } from '@/lib/rag';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { pageId, question } = await req.json();
  if (!pageId || !question) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const qEmbed = await embedOne(question);
  const rows = await retrieveChunks(pageId, qEmbed, 6);
  const answer = await answerWithContext(question, rows.map(r => r.content));

  return NextResponse.json({ answer, sources: rows.map(r => ({ id: r.id, score: r.score })) });
}