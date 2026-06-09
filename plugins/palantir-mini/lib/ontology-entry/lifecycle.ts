/**
 * UniversalOntologyEntry lifecycle — status transition workflow.
 *
 * Authority chain: schemas/ontology/primitives/universal-ontology-entry.ts
 *   → shared-core/universal-ontology-entry.ts
 *   → this file (plugin runtime lifecycle implementation)
 *   → callers (hooks + handlers)
 *
 * Rule cross-refs:
 *   rule 01 (ontology-first): meaning → ontology → contracts → runtime
 *   rule 10 (events.jsonl): every ontology-state edit emits an event BEFORE writing files
 *   rule 26 §Axis E: semantic (status-transition decisions) + procedural (transition workflow)
 *
 * @since palantir-mini plugin v5.x (foamy-giggling-kettle PR-3)
 */

import * as path from "node:path";
import { atomicWriteJsonSync } from "../fs-atomic";
import type { UniversalOntologyEntry } from "./universal-entry";

/** Derived from UniversalOntologyEntry["status"] to avoid exporting a separate union. */
type UniversalOntologyEntryStatus = UniversalOntologyEntry["status"];
import {
  universalOntologyEntryPath,
  universalOntologyEntryStoreDir,
} from "./entry-store";
import { emit } from "../../scripts/log";

// ─── Refs ─────────────────────────────────────────────────────────────────────

/**
 * Optional typed cross-references to companion artifacts created alongside
 * a status transition (e.g. the query that caused context-retrieved, the
 * contract that caused semantic-approved).
 */
export interface UniversalOntologyEntryTransitionRefs {
  readonly ontologyContextQueryRef?: string;
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly delegationRecipeRef?: string;
  /**
   * Sprint 97 W1 — optional list of DTC fill progress ref IDs accumulated
   * during a DTC fill session. Backward-compatible optional field; absent on
   * all non-DTC transitions. Used by `dtc_fill_turn_advanced` lineage chain
   * to correlate per-step events with the owning UniversalOntologyEntry.
   */
  readonly dtcFillProgressRefs?: readonly string[];
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface TransitionUniversalOntologyEntryInput {
  readonly entry: UniversalOntologyEntry;
  readonly nextStatus: UniversalOntologyEntryStatus;
  readonly refs?: UniversalOntologyEntryTransitionRefs;
  readonly projectRoot: string;
  /** Injected for testing; defaults to new Date() when absent. */
  readonly now?: Date;
}

// ─── Core transition ──────────────────────────────────────────────────────────

/**
 * Transitions a UniversalOntologyEntry to a new status.
 *
 * Steps:
 *   1. Build new entry (status = nextStatus; UniversalOntologyEntry has no updatedAt field)
 *   2. Persist atomic write to .palantir-mini/session/ontology-entry/<entryId>.json
 *   3. Update current.json pointer
 *   4. Emit `phase_completed` event tagged "universal-ontology-entry-transitioned" (rule 10 5-dim)
 *   5. Return new entry
 *
 * Idempotency: if entry.status === nextStatus, a no-op event is emitted
 * and the same entry is returned (status unchanged).
 */
export async function transitionUniversalOntologyEntry(
  input: TransitionUniversalOntologyEntryInput,
): Promise<UniversalOntologyEntry> {
  const { entry, nextStatus, refs, projectRoot } = input;
  const fromStatus = entry.status;
  const isNoOp = fromStatus === nextStatus;

  // 1. Build new entry (UniversalOntologyEntry has no updatedAt field; status is the only mutable field)
  const next: UniversalOntologyEntry = {
    ...entry,
    status: nextStatus,
  };

  // 2+3. Persist atomically (same pattern as writeUniversalOntologyEntry)
  if (!isNoOp) {
    const dir = universalOntologyEntryStoreDir(projectRoot);
    const entryPath = universalOntologyEntryPath(projectRoot, entry.entryId);
    const currentPath = path.join(dir, "current.json");
    atomicWriteJsonSync(entryPath, next);
    atomicWriteJsonSync(currentPath, next);
  }

  // 4. Emit event (best-effort; never blocks the return)
  // NOTE: event type "universal_ontology_entry_transitioned" is not yet in the event-types union.
  // Using "phase_completed" with phaseTag "universal-ontology-entry-transitioned" per the
  // same pattern used by agent-router-suggestion-emit (PR-2). Transition data embedded in
  // withWhat.reasoning; taskId set to entryId for replay correlation.
  try {
    const entryRef = `universal-ontology-entry://${entry.entryId.replace(/^universal-ontology-entry:/, "").replace(/[^a-z0-9._:-]/g, "-")}`;
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag: "universal-ontology-entry-transitioned",
        taskId: entry.entryId,
        validations: isNoOp ? ["no-op-transition"] : [`${fromStatus}-to-${nextStatus}`],
      },
      toolName: "transitionUniversalOntologyEntry",
      cwd: projectRoot,
      sessionId: entry.prompt.sessionId,
      reasoning:
        `UniversalOntologyEntry status transition: ${fromStatus} → ${nextStatus} ` +
        `for entryId=${entry.entryId.slice(0, 40)} entryRef=${entryRef}` +
        (refs ? ` with refs=${JSON.stringify(Object.keys(refs))}` : ""),
      memoryLayers: ["semantic", "procedural"],
    });
  } catch {
    // Best-effort — event failure never blocks the transition result.
  }

  return next;
}
