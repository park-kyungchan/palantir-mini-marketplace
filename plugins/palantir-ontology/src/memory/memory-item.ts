// Typed memory items (ledger row P510, docs/architecture.md ADR-006,
// execution-plan.md section 1.5/6.2, contracts/memory-item.contract.json).
//
// Mission: "Implement explicit typed memory items in src/memory: the four
// memory forms (working, episodic, semantic, procedural), each a distinct
// type with its own authority and retention fields — no shared catch-all
// shape." This file is the ONLY place that enforcement lives — the JSON
// contract (`contracts/memory-item.contract.json`) stays a single envelope
// schema (the successor's minimal schema-validator subset has no
// `oneOf`/`if`-`then`, so it structurally cannot express "this field is
// required/forbidden depending on the value of another field") and was
// extended only ADDITIVELY (new optional properties on `authority` and
// `retention`) per this task's charter. The per-layer REQUIRED-vs-FORBIDDEN
// enforcement below is what makes the four forms actually distinct, not a
// shared catch-all shape wearing four labels.
//
// MEM-001 (working): `WorkingMemoryItem.authority.sessionScope` is required
// and NO other layer's authority field may appear — working memory "does
// not mint authority" (mission bullet), so it can never carry a
// `governingDecisionRef`. `retention.policy` is locked to `"ephemeral"` and
// `maxAgeSeconds` is a required explicit bound — "explicit bounded,
// current-session representation with defined authority and retention
// behavior."
//
// MEM-002 (episodic): `EpisodicMemoryItem.authority.eventRef` anchors the
// item to the event it is derived from; `retention.sequenceOrdinal` is a
// required replayable-ordering position (full deterministic replay is
// P540's charter — this is the typed seam P540 reads). `itemId` +
// `createdAt` + `byWhom` already carry identity/time/actor generically;
// `content.outcome` (required, `isWellFormedEpisodicContent`) supplies the
// remaining "outcome" MEM-002 names.
//
// MEM-003 (semantic): `SemanticMemoryItem.authority.governingDecisionRef` is
// required — "semantic promotion requires a governing decision" (mission
// bullet); this is the one field only the semantic layer may carry.
// `content.concept`/`relations` (required, `isWellFormedSemanticContent`) is
// a structured concept/relation shape, independent of raw transcript text
// or cache rows by construction (a bare string is never accepted).
//
// MEM-004 (procedural): `ProceduralMemoryItem.authority.playbookRef` is
// required — the governed playbook/procedure this item records.
// `content.procedureId`/`steps` (required, `isWellFormedProceduralContent`)
// is a distinct structural shape from `SemanticMemoryItem.content`
// (`procedureId`+`steps` vs. `concept`+`relations`) — independent of
// semantic facts and of runtime instructions by construction.
//
// MEM-005: the four forms are distinguished by TWO independent
// machine-readable signals, never filename or prose — (a) the contract's
// `layer` enum (`"working" | "episodic" | "semantic" | "procedural"`), and
// (b) this file's `is*MemoryItem` runtime type guards, which additionally
// enforce the layer-conditional authority/retention/content shape the JSON
// contract alone cannot. `classifyMemoryItem` is the one dispatch function
// that ties both signals together for a caller holding an `unknown` value.
//
// Provenance (ledger row P530, MEM-007, contracts/memory-item.contract.json's
// now-required `provenance` object): every form's `provenance` field is
// REQUIRED and non-optional in both this file's TypeScript shapes
// (`MemoryProvenance`, no `?`) and the JSON contract (`required` now
// includes `"provenance"`, and the nested object requires all six of
// `source`/`session`/`actor`/`transformation`/`governingContract`/
// `priorState`) — replacing P510's optional `sourceRef`/`lineageRefs`
// placeholder, which this file no longer references. Unlike
// authority/retention, provenance completeness is NOT layer-conditional —
// every layer requires the identical six fields — so, unlike those two,
// this requirement genuinely needed no `oneOf`/`if`-`then` to express at
// the schema level; `isWellFormedMemoryItemBase` below enforces the same
// six-field completeness at the TypeScript layer so a hand-built object
// smuggled through `unknown` cannot bypass it either. "A memory item
// without complete provenance cannot be persisted" (mission bullet): no
// `is*MemoryItem` guard — and therefore `classifyMemoryItem` — accepts a
// value whose `provenance` is absent or has ANY field missing/empty; see
// `tests/memory/memory-item.test.ts`'s fail-closed provenance tests.
//
// Mutation-authority note (required term `mutation-authority`): the
// `authority` object on a memory item is a DIFFERENT concept from
// `src/governance/types.ts`'s `MutationAuthorityEnvelope` — a memory item's
// `authority.writer`/`governingDecisionRef`/etc. names which code path or
// decision backs the item's CONTENT, it never mints or substitutes for a
// real mutation-authority envelope, and nothing in this file imports
// `src/governance/**` (grep-verified in the P510 report) — "no memory
// write path may reach the protected writer except via the P430 single
// commit gate" holds trivially at this wave because this file implements no
// write path at all, only typed records and structural guards.
//
// ControlPlaneNodeKind note (required term `ControlPlaneNodeKind`): a
// `MemoryItem` is a content/knowledge record, never a
// `src/control-plane/types.ts` `ControlPlaneNodeKind` entry (lifecycle-
// control metadata) — `MemoryLayer` and `ControlPlaneNodeKind` are disjoint
// enums with zero shared string values, mirroring the disjointness
// `src/altitude1/staged-construction.ts` already establishes between
// `PrimitiveKind` and `ControlPlaneNodeKind`.
//
// consumer-domain-ownership note (required term): memory items are
// successor-owned control/knowledge state (ADR-006's per-project
// `.palantir-mini/` storage authority), never the consumer domain Ontology
// itself — a `SemanticMemoryItem.content.concept` records the successor's
// OWN durable knowledge about its work, it is not a substitute for, or a
// write into, the consumer's Object Type/Property/Link data (ADR-001).

import { type AggregateResult } from "../altitude1/types";
import { type ArchiveProof, requireArchiveBeforeRemove } from "../lineage/retention";
import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED } from "../semantic-core/reason-codes";

/** The four canonical agentic memory layers (contract `layer` enum, execution-plan.md section 1.5/5.8). */
export const MEMORY_LAYERS = ["working", "episodic", "semantic", "procedural"] as const;

export type MemoryLayer = (typeof MEMORY_LAYERS)[number];

const MEMORY_LAYER_SET: ReadonlySet<string> = new Set(MEMORY_LAYERS);

/** Runtime guard: is `value` one of the 4 registered memory layers? */
export function isMemoryLayer(value: unknown): value is MemoryLayer {
  return typeof value === "string" && MEMORY_LAYER_SET.has(value);
}

/** Mirrors the contract's `byWhom` shape (`identity` required, `role` optional). */
export interface MemoryActor {
  readonly identity: string;
  readonly role?: string;
}

/**
 * MEM-007: item-level provenance, required and complete on every memory
 * item — no optional/partial form, and no field defaults to absent.
 * `source` (upstream origin), `session` (the session that produced this
 * item), `actor` (identity of the acting agent/user for THIS write — may
 * differ from `byWhom.identity` on a delegated-write path), `transformation`
 * (the named operation that derived this item), `governingContract` (the
 * decision/ADR/contract that authorized persisting it), `priorState` (this
 * item's own state immediately before this write, or
 * `MEMORY_PROVENANCE_GENESIS_PRIOR_STATE` for a first-ever write — the
 * field itself is still always present, never omitted).
 */
export interface MemoryProvenance {
  readonly source: string;
  readonly session: string;
  readonly actor: string;
  readonly transformation: string;
  readonly governingContract: string;
  readonly priorState: string;
}

/** Sentinel `provenance.priorState` value for a memory item's first-ever write, where no prior state of the item exists yet — `priorState` stays required and non-empty even here. */
export const MEMORY_PROVENANCE_GENESIS_PRIOR_STATE = "genesis";

// ---------------------------------------------------------------------------
// Per-layer authority shapes. Each interface declares its OWN required
// field and structurally omits every other layer's field — the TypeScript
// shape itself is already "no shared catch-all"; the runtime guards below
// additionally reject a value that smuggles a foreign field past the type
// system (e.g. a hand-built object cast through `unknown`).
// ---------------------------------------------------------------------------

export interface WorkingMemoryAuthority {
  readonly writer: string;
  readonly owner?: string;
  readonly sessionScope: string;
}

export interface EpisodicMemoryAuthority {
  readonly writer: string;
  readonly owner?: string;
  readonly eventRef: string;
}

export interface SemanticMemoryAuthority {
  readonly writer: string;
  readonly owner?: string;
  readonly governingDecisionRef: string;
}

export interface ProceduralMemoryAuthority {
  readonly writer: string;
  readonly owner?: string;
  readonly playbookRef: string;
}

// ---------------------------------------------------------------------------
// Per-layer retention shapes.
// ---------------------------------------------------------------------------

export interface WorkingMemoryRetention {
  readonly policy: "ephemeral";
  readonly maxAgeSeconds: number;
}

export interface EpisodicMemoryRetention {
  readonly policy: "retained" | "archived";
  readonly archiveRef?: string;
  readonly sequenceOrdinal: number;
}

export interface SemanticMemoryRetention {
  readonly policy: "retained" | "archived";
  readonly archiveRef?: string;
}

export interface ProceduralMemoryRetention {
  readonly policy: "retained" | "archived";
  readonly archiveRef?: string;
}

// ---------------------------------------------------------------------------
// Per-layer content shapes (MEM-003/MEM-004: structurally distinct from
// each other and from a raw transcript/cache row — a bare string is never
// accepted for semantic or procedural content).
// ---------------------------------------------------------------------------

export interface WorkingMemoryContent {
  readonly note?: string;
}

export interface EpisodicMemoryContent {
  readonly outcome: string;
  readonly summary?: string;
}

export interface SemanticRelation {
  readonly predicate: string;
  readonly target: string;
}

export interface SemanticMemoryContent {
  readonly concept: string;
  readonly relations?: readonly SemanticRelation[];
}

export interface ProceduralMemoryContent {
  readonly procedureId: string;
  readonly steps: readonly string[];
}

// ---------------------------------------------------------------------------
// The four full item shapes.
// ---------------------------------------------------------------------------

export interface WorkingMemoryItem {
  readonly schemaVersion: string;
  readonly itemId: string;
  readonly layer: "working";
  readonly authority: WorkingMemoryAuthority;
  readonly retention: WorkingMemoryRetention;
  readonly content?: WorkingMemoryContent;
  readonly createdAt: string;
  readonly byWhom: MemoryActor;
  readonly provenance: MemoryProvenance;
}

export interface EpisodicMemoryItem {
  readonly schemaVersion: string;
  readonly itemId: string;
  readonly layer: "episodic";
  readonly authority: EpisodicMemoryAuthority;
  readonly retention: EpisodicMemoryRetention;
  readonly content: EpisodicMemoryContent;
  readonly createdAt: string;
  readonly byWhom: MemoryActor;
  readonly provenance: MemoryProvenance;
}

export interface SemanticMemoryItem {
  readonly schemaVersion: string;
  readonly itemId: string;
  readonly layer: "semantic";
  readonly authority: SemanticMemoryAuthority;
  readonly retention: SemanticMemoryRetention;
  readonly content: SemanticMemoryContent;
  readonly createdAt: string;
  readonly byWhom: MemoryActor;
  readonly provenance: MemoryProvenance;
}

export interface ProceduralMemoryItem {
  readonly schemaVersion: string;
  readonly itemId: string;
  readonly layer: "procedural";
  readonly authority: ProceduralMemoryAuthority;
  readonly retention: ProceduralMemoryRetention;
  readonly content: ProceduralMemoryContent;
  readonly createdAt: string;
  readonly byWhom: MemoryActor;
  readonly provenance: MemoryProvenance;
}

/** Discriminated union — never a catch-all `MemoryItem` shape without a discriminant. */
export type MemoryItem = WorkingMemoryItem | EpisodicMemoryItem | SemanticMemoryItem | ProceduralMemoryItem;

// ---------------------------------------------------------------------------
// Structural guards. Hand-rolled field checks (the `isWellFormedControlPlaneNode`
// / `isWellFormedEvidenceItem` precedent) rather than a generic JSON-schema
// engine read from the contract at runtime — memory items, like
// `ControlPlaneNode` and `PrimitiveEvidenceItem`, are typed records with no
// state machine, so the lighter hand-rolled pattern applies, not the
// heavier `envelope-validate.ts` pattern P430 uses for the mutation-
// authority envelope.
// ---------------------------------------------------------------------------

function isWellFormedActor(value: unknown): value is MemoryActor {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.identity !== "string" || v.identity.length === 0) return false;
  if (v.role !== undefined && typeof v.role !== "string") return false;
  return true;
}

interface MemoryItemBaseShape {
  readonly schemaVersion: string;
  readonly itemId: string;
  readonly layer: string;
  readonly authority: Record<string, unknown>;
  readonly retention: Record<string, unknown>;
  readonly content: unknown;
  readonly createdAt: string;
  readonly byWhom: MemoryActor;
  readonly provenance: MemoryProvenance;
}

// MEM-007: the six provenance fields, identical across all four layers
// (unlike RESERVED_AUTHORITY_FIELDS/RESERVED_RETENTION_FIELDS below, which
// ARE layer-conditional) — a plain non-empty-string check on each, no
// per-layer branching needed.
const PROVENANCE_FIELDS = ["source", "session", "actor", "transformation", "governingContract", "priorState"] as const;

/** MEM-007: `value` must carry all six provenance fields, each a non-empty string — partial provenance is rejected the same as absent provenance. */
function isWellFormedProvenance(value: unknown): value is MemoryProvenance {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  for (const field of PROVENANCE_FIELDS) {
    if (typeof v[field] !== "string" || (v[field] as string).length === 0) return false;
  }
  return true;
}

/** Envelope-level shape check only — mirrors contract required fields, no layer-conditional logic. */
function isWellFormedMemoryItemBase(value: unknown): value is MemoryItemBaseShape {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.schemaVersion !== "string" || v.schemaVersion.length === 0) return false;
  if (typeof v.itemId !== "string" || v.itemId.length === 0) return false;
  if (typeof v.layer !== "string") return false;
  if (v.authority === null || typeof v.authority !== "object") return false;
  const authority = v.authority as Record<string, unknown>;
  if (typeof authority.writer !== "string" || authority.writer.length === 0) return false;
  if (v.retention === null || typeof v.retention !== "object") return false;
  const retention = v.retention as Record<string, unknown>;
  if (typeof retention.policy !== "string") return false;
  if (typeof v.createdAt !== "string" || v.createdAt.length === 0) return false;
  if (!isWellFormedActor(v.byWhom)) return false;
  if (!isWellFormedProvenance(v.provenance)) return false;
  return true;
}

// Every authority field a layer MAY reserve to itself. Any field in this
// list that appears on the "wrong" layer's item is a borrowed-authority
// violation (validation-contract item 2).
const RESERVED_AUTHORITY_FIELDS = ["governingDecisionRef", "eventRef", "sessionScope", "playbookRef"] as const;
type ReservedAuthorityField = (typeof RESERVED_AUTHORITY_FIELDS)[number];

const LAYER_OWN_AUTHORITY_FIELD: Record<MemoryLayer, ReservedAuthorityField> = {
  working: "sessionScope",
  episodic: "eventRef",
  semantic: "governingDecisionRef",
  procedural: "playbookRef",
};

/** True iff `authority` carries its OWN layer's required field and NONE of the other three layers' reserved fields. */
function hasCleanLayerAuthority(layer: MemoryLayer, authority: Record<string, unknown>): boolean {
  const ownField = LAYER_OWN_AUTHORITY_FIELD[layer];
  const ownValue = authority[ownField];
  if (typeof ownValue !== "string" || ownValue.length === 0) return false;
  for (const field of RESERVED_AUTHORITY_FIELDS) {
    if (field !== ownField && authority[field] !== undefined) return false;
  }
  return true;
}

const RESERVED_RETENTION_FIELDS = ["maxAgeSeconds", "sequenceOrdinal"] as const;
type ReservedRetentionField = (typeof RESERVED_RETENTION_FIELDS)[number];

const LAYER_OWN_RETENTION_FIELD: Partial<Record<MemoryLayer, ReservedRetentionField>> = {
  working: "maxAgeSeconds",
  episodic: "sequenceOrdinal",
};

const LAYER_ALLOWED_POLICIES: Record<MemoryLayer, readonly string[]> = {
  working: ["ephemeral"],
  episodic: ["retained", "archived"],
  semantic: ["retained", "archived"],
  procedural: ["retained", "archived"],
};

/** True iff `retention.policy` is legal for `layer` and the layer-reserved ordering/bound fields are neither missing (own) nor borrowed (foreign). */
function hasCleanLayerRetention(layer: MemoryLayer, retention: Record<string, unknown>): boolean {
  if (!LAYER_ALLOWED_POLICIES[layer].includes(retention.policy as string)) return false;
  const ownField = LAYER_OWN_RETENTION_FIELD[layer];
  for (const field of RESERVED_RETENTION_FIELDS) {
    if (field === ownField) continue;
    if (retention[field] !== undefined) return false;
  }
  if (ownField === "maxAgeSeconds") {
    const v = retention.maxAgeSeconds;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1) return false;
  }
  if (ownField === "sequenceOrdinal") {
    const v = retention.sequenceOrdinal;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return false;
  }
  return true;
}

function isWellFormedEpisodicContent(value: unknown): value is EpisodicMemoryContent {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.outcome !== "string" || v.outcome.length === 0) return false;
  if (v.summary !== undefined && typeof v.summary !== "string") return false;
  return true;
}

function isWellFormedSemanticContent(value: unknown): value is SemanticMemoryContent {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.concept !== "string" || v.concept.length === 0) return false;
  if (v.relations !== undefined) {
    if (!Array.isArray(v.relations)) return false;
    const relations: unknown[] = v.relations;
    for (const r of relations) {
      if (r === null || typeof r !== "object") return false;
      const rr = r as Record<string, unknown>;
      if (typeof rr.predicate !== "string" || rr.predicate.length === 0) return false;
      if (typeof rr.target !== "string" || rr.target.length === 0) return false;
    }
  }
  return true;
}

function isWellFormedProceduralContent(value: unknown): value is ProceduralMemoryContent {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.procedureId !== "string" || v.procedureId.length === 0) return false;
  if (!Array.isArray(v.steps)) return false;
  const steps: unknown[] = v.steps;
  if (steps.length === 0) return false;
  return steps.every((s) => typeof s === "string" && s.length > 0);
}

function isWellFormedWorkingContent(value: unknown): value is WorkingMemoryContent {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.note === undefined || typeof v.note === "string";
}

/** MEM-001: bounded, current-session working item — `authority.sessionScope` required, `retention` locked to `"ephemeral"` + `maxAgeSeconds`, no other layer's authority/retention field present. */
export function isWorkingMemoryItem(value: unknown): value is WorkingMemoryItem {
  if (!isWellFormedMemoryItemBase(value)) return false;
  if (value.layer !== "working") return false;
  if (!hasCleanLayerAuthority("working", value.authority)) return false;
  if (!hasCleanLayerRetention("working", value.retention)) return false;
  if (value.content !== undefined && !isWellFormedWorkingContent(value.content)) return false;
  return true;
}

/** MEM-002: event-anchored episode — `authority.eventRef` + `retention.sequenceOrdinal` required, `content.outcome` required (identity/time/actor already generic via itemId/createdAt/byWhom). */
export function isEpisodicMemoryItem(value: unknown): value is EpisodicMemoryItem {
  if (!isWellFormedMemoryItemBase(value)) return false;
  if (value.layer !== "episodic") return false;
  if (!hasCleanLayerAuthority("episodic", value.authority)) return false;
  if (!hasCleanLayerRetention("episodic", value.retention)) return false;
  if (!isWellFormedEpisodicContent(value.content)) return false;
  return true;
}

/** MEM-003: durable governed knowledge — `authority.governingDecisionRef` required (semantic promotion requires a governing decision), `content.concept` required and structurally distinct from raw transcript text. */
export function isSemanticMemoryItem(value: unknown): value is SemanticMemoryItem {
  if (!isWellFormedMemoryItemBase(value)) return false;
  if (value.layer !== "semantic") return false;
  if (!hasCleanLayerAuthority("semantic", value.authority)) return false;
  if (!hasCleanLayerRetention("semantic", value.retention)) return false;
  if (!isWellFormedSemanticContent(value.content)) return false;
  return true;
}

/** MEM-004: reusable governed procedure/playbook — `authority.playbookRef` required, `content.procedureId`/`steps` required and structurally distinct from `SemanticMemoryItem.content`. */
export function isProceduralMemoryItem(value: unknown): value is ProceduralMemoryItem {
  if (!isWellFormedMemoryItemBase(value)) return false;
  if (value.layer !== "procedural") return false;
  if (!hasCleanLayerAuthority("procedural", value.authority)) return false;
  if (!hasCleanLayerRetention("procedural", value.retention)) return false;
  if (!isWellFormedProceduralContent(value.content)) return false;
  return true;
}

export type MemoryItemClassification =
  | { readonly ok: true; readonly layer: MemoryLayer; readonly item: MemoryItem }
  | { readonly ok: false; readonly reasonCode: "RC-SCHEMA-VALIDATION-FAILED"; readonly detail: string };

/**
 * MEM-005: the single dispatch entry point tying the contract's `layer`
 * discriminator to this file's layer-conditional guards. `unknown` in,
 * either a narrowed `MemoryItem` tagged with its actual `layer`, or a
 * denial carrying the registered `RC-SCHEMA-VALIDATION-FAILED` reason code
 * (never a bare `false`/`unknown` result — `UNKNOWN-is-not-PASS`).
 */
export function classifyMemoryItem(value: unknown): MemoryItemClassification {
  if (value === null || typeof value !== "object") {
    return { ok: false, reasonCode: "RC-SCHEMA-VALIDATION-FAILED", detail: "memory item is not an object" };
  }
  const layer = (value as Record<string, unknown>).layer;
  if (!isMemoryLayer(layer)) {
    return { ok: false, reasonCode: "RC-SCHEMA-VALIDATION-FAILED", detail: `"${String(layer)}" is not one of the 4 registered memory layers` };
  }
  if (layer === "working") {
    return isWorkingMemoryItem(value)
      ? { ok: true, layer, item: value }
      : { ok: false, reasonCode: "RC-SCHEMA-VALIDATION-FAILED", detail: `layer "working" item failed its layer-specific authority/retention/content shape check` };
  }
  if (layer === "episodic") {
    return isEpisodicMemoryItem(value)
      ? { ok: true, layer, item: value }
      : { ok: false, reasonCode: "RC-SCHEMA-VALIDATION-FAILED", detail: `layer "episodic" item failed its layer-specific authority/retention/content shape check` };
  }
  if (layer === "semantic") {
    return isSemanticMemoryItem(value)
      ? { ok: true, layer, item: value }
      : { ok: false, reasonCode: "RC-SCHEMA-VALIDATION-FAILED", detail: `layer "semantic" item failed its layer-specific authority/retention/content shape check` };
  }
  return isProceduralMemoryItem(value)
    ? { ok: true, layer, item: value }
    : { ok: false, reasonCode: "RC-SCHEMA-VALIDATION-FAILED", detail: `layer "procedural" item failed its layer-specific authority/retention/content shape check` };
}

// Compile-time + runtime self-check that this module's bound reason code is
// actually registered in contracts/reason-code-registry.json (same
// belt-and-suspenders guard staged-construction.ts/construction-state-machine.ts use).
if (!isRegisteredReasonCode(RC_SCHEMA_VALIDATION_FAILED)) {
  throw new Error("memory-item.ts: RC-SCHEMA-VALIDATION-FAILED is not registered in contracts/reason-code-registry.json");
}

/**
 * MEM-008: MemoryItem-specific wrapper around
 * `src/lineage/retention.ts#requireArchiveBeforeRemove`. Denies removing
 * ANY memory item — of any of the 4 layers — from the authoritative store
 * unless its own `retention` already proves a prior archive
 * (`policy === "archived"` with a recorded `archiveRef`). This file holds
 * the MemoryItem-specific knowledge (which field is `retention`); the
 * generic archive-before-remove ORDERING rule itself lives in
 * `src/lineage/retention.ts`, which this function is the sole
 * `MemoryItem`-typed caller of in this module.
 */
export function assertMemoryItemArchivedBeforeRemove(item: MemoryItem): AggregateResult<ArchiveProof> {
  return requireArchiveBeforeRemove(item.itemId, item.retention);
}
