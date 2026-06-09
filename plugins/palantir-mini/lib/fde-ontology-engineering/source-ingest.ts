/**
 * source-ingest — parse a FROZEN NC1 SOURCE jsonl (one record per line) into the
 * five FDE ontology-engineering session candidate arrays, then merge them onto a
 * session so the existing register pipeline can elevate them.
 *
 * This is the INGESTION ADAPTER that lets a frozen NC1 SOURCE feed the elevation
 * flow without interactive per-turn authoring:
 *
 *   action:"ingest" (SOURCE → session candidates)
 *     → draft_sic → approve → action:"register"
 *
 * The SOURCE schema (linear-function NC1):
 *   - Discriminator: record.kg_layer ∈ {DATA, LOGIC, ACTION, GOVERNANCE, EDGE}.
 *   - record.record_type is the precise 5-value string (kg_linear_function_*).
 *   - Atom fields: candidate_id, label_ko (human name), description_ko (prose),
 *     atom_kind/logic_kind/action_kind/role_kind (sub-kind),
 *     model_knowledge_basis, source_basis_refs (string[]), review_status,
 *     promotion_record, governed_action_policy (GOV).
 *   - EDGE fields: candidate_id, source_candidate_id, target_candidate_id,
 *     edge_kind (12 values; may be NULL).
 *
 * PURE parse (parseJsonlSourceToCandidateArrays) is decoupled from the
 * session-integrating wrapper (ingestJsonlSourceToCandidates) so the transform is
 * independently testable.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Map a frozen NC1 SOURCE jsonl → session candidate arrays (ingest seam)
 */

import * as fs from "node:fs";
import {
  createFDEOntologyEngineeringSessionFromEntry,
  readCurrentFDEOntologyEngineeringSession,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "./session-store";
import type {
  ActionTypeCandidate,
  FDEOntologyEngineeringSession,
  FunctionCandidate,
  LinkTypeCandidate,
  ObjectTypeCandidate,
  PropertyCandidate,
  RoleCandidate,
} from "./types";
import { createUniversalOntologyEntry } from "../ontology-entry/universal-entry";

/**
 * Normalized layer (lowercased `kg_layer`) → candidate kind. The five SOURCE
 * layers map onto the four registerable ontology primitive kinds plus link:
 *   data → object · logic → function · action → action · governance → role ·
 *   edge → link.
 */
export const AXIS_TO_CANDIDATE_KIND = {
  data: "object",
  logic: "function",
  action: "action",
  governance: "role",
  edge: "link",
} as const;

export type SourceLayer = keyof typeof AXIS_TO_CANDIDATE_KIND;

export interface ParsedSourceCandidateArrays {
  readonly objectCandidates: ObjectTypeCandidate[];
  readonly functionCandidates: FunctionCandidate[];
  readonly actionCandidates: ActionTypeCandidate[];
  readonly roleCandidates: RoleCandidate[];
  readonly propertyCandidates: PropertyCandidate[];
  readonly linkCandidates: LinkTypeCandidate[];
  readonly skipped: {
    readonly edges: Array<{ readonly candidateId: string; readonly reason: string }>;
    readonly records: Array<{ readonly line: number; readonly reason: string }>;
  };
}

export interface IngestJsonlSourceInput {
  readonly sourceJsonlPath: string;
  readonly projectRoot: string;
  readonly rawUserRequest?: string;
}

export interface IngestJsonlSourceResult {
  readonly session: FDEOntologyEngineeringSession;
  readonly counts: {
    readonly objects: number;
    readonly functions: number;
    readonly actions: number;
    readonly roles: number;
    readonly properties: number;
    readonly links: number;
  };
  readonly skipped: ParsedSourceCandidateArrays["skipped"];
}

/**
 * Mirror of the module-private `slug()` in implicit-intent.ts (NOT exported
 * there). candidateId convention is `<type>:<slug>`; slug is lowercase, max 72,
 * alnum + Korean + `._:-`. Kept in sync with implicit-intent.ts.
 */
function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function slug(value: string): string {
  return (
    cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9가-힣._:-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "candidate"
  );
}

/** Drop empty/whitespace-only strings; preserve order. */
function nonEmpty(values: readonly (string | undefined | null)[]): string[] {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function normalizeLayer(value: unknown): SourceLayer | undefined {
  if (typeof value !== "string") return undefined;
  const lowered = value.trim().toLowerCase();
  return (lowered in AXIS_TO_CANDIDATE_KIND) ? (lowered as SourceLayer) : undefined;
}

/**
 * De-dup a candidate array by candidateId. LAST-WINS: a later SOURCE record with
 * the same candidateId overwrites an earlier one (a frozen NC1 SOURCE should not
 * collide, but if it does, the later line is the more recent authoring).
 */
function dedupByCandidateId<T extends { readonly candidateId: string }>(items: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) byId.set(item.candidateId, item);
  return Array.from(byId.values());
}

/**
 * PURE read+transform: parse a SOURCE jsonl file into the five candidate arrays.
 * Two passes — atoms first (so edges can resolve endpoint names), then edges.
 * Malformed lines and unresolvable/null-kind edges are skipped-and-reported, never
 * thrown.
 */
export function parseJsonlSourceToCandidateArrays(
  sourceJsonlPath: string,
): ParsedSourceCandidateArrays {
  const raw = fs.readFileSync(sourceJsonlPath, "utf8");
  const lines = raw.split("\n");

  const objectCandidates: ObjectTypeCandidate[] = [];
  const functionCandidates: FunctionCandidate[] = [];
  const actionCandidates: ActionTypeCandidate[] = [];
  const roleCandidates: RoleCandidate[] = [];
  const propertyCandidates: PropertyCandidate[] = [];
  const linkCandidates: LinkTypeCandidate[] = [];
  const skippedEdges: Array<{ candidateId: string; reason: string }> = [];
  const skippedRecords: Array<{ line: number; reason: string }> = [];

  // source candidate_id → human name (label_ko || candidate_id), used by edges.
  const sourceIdToName = new Map<string, string>();

  // Parse every non-empty line once (so PASS 1 / PASS 2 share the parse).
  const parsed: Array<{ line: number; layer: SourceLayer; record: Record<string, unknown> }> = [];
  for (let i = 0; i < lines.length; i++) {
    const text = (lines[i] ?? "").trim();
    if (text.length === 0) continue;
    let record: unknown;
    try {
      record = JSON.parse(text);
    } catch (error) {
      skippedRecords.push({ line: i + 1, reason: `malformed JSON: ${(error as Error).message}` });
      continue;
    }
    if (typeof record !== "object" || record === null || Array.isArray(record)) {
      skippedRecords.push({ line: i + 1, reason: "record is not a JSON object" });
      continue;
    }
    const rec = record as Record<string, unknown>;
    const layer = normalizeLayer(rec.kg_layer);
    if (layer === undefined) {
      skippedRecords.push({
        line: i + 1,
        reason: `unknown kg_layer: ${JSON.stringify(rec.kg_layer ?? null)}`,
      });
      continue;
    }
    parsed.push({ line: i + 1, layer, record: rec });
  }

  // ── PASS 1: atoms (data/logic/action/governance) ──────────────────────────
  for (const { layer, record } of parsed) {
    if (layer === "edge") continue;
    const candidateId = asString(record.candidate_id);
    const plainName = asString(record.label_ko) ?? candidateId ?? "(unnamed)";
    const description = asString(record.description_ko);
    const sourceBasisRefs = asStringArray(record.source_basis_refs);
    // evidenceRefs MUST be non-empty for object/action/function — fall back to candidate_id.
    const evidenceRefs = nonEmpty([...sourceBasisRefs, candidateId]);

    if (candidateId !== undefined) sourceIdToName.set(candidateId, plainName);

    switch (layer) {
      case "data":
        // DATA-axis split: atom_kind "property" → a Property (an ObjectType's
        // stored field); every other DATA atom (entity, …) → an ObjectType.
        if (asString(record.atom_kind) === "property") {
          propertyCandidates.push({
            candidateId: `property:${slug(plainName)}`,
            plainName,
            dataType: asString(record.value_type),
            whyItMayMatter: description,
            evidenceRefs,
          });
        } else {
          objectCandidates.push({
            candidateId: `object:${slug(plainName)}`,
            plainName,
            whyItMayMatter: description ?? asString(record.atom_kind) ?? "(from NC1 SOURCE)",
            evidenceRefs,
          });
        }
        break;
      case "logic":
        functionCandidates.push({
          candidateId: `function:${slug(plainName)}`,
          plainName,
          logicIntent: description ?? asString(record.logic_kind) ?? "(SOURCE)",
          deterministic: true,
          evidenceRefs,
        });
        break;
      case "action":
        actionCandidates.push({
          candidateId: `action:${slug(plainName)}`,
          plainName,
          operationalIntent: description ?? asString(record.action_kind) ?? "(SOURCE)",
          writebackRisk: "none",
          evidenceRefs,
        });
        break;
      case "governance": {
        const policy = record.governed_action_policy;
        roleCandidates.push({
          candidateId: `role:${slug(plainName)}`,
          plainName,
          principalKind: "agent",
          permissions:
            policy !== undefined && policy !== null ? [String(policy)] : undefined,
          whyItMayMatter: description ?? asString(record.role_kind),
          evidenceRefs,
        });
        break;
      }
    }
  }

  // ── PASS 2: edges ─────────────────────────────────────────────────────────
  for (const { record } of parsed) {
    const layer = normalizeLayer(record.kg_layer);
    if (layer !== "edge") continue;
    const candidateId = asString(record.candidate_id) ?? "(edge)";
    const edgeKind = asString(record.edge_kind);
    const srcId = asString(record.source_candidate_id);
    const dstId = asString(record.target_candidate_id);
    const srcName = srcId ? sourceIdToName.get(srcId) : undefined;
    const tgtName = dstId ? sourceIdToName.get(dstId) : undefined;

    if (edgeKind === undefined || srcName === undefined || tgtName === undefined) {
      const reasons: string[] = [];
      if (edgeKind === undefined) reasons.push("edge_kind is null/empty");
      if (srcName === undefined) reasons.push(`unresolved source_candidate_id=${srcId ?? "(none)"}`);
      if (tgtName === undefined) reasons.push(`unresolved target_candidate_id=${dstId ?? "(none)"}`);
      skippedEdges.push({ candidateId, reason: reasons.join("; ") });
      continue;
    }

    linkCandidates.push({
      candidateId: `link:${slug(`${edgeKind}-${srcId}-${dstId}`)}`,
      plainName: String(edgeKind),
      sourceObject: srcName,
      targetObject: tgtName,
      businessMeaning: String(edgeKind),
      evidenceRefs: nonEmpty([candidateId]),
    });
  }

  return {
    objectCandidates: dedupByCandidateId(objectCandidates),
    functionCandidates: dedupByCandidateId(functionCandidates),
    actionCandidates: dedupByCandidateId(actionCandidates),
    roleCandidates: dedupByCandidateId(roleCandidates),
    propertyCandidates: dedupByCandidateId(propertyCandidates),
    linkCandidates: dedupByCandidateId(linkCandidates),
    skipped: { edges: skippedEdges, records: skippedRecords },
  };
}

/**
 * Session-integrating wrapper: create (or read existing) the FDE session for
 * projectRoot, merge the parsed candidate arrays onto it, persist, and return the
 * session + counts + skipped report. No approval gate — ingest is pre-approval,
 * like a turn.
 */
export function ingestJsonlSourceToCandidates(
  input: IngestJsonlSourceInput,
): IngestJsonlSourceResult {
  const parsed = parseJsonlSourceToCandidateArrays(input.sourceJsonlPath);

  const existing = readCurrentFDEOntologyEngineeringSession(input.projectRoot);
  const base =
    existing ??
    createFDEOntologyEngineeringSessionFromEntry({
      entry: createUniversalOntologyEntry({
        rawUserRequest:
          input.rawUserRequest ?? `ingest frozen NC1 SOURCE jsonl: ${input.sourceJsonlPath}`,
        projectRoot: input.projectRoot,
      }),
    });

  // Merge (replace) the candidate arrays. Ingest is the SOURCE-of-record for the
  // candidate set; later-wins on candidateId is already applied in the parse.
  const session: FDEOntologyEngineeringSession = {
    ...base,
    objectCandidates: parsed.objectCandidates,
    functionCandidates: parsed.functionCandidates,
    actionCandidates: parsed.actionCandidates,
    roleCandidates: parsed.roleCandidates,
    propertyCandidates: parsed.propertyCandidates,
    linkCandidates: parsed.linkCandidates,
    updatedAt: new Date().toISOString(),
  };

  writeFDEOntologyEngineeringSessionSnapshot(session);

  return {
    session,
    counts: {
      objects: parsed.objectCandidates.length,
      functions: parsed.functionCandidates.length,
      actions: parsed.actionCandidates.length,
      roles: parsed.roleCandidates.length,
      properties: parsed.propertyCandidates.length,
      links: parsed.linkCandidates.length,
    },
    skipped: parsed.skipped,
  };
}
