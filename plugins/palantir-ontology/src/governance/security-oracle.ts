// Governance-owned, fail-closed security oracle (P460 FIX 2 — see
// decisions/pm2-core-safety-correction.md; superseded module-global
// mechanics removed in P460 v3 — see
// decisions/pm2-gate-threat-model-escalation.md "User Ruling and Lead
// Selection — Option 1+").
//
// `GateSecurityOracle` names the five security-trust predicates a commit
// gate needs (permission/fingerprint-freshness/scope/dry-run/prior-state).
// `FAIL_CLOSED_ORACLE` is the honest Wave-4 default: no real governance
// oracle exists yet, so every predicate denies/mismatches rather than
// silently passing.
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md items 1-2): this
// module used to also own a mutable module-global `ACTIVE_ORACLE` plus
// `installSecurityOracle`/`resetSecurityOracle`/`resolveActiveOracle` to
// swap it. The v3 re-verifier's surviving finding was that a computed
// dynamic `import()` specifier (invisible to any static/AST scanner) could
// reach `installSecurityOracle` and corrupt that global from ANY production
// file with in-process code execution — a class of bypass a mutable global
// can never fully close, only narrow. v3 deletes the global and the
// installer/reset/resolve functions ENTIRELY: there is no longer a
// process-wide oracle to install into, freeze, corrupt, or reset, by
// construction. `./commit-gate.ts`'s `createCommitGate(oracle, effects)`
// factory captures an oracle in a PER-INSTANCE closure instead — see that
// file's module doc. The single production instance
// (`PRODUCTION_COMMIT_GATE`, built once in `./index.ts` from
// `FAIL_CLOSED_ORACLE`) is therefore not just frozen but unreachable to
// mutate: nothing in this module exposes a swap path anymore, so the old
// exploit 2a (in-place mutation of the returned oracle reference) and 2b
// (deep-importing the installer) both lose their target entirely, not just
// their access path.
//
// `FAIL_CLOSED_ORACLE` stays `Object.freeze`d at definition — belt-and-
// suspenders against in-place mutation of the shared sentinel object itself
// (which several call sites, including `createCommitGate`, may hold a
// reference to), even though there is no longer an installer that could
// swap a corrupted copy back in.

export interface GateSecurityOracle {
  /** Resolves `permissionDecisionRef` to a live allow/deny. Anything other than the literal "allow" is treated as deny (fail-closed). */
  readonly resolvePermissionDecision: (ref: string) => "allow" | "deny";
  /** The LIVE currently-approved SIC/DTC fingerprints for this envelope's target, read fresh at resolution time (never cached from mint time) — this is what catches a "stale" envelope whose approved body has since changed. */
  readonly currentApprovedFingerprints: () => { readonly sicFingerprint: string; readonly dtcFingerprint: string };
  /** Consumer-domain-neutral scope-membership check (ADR-001: the gate itself never knows a consumer's object model). */
  readonly isWithinDeclaredScope: (targetIdentities: readonly string[], writeScope: readonly string[], allowedAction: string) => boolean;
  /** The actual write-plan fingerprint computed at commit time, compared against the envelope's `dryRunFingerprint`. */
  readonly actualDryRunFingerprint: () => string;
  /** The actual current concurrency token/prior-state of the target, compared against the envelope's `expectedPriorState`. */
  readonly actualPriorState: () => string;
}

/**
 * Denies permission and returns non-matching sentinels for every other
 * predicate, so every one of a commit gate's five oracle-backed checks
 * fails closed rather than silently passing when no real oracle has been
 * constructed in. The sentinel fingerprints/tokens are the empty string —
 * never a valid 64-hex fingerprint or a real concurrency token — so they
 * cannot accidentally match a legitimately-minted envelope's own fields.
 *
 * Frozen at definition so no holder of this reference can mutate a
 * predicate on it in place.
 */
export const FAIL_CLOSED_ORACLE: GateSecurityOracle = Object.freeze({
  resolvePermissionDecision: () => "deny",
  currentApprovedFingerprints: () => ({ sicFingerprint: "", dtcFingerprint: "" }),
  isWithinDeclaredScope: () => false,
  actualDryRunFingerprint: () => "",
  actualPriorState: () => "",
});
