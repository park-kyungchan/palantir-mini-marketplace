// Shared test-only fixtures for the P440 altitude2 suites. Mirrors
// tests/governance/gate-test-helpers.ts's role for the P430 suites.
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+"): `routeCommit` (`../../src/altitude2/commit-
// routing.ts`) defaults its `gate` parameter to the single frozen
// `PRODUCTION_COMMIT_GATE` — which is permanently fail-closed. A test that
// wants `routeCommit` to actually reach `RC-COMMIT-SUCCEEDED` (or a
// specific oracle-predicate denial) builds its OWN gate via
// `createCommitGate` and passes it as `routeCommit`'s fourth argument. No
// install/reset — each gate is self-contained.

import { createCommitGate, type CommitGate, type CommitGateClock } from "../../src/governance/commit-gate";
import { createTrustedOracleForTest, type GateSecurityOracle } from "../../src/governance/testing/trusted-oracle";
import { bindConsumerOntology, openReadOrQuery, type BindConsumerOntologyRequest } from "../../src/altitude2/consumer-binding";
import { proposeOperation } from "../../src/altitude2/proposal";
import { performDryRun } from "../../src/altitude2/dry-run";
import { runGovernanceCheck } from "../../src/altitude2/governance-check";
import type { BindingScope, OperationSession, Proposal } from "../../src/altitude2/types";

export const ROUTE_SIC_FINGERPRINT = "a".repeat(64);
export const ROUTE_DTC_FINGERPRINT = "b".repeat(64);

const FIXED_NOW: CommitGateClock = { now: () => "2026-07-18T09:01:00Z" };

/**
 * Builds a self-contained `CommitGate` via `createCommitGate`, bound to a
 * fully-permissive `GateSecurityOracle` by default (every predicate
 * matches the fixtures below). `routeCommit` (and the `resolveMutationAuthority`
 * it delegates to) reads every security-trust predicate exclusively from
 * whichever gate is passed in — never from a `routeCommit` caller argument
 * otherwise. Individual predicates can be overridden per test.
 */
export function buildGate(overrides: Partial<GateSecurityOracle> = {}, clock: CommitGateClock = FIXED_NOW): CommitGate {
  return createCommitGate(
    createTrustedOracleForTest({
      resolvePermissionDecision: () => "allow",
      currentApprovedFingerprints: () => ({ sicFingerprint: ROUTE_SIC_FINGERPRINT, dtcFingerprint: ROUTE_DTC_FINGERPRINT }),
      isWithinDeclaredScope: (targetIdentities, writeScope) => targetIdentities.every((id: string) => writeScope.includes("ontology/object-types/widget.objecttype.ts") || id.length > 0),
      actualDryRunFingerprint: () => {
        throw new Error("test fixture: actualDryRunFingerprint must be overridden per-test to prove the fingerprint round-trip");
      },
      actualPriorState: () => "concurrency-token:widget:rev-3",
      ...overrides,
    }),
    clock,
  );
}

export function baseBindingRequest(overrides: Partial<BindConsumerOntologyRequest> = {}): BindConsumerOntologyRequest {
  return {
    sessionId: "session:p440-1",
    consumerProjectId: "projects/example-project",
    consumerOntologyId: "consumer:example-project",
    consumerOntologyVersion: "2.1.0",
    successorVersion: "0.1.0",
    bindingScope: "commit",
    byWhom: { identity: "agent:claude-sonnet-5", role: "worker" },
    ...overrides,
  };
}

export function baseProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    targetIdentities: ["ObjectType:Widget"],
    allowedAction: "create-object-type",
    writeScope: ["ontology/object-types/widget.objecttype.ts"],
    description: "Create the Widget object type.",
    ...overrides,
  };
}

/** Binds + opens READ_OR_QUERY for a session with the given bindingScope. */
export function boundSession(bindingScope: BindingScope = "commit"): OperationSession {
  const bound = bindConsumerOntology(baseBindingRequest({ bindingScope }), {
    now: () => "2026-07-18T09:00:00Z",
    resolveConsumerProject: () => true,
  });
  if (!bound.ok) throw new Error("fixture setup failed: bindConsumerOntology");
  const opened = openReadOrQuery(bound.value);
  if (!opened.ok) throw new Error("fixture setup failed: openReadOrQuery");
  return opened.value;
}

/** Walks a session through PROPOSAL -> DRY_RUN -> GOVERNANCE_CHECK (requires bindingScope: "commit"). */
export function sessionAtGovernanceCheck(overrides: { proposal?: Partial<Proposal> } = {}): OperationSession {
  const proposed = proposeOperation(boundSession("commit"), baseProposal(overrides.proposal));
  if (!proposed.ok) throw new Error("fixture setup failed: proposeOperation");
  const dryRun = performDryRun(proposed.value);
  if (!dryRun.ok) throw new Error("fixture setup failed: performDryRun");
  const governed = runGovernanceCheck(dryRun.value, {
    evaluateSubmissionCriteria: () => ({ passed: true, evaluatedAt: "2026-07-18T09:00:30Z" }),
    permissionDecisionRef: () => "rbac:l2:allow:2026-07-18T09:00:30Z",
  });
  if (!governed.ok) throw new Error("fixture setup failed: runGovernanceCheck");
  return governed.value;
}
