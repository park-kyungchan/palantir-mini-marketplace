// Test-only security-oracle builder (P460 v3 — see
// decisions/pm2-gate-threat-model-escalation.md "User Ruling and Lead
// Selection — Option 1+", item 3). A clearly test-only module: the entire
// `src/governance/testing/**` directory is off-limits to production code —
// `scripts/boundary-check.ts` forbids any non-test `src/**` file from
// importing anything under this directory.
//
// P460 v3: there is no more global to install into or reset — this file
// used to also export `installSecurityOracle`/`resetSecurityOracle`
// (re-exported from `../security-oracle`) so tests could swap the module-
// global active oracle. That mechanism is gone. A test now builds a fully-
// specified oracle here and hands it DIRECTLY to
// `createCommitGate(oracle, effects)` (`../commit-gate`, itself governance/
// test-only — banned outside `src/governance/**`/tests by `scripts/
// boundary-check.ts`'s `governance-commit-gate-factory-import` rule) to get
// its OWN self-contained gate instance. No install call, no reset call, no
// cross-test leakage possible even without an `afterEach`.
//
// `createTrustedOracleForTest` requires every one of the five
// `GateSecurityOracle` predicates explicitly (no optional field, same
// no-silent-omission discipline `GateEffects` already establishes) — a test
// cannot accidentally leave a predicate fail-closed by forgetting to
// override it while intending a commit-success case; it must say so.

import type { GateSecurityOracle } from "../security-oracle";

export type { GateSecurityOracle } from "../security-oracle";

/** Builds a fully-specified `GateSecurityOracle` for test use with `createCommitGate` — every predicate is required, mirroring production's no-silent-omission discipline. */
export function createTrustedOracleForTest(impls: GateSecurityOracle): GateSecurityOracle {
  return { ...impls };
}
