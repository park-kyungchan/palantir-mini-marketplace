import * as fs from "node:fs";
import * as path from "node:path";

export const CURRICULUM_V2_SCHEMA_VERSION = "curriculum-reference-pack/v2";

export interface CurriculumContextTrust {
  readonly role?: string;
  readonly ssot_status?: string;
  readonly authority_tier?: string;
  readonly confidence?: number;
  readonly human_review_status?: string;
  readonly defect_refs?: readonly string[];
  readonly qa_risk_refs?: readonly string[];
}

export interface CurriculumContextSourceSpanRef {
  readonly source_id?: string;
  readonly source_document?: string;
  readonly source_path?: string;
  readonly source_page_start?: number | null;
  readonly source_page_end?: number | null;
  readonly derived_path?: string;
  readonly derived_line_start?: number | null;
  readonly derived_line_end?: number | null;
  readonly raw_excerpt_sha256?: string;
  readonly source_authority?: string;
}

export interface CurriculumContextObject {
  readonly schema_version: typeof CURRICULUM_V2_SCHEMA_VERSION;
  readonly object_id: string;
  readonly collection_id: string;
  readonly object_type: string;
  readonly title: string;
  readonly language?: string;
  readonly native_id?: string | null;
  readonly native_label?: string | null;
  readonly display_text?: string;
  readonly normalized_text?: string;
  readonly source_span_refs?: readonly string[];
  readonly trust?: CurriculumContextTrust;
  readonly tags?: readonly string[];
  readonly retrieval_tags?: readonly string[];
  readonly related_object_ids?: readonly string[];
  readonly v1_unit_ref?: {
    readonly unit_id?: string;
    readonly unit_type?: string;
    readonly card_path?: string | null;
  };
  readonly facets?: {
    readonly grade_band?: string | null;
    readonly course?: string | null;
    readonly concept?: readonly string[];
    readonly command_verb?: string | null;
    readonly criterion?: string | null;
    readonly source_authority?: readonly string[];
    readonly qa_risk?: readonly string[];
  };
}

export interface CurriculumContextSourceSpan {
  readonly schema_version: typeof CURRICULUM_V2_SCHEMA_VERSION;
  readonly span_id?: string;
  readonly object_id?: string;
  readonly object_type?: string;
  readonly collection_id: string;
  readonly title?: string;
  readonly language?: string;
  readonly source_span_refs?: readonly string[];
  readonly trust?: CurriculumContextTrust;
  readonly source_id?: string;
  readonly source_document?: string;
  readonly source_path?: string;
  readonly source_page_start?: number | null;
  readonly source_page_end?: number | null;
  readonly derived_path?: string;
  readonly derived_line_start?: number | null;
  readonly derived_line_end?: number | null;
  readonly raw_excerpt_sha256?: string;
  readonly authority_tier?: string;
  readonly screenshot_path?: string | null;
  readonly extraction_notes?: readonly string[];
}

export interface CurriculumContextEdge {
  readonly schema_version: typeof CURRICULUM_V2_SCHEMA_VERSION;
  readonly edge_id: string;
  readonly collection_id: string;
  readonly edge_type: string;
  readonly from_object_id: string;
  readonly to_object_id?: string | null;
  readonly to_source_span_ref?: string | null;
  readonly source_span_refs?: readonly string[];
  readonly trust?: CurriculumContextTrust;
  readonly v1_edge_ref?: string | null;
}

export interface CurriculumContextAuthoringRow {
  readonly schema_version: typeof CURRICULUM_V2_SCHEMA_VERSION;
  readonly intent_phrase: string;
  readonly candidate_nouns?: readonly string[];
  readonly candidate_verbs?: readonly string[];
  readonly candidate_surfaces?: readonly string[];
  readonly non_goals?: readonly string[];
  readonly evidence_object_refs?: readonly string[];
  readonly source_span_refs?: readonly string[];
  readonly confidence?: number;
}

export interface CurriculumContextRetrievalBundle {
  readonly schema_version: typeof CURRICULUM_V2_SCHEMA_VERSION;
  readonly bundle_id?: string;
  readonly object_id?: string;
  readonly object_type?: string;
  readonly collection_id: string;
  readonly title?: string;
  readonly purpose?: string;
  readonly recommended_questions?: readonly string[];
  readonly candidate_nouns?: readonly string[];
  readonly candidate_verbs?: readonly string[];
  readonly non_goal_warnings?: readonly string[];
  readonly evidence_object_refs?: readonly string[];
  readonly source_span_refs?: readonly string[];
  readonly qa_risk_refs?: readonly string[];
  readonly confidence?: number;
  readonly trust?: CurriculumContextTrust;
}

export interface CurriculumContextPack {
  readonly schemaVersion: typeof CURRICULUM_V2_SCHEMA_VERSION;
  readonly packRoot: string;
  readonly collectionIds: readonly string[];
  readonly objects: readonly CurriculumContextObject[];
  readonly sourceSpans: readonly CurriculumContextSourceSpan[];
  readonly edges: readonly CurriculumContextEdge[];
  readonly authoringRows: readonly CurriculumContextAuthoringRow[];
  readonly retrievalBundles: readonly CurriculumContextRetrievalBundle[];
  readonly warnings: readonly string[];
}

export interface LoadCurriculumContextPacksInput {
  readonly projectRoot: string;
  readonly packRoots?: readonly string[];
  readonly maxDiscoveredRoots?: number;
}

export interface LoadCurriculumContextPacksResult {
  readonly packs: readonly CurriculumContextPack[];
  readonly scannedRoots: readonly string[];
  readonly warnings: readonly string[];
}

type RowKind =
  | "objects"
  | "sourceSpans"
  | "edges"
  | "authoringRows"
  | "retrievalBundles";

const DEFAULT_PACK_ROOTS = [
  ".palantir-mini/curriculum/v2",
  "docs/2022-math-curriculum/agent-ready/v2",
  "docs/2022-math-curriculum/agent-ready/ontology-engineering/v2",
  "docs/myp-mathematics-subject-guide-2021/agent-ready/v2",
  "docs/myp-mathematics-subject-guide-2021/agent-ready/ontology-engineering/v2",
] as const;

const FILE_CANDIDATES: Record<RowKind, readonly string[]> = {
  objects: [
    "objects.jsonl",
    "curriculum-objects.jsonl",
    "curriculum_objects.jsonl",
    "manifests/objects.jsonl",
  ],
  sourceSpans: [
    "source-spans.jsonl",
    "source_spans.jsonl",
    "spans.jsonl",
    "manifests/source-spans.jsonl",
  ],
  edges: [
    "edges.jsonl",
    "curriculum-edges.jsonl",
    "curriculum_edges.jsonl",
    "manifests/edges.jsonl",
  ],
  authoringRows: [
    "authoring-index.jsonl",
    "authoring-index.json",
    "authoring_rows.jsonl",
    "authoring-rows.jsonl",
    "manifests/authoring-index.jsonl",
    "indexes/authoring-index.json",
  ],
  retrievalBundles: [
    "retrieval-bundles.jsonl",
    "retrieval-bundles.json",
    "retrieval_bundles.jsonl",
    "bundles.jsonl",
    "manifests/retrieval-bundles.jsonl",
    "bundles/retrieval-bundles.json",
    "indexes/retrieval-bundles.json",
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasV2Schema(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.schema_version === CURRICULUM_V2_SCHEMA_VERSION;
}

function isCurriculumObject(value: unknown): value is CurriculumContextObject {
  return (
    hasV2Schema(value) &&
    typeof value.object_id === "string" &&
    typeof value.collection_id === "string" &&
    typeof value.object_type === "string" &&
    typeof value.title === "string"
  );
}

function isSourceSpan(value: unknown): value is CurriculumContextSourceSpan {
  return (
    hasV2Schema(value) &&
    (typeof value.span_id === "string" || typeof value.object_id === "string") &&
    typeof value.collection_id === "string"
  );
}

function isEdge(value: unknown): value is CurriculumContextEdge {
  return (
    hasV2Schema(value) &&
    typeof value.edge_id === "string" &&
    typeof value.collection_id === "string" &&
    typeof value.edge_type === "string" &&
    typeof value.from_object_id === "string"
  );
}

function isAuthoringRow(value: unknown): value is CurriculumContextAuthoringRow {
  return (
    hasV2Schema(value) &&
    typeof value.intent_phrase === "string" &&
    (value.candidate_nouns === undefined || isStringArray(value.candidate_nouns)) &&
    (value.candidate_verbs === undefined || isStringArray(value.candidate_verbs)) &&
    (value.candidate_surfaces === undefined || isStringArray(value.candidate_surfaces))
  );
}

function isRetrievalBundle(value: unknown): value is CurriculumContextRetrievalBundle {
  return (
    hasV2Schema(value) &&
    (typeof value.bundle_id === "string" || typeof value.object_id === "string") &&
    typeof value.collection_id === "string"
  );
}

function acceptRow(kind: RowKind, value: unknown): boolean {
  if (kind === "objects") return isCurriculumObject(value);
  if (kind === "sourceSpans") return isSourceSpan(value);
  if (kind === "edges") return isEdge(value);
  if (kind === "authoringRows") return isAuthoringRow(value);
  return isRetrievalBundle(value);
}

function normalizeRoot(projectRoot: string, root: string): string {
  return path.isAbsolute(root) ? root : path.join(projectRoot, root);
}

function rowsFromJsonDocument(kind: RowKind, parsed: unknown): readonly unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return acceptRow(kind, parsed) ? [parsed] : [];

  const keys = [
    "rows",
    "items",
    "objects",
    "spans",
    "sourceSpans",
    "edges",
    "authoringRows",
    "retrievalBundles",
    "bundles",
  ];
  for (const key of keys) {
    const value = parsed[key];
    if (Array.isArray(value)) return value;
  }
  return acceptRow(kind, parsed) ? [parsed] : [];
}

function readRows<T>(
  filePath: string,
  kind: RowKind,
): { rows: readonly T[]; warnings: readonly string[]; found: boolean } {
  if (!fs.existsSync(filePath)) return { rows: [], warnings: [], found: false };

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return { rows: [], warnings: [`unreadable:${filePath}`], found: true };
  }

  const warnings: string[] = [];
  if (filePath.endsWith(".json")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const rows = rowsFromJsonDocument(kind, parsed);
      const accepted: T[] = [];
      rows.forEach((row, index) => {
        if (acceptRow(kind, row)) {
          accepted.push(row as T);
        } else {
          warnings.push(`invalid-${kind}-row:${filePath}:${index + 1}`);
        }
      });
      return { rows: accepted, warnings, found: true };
    } catch {
      return { rows: [], warnings: [`malformed-json:${filePath}`], found: true };
    }
  }

  const rows: T[] = [];
  const lines = raw.split(/\r?\n/u);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line.length === 0) continue;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (acceptRow(kind, parsed)) {
        rows.push(parsed as T);
      } else {
        warnings.push(`invalid-${kind}-row:${filePath}:${i + 1}`);
      }
    } catch {
      warnings.push(`malformed-jsonl:${filePath}:${i + 1}`);
    }
  }

  return { rows, warnings, found: true };
}

function readFirstCandidate<T>(
  packRoot: string,
  kind: RowKind,
): { rows: readonly T[]; warnings: readonly string[]; foundPath: string | null } {
  for (const candidate of FILE_CANDIDATES[kind]) {
    const filePath = path.join(packRoot, candidate);
    const result = readRows<T>(filePath, kind);
    if (result.found) {
      return { rows: result.rows, warnings: result.warnings, foundPath: filePath };
    }
  }
  return { rows: [], warnings: [], foundPath: null };
}

function collectCollectionIds(
  rows: readonly {
    readonly collection_id?: string;
  }[],
): readonly string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (typeof row.collection_id === "string" && row.collection_id.trim().length > 0) {
      ids.add(row.collection_id);
    }
  }
  return [...ids].sort();
}

function loadPackRoot(packRoot: string): CurriculumContextPack | null {
  if (!fs.existsSync(packRoot)) return null;
  try {
    if (!fs.statSync(packRoot).isDirectory()) return null;
  } catch {
    return null;
  }

  const objectRows = readFirstCandidate<CurriculumContextObject>(packRoot, "objects");
  const sourceSpanRows = readFirstCandidate<CurriculumContextSourceSpan>(packRoot, "sourceSpans");
  const edgeRows = readFirstCandidate<CurriculumContextEdge>(packRoot, "edges");
  const authoringRows = readFirstCandidate<CurriculumContextAuthoringRow>(packRoot, "authoringRows");
  const retrievalBundleRows =
    readFirstCandidate<CurriculumContextRetrievalBundle>(packRoot, "retrievalBundles");

  const warnings = [
    ...objectRows.warnings,
    ...sourceSpanRows.warnings,
    ...edgeRows.warnings,
    ...authoringRows.warnings,
    ...retrievalBundleRows.warnings,
  ];
  const totalRows =
    objectRows.rows.length +
    sourceSpanRows.rows.length +
    edgeRows.rows.length +
    authoringRows.rows.length +
    retrievalBundleRows.rows.length;

  if (totalRows === 0) {
    return null;
  }

  return {
    schemaVersion: CURRICULUM_V2_SCHEMA_VERSION,
    packRoot,
    collectionIds: collectCollectionIds([
      ...objectRows.rows,
      ...sourceSpanRows.rows,
      ...edgeRows.rows,
      ...retrievalBundleRows.rows,
    ]),
    objects: objectRows.rows,
    sourceSpans: sourceSpanRows.rows,
    edges: edgeRows.rows,
    authoringRows: authoringRows.rows,
    retrievalBundles: retrievalBundleRows.rows,
    warnings,
  };
}

function discoverAgentReadyV2Roots(
  projectRoot: string,
  maxRoots: number,
): readonly string[] {
  const docsRoot = path.join(projectRoot, "docs");
  const roots: string[] = [];
  if (!fs.existsSync(docsRoot)) return roots;

  const visit = (dir: string, depth: number): void => {
    if (roots.length >= maxRoots || depth > 5) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (roots.length >= maxRoots) return;
      if (!entry.isDirectory()) continue;
      const child = path.join(dir, entry.name);
      const isDirectAgentReady = entry.name === "v2" && path.basename(dir) === "agent-ready";
      const isOntologyEngineering =
        entry.name === "v2" &&
        path.basename(dir) === "ontology-engineering" &&
        path.basename(path.dirname(dir)) === "agent-ready";
      if (isDirectAgentReady || isOntologyEngineering) {
        roots.push(child);
        continue;
      }
      visit(child, depth + 1);
    }
  };

  visit(docsRoot, 0);
  return roots;
}

export function discoverCurriculumContextPackRoots(
  projectRoot: string,
  maxDiscoveredRoots = 20,
): readonly string[] {
  const roots = new Set<string>();
  for (const root of DEFAULT_PACK_ROOTS) {
    roots.add(normalizeRoot(projectRoot, root));
  }
  for (const root of discoverAgentReadyV2Roots(projectRoot, maxDiscoveredRoots)) {
    roots.add(root);
  }
  return [...roots];
}

export function loadCurriculumContextPacks(
  input: LoadCurriculumContextPacksInput,
): LoadCurriculumContextPacksResult {
  const scannedRoots =
    input.packRoots?.map((root) => normalizeRoot(input.projectRoot, root)) ??
    discoverCurriculumContextPackRoots(input.projectRoot, input.maxDiscoveredRoots);
  const packs: CurriculumContextPack[] = [];
  const warnings: string[] = [];

  for (const root of scannedRoots) {
    const pack = loadPackRoot(root);
    if (!pack) continue;
    packs.push(pack);
    warnings.push(...pack.warnings);
  }

  return { packs, scannedRoots, warnings };
}
