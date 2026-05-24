# @palantirKC/claude-schemas — v2.0 Migration Runbook

Cross-ref: rule 08 (schema-versioning) §CHANGELOG + §Codegen authority.
This document is the SoT for executing any MAJOR (breaking) schema version bump.
It is NOT the migration itself — do not follow this document until a v2.0 sprint is formally scoped.

---

## §1 — Migration triggers

A MAJOR bump to v2.0 is warranted when at least one of:

- **Primitive rename/remove**: a load-bearing primitive (e.g. `Rule`, `GradingCriterion`, `SprintContractDeclaration`) is renamed or removed, not just extended.
- **ABI break in PROPERTY_TYPES**: `PROPERTY_TYPES` constant or `PropertyType` union loses a member that consumer codegen depends on (codegen output changes shape).
- **Structural change to GradingCriterion**: e.g. `rubricDomain` enum loses a value, `weight` type changes from `number` to an object, `threshold` becomes non-optional.
- **Import path restructure**: primitives move across sub-package boundaries (`ontology/` → `interaction/` etc.) breaking existing `import` paths in consumer code.
- **Codegen header schema change**: the generated-file header fields change in a way that invalidates `generated-header-check` hook parsing.

Prefer additive types + deprecation notes (MINOR) over any of the above. Reach for v2.0 only when additive extension is structurally impossible.

---

## §2 — Parallel-version peerDep window

During the v2.0 transition, consumers move from the v1.x range to a bridging range, then to v2.x:

| Stage | Consumer peerDep | Purpose |
|-------|-----------------|---------|
| Pre-migration (current) | `>=1.45.0 <2.0.0` | All consumers; v2.0 blocked |
| Transition open | `>=1.45.0 <3.0.0` | Bridges v1.x final + v2.0-prerelease; safe to read both |
| v2.0 cutover | `>=2.0.0 <3.0.0` | Strict v2.x; v1.x uninstallable |

Open the transition window (`<3.0.0`) in each consumer's `package.json` BEFORE publishing v2.0 to the registry. This prevents npm/bun install from breaking when v2.0 lands on disk.

---

## §3 — Pre-migration checklist

Before any v2.0 file is touched:

1. Draft a blueprint at `~/.claude/plans/YYYY-MM-DD-schemas-v2.0-blueprint.md` naming: (a) every breaking primitive change; (b) affected consumers; (c) rollback decision owner; (d) sprint window.
2. Verify `pm_rule_audit` is green (0 stale citations, 0 bottleneck flags).
3. Tag the v1.x final release: `git tag schemas-v1.99.0` (or the actual last v1.x).
4. Open transition window across all 4 consumers (see §2) in a single PR before v2.0 work begins.

---

## §4 — Staged migration order

Run consumers strictly in this sequence. Do not advance to the next until the prior consumer is green.

### Step 0 — Schema v2.0-prerelease

- Publish `2.0.0-pre.1` from `~/.claude/schemas/`.
- Verify `pm-codegen` produces byte-identical output given identical inputs on the v1.x final baseline.

### Step 1 — palantir-math (canonical reference, Stage 5 maturity)

Rationale: highest test coverage (92%); regression surface catches primitive breakage earliest.

1. Pin to v1.x final (`1.99.x`) in `projects/palantir-math/package.json` and confirm `bun test` green.
2. Bump pin to `2.0.0-pre.1`; run `pm-codegen` → inspect generated header (schema version field must read `2.0.0-pre.1`).
3. Run `pm-verify` (schema-pin + generated-header). Must pass with 0 drift.
4. Run `bun test --filter '*'` — fail threshold: > 5% regressions → rollback (§6).
5. Run runtime smoke: `bun run dev` + spot-check 3 ontology-dependent API paths.
6. Commit: `chore(palantir-math): migrate to schemas v2.0.0-pre.1`.

### Step 2 — mathcrew (Stage 4 maturity)

Same sub-steps as Step 1; substitute `projects/mathcrew/` and `bun run dev --scene default`.
Ontology graph health check: `pm_rule_audit` + `detect_doc_drift` must return 0 errors.

### Step 3 — hyperframes

Same sub-steps. Extra gate: `bun run verify-visual` canary must pass ≥ 8/10 (sprint-015 baseline).
Rollback trigger: < 6/10 visual pass OR any white-frame regression detected.

### Step 4 — palantir-mini plugin

Last in order; plugin depends on all consumers validating first.

1. Update `~/.claude/plugins/palantir-mini/package.json` peerDep to `>=2.0.0 <3.0.0`.
2. Run `bun test` under `~/.claude/plugins/palantir-mini/tests/` — hook unit tests + handler integration.
3. Run plugin self-check: `pm_plugin_self_check` MCP handler must return `healthy: true`.
4. Bump plugin version MINOR (schema ABI change is a consumer MINOR; plugin feature set unchanged).

### Step 5 — Promote peerDep range to v2.x strict

Once all 4 consumers are green on `2.0.0-pre.N`:

- Publish `2.0.0` (drop `-pre` suffix).
- Narrow each consumer pin from `<3.0.0` to `<3.0.0` (leave as-is; `<3.0.0` is the production range going forward).
- Emit `migration_phase_completed` event (5-dim, rule 10) for each consumer with `propagationDepth` = step index.

---

## §5 — Codegen replay validation

After each `pm-codegen` run in §4:

```bash
# Verify header fields are present and correct
grep -E "schema-version:|ontology-hash:|generator-version:|timestamp:" \
  projects/<consumer>/src/generated/*.ts

# Verify byte-identity across two consecutive runs
pm-codegen --project <consumer>
cp -r src/generated src/generated.bak
pm-codegen --project <consumer>
diff -rq src/generated src/generated.bak && echo "PASS: byte-identical" || echo "FAIL: drift detected"
```

Drift detected = blocking defect. Fix generator before advancing.

---

## §6 — Rollback criteria

Rollback the consumer (revert to v1.x pin) immediately when any of:

| Gate | Threshold | Action |
|------|-----------|--------|
| Test regression | > 5% of previously passing tests now fail | Revert pin; file bug against v2.0-pre |
| Codegen header drift | Any generated file missing schema-version or ontology-hash | Revert; fix pm-codegen |
| Runtime smoke failure | Any ontology-dependent API path returns 500 or panics | Revert pin immediately |
| Visual regression (hyperframes) | < 6/10 canary visual pass | Revert; re-run sprint-015 baseline |
| pm-verify block | `verify_schema_pin` returns incompatible | Revert; check peerDep window §2 |
| Plugin self-check | `pm_plugin_self_check` returns `healthy: false` | Revert plugin step; keep consumers |

Rollback command:

```bash
git checkout schemas-v1.99.0 -- . # restore schema to v1.x final tag
cd projects/<consumer> && bun install
```

---

## §7 — Sprint window + governance

- A v2.0 sprint MUST be a Full Sprint (rule 20) — multi-file, multi-consumer, ≥2 iters.
- Sprint contract: `mode="full"`, `timeboxMs` ≥ 7200000 (2h) per consumer step.
- Decision owner: Lead (opus[1m]); subagents execute per-consumer steps in isolation (worktree per rule 16 v4.1.0).
- No partial cutover: all 4 consumers migrate in the same sprint window. A v2.0 in the wild with only 2 consumers migrated is a blocked state.
- Cross-ref: rule 08 §CHANGELOG (bump discipline), rule 25 §Wave-split policy (PR-merge-cleanup at each Wave boundary).
