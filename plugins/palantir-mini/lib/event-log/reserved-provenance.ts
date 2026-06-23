// palantir-mini — Reserved commit-provenance type guard (shared)
// Domain: SECURITY (ActionType = sole write-back commit gate)
//
// Lifted VERBATIM from bridge/handlers/emit-event.ts (the F1 guard) so BOTH the
// MCP boundary (emit-event) AND the hook-side emit() choke (scripts/log.ts) can
// import the SAME reserved-type set + validator — one definition, two call sites.

import type { EventEnvelope } from "./types";

/**
 * F1 / ssot/palantir/ontology/approval-and-lineage.md (ActionType = SOLE write-back
 * commit gate) — commit-provenance event types that assert "the governed commit path
 * ran" (an ActionType committed edits, or a submission-criteria gate rejected them).
 * These are emitted EXCLUSIVELY by lib/actions/commit.ts (commitEdits) via
 * appendEventAtomic — NEVER through this MCP boundary. Accepting them here would let a
 * caller forge `edit_committed`/`submission_criteria_failed` with an arbitrary
 * actionTypeRid, bypassing the A2 ActionType gate and poisoning the fold's
 * registeredPrimitives + audit counts. Fail closed: reject direct emit of these types.
 */
export const RESERVED_PROVENANCE_TYPES: ReadonlySet<string> = new Set([
  "edit_committed",
  "submission_criteria_failed",
]);

/**
 * F1 — Returns an error message when the envelope's type is a reserved commit-provenance
 * type that must only originate from the governed commit path, or null when allowed.
 */
export function validateReservedProvenanceType(
  envelope: Omit<EventEnvelope, "sequence">,
): string | null {
  if (RESERVED_PROVENANCE_TYPES.has(envelope.type)) {
    return (
      `emit_event refuses reserved commit-provenance type "${envelope.type}": this type ` +
      "may only be emitted by the governed commit path (lib/actions/commit.ts via the " +
      "ActionType gate), not by a direct emit_event. Commit through commit_edits so the " +
      "ActionType write-back gate (ssot/palantir approval-and-lineage) applies."
    );
  }
  return null;
}
