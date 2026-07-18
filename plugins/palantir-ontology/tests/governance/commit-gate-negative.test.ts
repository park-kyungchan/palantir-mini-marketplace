// P430 S3: the negative suite (validation contract item 1 — every ADR-005/
// execution-plan.md section 6.4 binding gets a positive AND a negative
// test) plus the specific missing/stale/expired/forged/mismatched/replayed
// authority scenarios, criteria-vs-permission separation, scope escape, and
// prior-state mismatch execution-plan.md section 9 row P430 names.
//
// P460 FIX 2: checks 1-5 (schema/forged/tampered/replayed/expired) never
// touch the security oracle, so those cases below build a gate with
// `buildGate()`'s allow-all baseline and simply don't override anything
// beyond what the scenario needs. Checks 6-11 (fingerprint-freshness/
// criteria/permission/scope/dry-run/prior-state) read from the gate's own
// captured oracle, so each of those cases builds a SEPARATE gate (via
// `buildGate({ ... })`, overriding only the ONE predicate the case means to
// isolate) for the resolve call — sharing the SAME ledger the mint gate
// used, so the ledger record itself carries the baseline mint-time truth.
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+"): `mintOne()` builds a BASELINE gate
// (`buildGate()`) and calls `gate.issueMutationAuthority` on it — minting
// itself reads the gate's captured oracle now (sicFingerprint/dtcFingerprint/
// expectedPriorState are governance truth, filled at mint time), so an
// envelope cannot be minted at all through a gate built from an
// all-deny/fail-closed oracle. A case that wants a check-6/9/10/11
// divergence between mint time and resolve time builds a DIFFERENT gate
// (`buildGate({ ... })`) for the resolve call, sharing `mintOne()`'s ledger.
//
// | §6.4 binding                        | positive test (commit-gate.test.ts)                       | negative test (this file)                                   |
// |--------------------------------------|-------------------------------------------------------------|----------------------------------------------------------------|
// | permission decision reference        | "commits when every check passes..."                        | "criteria-without-permission: permission deny -> RC-AUTH-PERMISSION-DENIED" |
// | submission-criteria (sep. from perm) | "commits when every check passes..."                        | "permission-without-criteria: criteria failed -> RC-AUTH-SUBMISSION-CRITERIA-FAILED" |
// | consumer Ontology identity/version   | envelope-validate.test.ts positive fixtures                 | envelope-validate.test.ts missing-consumerOntology.json         |
// | target identities / write scope      | "commits when every check passes..."                        | "scope escape: target outside declared scope -> RC-AUTH-SCOPE-VIOLATION" |
// | allowed action                       | envelope-validate.test.ts positive fixtures                 | envelope-validate.test.ts missing-allowedAction.json             |
// | issuance and expiration              | "mints a schema-valid envelope..."                          | "expired authority -> RC-AUTH-EXPIRED"                          |
// | one-time/bounded nonce, replay       | "a bare nonce (opaque handle) resolves..."                  | "replayed authority: same nonce twice -> RC-AUTH-NONCE-REUSED"  |
// | dry-run fingerprint                  | "commits when every check passes..."                        | "dry-run fingerprint mismatch -> RC-AUTH-DRY-RUN-MISMATCH"      |
// | expected prior state / concurrency   | "commits when every check passes..."                        | "prior-state mismatch -> RC-AUTH-CONCURRENCY-CONFLICT"          |
// | SIC/DTC fingerprints (freshness)     | "commits when every check passes..."                        | "stale authority: live approved body changed -> RC-AUTH-FINGERPRINT-MISMATCH" |
// | envelope-or-opaque-handle revalidate | "a handle resolution still runs every downstream check..."  | "forged authority: never-minted nonce -> RC-SCHEMA-VALIDATION-FAILED"; "mismatched (tampered) authority -> RC-AUTH-FINGERPRINT-MISMATCH" |
// | stable denial/outcome reason codes   | every test below asserts a specific registered `reasonCode` | every test below asserts a specific registered `reasonCode`    |
// | governance-owned fail-closed oracle  | (new, P460)                                                  | "fail-closed default (no oracle installed): a legitimately-minted envelope is still DENIED, never RC-COMMIT-SUCCEEDED" |

import { describe, expect, test } from "bun:test";
import { createCommitGate, createMintLedger, type MintLedger } from "../../src/governance/commit-gate";
import { FAIL_CLOSED_ORACLE } from "../../src/governance/security-oracle";
import type { MutationAuthorityEnvelope } from "../../src/governance/types";
import { allowAllEffects, baseRequest, buildGate, DTC_FINGERPRINT } from "./gate-test-helpers";

function mintOne(overrides: Parameters<typeof baseRequest>[0] = {}): { ledger: MintLedger; envelope: MutationAuthorityEnvelope } {
  const ledger = createMintLedger();
  const gate = buildGate(); // P460 v3: baseline governance truth at mint time — see module doc above.
  const minted = gate.issueMutationAuthority(baseRequest(overrides), ledger);
  if (!minted.ok) throw new Error("fixture setup: issueMutationAuthority failed");
  return { ledger, envelope: minted.value };
}

describe("missing authority", () => {
  test("undefined presented as a full envelope -> RC-SCHEMA-VALIDATION-FAILED", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const result = gate.resolveMutationAuthority(undefined as unknown as MutationAuthorityEnvelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("an envelope missing a required field -> RC-SCHEMA-VALIDATION-FAILED", () => {
    const { envelope, ledger } = mintOne();
    const { permissionDecisionRef: _drop, ...malformed } = envelope;
    const gate = buildGate();
    const result = gate.resolveMutationAuthority(malformed as unknown as MutationAuthorityEnvelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });
});

describe("forged authority", () => {
  test("a schema-valid envelope whose nonce was never minted by this gate -> RC-SCHEMA-VALIDATION-FAILED", () => {
    const { envelope } = mintOne(); // minted into ITS OWN ledger, never registered in the fresh one below
    const freshLedger = createMintLedger();
    const forged: MutationAuthorityEnvelope = { ...envelope, nonce: "never-issued-nonce-000000" };
    const gate = buildGate();
    const result = gate.resolveMutationAuthority(forged, freshLedger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("a bare handle for a nonce that was never minted -> RC-SCHEMA-VALIDATION-FAILED", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const result = gate.resolveMutationAuthority("nonce-that-does-not-exist", ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });
});

describe("mismatched (tampered) authority", () => {
  test("a presented envelope that diverges from the gate's own minted record for the same nonce -> RC-AUTH-FINGERPRINT-MISMATCH", () => {
    const { envelope, ledger } = mintOne();
    const tampered: MutationAuthorityEnvelope = { ...envelope, targetIdentities: ["ObjectType:SomethingElseEntirely"] };
    const gate = buildGate();
    const result = gate.resolveMutationAuthority(tampered, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-FINGERPRINT-MISMATCH");
  });
});

describe("stale authority", () => {
  test("the live currently-approved SIC/DTC fingerprints no longer match the envelope's own -> RC-AUTH-FINGERPRINT-MISMATCH", () => {
    const { envelope, ledger } = mintOne();
    const gate = buildGate({ currentApprovedFingerprints: () => ({ sicFingerprint: "0".repeat(64), dtcFingerprint: DTC_FINGERPRINT }) });
    const result = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-FINGERPRINT-MISMATCH");
  });
});

describe("expired authority", () => {
  test("resolution time at or after expiresAt -> RC-AUTH-EXPIRED", () => {
    const { envelope, ledger } = mintOne();
    const gate = buildGate({}, { now: () => envelope.expiresAt });
    const result = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-EXPIRED");
  });
});

describe("replayed authority", () => {
  test("the same nonce presented twice: first commits, second is denied with a stable code", () => {
    const { envelope, ledger } = mintOne();
    const gate = buildGate();
    const first = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(first.ok).toBe(true);

    const second = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reasonCode).toBe("RC-AUTH-NONCE-REUSED");
  });

  test("replay via the opaque-handle path is caught identically", () => {
    const { envelope, ledger } = mintOne();
    const gate = buildGate();
    expect(gate.resolveMutationAuthority(envelope.nonce, ledger, allowAllEffects()).ok).toBe(true);
    const second = gate.resolveMutationAuthority(envelope.nonce, ledger, allowAllEffects());
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reasonCode).toBe("RC-AUTH-NONCE-REUSED");
  });
});

describe("criteria-without-permission", () => {
  test("submissionCriteriaResult.passed is true but permission resolves to deny -> RC-AUTH-PERMISSION-DENIED", () => {
    const { envelope, ledger } = mintOne({ submissionCriteriaResult: { passed: true, evaluatedAt: "2026-07-18T09:45:10Z" } });
    const gate = buildGate({ resolvePermissionDecision: () => "deny" });
    const result = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-PERMISSION-DENIED");
  });
});

describe("permission-without-criteria", () => {
  test("permission resolves to allow but submissionCriteriaResult.passed is false -> RC-AUTH-SUBMISSION-CRITERIA-FAILED", () => {
    const { envelope, ledger } = mintOne({ submissionCriteriaResult: { passed: false, evaluatedAt: "2026-07-18T09:45:10Z", detail: "LOGIC evidence incomplete" } });
    const gate = buildGate({ resolvePermissionDecision: () => "allow" });
    const result = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-SUBMISSION-CRITERIA-FAILED");
  });
});

describe("scope escape", () => {
  test("targetIdentities outside the envelope's declared writeScope -> RC-AUTH-SCOPE-VIOLATION", () => {
    const { envelope, ledger } = mintOne();
    const gate = buildGate({ isWithinDeclaredScope: () => false });
    const result = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-SCOPE-VIOLATION");
  });
});

describe("prior-state mismatch", () => {
  test("expectedPriorState no longer matches the target's actual prior state -> RC-AUTH-CONCURRENCY-CONFLICT", () => {
    const { envelope, ledger } = mintOne();
    const gate = buildGate({ actualPriorState: () => "concurrency-token:widget:rev-4" });
    const result = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-CONCURRENCY-CONFLICT");
  });
});

describe("dry-run fingerprint mismatch", () => {
  test("the actual write plan no longer matches the envelope's dryRunFingerprint -> RC-AUTH-DRY-RUN-MISMATCH", () => {
    const { envelope, ledger } = mintOne();
    const gate = buildGate({ actualDryRunFingerprint: () => "f".repeat(64) });
    const result = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-DRY-RUN-MISMATCH");
  });
});

describe("check ordering keeps criteria and permission independently observable", () => {
  test("both criteria and permission failing still resolves to the criteria code first (submission-criteria is evaluated before permission)", () => {
    const { envelope, ledger } = mintOne({ submissionCriteriaResult: { passed: false, evaluatedAt: "2026-07-18T09:45:10Z" } });
    const gate = buildGate({ resolvePermissionDecision: () => "deny" });
    const result = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-SUBMISSION-CRITERIA-FAILED");
  });
});

// P460 FIX 2 regression (a), UPDATED for v3: the fail-closed default denies
// closes at TWO separate points now, both proven below, and now proven
// through a gate built DIRECTLY from `FAIL_CLOSED_ORACLE` itself (the exact
// object `PRODUCTION_COMMIT_GATE` is built from) rather than an "installed"
// default.
//
// (a-1) MINT time: a gate's `issueMutationAuthority` itself reads its
// captured oracle to fill sicFingerprint/dtcFingerprint/expectedPriorState,
// so a gate built from `FAIL_CLOSED_ORACLE` denies at MINT time
// (RC-SCHEMA-VALIDATION-FAILED, since the fail-closed sentinel's
// empty-string fingerprints fail the envelope contract's
// `^[a-f0-9]{64}$` pattern) — an envelope can no longer even be MINTED
// through such a gate, let alone resolved.
//
// (a-2) RESOLVE time: a LEGITIMATELY-minted envelope (minted through a
// gate built with a trusted oracle) is still denied if RESOLVED through a
// DIFFERENT gate built from `FAIL_CLOSED_ORACLE` — proving the fail-closed
// oracle governs resolution independently of whatever oracle happened to
// mint the envelope, and that the writer is never invoked either way.
describe("fail-closed default: no permissive oracle survives to either mint or resolve", () => {
  test("(a-1) issueMutationAuthority itself denies through a gate built from FAIL_CLOSED_ORACLE — an envelope cannot even be minted", () => {
    const ledger = createMintLedger();
    const failClosedGate = createCommitGate(FAIL_CLOSED_ORACLE, { now: () => "2026-07-18T09:45:20Z" });
    const result = failClosedGate.issueMutationAuthority(baseRequest(), ledger);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("(a-2) a legitimately-minted envelope is still DENIED, never RC-COMMIT-SUCCEEDED, when resolved through a gate built from FAIL_CLOSED_ORACLE, and the writer is never invoked", () => {
    const { envelope, ledger } = mintOne(); // mintOne() mints through a trusted gate
    const failClosedGate = createCommitGate(FAIL_CLOSED_ORACLE, { now: () => "2026-07-18T09:45:20Z" });
    const writes: string[] = [];
    const result = failClosedGate.resolveMutationAuthority(envelope, ledger, allowAllEffects(writes));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).not.toBe("RC-COMMIT-SUCCEEDED");
      expect(result.reasonCode).toBe("RC-AUTH-FINGERPRINT-MISMATCH"); // first oracle-backed check in resolution order
    }
    expect(writes).toEqual([]);
  });

  test("resolveMutationAuthority's signature has no parameter an all-permissive caller-supplied oracle could occupy (compile-time containment)", async () => {
    const source = await Bun.file(new URL("../../src/governance/commit-gate.ts", import.meta.url)).text();
    // The inner function's signature line itself must only name `deps`
    // (writeExecutor-only), never any of the five oracle-predicate
    // parameter names.
    const sigMatch = source.match(/function resolveMutationAuthority\(([\s\S]*?)\): AggregateResult<EnvelopeResult> \{/);
    expect(sigMatch).not.toBeNull();
    const signature = sigMatch![1]!;
    for (const oraclePredicate of ["resolvePermissionDecision", "currentApprovedFingerprints", "isWithinDeclaredScope", "actualDryRunFingerprint", "actualPriorState"]) {
      expect(signature).not.toContain(oraclePredicate);
    }
  });
});

describe("permission specifically fail-closed when explicitly left unresolved by the test oracle", () => {
  test("every OTHER predicate passing, permission left at deny -> RC-AUTH-PERMISSION-DENIED (never RC-COMMIT-SUCCEEDED)", () => {
    const { envelope, ledger } = mintOne();
    const gate = buildGate({ resolvePermissionDecision: () => "deny" }); // every other predicate still "allow"
    const result = gate.resolveMutationAuthority(envelope, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-PERMISSION-DENIED");
  });
});
