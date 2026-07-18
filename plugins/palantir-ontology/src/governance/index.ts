// Public barrel for src/governance/ (ledger row P430, ADR-005). This is the
// ONLY module path outside `src/governance/**` itself that any other
// successor subsystem (src/altitude2/, src/adapters/*, a future consumer
// binding) may import from. `scripts/boundary-check.ts` enforces this
// structurally: any file outside `src/governance/**` that imports
// `./atomic-write` or `./mint-ledger`'s internal mutation surface, or
// `./commit-gate`'s `createCommitGate` factory, or `./security-oracle`, by
// any path other than this file is a boundary violation.
//
// Deliberately does NOT re-export `atomicWriteFile`/`assertWithinAllowedRoots`
// (the writer primitive itself — ADR-005: "must not be exported from a
// public module path any other successor subsystem can import"), the
// `./mint-ledger` populate/read/mutate internals, or `createCommitGate`
// (`./commit-gate`'s gate FACTORY — P460 v3, see below).
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+", items 1-2): earlier corrections (FIX 1/FIX 2/
// v2) built the commit gate around a mutable module-global oracle
// (`./security-oracle.ts`'s `ACTIVE_ORACLE`), swappable only through a
// guarded `installSecurityOracle`/`resetSecurityOracle` pair reachable from
// `src/governance/testing/**` alone. The v3 re-verifier's surviving finding
// was that a computed dynamic `import()` specifier (invisible to any
// static/AST scanner) could still reach that installer with in-process code
// execution. v3 deletes the global and the installer entirely — there is
// nothing left to install into. `./commit-gate.ts`'s `createCommitGate(oracle,
// effects)` factory captures an oracle in a PER-INSTANCE closure instead;
// `createCommitGate` itself is governance/test-only (banned outside
// `src/governance/**`/tests by `scripts/boundary-check.ts`'s new
// `governance-commit-gate-factory-import` rule, mirroring the existing
// `governance-security-oracle-import` rule one file over).
//
// `PRODUCTION_COMMIT_GATE` below is the ONE frozen production instance —
// built here, once, from `FAIL_CLOSED_ORACLE` and a real ISO clock. Every
// non-test consumer (currently `src/altitude2/commit-routing.ts#routeCommit`)
// uses this single instance; nothing outside this file constructs another
// production gate. A later wave upgrades the gate's real-world behavior by
// changing ONLY this one construction line (swapping `FAIL_CLOSED_ORACLE`
// for a real oracle) — "one reviewable extension point," per the ruling.
// Tests build their OWN gate via `createCommitGate(createTrustedOracleForTest(...),
// ...)` (`src/governance/testing/trusted-oracle.ts`) — no global to install
// or reset, and no test's gate can affect another test's or the production
// instance's behavior.

import { createCommitGate } from "./commit-gate";
import { FAIL_CLOSED_ORACLE } from "./security-oracle";

/**
 * The single, frozen, production commit gate. Fail-closed by construction
 * (`FAIL_CLOSED_ORACLE`) until a later wave changes this one line to pass a
 * real oracle — the honest Wave-4 state: no real governance oracle exists
 * yet, so every commit attempt through this instance denies rather than
 * silently succeeding.
 */
export const PRODUCTION_COMMIT_GATE = createCommitGate(FAIL_CLOSED_ORACLE, { now: () => new Date().toISOString() });

export type { CommitGate, MintLedger } from "./commit-gate";
export { createMintLedger } from "./commit-gate";
export type { GateSecurityOracle } from "./security-oracle";
export { validateEnvelopeShape } from "./envelope-validate";
export type { EnvelopeValidationResult } from "./envelope-validate";
export { createFileWriteExecutor } from "./default-write-executor";
export type {
  ConsumerOntologyRef,
  EnvelopeActor,
  EnvelopeResult,
  GateEffects,
  MutationAuthorityEnvelope,
  MutationAuthorityRequest,
  SubmissionCriteriaResult,
} from "./types";
