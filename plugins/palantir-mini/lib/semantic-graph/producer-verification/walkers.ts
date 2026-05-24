// palantir-mini v3.7.0 — lib/semantic-graph/producer-verification/walkers.ts
// Markdown + scan-root directory walkers + snippet helper.
// Extracted from producer-verification.ts during A.2 decomposition.

import * as fs from "fs";
import * as path from "path";

export function walkMarkdown(dir: string, visit: (f: string) => void, depth = 0): void {
  if (depth > 4) return;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkMarkdown(full, visit, depth + 1);
    else if (e.name.endsWith(".md")) visit(full);
  }
}

/** Walk project files under scan-root dirs for monitor scope. Limited depth + extension whitelist. */
export function walkScanRoot(dir: string, visit: (f: string) => void, maxDepth = 5, depth = 0): void {
  if (depth > maxDepth) return;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "dist") continue;
    // `.palantir-mini` itself is a valid scan target for event-log-tail; allow it explicitly
    if (e.name.startsWith(".") && e.name !== ".palantir-mini") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkScanRoot(full, visit, maxDepth, depth + 1);
    else if (/\.(ts|tsx|js|jsx|json|jsonl|md)$/.test(e.name)) visit(full);
  }
}

export function snippetAround(text: string, index: number): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + 100);
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 180);
}
