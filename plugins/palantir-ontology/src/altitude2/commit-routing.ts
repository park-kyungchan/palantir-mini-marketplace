// Commit routing (ledger row P440, A2-005, ADR-005, AGENT-CONTRACT.md
// section 3/4).
//
// "Altitude-2 itself can neither mint authority nor commit" — `routeCommit`
// is the ONE function in this package's Altitude-2 lane that touches
// mutation authority at all, and it does so exclusively through a
// `CommitGate` (`../governance`'s public barrel type) — by default the
// single frozen `PRODUCTION_COMMIT_GATE` that same barrel exports. This
// file never imports `../governance/commit-gate` or `../governance/security-
// oracle` (it uses the same public barrel every OTHER sanctioned governance
// consumer must use) and defines no minting or writer logic of its own — it
// builds a typed `MutationAuthorityRequest` from the session's own
// accumulated state (binding, proposal, dryRunFingerprint,
// submissionCriteriaResult, permissionDecisionRef) and hands it to the gate.
//
// P460 FIX 2: the five security-trust predicates (permission/fingerprint-
// freshness/scope/dry-run/prior-state) are no longer part of `RouteCommitDeps`
// at all — the gate's `resolveMutationAuthority` reads them from its own
// captured, fail-closed `GateSecurityOracle` instead. This file's own
// `deps` carries only `writeExecutor` plus the caller-identity/evidence
// fields `routeCommit` itself needs to build the envelope — never a
// security predicate a caller could forge permissive.
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+", item 4): this file NEVER imports
// `../governance/security-oracle` or `../governance/commit-gate`'s
// `createCommitGate` factory, and NEVER references an oracle by name — the
// module-global oracle mechanism v1/v2 built around is gone entirely (see
// `../governance/security-oracle.ts`'s module doc). `routeCommit` accepts
// an OPTIONAL `gate: CommitGate` parameter defaulting to
// `PRODUCTION_COMMIT_GATE` — every real caller gets the one frozen
// fail-closed production instance; only a test (which alone can import
// `createCommitGate`, banned for production `src/**` by `scripts/boundary-
// check.ts`'s `governance-commit-gate-factory-import` rule) can construct
// and pass a different one. This is the "one reviewable extension point"
// the ruling names: a later wave upgrades production behavior by changing
// `PRODUCTION_COMMIT_GATE`'s single construction line in
// `../governance/index.ts`, never by touching this file. `deps` also no
// longer carries `now` — the gate captures its own clock at construction
// (`CommitGateClock` in `../governance/commit-gate.ts`), so this file has no
// remaining use for a caller-supplied clock at all.

import {
  createMintLedger,
  PRODUCTION_COMMIT_GATE,
  type CommitGate,
  type ConsumerOntologyRef,
  type EnvelopeActor,
  type EnvelopeResult,
  type GateEffects,
  type MintLedger,
  type MutationAuthorityRequest,
} from "../governance";
import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import type { UserDecisionEvidence } from "../semantic-core/user-decision-evidence";
import { isStateWithinBindingScope } from "./binding-scope";
import { assertLegalTransition } from "./operation-state-machine";
import { type AggregateResult, denied, ok, type OperationSession } from "./types";

export { createMintLedger, type MintLedger };

const RC_BINDING_SCOPE_INSUFFICIENT: ReasonCode = "RC-BINDING-SCOPE-INSUFFICIENT";

const CITED_CODES: readonly ReasonCode[] = [RC_BINDING_SCOPE_INSUFFICIENT, RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("commit-routing.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

export interface RouteCommitDeps {
  /** The ONE protected writer the resolved gate is authorized to invoke once every check has passed — never the clock (the gate captures its own; see module doc above). */
  readonly writeExecutor: GateEffects["writeExecutor"];
  readonly userDecisionEvidence: UserDecisionEvidence;
  readonly issuingActor: EnvelopeActor;
  readonly issuingDecision: string;
  readonly ttlSeconds: number;
}

export interface CommitRouteOutcome {
  readonly session: OperationSession;
  readonly result: EnvelopeResult;
}

/**
 * The commit ROUTING function (mission bullet). Requires
 * `session.state === "GOVERNANCE_CHECK"` with a proposal/dryRunFingerprint/
 * submissionCriteriaResult/permissionDecisionRef already attached, and a
 * binding scope of exactly `"commit"` (the only scope whose ceiling reaches
 * `COMMIT`). Builds the `MutationAuthorityRequest` from the session's own
 * state plus `deps` (never from caller-suppliable `issuedAt`/`expiresAt`/
 * `nonce` — the single gate stamps those itself), mints the envelope via
 * `gate.issueMutationAuthority`, then immediately resolves it via
 * `gate.resolveMutationAuthority` — the SAME gate instance, delegated to in
 * one indivisible call. `gate` defaults to `PRODUCTION_COMMIT_GATE`
 * (`../governance`'s single frozen production instance); only a test
 * (never production code — see module doc above) constructs and passes a
 * different one. On success the session advances through
 * `MUTATION_AUTHORITY_ISSUED` to `COMMIT`; on any denial (schema, forged
 * nonce, tampered, replayed, expired, stale fingerprint, criteria,
 * permission, scope, dry-run mismatch, concurrency conflict) the gate's own
 * stable reason code is returned unchanged — this module invents none of
 * its own mutation-authority denial codes.
 */
export function routeCommit(
  session: OperationSession,
  ledger: MintLedger,
  deps: RouteCommitDeps,
  gate: CommitGate = PRODUCTION_COMMIT_GATE,
): AggregateResult<CommitRouteOutcome> {
  if (session.proposal === undefined || session.dryRunFingerprint === undefined || session.submissionCriteriaResult === undefined || session.permissionDecisionRef === undefined) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `routeCommit: session "${session.sessionId}" is missing proposal/dryRunFingerprint/submissionCriteriaResult/permissionDecisionRef`);
  }
  if (!isStateWithinBindingScope(session.binding.bindingScope, "COMMIT")) {
    return denied(
      RC_BINDING_SCOPE_INSUFFICIENT,
      `routeCommit: session "${session.sessionId}"'s binding scope "${session.binding.bindingScope}" does not authorize COMMIT`,
    );
  }
  const toIssued = assertLegalTransition(session.state, "MUTATION_AUTHORITY_ISSUED");
  if (!toIssued.ok) {
    return denied(toIssued.reasonCode, `session "${session.sessionId}": ${toIssued.detail}`);
  }

  // P460 v3: `routeCommit` never touches an oracle — `sicFingerprint`/
  // `dtcFingerprint`/`expectedPriorState` are no longer part of
  // `MutationAuthorityRequest` at all (see `../governance/types.ts`).
  // `gate.issueMutationAuthority` (called below) fills all three itself
  // from its own captured oracle at mint time.
  const consumerOntology: ConsumerOntologyRef = { id: session.binding.consumerOntologyId, version: session.binding.consumerOntologyVersion };

  const request: MutationAuthorityRequest = {
    schemaVersion: "1.0.0",
    userDecisionEvidence: deps.userDecisionEvidence,
    consumerOntology,
    targetIdentities: session.proposal.targetIdentities,
    allowedAction: session.proposal.allowedAction,
    writeScope: session.proposal.writeScope,
    permissionDecisionRef: session.permissionDecisionRef,
    submissionCriteriaResult: session.submissionCriteriaResult,
    issuingActor: deps.issuingActor,
    issuingDecision: deps.issuingDecision,
    dryRunFingerprint: session.dryRunFingerprint,
    ttlSeconds: deps.ttlSeconds,
  };

  const issued = gate.issueMutationAuthority(request, ledger);
  if (!issued.ok) {
    return denied(issued.reasonCode, issued.detail);
  }

  const issuedSession: OperationSession = { ...session, state: "MUTATION_AUTHORITY_ISSUED", envelopeNonce: issued.value.nonce };

  const resolved = gate.resolveMutationAuthority(issued.value, ledger, { writeExecutor: deps.writeExecutor });
  if (!resolved.ok) {
    return denied(resolved.reasonCode, resolved.detail);
  }

  const toCommit = assertLegalTransition(issuedSession.state, "COMMIT");
  if (!toCommit.ok) {
    return denied(toCommit.reasonCode, `session "${session.sessionId}": ${toCommit.detail}`);
  }

  const committedSession: OperationSession = { ...issuedSession, state: "COMMIT", commitResult: resolved.value };
  return ok({ session: committedSession, result: resolved.value });
}
