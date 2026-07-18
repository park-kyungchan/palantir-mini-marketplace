// Mutation-authority envelope types (ledger row P430, docs/architecture.md
// ADR-005, execution-plan.md section 6.4, AGENT-CONTRACT.md section 3).
//
// Mirrors `contracts/mutation-authority.contract.json` (P330) field-for-field
// — the JSON schema remains the single source of truth for the wire shape;
// this file is the compile-time type projection of it, consumed by
// `envelope-validate.ts` (runtime shape check) and `commit-gate.ts` (the one
// commit service). Every field name below matches a `required` entry in the
// contract exactly; see that file's per-field `description` for the
// execution-plan.md section 6.4 field number each one binds.

import type { ReasonCode } from "../semantic-core/reason-codes";
import type { UserDecisionEvidence } from "../semantic-core/user-decision-evidence";

export interface EnvelopeActor {
  readonly identity: string;
  readonly role?: string;
}

export interface ConsumerOntologyRef {
  readonly id: string;
  readonly version: string;
}

export interface SubmissionCriteriaResult {
  readonly passed: boolean;
  readonly evaluatedAt: string; // ISO-8601 date-time
  readonly detail?: string;
}

export interface EnvelopeResult {
  readonly outcome: "committed" | "denied" | "error";
  readonly reasonCode: ReasonCode;
  readonly recordedAt: string; // ISO-8601 date-time
  readonly detail?: string;
}

/**
 * The typed mutation-authority envelope (execution-plan.md section 6.4's 14
 * fields, `sicFingerprint`/`dtcFingerprint` plus `schemaVersion`, minted
 * exclusively by `commit-gate.ts`'s `issueMutationAuthority`). `result` is
 * absent while pending and present once the gate has resolved it — matching
 * `contracts/mutation-authority.contract.json`'s own optional/terminal
 * `result` field.
 */
export interface MutationAuthorityEnvelope {
  readonly schemaVersion: string;
  readonly sicFingerprint: string;
  readonly dtcFingerprint: string;
  readonly userDecisionEvidence: UserDecisionEvidence;
  readonly consumerOntology: ConsumerOntologyRef;
  readonly targetIdentities: readonly string[];
  readonly allowedAction: string;
  readonly writeScope: readonly string[];
  readonly permissionDecisionRef: string;
  readonly submissionCriteriaResult: SubmissionCriteriaResult;
  readonly issuingActor: EnvelopeActor;
  readonly issuingDecision: string;
  readonly issuedAt: string; // ISO-8601 date-time
  readonly expiresAt: string; // ISO-8601 date-time
  readonly nonce: string;
  readonly dryRunFingerprint: string;
  readonly expectedPriorState: string;
  readonly result?: EnvelopeResult;
}

/**
 * Everything a caller supplies to mint a fresh envelope. `issuedAt`,
 * `expiresAt`, and `nonce` are NEVER caller-supplied — the gate is the
 * single minting location (ADR-005) and stamps all three itself from
 * `GateEffects.now` and the request's `ttlSeconds`.
 *
 * P460 v2 (decisions/pm2-core-safety-correction.md "v2 Correction" item 4):
 * `sicFingerprint`, `dtcFingerprint`, and `expectedPriorState` are ALSO
 * never caller-supplied, for the same reason — they are governance truth,
 * not request data. The v1 correction moved the five SECURITY trust
 * PREDICATES off this type onto `GateSecurityOracle`
 * (`./security-oracle.ts`), but still let a caller embed a self-chosen
 * "approved" fingerprint/prior-state value directly into the pre-mint
 * request, which `src/altitude2/commit-routing.ts#routeCommit` then had to
 * source itself by reading the oracle (obtaining the oracle object at all,
 * even read-only, is what let a caller mutate it in place). v2 fills these
 * three fields INSIDE `issueMutationAuthority` (`./commit-gate.ts`) from
 * the oracle instead.
 *
 * P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
 * Lead Selection — Option 1+"): v2's module-global
 * `resolveActiveOracle()` singleton is gone. `issueMutationAuthority` (the
 * inner function `./commit-gate.ts`'s `createCommitGate(oracle, effects)`
 * factory returns) reads its OWN captured `oracle` instead — the SAME one
 * the returned `resolveMutationAuthority` independently re-reads at resolve
 * time, from the same gate instance's closure. The ENVELOPE
 * (`MutationAuthorityEnvelope` above) still carries all three post-mint;
 * only the pre-mint REQUEST omits them.
 */
export type MutationAuthorityRequest = Omit<
  MutationAuthorityEnvelope,
  "issuedAt" | "expiresAt" | "nonce" | "result" | "sicFingerprint" | "dtcFingerprint" | "expectedPriorState"
> & {
  readonly ttlSeconds: number;
};

/**
 * The non-security effects the gate needs to resolve an envelope:
 * wall-clock time and the one protected writer. Both remain
 * caller-injected and REQUIRED (no optional field, no implicit
 * pass-through default — P220 section 8.3/8.4's warn-only /
 * vacuous-when-omitted gaps stay closed).
 *
 * P460 FIX 2: the five SECURITY trust predicates that used to live on this
 * interface (`resolvePermissionDecision`, `currentApprovedFingerprints`,
 * `isWithinDeclaredScope`, `actualDryRunFingerprint`, `actualPriorState`)
 * are gone from here — the P460 adversarial verifier found that making
 * them REQUIRED CALLER-INJECTED fields meant any caller could supply
 * all-permissive implementations and a forged `OperationSession`/envelope
 * to reach `RC-COMMIT-SUCCEEDED` without any real governance decision.
 * Those five predicates now live on `GateSecurityOracle`
 * (`./security-oracle.ts`).
 *
 * P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
 * Lead Selection — Option 1+"): `./commit-gate.ts`'s `createCommitGate(oracle,
 * effects)` factory captures a `GateSecurityOracle` in closure per gate
 * instance — never from an argument this or any other public function
 * accepts, and never from a module-global. This interface itself is
 * unchanged, but the two functions built from it no longer take the whole
 * shape at once: the factory captures `Pick<GateEffects, "now">` at
 * construction (`CommitGateClock`), and the returned
 * `resolveMutationAuthority` takes only `Pick<GateEffects, "writeExecutor">`
 * per call. See `security-oracle.ts`'s module doc for the fail-closed
 * default and `commit-gate.ts`'s module doc for the factory.
 */
export interface GateEffects {
  /** Current wall-clock time as ISO-8601, injected for deterministic tests. */
  readonly now: () => string;
  /**
   * The ONE protected writer this gate is authorized to invoke once every
   * check has passed. This function itself is never exported from
   * `src/governance/index.ts` or importable by any other module — only a
   * concrete implementation may be injected here by whichever caller
   * ultimately owns the real write target (Wave 5, ADR-006). Throwing here
   * propagates out of `resolveMutationAuthority` uncaught — write-execution
   * failure is Wave-5-owned storage territory, not an authorization-gate
   * reason code.
   */
  readonly writeExecutor: (envelope: MutationAuthorityEnvelope) => void;
}
