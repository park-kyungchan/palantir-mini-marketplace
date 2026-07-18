// P430 S2: single commit service — positive path + writer privatization
// (via the real atomic-write-backed executor) + envelope-or-opaque-handle.
//
// P460 FIX 2: a gate's `resolveMutationAuthority`'s five security-trust
// predicates no longer come from a per-call `deps` argument — they come
// from the gate's own captured, governance-owned oracle. Every test below
// that needs a commit-SUCCESS (or a specific oracle-predicate denial)
// builds a trusted test gate via `buildGate`.
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+"): there is no more module-global oracle to
// install/reset. Each test below builds its OWN `CommitGate` via
// `createCommitGate` (`buildGate` in `gate-test-helpers.ts`) and calls
// `gate.issueMutationAuthority(request, ledger)` /
// `gate.resolveMutationAuthority(presented, ledger, { writeExecutor })` —
// no third `deps` argument carrying a clock (the gate captures its own).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createMintLedger } from "../../src/governance/commit-gate";
import { validateEnvelopeShape } from "../../src/governance/envelope-validate";
import { allowAllEffects, baseRequest, buildGate, createFileWriteExecutor, makeTempOutcomeDir } from "./gate-test-helpers";

describe("issueMutationAuthority: the single minting location", () => {
  test("mints a schema-valid envelope with a gate-stamped issuedAt/expiresAt/nonce", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const result = gate.issueMutationAuthority(baseRequest(), ledger);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.issuedAt).toBe("2026-07-18T09:45:20Z");
    expect(result.value.expiresAt).toBe("2026-07-18T09:50:20.000Z");
    expect(result.value.nonce.length).toBeGreaterThanOrEqual(8);
    expect(validateEnvelopeShape(result.value).valid).toBe(true);
  });

  test("two mints in the same ledger produce two distinct nonces", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const a = gate.issueMutationAuthority(baseRequest(), ledger);
    const b = gate.issueMutationAuthority(baseRequest(), ledger);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.value.nonce).not.toBe(b.value.nonce);
  });

  test("fails closed on a non-positive ttlSeconds rather than minting a broken envelope", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const result = gate.issueMutationAuthority(baseRequest({ ttlSeconds: 0 }), ledger);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });
});

describe("resolveMutationAuthority: happy path, full envelope", () => {
  test("commits when every check passes and invokes the injected writer exactly once", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const minted = gate.issueMutationAuthority(baseRequest(), ledger);
    if (!minted.ok) throw new Error("fixture setup failed");

    const writes: string[] = [];
    const result = gate.resolveMutationAuthority(minted.value, ledger, allowAllEffects(writes));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome).toBe("committed");
    expect(result.value.reasonCode).toBe("RC-COMMIT-SUCCEEDED");
    expect(writes).toEqual([minted.value.nonce]);
  });

  test("commits using the REAL atomic-write-backed executor and the outcome file is byte-readable", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const minted = gate.issueMutationAuthority(baseRequest(), ledger);
    if (!minted.ok) throw new Error("fixture setup failed");

    const outcomeDir = makeTempOutcomeDir();
    const writeExecutor = createFileWriteExecutor(outcomeDir, [outcomeDir]);
    const result = gate.resolveMutationAuthority(minted.value, ledger, { writeExecutor });
    expect(result.ok).toBe(true);

    const written = JSON.parse(readFileSync(join(outcomeDir, `${minted.value.nonce}.committed.json`), "utf8"));
    expect(written.nonce).toBe(minted.value.nonce);
    expect(written.sicFingerprint).toBe(minted.value.sicFingerprint);
  });
});

describe("resolveMutationAuthority: envelope-or-opaque-handle", () => {
  test("a bare nonce (opaque handle) resolves and revalidates identically to the full envelope", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const minted = gate.issueMutationAuthority(baseRequest(), ledger);
    if (!minted.ok) throw new Error("fixture setup failed");

    const writes: string[] = [];
    const result = gate.resolveMutationAuthority(minted.value.nonce, ledger, allowAllEffects(writes));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome).toBe("committed");
    expect(writes).toEqual([minted.value.nonce]);
  });

  test("a handle resolution still runs every downstream check — a handle does not substitute for authority", () => {
    const ledger = createMintLedger();
    const mintGate = buildGate();
    const minted = mintGate.issueMutationAuthority(baseRequest(), ledger);
    if (!minted.ok) throw new Error("fixture setup failed");

    const denyGate = buildGate({ resolvePermissionDecision: () => "deny" });
    const result = denyGate.resolveMutationAuthority(minted.value.nonce, ledger, allowAllEffects());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-PERMISSION-DENIED");
  });
});
