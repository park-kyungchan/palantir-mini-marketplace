// Shared test-only fixtures for the P430 commit-gate suites.
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+", item 3): there is no more module-global
// oracle to install into/reset. `buildGate` builds a fully-specified,
// allow-all-by-default `GateSecurityOracle` via `createTrustedOracleForTest`
// and hands it straight to `createCommitGate` (both governance/test-only —
// reachable here because `tests/**` is outside `scripts/boundary-check.ts`'s
// scanned `src/**` tree, the same precedent every other governance test
// file already relies on), returning a SELF-CONTAINED `CommitGate` instance.
// Each test builds its own gate(s); there is nothing to leak across cases
// and no `afterEach` reset is needed.
//
// `baseRequest()` does not include `sicFingerprint`/`dtcFingerprint`/
// `expectedPriorState` — `MutationAuthorityRequest` omits all three
// (governance fills them at mint time from the gate's captured oracle).
// `SIC_FINGERPRINT`/`DTC_FINGERPRINT` below remain this fixture module's
// fixed values for a gate's `currentApprovedFingerprints()` (and
// `"concurrency-token:widget:rev-3"` for `actualPriorState()`) — a case
// that wants mint-time and resolve-time to see DIFFERENT oracle answers
// (e.g. simulating a live-approved body changing between mint and resolve)
// builds TWO gates sharing the same ledger: one for the mint call, a second
// (with an overridden predicate) for the resolve call.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCommitGate, type CommitGate, type CommitGateClock } from "../../src/governance/commit-gate";
import { createFileWriteExecutor } from "../../src/governance/default-write-executor";
import type { MutationAuthorityEnvelope, MutationAuthorityRequest } from "../../src/governance/types";
import { createTrustedOracleForTest, type GateSecurityOracle } from "../../src/governance/testing/trusted-oracle";

export const SIC_FINGERPRINT = "53b9d0db6c3aef2f1e9dda2693214f73b042dfa88389cb62aff0fffb7c501b1".padEnd(64, "0").slice(0, 64);
export const DTC_FINGERPRINT = "61a896b5b7edb1df2c0cbbcb568112e6781d1481926776f6bc02c1bb60944c6".padEnd(64, "0").slice(0, 64);
export const DRY_RUN_FINGERPRINT = "d1bf202a3398c83aa6b85e2f387e102470176dd13cba3cec892a6951241ca2c".padEnd(64, "0").slice(0, 64);

const FIXED_NOW: CommitGateClock = { now: () => "2026-07-18T09:45:20Z" };

export function baseRequest(overrides: Partial<MutationAuthorityRequest> = {}): MutationAuthorityRequest {
  return {
    schemaVersion: "1.0.0",
    userDecisionEvidence: {
      evidenceRef: "transcript:2026-07-18-approval-turn-9",
      verifiedAt: "2026-07-18T09:45:00Z",
      verifiedBy: { identity: "user:palantirkc" },
    },
    consumerOntology: { id: "consumer:example-project", version: "2.1.0" },
    targetIdentities: ["ObjectType:Widget"],
    allowedAction: "create-object-type",
    writeScope: ["ontology/object-types/widget.objecttype.ts"],
    permissionDecisionRef: "rbac:l2:allow:2026-07-18T09:45:05Z",
    submissionCriteriaResult: { passed: true, evaluatedAt: "2026-07-18T09:45:10Z" },
    issuingActor: { identity: "successor:governance-gate" },
    issuingDecision: "gate-decision:2026-07-18T09:45:15Z",
    dryRunFingerprint: DRY_RUN_FINGERPRINT,
    ttlSeconds: 300,
    ...overrides,
  };
}

/** The `writeExecutor`-only deps a gate's `resolveMutationAuthority` needs per call; individual writes can be observed via `writes`. */
export function allowAllEffects(writes: string[] = []): { writeExecutor: (envelope: MutationAuthorityEnvelope) => void } {
  return {
    writeExecutor: (envelope: MutationAuthorityEnvelope) => {
      writes.push(envelope.nonce);
    },
  };
}

/**
 * Builds a self-contained `CommitGate` bound to a fully-permissive
 * `GateSecurityOracle` (every predicate matches the fixtures above) via
 * `createCommitGate`. Individual predicates can be overridden per test
 * (e.g. `buildGate({ resolvePermissionDecision: () => "deny" })` to isolate
 * a single denial), and the clock defaults to a fixed timestamp but can
 * also be overridden (e.g. to simulate resolution happening after
 * expiry). No install/reset — the gate this returns is isolated from every
 * other gate any other test builds.
 */
export function buildGate(overrides: Partial<GateSecurityOracle> = {}, clock: CommitGateClock = FIXED_NOW): CommitGate {
  return createCommitGate(
    createTrustedOracleForTest({
      resolvePermissionDecision: () => "allow",
      currentApprovedFingerprints: () => ({ sicFingerprint: SIC_FINGERPRINT, dtcFingerprint: DTC_FINGERPRINT }),
      isWithinDeclaredScope: () => true,
      actualDryRunFingerprint: () => DRY_RUN_FINGERPRINT,
      actualPriorState: () => "concurrency-token:widget:rev-3",
      ...overrides,
    }),
    clock,
  );
}

export function makeTempOutcomeDir(): string {
  return mkdtempSync(join(tmpdir(), "p430-governance-"));
}

export { createFileWriteExecutor, readFileSync };
