// The ONE commit gate (ledger row P430, ADR-005, execution-plan.md section
// 6.4/9 row P430, AGENT-CONTRACT.md section 3).
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+", items 1-3): this file used to export
// `issueMutationAuthority`/`resolveMutationAuthority` as bare top-level
// functions reading a mutable module-global oracle
// (`./security-oracle.ts#resolveActiveOracle`). v3 replaces that with a
// FACTORY, `createCommitGate(oracle, effects)`: it captures a (frozen)
// `GateSecurityOracle` and a clock in closure and returns
// `Object.freeze({ issueMutationAuthority, resolveMutationAuthority })`
// bound to that captured oracle/clock. There is no module-global left to
// install into, mutate, or reset — each gate instance is self-contained.
//
// `createCommitGate` itself is governance/test-only: `scripts/boundary-
// check.ts`'s `governance-commit-gate-factory-import` rule forbids any
// non-governance, non-test `src/**` file from importing it (mirroring the
// existing `governance-security-oracle-import` rule's pattern one file
// over). The ONE production instance is `PRODUCTION_COMMIT_GATE`, built
// once in `./index.ts` from `FAIL_CLOSED_ORACLE` and a real ISO clock, and
// re-exported from the public barrel — `src/altitude2/commit-routing.ts`
// (and any future consumer) uses that single frozen instance by default.
// Tests construct their OWN gate via `createCommitGate(createTrustedOracleForTest(...),
// ...)` (`src/governance/testing/trusted-oracle.ts`) — no global to install
// or reset, and each test's gate is isolated from every other test's.
//
// Exactly one exported factory mints or resolves mutation authority through
// its returned gate object:
//   - `issueMutationAuthority` — the SINGLE minting location (ADR-005's
//     "adjudicated single minting location" evidence, generalized as a
//     forward requirement). Stamps `issuedAt`/`expiresAt`/`nonce` itself;
//     none of the three is ever caller-supplied.
//   - `resolveMutationAuthority` — the single commit gate. Accepts either a
//     full envelope OR a bare nonce (opaque handle) and revalidates it
//     against this gate's own mint ledger before doing anything else
//     ("any handle is resolved AND revalidated inside the gate — approval
//     routing from P410/P420 never substitutes for authority").
//
// No other function in this package may call `atomic-write.ts` or mutate a
// `MintLedger` — `scripts/boundary-check.ts` enforces this structurally by
// scanning every non-governance file's imports.
//
// Check order below is deliberate and each step returns a distinct,
// registered `contracts/reason-code-registry.json` code (never a free-text
// denial):
//   1. schema shape (full-envelope calls only)                -> RC-SCHEMA-VALIDATION-FAILED
//   2. nonce never issued by this gate ("forged")              -> RC-SCHEMA-VALIDATION-FAILED
//   3. presented envelope != minted record ("tampered")        -> RC-AUTH-FINGERPRINT-MISMATCH
//   4. nonce already consumed ("replayed")                     -> RC-AUTH-NONCE-REUSED
//   5. expiresAt has passed                                    -> RC-AUTH-EXPIRED
//   6. sicFingerprint/dtcFingerprint stale vs. LIVE approved    -> RC-AUTH-FINGERPRINT-MISMATCH
//   7. submissionCriteriaResult.passed !== true                -> RC-AUTH-SUBMISSION-CRITERIA-FAILED
//   8. permissionDecisionRef does not resolve to "allow"        -> RC-AUTH-PERMISSION-DENIED
//   9. targetIdentities outside writeScope ("scope escape")    -> RC-AUTH-SCOPE-VIOLATION
//  10. dry-run fingerprint mismatch                             -> RC-AUTH-DRY-RUN-MISMATCH
//  11. expectedPriorState mismatch ("prior-state mismatch")     -> RC-AUTH-CONCURRENCY-CONFLICT
//  12. all pass: consume nonce, invoke the ONE writer, succeed  -> RC-COMMIT-SUCCEEDED
//
// This order is what makes "criteria-without-permission" (criteria true,
// permission deny -> stopped at step 8, RC-AUTH-PERMISSION-DENIED) and
// "permission-without-criteria" (permission allow, criteria false -> stopped
// at step 7, RC-AUTH-SUBMISSION-CRITERIA-FAILED) resolve to DIFFERENT,
// individually stable codes — the concrete fix for P220 section 8.4's
// vacuous-when-omitted gap ("kept separate from permission").

import { randomUUID } from "node:crypto";
import { isRegisteredReasonCode, type ReasonCode } from "../semantic-core/reason-codes";
import { type AggregateResult, denied, ok } from "../altitude1/types";
import { validateEnvelopeShape } from "./envelope-validate";
import { createMintLedger, envelopeBodyFingerprint, lookupInLedger, markConsumedInLedger, mintIntoLedger, type MintLedger } from "./mint-ledger";
import type { GateSecurityOracle } from "./security-oracle";
import type { EnvelopeResult, GateEffects, MutationAuthorityEnvelope, MutationAuthorityRequest } from "./types";

export type { MintLedger } from "./mint-ledger";
export { createMintLedger } from "./mint-ledger";

const RC_AUTH_EXPIRED: ReasonCode = "RC-AUTH-EXPIRED";
const RC_AUTH_NONCE_REUSED: ReasonCode = "RC-AUTH-NONCE-REUSED";
const RC_AUTH_FINGERPRINT_MISMATCH: ReasonCode = "RC-AUTH-FINGERPRINT-MISMATCH";
const RC_AUTH_SUBMISSION_CRITERIA_FAILED: ReasonCode = "RC-AUTH-SUBMISSION-CRITERIA-FAILED";
const RC_AUTH_PERMISSION_DENIED: ReasonCode = "RC-AUTH-PERMISSION-DENIED";
const RC_AUTH_CONCURRENCY_CONFLICT: ReasonCode = "RC-AUTH-CONCURRENCY-CONFLICT";
const RC_AUTH_SCOPE_VIOLATION: ReasonCode = "RC-AUTH-SCOPE-VIOLATION";
const RC_AUTH_DRY_RUN_MISMATCH: ReasonCode = "RC-AUTH-DRY-RUN-MISMATCH";
const RC_COMMIT_SUCCEEDED: ReasonCode = "RC-COMMIT-SUCCEEDED";
const RC_SCHEMA_VALIDATION_FAILED: ReasonCode = "RC-SCHEMA-VALIDATION-FAILED";

// Belt-and-suspenders: every code this file cites must actually be
// registered in contracts/reason-code-registry.json (same discipline
// construction-state-machine.ts already applies to its own two codes).
const CITED_CODES: readonly ReasonCode[] = [
  RC_AUTH_EXPIRED,
  RC_AUTH_NONCE_REUSED,
  RC_AUTH_FINGERPRINT_MISMATCH,
  RC_AUTH_SUBMISSION_CRITERIA_FAILED,
  RC_AUTH_PERMISSION_DENIED,
  RC_AUTH_CONCURRENCY_CONFLICT,
  RC_AUTH_SCOPE_VIOLATION,
  RC_AUTH_DRY_RUN_MISMATCH,
  RC_COMMIT_SUCCEEDED,
  RC_SCHEMA_VALIDATION_FAILED,
];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("commit-gate.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

export type EnvelopeOrHandle = MutationAuthorityEnvelope | string;

/** The non-oracle capability `createCommitGate` captures: a clock, read once per mint/resolve call. */
export type CommitGateClock = Pick<GateEffects, "now">;

/**
 * Builds a self-contained commit gate bound to `oracle` (captured, defensively
 * re-frozen so no caller-held reference to `oracle` can corrupt what this
 * gate actually checks against) and `effects` (the clock `issueMutationAuthority`/
 * `resolveMutationAuthority` read `now()` from). Returns a frozen object
 * exposing exactly those two functions — no other capability, no way to
 * swap the captured oracle/clock after construction.
 *
 * `issueMutationAuthority(request, ledger)` — the single minting location.
 * `sicFingerprint`/`dtcFingerprint`/`expectedPriorState` are governance
 * truth, not caller-suppliable request fields (`MutationAuthorityRequest`
 * in `./types.ts` omits all three) — this function fills them itself, here,
 * from the SAME captured oracle `resolveMutationAuthority` independently
 * re-reads below at resolve time. Stamps `issuedAt`/`expiresAt`/`nonce`
 * itself; none of the three is ever caller-supplied. Fails closed
 * (`RC-SCHEMA-VALIDATION-FAILED`) if the composed envelope is somehow
 * malformed (e.g. an out-of-range `ttlSeconds`, or — under a fail-closed
 * oracle — the empty-string fingerprint sentinels failing the envelope
 * contract's `^[a-f0-9]{64}$` pattern) rather than minting a broken
 * envelope. Records the envelope in `ledger` before returning it.
 *
 * `resolveMutationAuthority(presented, ledger, deps)` — the single commit
 * gate. See the module doc above for the full, ordered check list. `deps`
 * carries only `writeExecutor` (the clock is the gate's own captured
 * `effects`, not a per-call argument) — the ONE protected writer this gate
 * is authorized to invoke once every check has passed. Returns `ok` with
 * the committed `EnvelopeResult` on success, or `ok:false`-shaped
 * `denied()` carrying a registered `reasonCode` on any failure — never a
 * bare boolean or a free-text-only denial.
 */
export function createCommitGate(oracle: GateSecurityOracle, effects: CommitGateClock) {
  // Defensive re-freeze: guarantees THIS gate's checks always run against an
  // immutable oracle even if a caller passed in an object it still holds a
  // mutable reference to elsewhere.
  const capturedOracle: GateSecurityOracle = Object.isFrozen(oracle) ? oracle : Object.freeze({ ...oracle });

  function issueMutationAuthority(request: MutationAuthorityRequest, ledger: MintLedger): AggregateResult<MutationAuthorityEnvelope> {
    const { ttlSeconds, ...rest } = request;
    const issuedAt = effects.now();
    const issuedAtMs = Date.parse(issuedAt);
    if (Number.isNaN(issuedAtMs) || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      return denied(RC_SCHEMA_VALIDATION_FAILED, "issueMutationAuthority: invalid issuedAt or non-positive ttlSeconds");
    }
    const expiresAt = new Date(issuedAtMs + ttlSeconds * 1000).toISOString();
    const nonce = randomUUID();

    const { sicFingerprint, dtcFingerprint } = capturedOracle.currentApprovedFingerprints();
    const expectedPriorState = capturedOracle.actualPriorState();

    const envelope: MutationAuthorityEnvelope = { ...rest, sicFingerprint, dtcFingerprint, expectedPriorState, issuedAt, expiresAt, nonce };
    const shape = validateEnvelopeShape(envelope);
    if (!shape.valid) {
      return denied(RC_SCHEMA_VALIDATION_FAILED, `issueMutationAuthority: composed envelope failed shape validation: ${shape.errors.join("; ")}`);
    }

    mintIntoLedger(ledger, envelope);
    return ok(envelope);
  }

  function resolveMutationAuthority(
    presented: EnvelopeOrHandle,
    ledger: MintLedger,
    deps: Pick<GateEffects, "writeExecutor">,
  ): AggregateResult<EnvelopeResult> {
    let nonce: string;

    if (typeof presented === "string") {
      nonce = presented; // opaque handle: the gate resolves the full envelope from its own ledger below.
    } else {
      const shape = validateEnvelopeShape(presented);
      if (!shape.valid) {
        return denied(RC_SCHEMA_VALIDATION_FAILED, `resolveMutationAuthority: envelope failed shape validation: ${shape.errors.join("; ")}`);
      }
      nonce = presented.nonce;
    }

    const record = lookupInLedger(ledger, nonce);
    if (record === undefined) {
      return denied(RC_SCHEMA_VALIDATION_FAILED, `resolveMutationAuthority: nonce "${nonce}" was never issued by this gate (forged or unrecognized authority)`);
    }

    if (typeof presented !== "string") {
      const presentedFingerprint = envelopeBodyFingerprint(presented);
      if (presentedFingerprint !== record.mintedFingerprint) {
        return denied(RC_AUTH_FINGERPRINT_MISMATCH, "resolveMutationAuthority: presented envelope does not match the gate's own minted record for this nonce (tampered/mismatched authority)");
      }
    }

    const envelope = record.envelope;

    if (record.consumed) {
      return denied(RC_AUTH_NONCE_REUSED, `resolveMutationAuthority: nonce "${nonce}" has already been consumed by a prior commit attempt (replayed authority)`);
    }

    const nowMs = Date.parse(effects.now());
    if (nowMs >= Date.parse(envelope.expiresAt)) {
      return denied(RC_AUTH_EXPIRED, `resolveMutationAuthority: envelope expired at ${envelope.expiresAt}`);
    }

    // Every remaining check below reads its trust predicate from this
    // gate's own captured, defensively-frozen oracle — never from a caller-
    // suppliable argument. `deps` (this function's third parameter) carries
    // only `writeExecutor`; a caller cannot inject an all-permissive
    // predicate here even in principle, because no parameter of this
    // function accepts one.
    const live = capturedOracle.currentApprovedFingerprints();
    if (live.sicFingerprint !== envelope.sicFingerprint || live.dtcFingerprint !== envelope.dtcFingerprint) {
      return denied(RC_AUTH_FINGERPRINT_MISMATCH, "resolveMutationAuthority: sicFingerprint/dtcFingerprint no longer matches the currently-approved body (stale authority)");
    }

    if (envelope.submissionCriteriaResult.passed !== true) {
      return denied(RC_AUTH_SUBMISSION_CRITERIA_FAILED, "resolveMutationAuthority: submissionCriteriaResult.passed is not true");
    }

    if (capturedOracle.resolvePermissionDecision(envelope.permissionDecisionRef) !== "allow") {
      return denied(RC_AUTH_PERMISSION_DENIED, `resolveMutationAuthority: permissionDecisionRef "${envelope.permissionDecisionRef}" did not resolve to allow`);
    }

    if (!capturedOracle.isWithinDeclaredScope(envelope.targetIdentities, envelope.writeScope, envelope.allowedAction)) {
      return denied(RC_AUTH_SCOPE_VIOLATION, "resolveMutationAuthority: targetIdentities fall outside the envelope's declared writeScope/allowedAction");
    }

    if (capturedOracle.actualDryRunFingerprint() !== envelope.dryRunFingerprint) {
      return denied(RC_AUTH_DRY_RUN_MISMATCH, "resolveMutationAuthority: actual write plan no longer matches the envelope's dryRunFingerprint");
    }

    if (capturedOracle.actualPriorState() !== envelope.expectedPriorState) {
      return denied(RC_AUTH_CONCURRENCY_CONFLICT, "resolveMutationAuthority: expectedPriorState no longer matches the target's actual prior state");
    }

    // Every check passed: consume the nonce BEFORE invoking the writer so a
    // throwing writer never leaves a re-usable nonce behind.
    markConsumedInLedger(ledger, nonce);
    deps.writeExecutor(envelope);

    return ok({ outcome: "committed", reasonCode: RC_COMMIT_SUCCEEDED, recordedAt: effects.now() });
  }

  return Object.freeze({ issueMutationAuthority, resolveMutationAuthority });
}

/** The type of a gate `createCommitGate` returns — the shape `PRODUCTION_COMMIT_GATE` and every test-constructed gate share. */
export type CommitGate = ReturnType<typeof createCommitGate>;
