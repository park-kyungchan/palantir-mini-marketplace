// Shared test-only fixtures for the P520 SecondBrain governed-pipeline
// suites. Mirrors `tests/governance/gate-test-helpers.ts`'s
// `buildGate`/`allowAllEffects` pattern locally (one helper file per test
// directory is this codebase's established precedent — see also
// `tests/altitude2/session-test-helpers.ts`) rather than cross-importing
// across test directories.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCommitGate, type CommitGate, type CommitGateClock } from "../../src/governance/commit-gate";
import { createFileWriteExecutor } from "../../src/governance/default-write-executor";
import type { MutationAuthorityEnvelope } from "../../src/governance/types";
import { createTrustedOracleForTest, type GateSecurityOracle } from "../../src/governance/testing/trusted-oracle";
import type { SecondBrainPipelineDeps } from "../../src/memory/second-brain-pipeline";
import { fingerprintBody } from "../../src/semantic-core/fingerprint";
import type { CanonicalizableValue } from "../../src/semantic-core/canonical-json";

export const DRY_RUN_FINGERPRINT_SENTINEL = "d1bf202a3398c83aa6b85e2f387e102470176dd13cba3cec892a6951241ca2c";

/** Re-derives the SAME content-based dry-run fingerprint `second-brain-pipeline.ts` computes for `raw`, so a test's oracle can be built to match it for a commit-success case. */
export function computeDryRunFingerprintForRaw(raw: string): string {
  return fingerprintBody(JSON.parse(raw) as CanonicalizableValue);
}

const FIXED_NOW: CommitGateClock = { now: () => "2026-07-18T10:00:20Z" };

/**
 * Builds a self-contained, fully-permissive `CommitGate` via
 * `createCommitGate` — same pattern `tests/governance/gate-test-helpers.ts`
 * establishes. `actualDryRunFingerprint` is deliberately NOT fixed here
 * (unlike that file's fixture): a SecondBrain request's `dryRunFingerprint`
 * is content-derived (`fingerprintBody` over the parsed record), so a
 * caller wanting a commit-success case must override
 * `actualDryRunFingerprint` to return the SAME value the pipeline computed
 * — `expectMatchingDryRunOracle` below does this by re-deriving it from the
 * same raw content the pipeline validates.
 */
export function buildGate(overrides: Partial<GateSecurityOracle> = {}, clock: CommitGateClock = FIXED_NOW): CommitGate {
  return createCommitGate(
    createTrustedOracleForTest({
      resolvePermissionDecision: () => "allow",
      currentApprovedFingerprints: () => ({
        sicFingerprint: "0".repeat(64),
        dtcFingerprint: "0".repeat(64),
      }),
      isWithinDeclaredScope: () => true,
      actualDryRunFingerprint: () => DRY_RUN_FINGERPRINT_SENTINEL,
      actualPriorState: () => "concurrency-token:second-brain:rev-0",
      ...overrides,
    }),
    clock,
  );
}

export function baseDeps(overrides: Partial<SecondBrainPipelineDeps> = {}): SecondBrainPipelineDeps {
  const writes: unknown[] = [];
  return {
    userDecisionEvidence: {
      evidenceRef: "transcript:2026-07-18-p520-approval",
      verifiedAt: "2026-07-18T10:00:00Z",
      verifiedBy: { identity: "user:palantirkc" },
    },
    consumerOntology: { id: "consumer:example-project", version: "1.0.0" },
    permissionDecisionRef: "rbac:l2:allow:2026-07-18T10:00:00Z",
    issuingActor: { identity: "second-brain-fold:worker" },
    issuingDecision: "gate-decision:2026-07-18T10:00:00Z",
    ttlSeconds: 300,
    sessionId: "session-2026-07-18-p520",
    now: () => "2026-07-18T10:00:20Z",
    writeExecutor: (envelope: MutationAuthorityEnvelope) => {
      writes.push(envelope);
    },
    ...overrides,
  };
}

export function spyWriteExecutor(): { writeExecutor: (envelope: MutationAuthorityEnvelope) => void; calls: MutationAuthorityEnvelope[] } {
  const calls: MutationAuthorityEnvelope[] = [];
  return {
    calls,
    writeExecutor: (envelope: MutationAuthorityEnvelope) => {
      calls.push(envelope);
    },
  };
}

export function makeTempOutcomeDir(): string {
  return mkdtempSync(join(tmpdir(), "p520-second-brain-"));
}

export { createFileWriteExecutor };
