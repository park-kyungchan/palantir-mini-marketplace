/**
 * @stable — EventEnvelope primitive (prim-data-NN, v1.70.0)
 *
 * The canonical 5-dim Decision Lineage envelope (rule 10) modeled AS a schema
 * primitive. Until now the 5-dim envelope shape (when / atopWhich / throughWhich
 * / byWhom / withWhat) lived ONLY in the runtime type
 * `palantir-mini/lib/event-log/types.ts` (interface EventEnvelopeBase) and was
 * explicitly NOT modeled by the alias-wrapper `event.ts` primitive (which covers
 * only the EventRid graph-node identity). This primitive promotes the highest-
 * leverage missing primitive — the append-only events.jsonl row envelope — to
 * schema-level authority.
 *
 * AUTHORITY: schemas-snapshot is the SSoT. This file declares the envelope shape
 * INDEPENDENTLY (mirroring EventEnvelopeBase) and does NOT import uphill from
 * `lib/event-log/` — the runtime type remains the runtime mirror of THIS
 * canonical declaration, not the reverse.
 *
 * Relationship to sibling primitives:
 *   - event.ts (prim-learn-27) — EventRid graph-node identity + EventDeclaration
 *     (a single row as an ImpactGraph node). Complementary: this file declares
 *     the FULL envelope; event.ts declares the node identity.
 *   - lineage-refs.ts — typed cross-reference sub-record (lineageRefs field).
 *   - value-grade.ts / agentic-memory-layer.ts / refinement-target.ts — the
 *     rule-26 valuable-data extensions referenced by optional envelope fields.
 *
 * OCP: new event variants extend `EventEnvelope` without modifying existing
 * variants. PECS: consumers use exhaustive visitors over the supertype. Only a
 * small REPRESENTATIVE subset of variant kinds is enumerated here for
 * illustration; the discriminant is the `type` string and the CANONICAL
 * discriminant vocabulary is the `EVENT_TYPE_NAMES` registry in the sibling
 * `ontology/lineage/event-types.ts` (re-exported below as
 * `EVENT_ENVELOPE_DISCRIMINANTS` / `EventEnvelopeDiscriminant`), NOT a count
 * pinned in prose. The runtime mirror (lib/event-log/types.ts) carries the
 * subset of those discriminants that have dedicated typed payload variants.
 *
 * COUNT RECONCILIATION (ENVELOPE-1): three numbers used to diverge — this
 * primitive's prose ("~40"), the runtime union (typed-payload variants), and
 * the self ObjectType seed. The single SOURCE OF TRUTH for the discriminant
 * count is `EVENT_TYPE_NAMES.length`; the self ObjectType's drift test asserts
 * its seed equals that array, and the runtime-parity test (below / sibling
 * test) asserts the runtime base mirrors this primitive's 5-dim shape.
 *
 * D/L/A domain: DATA (append-only event row — immutable once emitted).
 * @owner palantirkc-ontology
 * @purpose Canonical 5-dim Decision Lineage envelope (rule 10 substrate)
 */

// The canonical discriminant vocabulary lives in the sibling lineage registry
// (same schemas-snapshot authority layer). Reference it instead of pinning a
// representative count in prose.
import { EVENT_TYPE_NAMES, type EventTypeName } from "../lineage/event-types";

export const EVENT_ENVELOPE_SCHEMA_VERSION = "events-jsonl/event-envelope/v1";

/** Canonical discriminant vocabulary for events.jsonl rows (SSoT = EVENT_TYPE_NAMES). */
export const EVENT_ENVELOPE_DISCRIMINANTS: readonly EventTypeName[] = EVENT_TYPE_NAMES;
/** The `type` discriminant of any events.jsonl row (canonical vocabulary). */
export type EventEnvelopeDiscriminant = EventTypeName;

// ─── Branded value types (mirror lib/event-log/types.ts brand convention) ────

/** Unique identifier for a single events.jsonl row. */
export type EventId = string & { readonly __brand: "EventId" };
/** Session identifier (THROUGH_WHICH context). */
export type SessionId = string & { readonly __brand: "SessionId" };
/** Git HEAD SHA at time of emit (ATOP_WHICH dimension). */
export type CommitSha = string & { readonly __brand: "CommitSha" };

export const eventId = (s: string): EventId => s as EventId;
export const sessionId = (s: string): SessionId => s as SessionId;
export const commitSha = (s: string): CommitSha => s as CommitSha;

// ─── Decision Lineage 5 dimensions (rule 10 — the 5-dim envelope) ────────────

/**
 * THROUGH_WHICH — session / tool / cwd surface context.
 * Mirrors EventEnvelopeBase.throughWhich in the runtime type.
 */
export interface EventThroughWhich {
  readonly sessionId: SessionId;
  readonly toolName: string;
  readonly cwd: string;
  /** Optional UI/system surface tag (e.g. "workshop", "cli", "mcp"). */
  readonly surface?: string;
}

/** Identity tag for the emitting runtime/actor (BY_WHOM). */
export type EventByWhomIdentity =
  | "claude-code"
  | "codex"
  | "gemini"
  | "user"
  | "monitor"
  | "test-agent"
  | "unknown";

/**
 * BY_WHOM — identity of the emitter, with provider-neutral attribution fields
 * (rule 26 §Axis D1 / LLMI-02). Mirrors EventEnvelopeBase.byWhom.
 */
export interface EventByWhom {
  readonly identity: EventByWhomIdentity;
  readonly agentName?: string;
  readonly teamName?: string;
  /** Normalized model name (e.g. "claude-opus-4-8", "gpt-5.4"). */
  readonly model?: string;
  /** Provider tag (e.g. "anthropic", "openai", "xai", "google"). */
  readonly provider?: string;
  /** Interface family (e.g. "messages", "responses", "vertex"). */
  readonly interfaceFamily?: string;
  /** Runtime tag (e.g. "claude-code", "codex", "gemini"). */
  readonly runtime?: string;
}

/**
 * WITH_WHAT — optional reasoning / hypothesis. Mirrors the core (non-extension)
 * subset of EventEnvelopeBase.withWhat; rule-26 extension fields (memoryLayers /
 * refinementTarget) are intentionally left to the runtime mirror + their own
 * primitives to keep this primitive self-contained (no cross-axis imports).
 */
export interface EventWithWhat {
  readonly reasoning?: string;
  readonly hypothesis?: string;
}

/**
 * The 5-dim base envelope. Every events.jsonl row carries these dimensions.
 * Mirrors `EventEnvelopeBase` in palantir-mini/lib/event-log/types.ts — kept in
 * lockstep additively (runtime is the mirror, schema is the authority).
 */
export interface EventEnvelopeBase {
  readonly eventId: EventId;
  /** WHEN — ISO8601 timestamp. */
  readonly when: string;
  /** ATOP_WHICH — git HEAD SHA at time of emit. */
  readonly atopWhich: CommitSha;
  /** THROUGH_WHICH — session / tool / cwd surface context. */
  readonly throughWhich: EventThroughWhich;
  /** BY_WHOM — provider-neutral emitter identity. */
  readonly byWhom: EventByWhom;
  /** WITH_WHAT — optional reasoning / hypothesis. */
  readonly withWhat?: EventWithWhat;
  /** Monotonic counter — optimistic version for concurrent appends. */
  readonly sequence: number;
  /**
   * PROPAGATION_DEPTH — optional FwdProp/BwdProp chain depth (rule 10
   * §propagationDepth; canonical 0-4 layer scale — see propagation-audit.ts
   * `PropagationDepth`). Omitting the field is valid; present value must be in
   * [0, 4].
   */
  readonly propagationDepth?: number;
  /**
   * PROPAGATION_DEPTH_SOURCE — provenance of `propagationDepth` (rule 10 v2.2.0
   * §Auto-derivation). "auto" = heuristically derived by emit() from the
   * emitter context path; "explicit" = supplied by the caller (explicit wins).
   * Present only when `propagationDepth` is set.
   */
  readonly propagationDepthSource?: "auto" | "explicit";
}

// ─── Representative variant subset ───────────────────────────────────────────
// OCP: the full ~40-variant union lives in the runtime mirror
// (lib/event-log/types.ts). This primitive enumerates a REPRESENTATIVE subset by
// `type` discriminant — new variants extend `EventEnvelope` without modifying
// existing variants. Payloads are kept narrow here; the runtime mirror is the
// authority for exhaustive per-variant payload shapes.

export type EditProposedEnvelope = EventEnvelopeBase & {
  readonly type: "edit_proposed";
  readonly payload: {
    readonly functionName: string;
    readonly params: unknown;
  };
};

export type EditCommittedEnvelope = EventEnvelopeBase & {
  readonly type: "edit_committed";
  readonly payload: {
    readonly actionTypeRid: string;
    readonly submissionCriteriaPassed: readonly string[];
  };
};

export type ValidationPhaseCompletedEnvelope = EventEnvelopeBase & {
  readonly type: "validation_phase_completed";
  readonly payload: {
    readonly phase:
      | "design"
      | "compile"
      | "deploy"
      | "merge"
      | "runtime"
      | "post_write";
    readonly passed: boolean;
    readonly errorClass?: string;
  };
};

/**
 * The discriminated EventEnvelope union (representative subset).
 *
 * OCP note: this union is intentionally NOT exhaustive — the runtime mirror
 * carries the full variant set. Consumers needing every variant import from the
 * runtime type; consumers needing the canonical 5-dim shape + the discriminant
 * pattern import this primitive.
 */
export type EventEnvelope =
  | EditProposedEnvelope
  | EditCommittedEnvelope
  | ValidationPhaseCompletedEnvelope;

/** The set of `type` discriminants enumerated by this primitive's subset. */
export type EventType = EventEnvelope["type"];

// ─── Type guard ──────────────────────────────────────────────────────────────

/**
 * Structural guard for an EventEnvelope. Validates the 5 required dimensions
 * (when / atopWhich / throughWhich / byWhom + sequence) and a string `type`
 * discriminant. Payload shape is NOT validated here (per-variant concern).
 */
export function isEventEnvelope(value: unknown): value is EventEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.type !== "string") return false;
  if (typeof v.eventId !== "string" || v.eventId.length === 0) return false;
  if (typeof v.when !== "string") return false;
  if (typeof v.atopWhich !== "string") return false;
  if (typeof v.sequence !== "number") return false;
  const tw = v.throughWhich as Record<string, unknown> | null | undefined;
  if (typeof tw !== "object" || tw === null) return false;
  if (typeof tw.sessionId !== "string") return false;
  if (typeof tw.toolName !== "string") return false;
  if (typeof tw.cwd !== "string") return false;
  const bw = v.byWhom as Record<string, unknown> | null | undefined;
  if (typeof bw !== "object" || bw === null) return false;
  if (typeof bw.identity !== "string") return false;
  return true;
}

// ─── Foundry equivalence ─────────────────────────────────────────────────────

import type { FoundryEquivalence } from "./category-foundry-equivalent";

const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "EventEnvelope is the palantir-mini append-only Decision Lineage row (rule 10 " +
    "5-dim substrate); no direct Palantir Foundry counterpart. Promotes the canonical " +
    "envelope from the runtime type lib/event-log/types.ts to schema-level authority.",
};

export { categoryFoundryEquivalent as eventEnvelopeFoundryEquivalent };
