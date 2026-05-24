// palantir-mini v3.3.0 — pm-rule-query keyword match helpers (B.5)
// Extracted from pm-rule-query.ts. Used by search mode only.

import { SEARCH_SNIPPET_CONTEXT } from "./types";

export function scoreMatch(text: string, query: string): { count: number; firstIdx: number } {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return { count: 0, firstIdx: -1 };
  let count = 0;
  let firstIdx = -1;
  let from = 0;
  while (true) {
    const idx = lower.indexOf(q, from);
    if (idx === -1) break;
    if (firstIdx === -1) firstIdx = idx;
    count++;
    from = idx + q.length;
  }
  return { count, firstIdx };
}

export function extractSnippet(text: string, idx: number, queryLen: number): string {
  const start = Math.max(0, idx - SEARCH_SNIPPET_CONTEXT);
  const end = Math.min(text.length, idx + queryLen + SEARCH_SNIPPET_CONTEXT);
  const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${snippet}${suffix}`;
}
