// palantir-mini v3.7.0 — lib/semantic-graph/producer-verification/extractors.ts
// Markdown section + criterion-id + RID/file-path target extractors.
// Extracted from producer-verification.ts during A.2 decomposition.

import { semanticRid } from "#schemas/ontology/primitives/semantic-rid";
import type { SemanticRid, SemanticRidKind } from "#schemas/ontology/primitives/semantic-rid";
import { snippetAround } from "./walkers";

/** Extract ## sections from markdown with per-section body for scan. */
export function extractEvalSections(src: string): Array<{ slug: string; title: string; body: string }> {
  const lines = src.split("\n");
  const out: Array<{ slug: string; title: string; body: string }> = [];
  let curTitle = "";
  let curSlug = "";
  let curBody: string[] = [];
  const flush = (): void => {
    if (curSlug) out.push({ slug: curSlug, title: curTitle, body: curBody.join("\n") });
  };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      flush();
      curTitle = (m[1] ?? "").trim();
      curSlug = curTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      curBody = [];
    } else if (curSlug) {
      curBody.push(line);
    }
  }
  flush();
  return out;
}

/** Extract bullet/`### C\d+` criterion IDs (preserves Wave 2 MVP node-emit behavior). */
export function extractBulletCriterionIds(src: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of src.split("\n")) {
    const m = line.match(/^(?:-\s+|###\s+)(C\d+)\b/);
    if (m) {
      const cId = (m[1] ?? "").toLowerCase();
      if (cId && !seen.has(cId)) {
        seen.add(cId);
        out.push(cId);
      }
    }
  }
  return out;
}

/**
 * Scan a body of markdown/text for RID + file-path mentions. Returns candidate
 * edge targets with evidence excerpts. Skips URLs (contains "//") + absolute
 * paths (starts with "/") to avoid spurious RIDs.
 */
export function extractTargets(body: string): Array<{ targetRid: SemanticRid; evidence: string }> {
  const seen = new Set<string>();
  const out: Array<{ targetRid: SemanticRid; evidence: string }> = [];
  const ridKinds = new Set<string>(["ontology", "runtime", "file", "eval", "doc", "mon", "gen", "lineage", "artifact"]);

  const push = (kind: SemanticRidKind, value: string, atIndex: number): void => {
    if (value.startsWith("/") || value.includes("//")) return;
    if (/\s/.test(value)) return;
    const key = `${kind}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    try {
      const rid = semanticRid(kind, value);
      out.push({ targetRid: rid, evidence: snippetAround(body, atIndex) });
    } catch {
      // invalid value for factory (colon in non-file kind, etc.) — skip silently
    }
  };

  // 1. Explicit RID mentions: `kind:value` where kind is in ridKinds
  const ridRegex = /\b([a-z]+):([a-zA-Z0-9._/\-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = ridRegex.exec(body)) !== null) {
    const kindStr = m[1] ?? "";
    const value = m[2] ?? "";
    if (!ridKinds.has(kindStr)) continue;
    push(kindStr as SemanticRidKind, value, m.index);
  }

  // 2. Backticked file-like paths: `src/foo.ts`, `lib/bar.tsx`
  const backtickRegex = /`([a-zA-Z0-9_][a-zA-Z0-9_/.\-]*\.(?:ts|tsx|js|jsx|md|json|jsonl))`/g;
  while ((m = backtickRegex.exec(body)) !== null) {
    const relPath = m[1] ?? "";
    if (!relPath || !relPath.includes("/")) continue;
    push("file", relPath, m.index);
  }

  // 3. Markdown links: [name](path.md) — doc-to-doc + doc-to-code references
  const linkRegex = /\[[^\]]+\]\(([a-zA-Z0-9_][a-zA-Z0-9_/.\-]*\.(?:md|ts|tsx|js|jsx|json))\)/g;
  while ((m = linkRegex.exec(body)) !== null) {
    const relPath = m[1] ?? "";
    if (!relPath || !relPath.includes("/")) continue;
    push("file", relPath, m.index);
  }

  return out;
}
