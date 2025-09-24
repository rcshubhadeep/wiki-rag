'use client';
import { useEffect, useState } from 'react';

type SavedPage = {
  id: number;
  url: string;
  title: string | null;
  createdAt?: string;
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [pageId, setPageId] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [asking, setAsking] = useState(false);

  async function refreshPages() {
    setLoadingPages(true);
    try {
      const res = await fetch('/api/pages', { method: 'GET' });
      const json: { pages: SavedPage[] } = await res.json();
      setPages(Array.isArray(json?.pages) ? json.pages : []);
    } catch {
      setPages([]);
    } finally {
      setLoadingPages(false);
    }
  }

  useEffect(() => {
    refreshPages();
  }, []);

  async function ingest() {
    setIngesting(true);
    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: JSON.stringify({ url }) });
      const json = await res.json();
      if (json.pageId) {
        setPageId(json.pageId);
        await refreshPages();
      }
    } finally {
      setIngesting(false);
    }
  }

  async function ask() {
    if (!pageId || !q) return;
    setAsking(true);
    try {
      const userMsg = { role: 'user' as const, text: q };
      setMessages((m) => [...m, userMsg]);
      setQ('');
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ pageId, question: userMsg.text }),
      });
      const json = await res.json();
      setMessages((m) => [...m, { role: 'assistant', text: json.answer ?? '(no answer)' }]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-semibold">Wikipedia RAG (pgvector)</h1>

      {/* Ingest */}
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-500
                     dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
          placeholder="https://en.wikipedia.org/wiki/Artificial_intelligence"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={ingest}
          className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
          disabled={ingesting}
        >
          {ingesting ? 'Ingesting…' : 'Ingest'}
        </button>
      </div>

      {/* Saved pages */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Saved pages</h2>
          <button
            onClick={refreshPages}
            className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            disabled={loadingPages}
          >
            {loadingPages ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {pages.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No pages yet. Ingest a Wikipedia URL above to get started.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded border border-gray-200 dark:border-gray-800">
            {pages.map((p) => {
              const selected = p.id === pageId;
              return (
                <li
                  key={p.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selected
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    setPageId(p.id);
                    setMessages([]); // start fresh when switching pages
                  }}
                  title={p.url}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {p.title || p.url.replace(/^https?:\/\//, '')}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {p.url}
                      </div>
                    </div>
                    {selected && (
                      <span className="text-xs px-2 py-1 rounded bg-blue-600 text-white">
                        Selected
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Chat */}
      {pageId && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-500
                         dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
              placeholder="Ask about this page..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              onClick={ask}
              className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
              disabled={asking}
            >
              {asking ? 'Asking…' : 'Ask'}
            </button>
          </div>

          <div className="space-y-2">
            {messages.map((m, i) => {
              const bubbleBase =
                'p-3 rounded border leading-relaxed whitespace-pre-wrap break-words';
              const bubbleTheme =
                m.role === 'user'
                  ? 'bg-gray-100 text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
                  : 'bg-gray-50 text-gray-900 border-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-700';
              return (
                <div key={i} className={`${bubbleBase} ${bubbleTheme}`}>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{m.role}</div>
                  <div>{m.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}