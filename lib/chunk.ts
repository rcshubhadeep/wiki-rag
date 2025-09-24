/**
 * Robust, progress-safe character chunker with overlap.
 * - Guarantees forward progress even when overlap >= maxLen.
 * - Clamps bad params and handles empty input safely.
 */
export function chunkText(raw: string, maxLen = 1200, overlap = 200) {
  const text = (raw ?? '').toString();
  const chunks: string[] = [];
  if (!text.trim()) return chunks;

  // Clamp params to safe ranges
  const safeMax = Number.isFinite(maxLen) && maxLen > 0 ? Math.floor(maxLen) : 1200;
  const safeOverlap = Number.isFinite(overlap) && overlap >= 0
    ? Math.min(Math.floor(overlap), Math.max(0, safeMax - 1))
    : 200;

  // Ensure forward progress
  const step = Math.max(1, safeMax - safeOverlap);

  for (let i = 0; i < text.length; i += step) {
    const end = Math.min(i + safeMax, text.length);
    const slice = text.slice(i, end).trim();
    if (slice) chunks.push(slice);
    if (end >= text.length) break;

    // Guard against pathological inputs
    if (chunks.length > 200000) {
      return [text.slice(0, Math.min(text.length, safeMax)).trim()];
    }
  }

  return chunks.map((c) => c.replace(/\s+\n/g, '\n').trim());
}