// Lineage append hook (ledger row P440, A2-009, execution-plan.md section
// 6.3's terminal `LINEAGE_APPENDED` step).
//
// A2-009 ("Everyday actions append durable decision/operation lineage with
// actor, target, route, evidence, and outcome sufficient for audit and
// replay"): `appendOperationLineage` builds exactly that typed
// `LineageEntry` (actor/target/route/evidence/outcome/recordedAt) from the
// session's own already-accumulated state and hands it to
// `deps.appendLineage`. That function is caller-injected and deliberately
// NOT a real store implementation here — durable lineage/event-log storage
// is Wave 5's charter (`src/lineage/`, ledger rows `P510`-`P550`,
// docs/architecture.md ADR-006: "Storage backend choice... is an
// implementation detail within a declared store's contract"; ADR-006 also
// requires an explicit, evidenced Wave-5 decision rather than a silently
// inherited stub). This module is the typed SEAM Altitude-2 calls after a
// successful commit, matching this task's exact mission bullet ("Lineage
// append hook after commit (LINEAGE_APPENDED)") — the same
// defer-real-storage-behind-an-injected-function pattern
// `src/governance/types.ts`'s `GateEffects.writeExecutor` already
// establishes for the commit gate's own writer.

import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import { assertLegalTransition } from "./operation-state-machine";
import { type AggregateResult, denied, ok, type BindingActor, type OperationSession } from "./types";

const CITED_CODES: readonly ReasonCode[] = [RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("lineage.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

export interface LineageEntry {
  readonly sessionId: string;
  readonly actor: BindingActor;
  readonly target: readonly string[];
  readonly route: string;
  readonly evidence: {
    readonly consumerOntologyId: string;
    readonly consumerOntologyVersion: string;
    readonly dryRunFingerprint: string;
    readonly envelopeNonce: string;
  };
  readonly outcome: {
    readonly outcome: string;
    readonly reasonCode: string;
  };
  readonly recordedAt: string;
}

export interface LineageDeps {
  readonly now: () => string;
  readonly appendLineage: (entry: LineageEntry) => void;
}

/**
 * Requires `session.state === "COMMIT"` with `commitResult`/
 * `envelopeNonce`/`proposal`/`dryRunFingerprint` all present (i.e. a
 * successfully routed commit) — this is strictly the post-commit hook,
 * never a substitute for per-step audit logging of denials (out of this
 * task's scope; a Wave-5-owned concern per the module doc above).
 */
export function appendOperationLineage(session: OperationSession, deps: LineageDeps): AggregateResult<OperationSession> {
  if (session.commitResult === undefined || session.envelopeNonce === undefined || session.proposal === undefined || session.dryRunFingerprint === undefined) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `appendOperationLineage: session "${session.sessionId}" has no successful commit to append lineage for`);
  }
  const check = assertLegalTransition(session.state, "LINEAGE_APPENDED");
  if (!check.ok) {
    return denied(check.reasonCode, `session "${session.sessionId}": ${check.detail}`);
  }

  const entry: LineageEntry = {
    sessionId: session.sessionId,
    actor: session.binding.byWhom,
    target: session.proposal.targetIdentities,
    route: "altitude2.operation",
    evidence: {
      consumerOntologyId: session.binding.consumerOntologyId,
      consumerOntologyVersion: session.binding.consumerOntologyVersion,
      dryRunFingerprint: session.dryRunFingerprint,
      envelopeNonce: session.envelopeNonce,
    },
    outcome: { outcome: session.commitResult.outcome, reasonCode: session.commitResult.reasonCode },
    recordedAt: deps.now(),
  };

  deps.appendLineage(entry);
  return ok({ ...session, state: "LINEAGE_APPENDED" });
}
