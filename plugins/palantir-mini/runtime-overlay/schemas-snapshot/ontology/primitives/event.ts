/**
 * @stable — Event primitive (prim-learn-27, v1.0.0)
 *
 * Alias-wrapper providing a typed graph-node identity for a single row in
 * `events.jsonl`. LineageRefs (lineage-refs.ts) is a sub-record INSIDE event
 * envelopes (not the event itself). This primitive adds the EventRid brand
 * and EventDeclaration node shape so the ImpactGraph can represent individual
 * events as first-class typed nodes linked to other nodes via PR 2.2 edges.
 *
 * The full envelope shape (with 5-dim fields: when, atopWhich, throughWhich,
 * byWhom, withWhat) lives in palantir-mini/lib/event-log/types.ts (runtime).
 * This primitive covers only the graph-node identity and optional lineageRefs
 * cross-reference — no runtime behavior.
 *
 * Decision: alias-wrapper (b1) per spec.md §4 row 7.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/lineage-refs.ts (lineageRefs field)
 *     -> ~/.claude/schemas/ontology/primitives/event.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (append-only event row identity — immutable once emitted)
 * @owner palantirkc-ontology
 * @purpose Event graph-node identity (Phase 2 ImpactGraph node-type; rule 10 substrate)
 */

import type { LineageRefs } from "./lineage-refs";

export type { LineageRefs } from "./lineage-refs";

export type EventRid = string & { readonly __brand: "EventRid" };
export const eventRid = (s: string): EventRid => s as EventRid;

export interface EventDeclaration {
  /** Unique identifier for this event row (corresponds to envelope `eventId` field). */
  readonly eventId: EventRid;
  /** Event type string (e.g. "edit_proposed", "validation_phase_completed"). */
  readonly type: string;
  /** ISO 8601 timestamp from the `when` 5-dim field. */
  readonly when: string;
  /**
   * Optional lineage cross-references from the envelope `lineageRefs` field.
   * Absent for lifecycle markers and advisory-only events (T1 nodes).
   */
  readonly lineageRefs?: LineageRefs;
}

export function isEventDeclaration(x: unknown): x is EventDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as EventDeclaration;
  return (
    typeof d.eventId === "string" &&
    d.eventId.length > 0 &&
    typeof d.type === "string" &&
    typeof d.when === "string"
  );
}
