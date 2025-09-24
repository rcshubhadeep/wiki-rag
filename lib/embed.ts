import OpenAI from 'openai';
import { env } from './env.mjs'

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY! });
const EMBEDDING_MODEL = env.EMBEDDING_MODEL || 'text-embedding-3-small';

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map(d => d.embedding as unknown as number[]);
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v;
}