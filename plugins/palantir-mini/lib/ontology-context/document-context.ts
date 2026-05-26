// palantir-mini PR-12 — Document context retrieval.
//
// Two modes:
//   - "full-document": each named document returned as one chunk (full text,
//     truncated to 2000 chars).
//   - "chunk-mode": split each document on ## headings, score chunks by token
//     overlap with prompt nouns/verbs, return top-K.
//
// No embeddings (deliberate non-goal — local runtime, low complexity).
//
// Reads <project>/.palantir-mini/document-corpus.json (DocumentCorpus
// instance). If missing, returns empty result with corpusFound=false.

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  DocumentCorpus,
  DocumentCorpusEntry,
  DocumentRetrievalMode,
} from "#schemas/ontology/primitives/document-corpus";

export interface DocumentContextChunk {
  readonly sourceRef: string;
  readonly documentId: string;
  readonly excerpt: string;
  readonly score: number;
}

export interface RetrieveDocumentContextInput {
  readonly projectRoot: string;
  /** Prompt tokens to score against — caller can pass nouns/verbs/surfaces extracted upstream. */
  readonly promptTokens?: readonly string[];
  /** Override default K from corpus. */
  readonly topKOverride?: number;
  /** Override retrievalMode (otherwise from corpus). */
  readonly retrievalModeOverride?: DocumentRetrievalMode;
}

export interface DocumentContextResult {
  readonly contextChunks: readonly DocumentContextChunk[];
  readonly retrievalKind: DocumentRetrievalMode;
  readonly corpusFound: boolean;
}

const CORPUS_FILE = "document-corpus.json";

function corpusPath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", CORPUS_FILE);
}

function readCorpus(projectRoot: string): DocumentCorpus | null {
  const fp = corpusPath(projectRoot);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8")) as DocumentCorpus;
  } catch {
    return null;
  }
}

function resolveDocPath(projectRoot: string, entry: DocumentCorpusEntry): string {
  if (path.isAbsolute(entry.sourcePath)) return entry.sourcePath;
  return path.join(projectRoot, entry.sourcePath);
}

function readDocText(projectRoot: string, entry: DocumentCorpusEntry): string | null {
  const fp = resolveDocPath(projectRoot, entry);
  if (!fs.existsSync(fp)) return null;
  try {
    return fs.readFileSync(fp, "utf8");
  } catch {
    return null;
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/**
 * Split text on ## headings (markdown). Returns chunks paired with the heading
 * that introduces them. If no headings exist, returns one chunk for the whole
 * document.
 */
function splitOnHeadings(text: string): Array<{ heading: string; body: string }> {
  const headingRe = /^##\s+(.+)$/gm;
  const matches: Array<{ idx: number; heading: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(text)) !== null) {
    matches.push({ idx: m.index, heading: (m[1] ?? "").trim() });
  }
  if (matches.length === 0) {
    return [{ heading: "", body: text }];
  }
  const chunks: Array<{ heading: string; body: string }> = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]!;
    const next = matches[i + 1];
    const start = current.idx;
    const end = next !== undefined ? next.idx : text.length;
    chunks.push({ heading: current.heading, body: text.slice(start, end) });
  }
  return chunks;
}

function scoreChunk(chunkTokens: Set<string>, promptTokens: readonly string[]): number {
  if (promptTokens.length === 0) return 0;
  let hit = 0;
  for (const t of promptTokens) {
    if (chunkTokens.has(t.toLowerCase())) hit += 1;
  }
  return hit / promptTokens.length;
}

export function retrieveDocumentContext(
  input: RetrieveDocumentContextInput,
): DocumentContextResult {
  const corpus = readCorpus(input.projectRoot);
  if (!corpus) {
    return { contextChunks: [], retrievalKind: "chunk-mode", corpusFound: false };
  }
  const retrievalKind = input.retrievalModeOverride ?? corpus.retrievalMode;
  const promptTokens = input.promptTokens ?? [];

  if (retrievalKind === "full-document") {
    const chunks: DocumentContextChunk[] = [];
    for (const entry of corpus.documents) {
      const text = readDocText(input.projectRoot, entry);
      if (!text) continue;
      chunks.push({
        sourceRef: entry.documentId,
        documentId: entry.documentId,
        excerpt: text.length > 2000 ? `${text.slice(0, 2000)}…` : text,
        score: 1,
      });
    }
    return { contextChunks: chunks, retrievalKind, corpusFound: true };
  }

  // chunk-mode
  const allChunks: DocumentContextChunk[] = [];
  for (const entry of corpus.documents) {
    const text = readDocText(input.projectRoot, entry);
    if (!text) continue;
    for (const chunk of splitOnHeadings(text)) {
      const tokens = new Set(tokenize(`${chunk.heading}\n${chunk.body}`));
      const score = scoreChunk(tokens, promptTokens);
      const excerpt =
        chunk.body.length > 600 ? `${chunk.body.slice(0, 600)}…` : chunk.body;
      allChunks.push({
        sourceRef: `${entry.documentId}#${chunk.heading || "head"}`,
        documentId: entry.documentId,
        excerpt,
        score,
      });
    }
  }
  allChunks.sort((a, b) => b.score - a.score);
  const k = input.topKOverride ?? corpus.topK;
  return {
    contextChunks: allChunks.slice(0, Math.max(0, k)),
    retrievalKind,
    corpusFound: true,
  };
}
