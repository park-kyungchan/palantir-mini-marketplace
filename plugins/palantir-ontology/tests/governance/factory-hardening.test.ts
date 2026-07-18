// P460 v3 regression (decisions/pm2-gate-threat-model-escalation.md "User
// Ruling and Lead Selection — Option 1+", items 1-3): dedicated coverage for
// the factory/frozen hardening that replaced v1/v2's mutable module-global
// oracle. Supersedes `security-oracle-hardening.test.ts` (deleted — its 2a/
// 2b mutation-freeze narrative described a global that no longer exists).
//
// The v3 re-verifier's surviving finding was that a computed dynamic
// `import()` specifier could reach `installSecurityOracle` and corrupt the
// module-global oracle from any production file with in-process code
// execution — a class of bypass a mutable global can never fully close,
// only narrow. This file proves the REPLACEMENT structurally: there is no
// global left to corrupt (checked by source grep, not just behavior), each
// `createCommitGate` instance is self-contained, and the ONE production
// instance (`PRODUCTION_COMMIT_GATE`) is frozen and permanently fail-closed.
// `tests/scripts/boundary-check.test.ts` covers the STATIC half (the new
// `governance-commit-gate-factory-import` and `computed-dynamic-import`
// rules biting live filesystem scans) — this file is the BEHAVIORAL half.

import { describe, expect, test } from "bun:test";
import { createCommitGate, createMintLedger } from "../../src/governance/commit-gate";
import { PRODUCTION_COMMIT_GATE, type GateSecurityOracle } from "../../src/governance";
import { FAIL_CLOSED_ORACLE } from "../../src/governance/security-oracle";
import { allowAllEffects, baseRequest, buildGate, DRY_RUN_FINGERPRINT } from "./gate-test-helpers";

/** Strips `//`-comment lines before an absence assertion — several module docs in this package legitimately DISCUSS a removed name (explaining why it's gone), so only LIVE code should be checked for its absence. Matches the precedent every other barrel-containment test in this suite already uses. */
function codeOnly(source: string): string {
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

describe("v3: no module-global oracle exists (source containment)", () => {
  test("security-oracle.ts no longer defines ACTIVE_ORACLE or an installer/reset/resolve function", async () => {
    const source = await Bun.file(new URL("../../src/governance/security-oracle.ts", import.meta.url)).text();
    const live = codeOnly(source);
    for (const removed of ["ACTIVE_ORACLE", "installSecurityOracle", "resetSecurityOracle", "resolveActiveOracle"]) {
      expect(live).not.toMatch(new RegExp(removed));
    }
  });

  test("commit-gate.ts no longer references a module-global oracle read path (resolveActiveOracle) anywhere", async () => {
    const source = await Bun.file(new URL("../../src/governance/commit-gate.ts", import.meta.url)).text();
    const live = codeOnly(source);
    expect(live).not.toMatch(/resolveActiveOracle/);
    expect(live).not.toMatch(/installSecurityOracle/);
    expect(live).not.toMatch(/ACTIVE_ORACLE/);
  });

  test("src/governance/testing/trusted-oracle.ts no longer exports an install/reset function", async () => {
    const source = await Bun.file(new URL("../../src/governance/testing/trusted-oracle.ts", import.meta.url)).text();
    const live = codeOnly(source);
    expect(live).not.toMatch(/installSecurityOracle/);
    expect(live).not.toMatch(/resetSecurityOracle/);
  });

  test("FAIL_CLOSED_ORACLE is frozen at definition (Object.isFrozen)", () => {
    expect(Object.isFrozen(FAIL_CLOSED_ORACLE)).toBe(true);
    expect(() => {
      (FAIL_CLOSED_ORACLE as unknown as { resolvePermissionDecision: () => string }).resolvePermissionDecision = () => "allow";
    }).toThrow();
  });
});

describe("v3: createCommitGate is not barrel-reachable (createCommitGate stays governance/test-only)", () => {
  test("no barrel (src/governance/index.ts) export names installSecurityOracle, resetSecurityOracle, or resolveActiveOracle", async () => {
    const barrelSource = await Bun.file(new URL("../../src/governance/index.ts", import.meta.url)).text();
    const codeOnly = barrelSource
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    for (const forbidden of ["installSecurityOracle", "resetSecurityOracle", "resolveActiveOracle", "mintIntoLedger", "lookupInLedger", "markConsumedInLedger", "atomicWriteFile"]) {
      expect(codeOnly).not.toMatch(new RegExp(forbidden));
    }
  });

  test("createCommitGate is imported for INTERNAL use only (to build PRODUCTION_COMMIT_GATE) — never re-exported under its own name", async () => {
    const barrelSource = await Bun.file(new URL("../../src/governance/index.ts", import.meta.url)).text();
    const codeOnly = barrelSource
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    // The only legitimate appearance: `import { createCommitGate } from
    // "./commit-gate";` (internal use) and its call site building
    // PRODUCTION_COMMIT_GATE. Neither is a re-export.
    expect(codeOnly).not.toMatch(/export\s*\{[^}]*\bcreateCommitGate\b/);
    expect(codeOnly).not.toMatch(/export\s*\*\s*from\s*["']\.\/commit-gate["']/);
    expect(codeOnly).toMatch(/import\s*\{\s*createCommitGate\s*\}\s*from\s*["']\.\/commit-gate["']/);
  });

  test("the barrel DOES export the single frozen PRODUCTION_COMMIT_GATE", async () => {
    const barrelSource = await Bun.file(new URL("../../src/governance/index.ts", import.meta.url)).text();
    expect(barrelSource).toMatch(/export const PRODUCTION_COMMIT_GATE = createCommitGate\(/);
  });
});

describe("v3: PRODUCTION_COMMIT_GATE is frozen and permanently fail-closed", () => {
  test("PRODUCTION_COMMIT_GATE itself is frozen (Object.isFrozen) — no property can be reassigned", () => {
    expect(Object.isFrozen(PRODUCTION_COMMIT_GATE)).toBe(true);
    expect(() => {
      (PRODUCTION_COMMIT_GATE as unknown as { issueMutationAuthority: unknown }).issueMutationAuthority = () => {};
    }).toThrow();
  });

  test("PRODUCTION_COMMIT_GATE denies a forged session (fail-closed) at mint time, and the writer is never invoked", () => {
    const ledger = createMintLedger();
    const minted = PRODUCTION_COMMIT_GATE.issueMutationAuthority(baseRequest(), ledger);
    expect(minted.ok).toBe(false);
    if (!minted.ok) expect(minted.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("PRODUCTION_COMMIT_GATE denies even a full, otherwise-well-formed forged envelope presented directly to resolve, and the writer is never invoked", () => {
    const ledger = createMintLedger();
    // A legitimately-minted envelope from a TRUSTED gate, presented to the
    // PRODUCTION (fail-closed) gate instead — simulates an attacker forging
    // a plausible-looking session and handing it straight to the real gate.
    const trusted = buildGate();
    const minted = trusted.issueMutationAuthority(baseRequest(), ledger);
    if (!minted.ok) throw new Error("fixture setup failed");

    const writes: string[] = [];
    const result = PRODUCTION_COMMIT_GATE.resolveMutationAuthority(minted.value, ledger, allowAllEffects(writes));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).not.toBe("RC-COMMIT-SUCCEEDED");
    expect(writes).toEqual([]);
  });
});

describe("v3: gate instances are isolated (no shared state to corrupt)", () => {
  test("mutating a predicate on an oracle passed to one createCommitGate call does not affect a separately-built gate's decisions", () => {
    const mutableOracle = {
      resolvePermissionDecision: () => "deny" as const,
      currentApprovedFingerprints: () => ({ sicFingerprint: "a".repeat(64), dtcFingerprint: "b".repeat(64) }),
      isWithinDeclaredScope: () => true,
      actualDryRunFingerprint: () => DRY_RUN_FINGERPRINT,
      actualPriorState: () => "state-1",
    };
    const gateA = createCommitGate(mutableOracle, { now: () => "2026-07-18T09:45:20Z" });
    // createCommitGate defensively re-freezes what it captures, so mutating
    // the ORIGINAL object (not gateA's internal copy) is the only way to
    // even attempt a post-construction change.
    (mutableOracle as { resolvePermissionDecision: () => string }).resolvePermissionDecision = () => "allow";
    const gateB = createCommitGate(mutableOracle, { now: () => "2026-07-18T09:45:20Z" });

    // gateA must still see the ORIGINAL captured decision (deny), proving
    // its closure over the oracle is independent of the source object's
    // later mutation.
    const ledgerA = createMintLedger();
    const mintedA = gateA.issueMutationAuthority(baseRequest(), ledgerA);
    if (!mintedA.ok) throw new Error("fixture setup failed");
    const resultA = gateA.resolveMutationAuthority(mintedA.value, ledgerA, allowAllEffects());
    expect(resultA.ok).toBe(false);
    if (!resultA.ok) expect(resultA.reasonCode).toBe("RC-AUTH-PERMISSION-DENIED");

    // gateB, built AFTER the mutation, sees the new value — proving each
    // gate is an independent snapshot, not a shared live reference.
    const ledgerB = createMintLedger();
    const mintedB = gateB.issueMutationAuthority(baseRequest(), ledgerB);
    if (!mintedB.ok) throw new Error("fixture setup failed");
    const resultB = gateB.resolveMutationAuthority(mintedB.value, ledgerB, allowAllEffects());
    expect(resultB.ok).toBe(true);
  });
});

describe("v3 item 4 (carried forward): MutationAuthorityRequest cannot smuggle governance-truth fields back in (compile-time + source containment)", () => {
  test("MutationAuthorityRequest's Omit clause excludes sicFingerprint/dtcFingerprint/expectedPriorState (source containment)", async () => {
    const source = await Bun.file(new URL("../../src/governance/types.ts", import.meta.url)).text();
    const omitMatch = source.match(/export type MutationAuthorityRequest = Omit<\s*MutationAuthorityEnvelope,\s*([\s\S]*?)>/);
    expect(omitMatch).not.toBeNull();
    const omitClause = omitMatch![1]!;
    for (const field of ["sicFingerprint", "dtcFingerprint", "expectedPriorState"]) {
      expect(omitClause).toContain(field);
    }
  });

  test("the factory's inner issueMutationAuthority names no security-oracle parameter, and its body reads the captured oracle only (never a caller argument)", async () => {
    const source = await Bun.file(new URL("../../src/governance/commit-gate.ts", import.meta.url)).text();
    const sigMatch = source.match(/function issueMutationAuthority\(([\s\S]*?)\): AggregateResult<MutationAuthorityEnvelope> \{/);
    expect(sigMatch).not.toBeNull();
    expect(sigMatch![1]!).not.toMatch(/oracle/i);
    expect(source).toMatch(/capturedOracle\.currentApprovedFingerprints\(\)/);
  });
});

describe("fourth-bypass hunt: a forged gate can only ever hit a caller-supplied fake writer, never the real one", () => {
  test("writeExecutor is invoked exactly once, only after the last check, never on a denial path (single-edge call graph, re-confirmed under the v3 factory)", () => {
    const ledger = createMintLedger();
    const allowGate = buildGate();
    const minted = allowGate.issueMutationAuthority(baseRequest(), ledger);
    if (!minted.ok) throw new Error("fixture setup failed");

    // Denial path first: writer must not fire.
    const denyGate = buildGate({ resolvePermissionDecision: () => "deny" });
    const denyWrites: string[] = [];
    const denied = denyGate.resolveMutationAuthority(minted.value, ledger, allowAllEffects(denyWrites));
    expect(denied.ok).toBe(false);
    expect(denyWrites).toEqual([]);

    // Success path second, same nonce, an allow-all gate: writer fires exactly once.
    const okWrites: string[] = [];
    const committed = allowGate.resolveMutationAuthority(minted.value, ledger, allowAllEffects(okWrites));
    expect(committed.ok).toBe(true);
    expect(okWrites).toEqual([minted.value.nonce]);
  });

  test("even a fully-permissive, test-constructed gate (createCommitGate with an allow-all oracle) can only reach a CALLER-SUPPLIED writeExecutor — the real atomic-write.ts writer stays reachable only via governance's own createFileWriteExecutor, never a bare import", async () => {
    // Structural half: the real writer primitive is still import-banned for
    // any non-governance file — a forged/permissive gate built by a test or
    // a hypothetical malicious module has no path to the REAL filesystem
    // writer except through the SAME sanctioned createFileWriteExecutor the
    // barrel already exports (a legitimate, pre-existing capability, not a
    // new hole createCommitGate opens).
    const barrelSource = await Bun.file(new URL("../../src/governance/index.ts", import.meta.url)).text();
    const live = codeOnly(barrelSource);
    expect(live).not.toMatch(/atomicWriteFile/);
    expect(live).toMatch(/export \{ createFileWriteExecutor \}/);

    // Behavioral half: a permissive gate's resolveMutationAuthority only
    // ever calls whatever writeExecutor the CALLER passed in this call —
    // never anything it captured at construction (createCommitGate takes no
    // writer at all).
    const ledger = createMintLedger();
    const gate = buildGate();
    const minted = gate.issueMutationAuthority(baseRequest(), ledger);
    if (!minted.ok) throw new Error("fixture setup failed");
    const sentinelWrites: string[] = [];
    const result = gate.resolveMutationAuthority(minted.value, ledger, { writeExecutor: (envelope) => sentinelWrites.push(`fake:${envelope.nonce}`) });
    expect(result.ok).toBe(true);
    expect(sentinelWrites).toEqual([`fake:${minted.value.nonce}`]);
  });
});

// Type-level smoke: GateSecurityOracle stays importable as a TYPE from the
// barrel (index.ts keeps `export type { GateSecurityOracle }`) — types
// carry no mutation surface, so this re-export is intentionally retained;
// asserted here so a future accidental removal is caught as a type error,
// not silently.
function _typeStillExported(o: GateSecurityOracle): GateSecurityOracle {
  return o;
}
void _typeStillExported;
