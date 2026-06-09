/**
 * @stable — DocumentCorpus primitive (prim-context-02, v1.56.0)
 *
 * Declares a project's document corpus for retrieval alongside ontology
 * context. Consumed by `palantir-mini lib/ontology-context/document-context.ts`
 * when `ontology_context_query` opts in via `includeDocumentContext: true`.
 *
 * Two retrieval modes:
 *   full-document — each named document returned as one chunk (truncated to 2KB)
 *   chunk-mode    — split on ## headings, score chunks by token overlap with
 *                   prompt nouns/verbs, return top-K
 *
 * The corpus file lives at `<project>/.palantir-mini/document-corpus.json`.
 * pm-project-onboard writes a placeholder on first onboarding (empty documents[]).
 * Operators populate `documents` with project-relevant references for
 * Chatbot Studio retrieval.
 *
 * Authority chain:
 *   research/ (AIP #3 Chatbot Studio retrieval model)
 *     ↓
 *   schemas/ontology/primitives/document-corpus.ts (this file)
 *     ↓
 *   ~/ontology/shared-core/document-corpus.ts
 *     ↓
 *   palantir-mini/lib/ontology-context/document-context.ts
 *     + bridge/handlers/ontology-context-query.ts (includeDocumentContext opt-in)
 *
 * Promoted at: v1.56.0 (foamy-giggling-kettle PR-12).
 *
 * @owner palantirkc-ontology
 * @since v1.56.0
 */


export const DOCUMENT_CORPUS_SCHEMA_VERSION =
  "palantir-mini/document-corpus/v1" as const;

/**
 * Retrieval mode for `retrieveDocumentContext`.
 *
 * - `full-document` — each named document returned as one chunk (full text,
 *   truncated to 2000 chars). Score = 1 for all.
 * - `chunk-mode` — split each document on ## headings, score chunks by token
 *   overlap with caller-supplied prompt nouns/verbs, return top-K.
 */
export type DocumentRetrievalMode = "full-document" | "chunk-mode";

/**
 * A single document entry in the corpus.
 * `sourcePath` may be absolute or workspace-relative to `projectRoot`.
 */
export interface DocumentCorpusEntry {
  /** Stable identifier for the document (URL-safe slug). */
  readonly documentId: string;
  /** Absolute or workspace-relative path to the document source. */
  readonly sourcePath: string;
  /** Short label for human display. */
  readonly title?: string;
  /** Last seen mtime ISO string (optional; populated by onboarding scan). */
  readonly mtime?: string;
}

/**
 * Canonical schema shape for a project's document corpus.
 * Written to `<project>/.palantir-mini/document-corpus.json`.
 */
export interface DocumentCorpus {
  readonly schemaVersion: typeof DOCUMENT_CORPUS_SCHEMA_VERSION;
  /** Documents available for retrieval. */
  readonly documents: readonly DocumentCorpusEntry[];
  /** Mode used by retrieveDocumentContext when caller opts in. */
  readonly retrievalMode: DocumentRetrievalMode;
  /** Top-K chunks returned in chunk-mode (ignored in full-document mode). */
  readonly topK: number;
}

/**
 * Type guard for schema version literal.
 */
export function isDocumentCorpusSchemaVersionV1(
  candidate: unknown,
): candidate is typeof DOCUMENT_CORPUS_SCHEMA_VERSION {
  return candidate === DOCUMENT_CORPUS_SCHEMA_VERSION;
}

/**
 * Type guard for DocumentCorpus.
 */
export function isDocumentCorpus(candidate: unknown): candidate is DocumentCorpus {
  if (typeof candidate !== "object" || candidate === null) return false;
  const corpus = candidate as DocumentCorpus;
  return (
    corpus.schemaVersion === DOCUMENT_CORPUS_SCHEMA_VERSION &&
    Array.isArray(corpus.documents) &&
    (corpus.retrievalMode === "full-document" || corpus.retrievalMode === "chunk-mode") &&
    typeof corpus.topK === "number" &&
    corpus.topK >= 0
  );
}
