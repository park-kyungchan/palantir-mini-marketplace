// SecondBrain governed order-of-operations pipeline (ledger row P520,
// docs/architecture.md ADR-006, execution-plan.md section 9 row P520:
// "Bring SecondBrain interchange, validation, and governing graph schema
// under successor source authority... Enforce extract/quarantine ->
// validate -> governed emit -> authoritative persist").
//
// The mission's ordered pipeline, one function per step, composed by the
// single public orchestrator at the bottom of this file:
//
//   1. extract/quarantine  -> `extractToQuarantine`        (always succeeds)
//   2. validate             -> `validateQuarantineEntry`     (pure, MEM-006)
//   3. governed emit        -> `buildSecondBrainMutationRequest`
//                               + `gate.issueMutationAuthority`
//   4. authoritative persist -> `gate.resolveMutationAuthority`'s injected
//                                `writeExecutor`, invoked ONLY on success
//
// The hard ordering gate (mission: "persistence is unreachable unless
// validation passed and a governed emit... occurred first"):
// `buildSecondBrainMutationRequest` (step 3) returns `denied(...)` WITHOUT
// ever calling `gate.issueMutationAuthority` when `validation.valid` is
// false — invalid content never even reaches the point where a mutation-
// authority REQUEST exists, let alone a minted envelope. `runSecondBrain*
// GovernedEmit` (the orchestrator) then only calls
// `gate.resolveMutationAuthority` — the ONLY function in this whole
// package that may invoke `deps.writeExecutor` (mirroring
// `src/governance/commit-gate.ts`'s own "no other function... may call
// `atomic-write.ts`" discipline) — on a request that DID reach
// `issueMutationAuthority`. A record that fails validation therefore can
// structurally never reach the writer: there is no code path from
// "validation failed" to "writeExecutor invoked" anywhere in this file.
// `tests/memory/second-brain-pipeline.test.ts` proves this with a
// call-counting writer spy (0 calls on invalid input) and a forged-nonce
// "bypass attempt" that reuses the shared gate's own forged/unrecognized-
// nonce denial (`RC-SCHEMA-VALIDATION-FAILED`, "never issued by this
// gate") — a would-be bypass that skips this file's validation entirely
// and hands the gate a hand-crafted nonce is denied by the SAME
// `src/governance/commit-gate.ts` mechanism every other successor write
// path already relies on (mutation-authority note, required term).
//
// Governed emit routes through `../governance`'s public barrel ONLY — this
// file imports `PRODUCTION_COMMIT_GATE`/`CommitGate`/`MintLedger` etc. from
// `../governance` (never `../governance/commit-gate` or
// `../governance/security-oracle` directly), the SAME single frozen,
// fail-closed-by-default gate `src/altitude2/commit-routing.ts#routeCommit`
// uses (`scripts/boundary-check.ts`'s `governance-commit-gate-factory-
// import`/`governance-security-oracle-import` rules forbid any other
// import path from a non-governance, non-test file). "Through the P430
// single commit gate" (mission bullet) is therefore literal, not
// figurative: SecondBrain content is authorized by the exact same gate
// instance every other successor mutation is.
//
// consumer-domain-ownership note (required term): a SecondBrain fold
// record is successor-owned knowledge/lineage state (ADR-006's per-project
// storage authority), never the consumer domain Ontology itself — this
// mirrors `src/memory/memory-item.ts`'s identical note for typed memory
// items; a governed SecondBrain graph node records the successor's OWN
// durable knowledge about its work, never a write into a consumer's Object
// Type/Property/Link data.
//
// ControlPlaneNodeKind note (required term): a SecondBrain quarantine
// entry, validation result, or governing-graph node/edge is content/
// knowledge state, never a `src/control-plane/types.ts`
// `ControlPlaneNodeKind` lifecycle-control entry — this file never
// constructs, reads, or references the `ControlPlaneNodeKind` catalog.
//
// UNKNOWN-is-not-PASS note (required term): every denial path below
// returns `AggregateResult`'s `{ ok: false, reasonCode, detail }` shape
// carrying a `contracts/reason-code-registry.json`-registered code — never
// a bare `false`/`undefined`, and quarantined-but-unvalidated content is
// never treated as implicitly passed.
//
// math-KG-excluded note (required term): no math-KG path
// (`/home/palantirkc/projects/data/curriculum-kg/**` or any other) was
// read or referenced by this file.

import { type AggregateResult, denied, ok } from "../altitude1/types";
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
import { fingerprintBody, type Fingerprint } from "../semantic-core/fingerprint";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import type { UserDecisionEvidence } from "../semantic-core/user-decision-evidence";
import {
  formatSecondBrainValidationErrors,
  validateSecondBrainGraphDocument,
  validateSecondBrainInterchangeLine,
  type SecondBrainValidationResult,
} from "./second-brain-validate";

export { createMintLedger };
export type { MintLedger };

const CITED_CODES: readonly ReasonCode[] = [RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("second-brain-pipeline.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

const SECOND_BRAIN_SCHEMA_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Step 1: extract/quarantine. Always succeeds (never throws) — a raw line
// that is not valid JSON is captured IN the quarantine entry (parseOk:false),
// not discarded and not treated as an error the caller must catch. The
// entry stays quarantined (extracted but unvalidated) until step 2 runs.
// ---------------------------------------------------------------------------

export interface SecondBrainQuarantineEntry {
  readonly raw: string;
  readonly parsed: unknown;
  readonly parseOk: boolean;
  readonly quarantinedAt: string;
}

export function extractToQuarantine(raw: string, now: () => string): SecondBrainQuarantineEntry {
  try {
    return { raw, parsed: JSON.parse(raw), parseOk: true, quarantinedAt: now() };
  } catch {
    return { raw, parsed: undefined, parseOk: false, quarantinedAt: now() };
  }
}

// ---------------------------------------------------------------------------
// Step 2: validate. Delegates to the pure, synchronous, zero-I/O validators
// in ./second-brain-validate.ts (MEM-006: "avoids LLM work on the blocking
// hook path") — this function itself adds no I/O or async work either.
// ---------------------------------------------------------------------------

export function validateQuarantineEntry(
  entry: SecondBrainQuarantineEntry,
  kind: "interchange-line" | "graph-document",
): SecondBrainValidationResult {
  if (!entry.parseOk) {
    return { valid: false, errors: [`$: raw content is not valid JSON (stays quarantined, never persisted)`] };
  }
  return kind === "interchange-line"
    ? validateSecondBrainInterchangeLine(entry.parsed)
    : validateSecondBrainGraphDocument(entry.parsed);
}

// ---------------------------------------------------------------------------
// Step 3: governed emit. `buildSecondBrainMutationRequest` is the hard
// ordering gate itself: it returns `denied(...)` and touches neither the
// mint ledger nor the commit gate when `validation.valid` is false. Only a
// caller holding an `ok:true` `AggregateResult<MutationAuthorityRequest>`
// can proceed to `gate.issueMutationAuthority`.
// ---------------------------------------------------------------------------

export interface SecondBrainGovernedEmitDeps {
  readonly userDecisionEvidence: UserDecisionEvidence;
  readonly consumerOntology: ConsumerOntologyRef;
  readonly permissionDecisionRef: string;
  readonly issuingActor: EnvelopeActor;
  readonly issuingDecision: string;
  readonly ttlSeconds: number;
  readonly sessionId: string;
  readonly now: () => string;
}

function dryRunFingerprintFor(parsed: unknown): Fingerprint {
  return fingerprintBody(parsed as CanonicalizableValue);
}

export function buildSecondBrainMutationRequest(
  entry: SecondBrainQuarantineEntry,
  validation: SecondBrainValidationResult,
  targetIdentity: string,
  allowedAction: string,
  writeScope: string,
  deps: SecondBrainGovernedEmitDeps,
): AggregateResult<MutationAuthorityRequest> {
  if (!validation.valid) {
    return denied(
      RC_SCHEMA_VALIDATION_FAILED,
      `second-brain record failed validation and stays quarantined (never persisted): ${formatSecondBrainValidationErrors(validation.errors)}`,
    );
  }
  const request: MutationAuthorityRequest = {
    schemaVersion: SECOND_BRAIN_SCHEMA_VERSION,
    userDecisionEvidence: deps.userDecisionEvidence,
    consumerOntology: deps.consumerOntology,
    targetIdentities: [targetIdentity],
    allowedAction,
    writeScope: [writeScope],
    permissionDecisionRef: deps.permissionDecisionRef,
    submissionCriteriaResult: { passed: true, evaluatedAt: deps.now() },
    issuingActor: deps.issuingActor,
    issuingDecision: deps.issuingDecision,
    dryRunFingerprint: dryRunFingerprintFor(entry.parsed),
    ttlSeconds: deps.ttlSeconds,
  };
  return ok(request);
}

// ---------------------------------------------------------------------------
// Step 4 + orchestration: `deps.writeExecutor` (the authoritative-persist
// step) is passed straight through to `gate.resolveMutationAuthority`,
// which is the ONLY call in this file that may invoke it, and it only ever
// reaches that call after `buildSecondBrainMutationRequest` above already
// required a passing validation to construct the request at all.
// ---------------------------------------------------------------------------

export interface SecondBrainPipelineDeps extends SecondBrainGovernedEmitDeps {
  readonly writeExecutor: GateEffects["writeExecutor"];
}

/**
 * Runs the full ordered pipeline for one NDJSON interchange line (batch or
 * summary). `gate` defaults to `PRODUCTION_COMMIT_GATE` (`../governance`'s
 * single frozen, fail-closed-by-default production instance) — the SAME
 * gate every other successor write path uses; only a test constructs and
 * passes a different one (`src/governance/testing/trusted-oracle.ts`, off-
 * limits to production code).
 */
export function runSecondBrainInterchangeGovernedEmit(
  raw: string,
  ledger: MintLedger,
  deps: SecondBrainPipelineDeps,
  gate: CommitGate = PRODUCTION_COMMIT_GATE,
): AggregateResult<EnvelopeResult> {
  const entry = extractToQuarantine(raw, deps.now);
  const validation = validateQuarantineEntry(entry, "interchange-line");
  const requestResult = buildSecondBrainMutationRequest(
    entry,
    validation,
    `second-brain-fold:${deps.sessionId}`,
    "second-brain-fold-persist",
    "second-brain-interchange",
    deps,
  );
  if (!requestResult.ok) return requestResult;

  const issued = gate.issueMutationAuthority(requestResult.value, ledger);
  if (!issued.ok) return issued;

  return gate.resolveMutationAuthority(issued.value, ledger, { writeExecutor: deps.writeExecutor });
}

/**
 * Runs the full ordered pipeline for one governing graph document (the
 * `summary` line's `graphRef` target). Same structure and same hard
 * ordering gate as `runSecondBrainInterchangeGovernedEmit` above, applied to
 * `contracts/second-brain-graph.contract.json` instead of the interchange
 * envelope.
 */
export function runSecondBrainGraphGovernedEmit(
  raw: string,
  ledger: MintLedger,
  deps: SecondBrainPipelineDeps,
  gate: CommitGate = PRODUCTION_COMMIT_GATE,
): AggregateResult<EnvelopeResult> {
  const entry = extractToQuarantine(raw, deps.now);
  const validation = validateQuarantineEntry(entry, "graph-document");
  const requestResult = buildSecondBrainMutationRequest(
    entry,
    validation,
    `second-brain-graph:${deps.sessionId}`,
    "second-brain-graph-persist",
    "second-brain-graph",
    deps,
  );
  if (!requestResult.ok) return requestResult;

  const issued = gate.issueMutationAuthority(requestResult.value, ledger);
  if (!issued.ok) return issued;

  return gate.resolveMutationAuthority(issued.value, ledger, { writeExecutor: deps.writeExecutor });
}
