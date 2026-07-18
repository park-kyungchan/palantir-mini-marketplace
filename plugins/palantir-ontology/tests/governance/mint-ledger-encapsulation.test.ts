// P460 FIX 1 regression: `createMintLedger()` returns an OPAQUE token with
// NO public write/lookup/consume method (decisions/pm2-core-safety-
// correction.md). Complements the manual bite-proof recorded in
// outputs/p460-correction.md — this test keeps the same closure surviving
// as an automated `bun test` check.
//
// This is the direct fix for the P460 adversarial verifier's finding 1
// ("public self-mint"): the OLD `MintLedger` shape (`{ issue, lookup,
// markConsumed }`) let any caller holding a ledger inject an
// attacker-chosen envelope directly via `ledger.issue(forgedEnvelope)`,
// bypassing `issueMutationAuthority` entirely — the single-minting-location
// claim was false. The new token has no such surface at all.
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+"): a gate's `issueMutationAuthority` reads its
// own captured oracle to fill sicFingerprint/dtcFingerprint/
// expectedPriorState at mint time, so every case below that mints builds a
// trusted gate via `buildGate()` first — no install/reset, each gate is
// self-contained.

import { describe, expect, test } from "bun:test";
import { createMintLedger, lookupInLedger, markConsumedInLedger, mintIntoLedger } from "../../src/governance/mint-ledger";
import { baseRequest, buildGate } from "./gate-test-helpers";

describe("createMintLedger(): the returned token exposes no write/lookup/consume method", () => {
  test("typeof token.issue / token.lookup / token.markConsumed are all \"undefined\"", () => {
    const ledger = createMintLedger();
    const asAny = ledger as unknown as Record<string, unknown>;
    expect(typeof asAny.issue).toBe("undefined");
    expect(typeof asAny.lookup).toBe("undefined");
    expect(typeof asAny.markConsumed).toBe("undefined");
  });

  test("assigning a same-shaped attacker object as if it were a ledger does not grant a real populate path either (mintIntoLedger rejects an unrecognized token)", () => {
    const forgedToken = { issue: () => {}, lookup: () => undefined, markConsumed: () => {} };
    expect(() => mintIntoLedger(forgedToken as any, baseRequest() as any)).toThrow(/unrecognized ledger/);
  });

  test("a token from one createMintLedger() call cannot be used to read/consume a record minted into a DIFFERENT ledger's store (WeakMap keys by identity, not shape)", () => {
    const ledgerA = createMintLedger();
    const ledgerB = createMintLedger();
    const gate = buildGate();
    const minted = gate.issueMutationAuthority(baseRequest(), ledgerA);
    if (!minted.ok) throw new Error("fixture setup failed");
    expect(lookupInLedger(ledgerB, minted.value.nonce)).toBeUndefined();
    expect(lookupInLedger(ledgerA, minted.value.nonce)).toBeDefined();
  });
});

describe("createMintLedger(): the ONLY populate path is issueMutationAuthority", () => {
  test("mintIntoLedger/lookupInLedger/markConsumedInLedger are not reachable from a public governance import path", async () => {
    const barrelSource = await Bun.file(new URL("../../src/governance/index.ts", import.meta.url)).text();
    // Only the live `export { ... }` / `export type { ... }` statements
    // matter here — the module doc comment above them legitimately
    // DISCUSSES these governance-internal names (explaining why they are
    // absent), so strip `//`-comment lines before asserting absence.
    const codeOnly = barrelSource
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(codeOnly).not.toMatch(/mintIntoLedger/);
    expect(codeOnly).not.toMatch(/lookupInLedger/);
    expect(codeOnly).not.toMatch(/markConsumedInLedger/);
    // P460 v3: resolveActiveOracle/installSecurityOracle/resetSecurityOracle
    // no longer exist anywhere (the module-global they operated on is
    // gone) — nothing outside src/governance/** can obtain or install an
    // oracle at all. createCommitGate (the FACTORY) is used internally here
    // to build PRODUCTION_COMMIT_GATE (legitimate, sanctioned) but is never
    // RE-EXPORTED under its own name — that specific pattern is asserted in
    // tests/governance/factory-hardening.test.ts.
    expect(codeOnly).not.toMatch(/resolveActiveOracle/);
    expect(codeOnly).not.toMatch(/installSecurityOracle/);
    expect(codeOnly).not.toMatch(/resetSecurityOracle/);
  });

  test("a freshly-created ledger has no record for a nonce until issueMutationAuthority mints one", () => {
    const ledger = createMintLedger();
    expect(lookupInLedger(ledger, "any-nonce-000")).toBeUndefined();
    const gate = buildGate();
    const minted = gate.issueMutationAuthority(baseRequest(), ledger);
    if (!minted.ok) throw new Error("fixture setup failed");
    expect(lookupInLedger(ledger, minted.value.nonce)).toBeDefined();
  });

  test("markConsumedInLedger against a nonce that was never minted is a no-op, not a forged consume", () => {
    const ledger = createMintLedger();
    expect(() => markConsumedInLedger(ledger, "never-minted-nonce")).not.toThrow();
    expect(lookupInLedger(ledger, "never-minted-nonce")).toBeUndefined();
  });
});
