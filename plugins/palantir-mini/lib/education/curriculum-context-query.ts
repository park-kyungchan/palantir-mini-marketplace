import * as path from "node:path";

import {
  CURRICULUM_V2_SCHEMA_VERSION,
  loadCurriculumContextPacks,
  type CurriculumContextAuthoringRow,
  type CurriculumContextObject,
  type CurriculumContextPack,
  type CurriculumContextRetrievalBundle,
  type CurriculumContextSourceSpan,
} from "./curriculum-context-pack";

export const CURRICULUM_CONTEXT_SCHEMA_VERSION = "curriculum-context/v0";

export interface CurriculumContextQueryInput {
  readonly projectRoot: string;
  readonly queryTerms?: readonly string[];
  readonly scopePaths?: readonly string[];
  readonly requestedAxes?: readonly string[];
  readonly packRoots?: readonly string[];
  readonly maxObjects?: number;
  readonly maxRetrievalBundles?: number;
  readonly maxAuthoringRows?: number;
  readonly maxSourceSpans?: number;
  readonly includeWarnings?: boolean;
}

export interface CurriculumContextPackSummary {
  readonly packRoot: string;
  readonly collectionIds: readonly string[];
  readonly objectCount: number;
  readonly sourceSpanCount: number;
  readonly edgeCount: number;
  readonly authoringRowCount: number;
  readonly retrievalBundleCount: number;
}

export interface CurriculumContextObjectHit {
  readonly collectionId: string;
  readonly objectId: string;
  readonly objectType: string;
  readonly title: string;
  readonly excerpt: string;
  readonly tags: readonly string[];
  readonly sourceSpanRefs: readonly string[];
  readonly relatedObjectIds: readonly string[];
  readonly trust: {
    readonly authorityTier: string | null;
    readonly confidence: number | null;
    readonly humanReviewStatus: string | null;
  };
  readonly score: number;
}

export interface CurriculumContextRetrievalBundleHit {
  readonly collectionId: string;
  readonly bundleId: string;
  readonly purpose: string | null;
  readonly candidateNouns: readonly string[];
  readonly candidateVerbs: readonly string[];
  readonly nonGoalWarnings: readonly string[];
  readonly evidenceObjectRefs: readonly string[];
  readonly sourceSpanRefs: readonly string[];
  readonly score: number;
}

export interface CurriculumContextAuthoringRowHit {
  readonly intentPhrase: string;
  readonly candidateNouns: readonly string[];
  readonly candidateVerbs: readonly string[];
  readonly candidateSurfaces: readonly string[];
  readonly nonGoals: readonly string[];
  readonly evidenceObjectRefs: readonly string[];
  readonly sourceSpanRefs: readonly string[];
  readonly confidence: number | null;
  readonly score: number;
}

export interface CurriculumContextSourceSpanHit {
  readonly collectionId: string;
  readonly spanId: string;
  readonly sourceDocument: string | null;
  readonly sourcePath: string | null;
  readonly sourcePageStart: number | null;
  readonly sourcePageEnd: number | null;
  readonly derivedPath: string | null;
  readonly derivedLineStart: number | null;
  readonly derivedLineEnd: number | null;
  readonly authorityTier: string | null;
}

export interface CurriculumContextBundle {
  readonly schemaVersion: typeof CURRICULUM_CONTEXT_SCHEMA_VERSION;
  readonly sourceSchemaVersion: typeof CURRICULUM_V2_SCHEMA_VERSION;
  readonly queryTerms: readonly string[];
  readonly scopePaths: readonly string[];
  readonly packCount: number;
  readonly packs: readonly CurriculumContextPackSummary[];
  readonly matchedObjects: readonly CurriculumContextObjectHit[];
  readonly retrievalBundles: readonly CurriculumContextRetrievalBundleHit[];
  readonly authoringRows: readonly CurriculumContextAuthoringRowHit[];
  readonly sourceSpans: readonly CurriculumContextSourceSpanHit[];
  readonly warnings?: readonly string[];
}

interface Scored<T> {
  readonly item: T;
  readonly pack: CurriculumContextPack;
  readonly score: number;
}

const DEFAULT_MAX_OBJECTS = 6;
const DEFAULT_MAX_RETRIEVAL_BUNDLES = 3;
const DEFAULT_MAX_AUTHORING_ROWS = 3;
const DEFAULT_MAX_SOURCE_SPANS = 8;

function normalizeText(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

function uniq(values: readonly string[]): readonly string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function tokenize(value: string): readonly string[] {
  const normalized = normalizeText(value);
  const terms: string[] = [];
  for (const token of normalized.split(/[^\p{L}\p{N}_-]+/u)) {
    if (token.length < 2) continue;
    terms.push(token);
    for (const part of token.split(/[-_]+/u)) {
      if (part.length >= 2) terms.push(part);
    }
  }
  return uniq(terms);
}

function termsFromScopePath(scopePath: string): readonly string[] {
  const normalized = normalizeText(scopePath.replace(/\\/g, "/"));
  const parsed = path.posix.parse(normalized);
  return tokenize(`${normalized} ${parsed.name} ${parsed.dir}`);
}

export function deriveCurriculumQueryTerms(input: {
  readonly queryTerms?: readonly string[];
  readonly scopePaths?: readonly string[];
  readonly requestedAxes?: readonly string[];
}): readonly string[] {
  const terms: string[] = [];
  for (const value of input.queryTerms ?? []) {
    terms.push(...tokenize(value));
  }
  for (const value of input.scopePaths ?? []) {
    terms.push(...termsFromScopePath(value));
  }
  for (const value of input.requestedAxes ?? []) {
    terms.push(...tokenize(value));
  }
  return uniq(terms);
}

function asArray(value: readonly string[] | undefined): readonly string[] {
  return value ?? [];
}

function objectTags(object: CurriculumContextObject): readonly string[] {
  return uniq([
    ...asArray(object.tags),
    ...asArray(object.retrieval_tags),
  ]);
}

function sourceSpanId(span: CurriculumContextSourceSpan): string {
  return span.span_id ?? span.object_id ?? "";
}

function retrievalBundleId(bundle: CurriculumContextRetrievalBundle): string {
  return bundle.bundle_id ?? bundle.object_id ?? "";
}

function compactText(values: readonly (string | null | undefined)[]): string {
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n");
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/gu, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

function scoreFields(
  fields: readonly (string | readonly string[] | null | undefined)[],
  terms: readonly string[],
): number {
  if (terms.length === 0) return 0;
  const haystack = normalizeText(
    fields
      .flatMap((field) => Array.isArray(field) ? field : [field])
      .filter((field): field is string => typeof field === "string" && field.length > 0)
      .join("\n"),
  );
  if (haystack.length === 0) return 0;

  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += 1;
  }
  return score / terms.length;
}

function scoreObject(object: CurriculumContextObject, terms: readonly string[]): number {
  return scoreFields(
    [
      object.object_id,
      object.object_type,
      object.title,
      object.native_id,
      object.native_label,
      object.display_text,
      object.normalized_text,
      objectTags(object),
      object.related_object_ids,
      object.v1_unit_ref?.unit_id,
      object.v1_unit_ref?.unit_type,
      object.v1_unit_ref?.card_path,
      object.facets?.grade_band,
      object.facets?.course,
      object.facets?.concept,
      object.facets?.command_verb,
      object.facets?.criterion,
      object.facets?.source_authority,
      object.facets?.qa_risk,
    ],
    terms,
  );
}

function scoreRetrievalBundle(
  bundle: CurriculumContextRetrievalBundle,
  terms: readonly string[],
): number {
  return scoreFields(
    [
      bundle.bundle_id,
      bundle.object_id,
      bundle.collection_id,
      bundle.title,
      bundle.purpose,
      bundle.recommended_questions,
      bundle.candidate_nouns,
      bundle.candidate_verbs,
      bundle.non_goal_warnings,
      bundle.evidence_object_refs,
      bundle.source_span_refs,
      bundle.qa_risk_refs,
    ],
    terms,
  );
}

function scoreAuthoringRow(
  row: CurriculumContextAuthoringRow,
  terms: readonly string[],
): number {
  return scoreFields(
    [
      row.intent_phrase,
      row.candidate_nouns,
      row.candidate_verbs,
      row.candidate_surfaces,
      row.non_goals,
      row.evidence_object_refs,
      row.source_span_refs,
    ],
    terms,
  );
}

function scoreSourceSpan(span: CurriculumContextSourceSpan, terms: readonly string[]): number {
  return scoreFields(
    [
      sourceSpanId(span),
      span.collection_id,
      span.title,
      span.source_id,
      span.source_document,
      span.source_path,
      span.derived_path,
      span.authority_tier,
      span.extraction_notes,
    ],
    terms,
  );
}

function topScored<T>(
  values: readonly Scored<T>[],
  limit: number,
): readonly Scored<T>[] {
  return [...values]
    .filter((value) => value.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}

function summarizePack(pack: CurriculumContextPack): CurriculumContextPackSummary {
  return {
    packRoot: pack.packRoot,
    collectionIds: pack.collectionIds,
    objectCount: pack.objects.length,
    sourceSpanCount: pack.sourceSpans.length,
    edgeCount: pack.edges.length,
    authoringRowCount: pack.authoringRows.length,
    retrievalBundleCount: pack.retrievalBundles.length,
  };
}

function objectHit(scored: Scored<CurriculumContextObject>): CurriculumContextObjectHit {
  const object = scored.item;
  return {
    collectionId: object.collection_id,
    objectId: object.object_id,
    objectType: object.object_type,
    title: object.title,
    excerpt: truncate(compactText([object.display_text, object.normalized_text]), 320),
    tags: objectTags(object),
    sourceSpanRefs: asArray(object.source_span_refs),
    relatedObjectIds: asArray(object.related_object_ids),
    trust: {
      authorityTier: object.trust?.authority_tier ?? null,
      confidence: typeof object.trust?.confidence === "number" ? object.trust.confidence : null,
      humanReviewStatus: object.trust?.human_review_status ?? null,
    },
    score: scored.score,
  };
}

function retrievalBundleHit(
  scored: Scored<CurriculumContextRetrievalBundle>,
): CurriculumContextRetrievalBundleHit {
  const bundle = scored.item;
  return {
    collectionId: bundle.collection_id,
    bundleId: retrievalBundleId(bundle),
    purpose: bundle.purpose ?? null,
    candidateNouns: asArray(bundle.candidate_nouns),
    candidateVerbs: asArray(bundle.candidate_verbs),
    nonGoalWarnings: asArray(bundle.non_goal_warnings),
    evidenceObjectRefs: asArray(bundle.evidence_object_refs),
    sourceSpanRefs: asArray(bundle.source_span_refs),
    score: scored.score,
  };
}

function authoringRowHit(
  scored: Scored<CurriculumContextAuthoringRow>,
): CurriculumContextAuthoringRowHit {
  const row = scored.item;
  return {
    intentPhrase: row.intent_phrase,
    candidateNouns: asArray(row.candidate_nouns),
    candidateVerbs: asArray(row.candidate_verbs),
    candidateSurfaces: asArray(row.candidate_surfaces),
    nonGoals: asArray(row.non_goals),
    evidenceObjectRefs: asArray(row.evidence_object_refs),
    sourceSpanRefs: asArray(row.source_span_refs),
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    score: scored.score,
  };
}

function sourceSpanHit(span: CurriculumContextSourceSpan): CurriculumContextSourceSpanHit {
  return {
    collectionId: span.collection_id,
    spanId: sourceSpanId(span),
    sourceDocument: span.source_document ?? null,
    sourcePath: span.source_path ?? null,
    sourcePageStart:
      typeof span.source_page_start === "number" ? span.source_page_start : null,
    sourcePageEnd:
      typeof span.source_page_end === "number" ? span.source_page_end : null,
    derivedPath: span.derived_path ?? null,
    derivedLineStart:
      typeof span.derived_line_start === "number" ? span.derived_line_start : null,
    derivedLineEnd:
      typeof span.derived_line_end === "number" ? span.derived_line_end : null,
    authorityTier: span.authority_tier ?? null,
  };
}

function collectSourceSpanIds(
  objectHits: readonly CurriculumContextObjectHit[],
  bundleHits: readonly CurriculumContextRetrievalBundleHit[],
  authoringHits: readonly CurriculumContextAuthoringRowHit[],
): Set<string> {
  const ids = new Set<string>();
  for (const hit of objectHits) {
    for (const id of hit.sourceSpanRefs) ids.add(id);
  }
  for (const hit of bundleHits) {
    for (const id of hit.sourceSpanRefs) ids.add(id);
  }
  for (const hit of authoringHits) {
    for (const id of hit.sourceSpanRefs) ids.add(id);
  }
  return ids;
}

function buildSourceSpanHits(
  packs: readonly CurriculumContextPack[],
  sourceSpanIds: Set<string>,
  scoredSpans: readonly Scored<CurriculumContextSourceSpan>[],
  limit: number,
): readonly CurriculumContextSourceSpanHit[] {
  const spans = new Map<string, CurriculumContextSourceSpan>();
  for (const pack of packs) {
    for (const span of pack.sourceSpans) {
      const id = sourceSpanId(span);
      if (id.length > 0 && !spans.has(id)) spans.set(id, span);
    }
  }

  const selected: CurriculumContextSourceSpan[] = [];
  const seen = new Set<string>();
  for (const id of sourceSpanIds) {
    const span = spans.get(id);
    const resolvedId = span ? sourceSpanId(span) : "";
    if (!span || resolvedId.length === 0 || seen.has(resolvedId)) continue;
    seen.add(resolvedId);
    selected.push(span);
    if (selected.length >= limit) break;
  }
  if (selected.length < limit) {
    for (const scored of scoredSpans) {
      const span = scored.item;
      const id = sourceSpanId(span);
      if (id.length === 0 || seen.has(id)) continue;
      seen.add(id);
      selected.push(span);
      if (selected.length >= limit) break;
    }
  }

  return selected.map(sourceSpanHit);
}

export function queryCurriculumContext(
  input: CurriculumContextQueryInput,
): CurriculumContextBundle | undefined {
  const queryTerms = deriveCurriculumQueryTerms(input);
  if (queryTerms.length === 0) return undefined;

  let loaded: ReturnType<typeof loadCurriculumContextPacks>;
  try {
    loaded = loadCurriculumContextPacks({
      projectRoot: input.projectRoot,
      ...(input.packRoots !== undefined ? { packRoots: input.packRoots } : {}),
    });
  } catch {
    return undefined;
  }

  if (loaded.packs.length === 0) return undefined;

  const objectScores: Scored<CurriculumContextObject>[] = [];
  const bundleScores: Scored<CurriculumContextRetrievalBundle>[] = [];
  const authoringScores: Scored<CurriculumContextAuthoringRow>[] = [];
  const spanScores: Scored<CurriculumContextSourceSpan>[] = [];

  for (const pack of loaded.packs) {
    for (const object of pack.objects) {
      objectScores.push({ item: object, pack, score: scoreObject(object, queryTerms) });
    }
    for (const bundle of pack.retrievalBundles) {
      bundleScores.push({ item: bundle, pack, score: scoreRetrievalBundle(bundle, queryTerms) });
    }
    for (const row of pack.authoringRows) {
      authoringScores.push({ item: row, pack, score: scoreAuthoringRow(row, queryTerms) });
    }
    for (const span of pack.sourceSpans) {
      spanScores.push({ item: span, pack, score: scoreSourceSpan(span, queryTerms) });
    }
  }

  const matchedObjects = topScored(
    objectScores,
    input.maxObjects ?? DEFAULT_MAX_OBJECTS,
  ).map(objectHit);
  const retrievalBundles = topScored(
    bundleScores,
    input.maxRetrievalBundles ?? DEFAULT_MAX_RETRIEVAL_BUNDLES,
  ).map(retrievalBundleHit);
  const authoringRows = topScored(
    authoringScores,
    input.maxAuthoringRows ?? DEFAULT_MAX_AUTHORING_ROWS,
  ).map(authoringRowHit);
  const sourceSpans = buildSourceSpanHits(
    loaded.packs,
    collectSourceSpanIds(matchedObjects, retrievalBundles, authoringRows),
    topScored(spanScores, input.maxSourceSpans ?? DEFAULT_MAX_SOURCE_SPANS),
    input.maxSourceSpans ?? DEFAULT_MAX_SOURCE_SPANS,
  );

  if (
    matchedObjects.length === 0 &&
    retrievalBundles.length === 0 &&
    authoringRows.length === 0 &&
    sourceSpans.length === 0
  ) {
    return undefined;
  }

  return {
    schemaVersion: CURRICULUM_CONTEXT_SCHEMA_VERSION,
    sourceSchemaVersion: CURRICULUM_V2_SCHEMA_VERSION,
    queryTerms,
    scopePaths: input.scopePaths ?? [],
    packCount: loaded.packs.length,
    packs: loaded.packs.map(summarizePack),
    matchedObjects,
    retrievalBundles,
    authoringRows,
    sourceSpans,
    ...(input.includeWarnings === true ? { warnings: loaded.warnings.slice(0, 10) } : {}),
  };
}

export const buildCurriculumContext = queryCurriculumContext;
