/**
 * rebind-persisted-approval — re-bind a PERSISTED minted approved SIC + DTC to the
 * CURRENT prompt envelope (the legitimate RESUME primitive behind `drift_rebind`).
 * @owner palantirkc-plugin-prompt-front-door
 *
 * A drift RESUME is NOT a new approval. When a prior turn genuinely minted an
 * approved SemanticIntentContract and an approved DigitalTwinChangeContract (each
 * carrying an unforgeable minted `approvalRef`), and a LATER turn re-binds that SAME
 * approved pair to the current prompt envelope so an existing already-registered
 * grammar can be re-elevated at the current HEAD, the human approval already
 * happened. This module carries the persisted minted approvalRefs FORWARD verbatim
 * — it NEVER mints a new ref and NEVER relaxes any validity gate. It only:
 *   1. RE-KEYS the SIC body and DTC contract body into NEW front-door contract
 *      records under the CURRENT envelope's (promptId, promptHash), so the
 *      PreToolUse gate's `contractContinuityMatches` resolves for the current prompt.
 *   2. ADVANCES the current envelope along the LEGAL front-door FSM chain
 *      (captured -> semantic_intent_user_review -> semantic_intent_approved ->
 *       digital_twin_user_review -> digital_twin_approved), carrying the minted refs.
 *
 * FAIL-CLOSED — every precondition is verified before any write:
 *   - the current envelope must be present;
 *   - the DTC record must be `status: "approved"`;
 *   - the DTC body's `semanticIntentContractRef` must equal the approved SIC's
 *     `contractId` (the DTC must bind to THIS SIC — never a cross-scope pairing);
 *   - every minted approvalRef (SIC contract, DTC record, DTC contract) must pass
 *     `validateApprovalRefValue` (an empty/string-only/malformed ref is rejected).
 *
 * This module performs NO commit and NO rid resolution — the handler delegates the
 * single commit + the fail-closed PROOF1∩PROOF2 re-elevation to the unchanged
 * `rebind_registered` core. It only re-binds the approval to the current prompt.
 */

import type { ApprovedSemanticIntentContract } from "../semantic-intent/approved-contract";
import { approvalRefToString, validateApprovalRefValue } from "./approval-ref";
import type { PromptEnvelope } from "./envelope";
import { transitionPromptEnvelope } from "./state-machine";
import type {
  PromptContractRecord,
  PromptFrontDoorStore,
} from "./store";
import type { DigitalTwinChangeContract } from "../lead-intent/contracts";

export interface RebindPersistedApprovalInput {
  /**
   * The front-door store the new re-keyed records + advanced envelope are written
   * through. A real {@link PromptFrontDoorStore} (the handler + tests both pass one,
   * exercising real re-keying to disk).
   */
  readonly store: PromptFrontDoorStore;
  /** The CURRENT captured prompt envelope the persisted approval is re-bound to. */
  readonly currentEnvelope: PromptEnvelope | null | undefined;
  /** The PERSISTED minted approved SIC (unforgeable minted approvalRef) sourced from the store. */
  readonly approvedSic: ApprovedSemanticIntentContract;
  /** The PERSISTED minted approved DTC contract record (the prompt-front-door record). */
  readonly dtcRecord: PromptContractRecord<DigitalTwinChangeContract>;
}

export interface RebindPersistedApprovalResult {
  /** The current envelope advanced to `digital_twin_approved`, carrying the re-keyed refs. */
  readonly advancedEnvelope: PromptEnvelope;
  /** The NEW front-door SIC record ref under the current envelope's promptId. */
  readonly semanticIntentContractRef: string;
  /** The NEW front-door DTC record ref under the current envelope's promptId. */
  readonly digitalTwinChangeContractRef: string;
}

/**
 * Re-bind the persisted minted approved SIC + DTC to the CURRENT envelope and
 * advance it to `digital_twin_approved`. Pure orchestration over the store + the
 * legal FSM; mints nothing. Throws (fail-closed) on any unmet precondition BEFORE
 * any write happens.
 */
export async function rebindPersistedApprovalToCurrentEnvelope(
  input: RebindPersistedApprovalInput,
): Promise<RebindPersistedApprovalResult> {
  const { store, currentEnvelope, approvedSic, dtcRecord } = input;

  // ── Fail-closed preconditions (verified BEFORE any write) ───────────────────
  if (currentEnvelope === null || currentEnvelope === undefined) {
    throw new Error(
      "drift_rebind: no current captured prompt envelope to re-bind the persisted approval to.",
    );
  }
  if (dtcRecord.status !== "approved") {
    throw new Error(
      `drift_rebind: persisted DTC record is not approved (status=${dtcRecord.status}); cannot re-bind.`,
    );
  }
  const dtcContract = dtcRecord.contract;
  if (dtcContract.semanticIntentContractRef !== approvedSic.contractId) {
    throw new Error(
      "drift_rebind: persisted DTC does not bind to the approved SIC " +
        `(dtc.semanticIntentContractRef=${String(dtcContract.semanticIntentContractRef)} !== ` +
        `approvedSic.contractId=${approvedSic.contractId}); refusing cross-scope re-bind.`,
    );
  }

  // Every minted approvalRef must be a valid minted ref — copied forward verbatim,
  // never re-minted. An empty/string-only/malformed ref fails closed.
  const sicRefIssues = validateApprovalRefValue("approvedSic.approvalRef", approvedSic.approvalRef);
  if (sicRefIssues.length > 0) {
    throw new Error(
      `drift_rebind: approved SIC approvalRef is not minted: ${sicRefIssues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  const dtcRecordRefIssues = validateApprovalRefValue("dtcRecord.approvalRef", dtcRecord.approvalRef);
  if (dtcRecordRefIssues.length > 0) {
    throw new Error(
      `drift_rebind: DTC record approvalRef is not minted: ${dtcRecordRefIssues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  const dtcContractRefIssues = validateApprovalRefValue(
    "dtcRecord.contract.approvalRef",
    dtcContract.approvalRef,
  );
  if (dtcContractRefIssues.length > 0) {
    throw new Error(
      `drift_rebind: DTC contract approvalRef is not minted: ${dtcContractRefIssues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }

  // ── G-ENV-C idempotency short-circuit (BEFORE the FSM walk / any write) ─────
  // `digital_twin_approved` only transitions to `superseded` in the FSM — there is
  // no path back to `semantic_intent_user_review`, so a duplicate/retried
  // drift_rebind call against an envelope ALREADY at `digital_twin_approved` (e.g.
  // a retry, or the envelope was already advanced by a prior turn) would otherwise
  // throw on the FIRST transition below. Compare the ALREADY-PERSISTED
  // digitalTwinApprovalRef against the incoming (persisted, carried-forward) DTC's
  // approvalRef via `approvalRefToString` — identical → true no-op success (no
  // write, no FSM walk); different → fail closed with a DISTINCT error (never
  // silently rebind over a different existing approval).
  if (currentEnvelope.state === "digital_twin_approved") {
    const existingRef = approvalRefToString(currentEnvelope.contractRefs.digitalTwinApprovalRef);
    const incomingRef = approvalRefToString(dtcContract.approvalRef);
    if (existingRef !== undefined && incomingRef !== undefined && existingRef === incomingRef) {
      return {
        advancedEnvelope: currentEnvelope,
        semanticIntentContractRef: currentEnvelope.contractRefs.semanticIntentContractRef ?? "",
        digitalTwinChangeContractRef: currentEnvelope.contractRefs.digitalTwinChangeContractRef ?? "",
      };
    }
    throw new Error(
      "drift_rebind: current envelope already digital_twin_approved under a DIFFERENT " +
        "approvalRef; refusing silent overwrite.",
    );
  }

  // ── Re-key the SIC + DTC bodies into NEW records under the CURRENT envelope ──
  // `writeContractRecord` copies `contract.approvalRef` onto the record verbatim,
  // so the minted refs are carried forward byte-identical (never re-minted). The
  // record's (promptId, promptHash) become the current envelope's, so the gate's
  // `contractContinuityMatches` resolves for the current prompt.
  const semanticRecord = await store.writeContractRecord(
    currentEnvelope,
    "semantic-intent",
    approvedSic,
  );
  const digitalTwinRecord = await store.writeContractRecord(
    currentEnvelope,
    "digital-twin-change",
    dtcContract,
  );

  // ── Advance the current envelope along the LEGAL FSM chain, carrying refs ────
  // captured -> semantic_intent_user_review -> semantic_intent_approved
  //          -> digital_twin_user_review -> digital_twin_approved
  const sicUserReview = transitionPromptEnvelope(currentEnvelope, "semantic_intent_user_review", {
    semanticIntentContractRef: semanticRecord.ref,
    semanticIntentApprovalRef: approvedSic.approvalRef,
  });
  const sicApproved = transitionPromptEnvelope(sicUserReview, "semantic_intent_approved", {
    semanticIntentContractRef: semanticRecord.ref,
    semanticIntentApprovalRef: approvedSic.approvalRef,
    approvalRef: approvedSic.approvalRef,
  });
  const dtcUserReview = transitionPromptEnvelope(sicApproved, "digital_twin_user_review", {
    digitalTwinChangeContractRef: digitalTwinRecord.ref,
    digitalTwinApprovalRef: dtcContract.approvalRef,
  });
  const dtcApproved = transitionPromptEnvelope(dtcUserReview, "digital_twin_approved", {
    digitalTwinChangeContractRef: digitalTwinRecord.ref,
    digitalTwinApprovalRef: dtcContract.approvalRef,
    approvalRef: dtcContract.approvalRef,
  });

  await store.saveEnvelope(dtcApproved);

  return {
    advancedEnvelope: dtcApproved,
    semanticIntentContractRef: semanticRecord.ref,
    digitalTwinChangeContractRef: digitalTwinRecord.ref,
  };
}
