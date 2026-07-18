// P440 S2: commit routing (A2-005, ADR-005) unit + integration tests.
//
// The "dry-run fingerprint feeds the envelope" integration test (validation
// contract item 5) runs the WHOLE chain — bind -> read -> propose -> dry-run
// -> governance-check -> routeCommit — through the REAL, unmodified
// src/governance single gate (imported only via ../../src/governance, the
// public barrel), proving `performDryRun`'s computed fingerprint is exactly
// what `resolveMutationAuthority` checks at commit time (gate check 10).
//
// P460 FIX 2: `RouteCommitDeps` no longer carries the five security-trust
// predicates — every test that reaches the governance gate passes a
// trusted test gate (`buildGate` in `session-test-helpers.ts`).
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+"): `routeCommit`'s `gate` parameter defaults to
// `PRODUCTION_COMMIT_GATE` (permanently fail-closed). Every test below that
// needs `routeCommit` to actually reach `RC-COMMIT-SUCCEEDED` or a specific
// oracle-predicate denial code passes its OWN gate (built via `buildGate`)
// as `routeCommit`'s fourth argument — no install/reset, no cross-test
// leakage. `deps` no longer carries `now` (the gate captures its own
// clock).

import { describe, expect, test } from "bun:test";
import { createMintLedger, routeCommit, type RouteCommitDeps } from "../../src/altitude2/commit-routing";
import { buildGate, sessionAtGovernanceCheck } from "./session-test-helpers";

function baseDeps(overrides: Partial<RouteCommitDeps> = {}): RouteCommitDeps {
  return {
    writeExecutor: () => {},
    userDecisionEvidence: { evidenceRef: "transcript:2026-07-18-turn-9", verifiedAt: "2026-07-18T09:00:45Z", verifiedBy: { identity: "user:palantirkc" } },
    issuingActor: { identity: "successor:altitude2-gate" },
    issuingDecision: "gate-decision:2026-07-18T09:01:00Z",
    ttlSeconds: 300,
    ...overrides,
  };
}

describe("routeCommit: dry-run fingerprint feeds the envelope (integration through the gate)", () => {
  test("commits when actualDryRunFingerprint matches performDryRun's computed fingerprint", () => {
    const session = sessionAtGovernanceCheck();
    const ledger = createMintLedger();
    const writes: string[] = [];
    const gate = buildGate({ actualDryRunFingerprint: () => session.dryRunFingerprint! });
    const deps = baseDeps({
      writeExecutor: (envelope) => {
        writes.push(envelope.nonce);
      },
    });

    const result = routeCommit(session, ledger, deps, gate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.result.outcome).toBe("committed");
    expect(result.value.result.reasonCode).toBe("RC-COMMIT-SUCCEEDED");
    expect(result.value.session.state).toBe("COMMIT");
    expect(writes).toEqual([result.value.session.envelopeNonce!]);
  });

  test("denies with RC-AUTH-DRY-RUN-MISMATCH when actualDryRunFingerprint diverges from the session's computed fingerprint", () => {
    const session = sessionAtGovernanceCheck();
    const ledger = createMintLedger();
    const gate = buildGate({ actualDryRunFingerprint: () => "c".repeat(64) }); // deliberately NOT session.dryRunFingerprint
    const deps = baseDeps();

    const result = routeCommit(session, ledger, deps, gate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-DRY-RUN-MISMATCH");
  });
});

describe("routeCommit: structured denials, no empty success", () => {
  function committableSession() {
    return sessionAtGovernanceCheck();
  }

  test("denies with RC-BINDING-SCOPE-INSUFFICIENT for a non-commit binding", () => {
    const base = committableSession();
    const session = { ...base, binding: { ...base.binding, bindingScope: "proposal" as const } };
    const gate = buildGate({ actualDryRunFingerprint: () => session.dryRunFingerprint! });
    const result = routeCommit(session, createMintLedger(), baseDeps(), gate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-BINDING-SCOPE-INSUFFICIENT");
  });

  test("denies with RC-AUTH-PERMISSION-DENIED when permission resolves to deny (separate from criteria)", () => {
    const session = committableSession();
    const gate = buildGate({ actualDryRunFingerprint: () => session.dryRunFingerprint!, resolvePermissionDecision: () => "deny" });
    const result = routeCommit(session, createMintLedger(), baseDeps(), gate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-PERMISSION-DENIED");
  });

  test("denies with RC-AUTH-SUBMISSION-CRITERIA-FAILED when criteria failed (separate from permission)", () => {
    const proposed = sessionAtGovernanceCheck();
    // Manually override the collected criteria result to simulate a failed criteria evaluation reaching GOVERNANCE_CHECK.
    const session = { ...proposed, submissionCriteriaResult: { passed: false, evaluatedAt: "2026-07-18T09:00:30Z" } };
    const gate = buildGate({ actualDryRunFingerprint: () => session.dryRunFingerprint! });
    const result = routeCommit(session, createMintLedger(), baseDeps(), gate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-SUBMISSION-CRITERIA-FAILED");
  });

  test("denies with RC-AUTH-CONCURRENCY-CONFLICT when the actual prior state moves on between issue and resolve", () => {
    const session = committableSession();
    // First call (at issue time, captured into expectedPriorState) returns
    // rev-3; the second call (resolveMutationAuthority's own live check)
    // returns rev-4 — simulating a concurrent write between mint and commit.
    const priorStates = ["concurrency-token:widget:rev-3", "concurrency-token:widget:rev-4"];
    const gate = buildGate({ actualDryRunFingerprint: () => session.dryRunFingerprint!, actualPriorState: () => priorStates.shift()! });
    const result = routeCommit(session, createMintLedger(), baseDeps(), gate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-CONCURRENCY-CONFLICT");
  });

  test("denies with RC-SCHEMA-VALIDATION-FAILED when the session has not completed governance-check", () => {
    const session = committableSession();
    const incomplete = { ...session, permissionDecisionRef: undefined };
    const gate = buildGate({ actualDryRunFingerprint: () => session.dryRunFingerprint! });
    const result = routeCommit(incomplete, createMintLedger(), baseDeps(), gate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("never invokes writeExecutor on any denial path (no empty success)", () => {
    const session = committableSession();
    const writes: string[] = [];
    const gate = buildGate({ actualDryRunFingerprint: () => "wrong-fingerprint".padEnd(64, "0") });
    const deps = baseDeps({
      writeExecutor: (envelope) => writes.push(envelope.nonce),
    });
    const result = routeCommit(session, createMintLedger(), deps, gate);
    expect(result.ok).toBe(false);
    expect(writes).toEqual([]);
  });

  test("never invokes writeExecutor when no gate is passed at all — the default PRODUCTION_COMMIT_GATE is permanently fail-closed (no empty success)", () => {
    const session = committableSession();
    const writes: string[] = [];
    const deps = baseDeps({
      writeExecutor: (envelope) => writes.push(envelope.nonce),
    });
    const result = routeCommit(session, createMintLedger(), deps); // gate omitted -> PRODUCTION_COMMIT_GATE
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).not.toBe("RC-COMMIT-SUCCEEDED");
    expect(writes).toEqual([]);
  });
});

describe("routeCommit: containment (mints no authority of its own)", () => {
  test("commit-routing.ts imports its gate only from the public governance barrel", async () => {
    const source = await Bun.file(new URL("../../src/altitude2/commit-routing.ts", import.meta.url)).text();
    expect(source).toMatch(/from\s+["']\.\.\/governance["']/);
    expect(source).not.toMatch(/from\s+["']\.\.\/governance\/commit-gate["']/);
    expect(source).not.toMatch(/from\s+["']\.\.\/governance\/atomic-write["']/);
    expect(source).not.toMatch(/from\s+["']\.\.\/governance\/mint-ledger["']/);
    expect(source).not.toMatch(/from\s+["']\.\.\/governance\/security-oracle["']/);
    expect(source).not.toMatch(/from\s+["']\.\.\/governance\/testing/);
  });

  // P460 v2/v3: the v1 correction's containment test above already asserted
  // no DIRECT `../governance/security-oracle` import — but v1 still
  // imported `resolveActiveOracle` from the BARREL and read the oracle
  // object itself here (exploit 2a). v2/v3 make this file never reference
  // the oracle AT ALL — asserted at the identifier level, not just the
  // import-specifier level. v3 additionally asserts this file never
  // imports/references `createCommitGate` — the gate FACTORY stays
  // governance/test-only; this file only ever sees `PRODUCTION_COMMIT_GATE`
  // (the single built instance) as its parameter default.
  test("commit-routing.ts never references resolveActiveOracle/installSecurityOracle/GateSecurityOracle/createCommitGate by name (v3: the oracle and the factory are fully governance-internal — routeCommit never touches either)", async () => {
    const source = await Bun.file(new URL("../../src/altitude2/commit-routing.ts", import.meta.url)).text();
    const codeOnly = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(codeOnly).not.toMatch(/resolveActiveOracle/);
    expect(codeOnly).not.toMatch(/installSecurityOracle/);
    expect(codeOnly).not.toMatch(/resetSecurityOracle/);
    expect(codeOnly).not.toMatch(/GateSecurityOracle/);
    expect(codeOnly).not.toMatch(/createCommitGate/);
  });

  // Fourth-bypass hunt: with sicFingerprint/dtcFingerprint/expectedPriorState
  // gone from MutationAuthorityRequest, confirm routeCommit's request
  // literal cannot smuggle a caller-chosen value back in under a different
  // name — the request literal's own key list is exactly the reduced set.
  test("the MutationAuthorityRequest literal routeCommit builds names none of sicFingerprint/dtcFingerprint/expectedPriorState (fourth-bypass hunt: no smuggled governance-truth field)", async () => {
    const source = await Bun.file(new URL("../../src/altitude2/commit-routing.ts", import.meta.url)).text();
    const literalMatch = source.match(/const request: MutationAuthorityRequest = \{([\s\S]*?)\};/);
    expect(literalMatch).not.toBeNull();
    const literal = literalMatch![1]!;
    expect(literal).not.toMatch(/\bsicFingerprint\s*:/);
    expect(literal).not.toMatch(/\bdtcFingerprint\s*:/);
    expect(literal).not.toMatch(/\bexpectedPriorState\s*:/);
  });

  test("routeCommit's gate parameter defaults to PRODUCTION_COMMIT_GATE (source containment: the one reviewable extension point)", async () => {
    const source = await Bun.file(new URL("../../src/altitude2/commit-routing.ts", import.meta.url)).text();
    expect(source).toMatch(/gate: CommitGate = PRODUCTION_COMMIT_GATE/);
  });
});
