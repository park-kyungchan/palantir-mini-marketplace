# Known Broad Suite Failures

Initialized for sprint-064 W4 from the PR #366 broad-suite baseline (`2002 pass / 16 skip / 29 fail`) and refreshed against a local `bun test --only-failures` run on 2026-05-11. W4 adapter self-tests are intentionally excluded from this ledger because they are in-scope regressions for W4, not inherited broad-suite debt.

Refreshed 2026-07-02 against targeted per-file `bun test` runs in a sandbox: 4 rows referenced test files that no longer exist in the repo (`briefing-template-validate.test.ts`, `apply-refinement-target.test.ts`, `grade-classification-accuracy.test.ts`, `lib/harness/ratchet-proposal.test.ts`), and the remaining PR #366-baseline rows now pass (several test cases were renamed or rewritten to match current handler behavior, e.g. the `t4-promotion-trigger` and `verification-edges-e2e` handlers were intentionally changed and their tests updated to match). All such rows have been pruned. One row remains: `wave2-mvp.test.ts::producer AST evidence` is flaky (timed out once at ~12s against a 10s per-test timeout, passed cleanly in isolation on retry at ~6.5s) and is kept pending a timeout/perf fix.

| test_path | failure_class | owner_surface | introduced | severity | blocks_release | required_fix | removal_target |
|---|---|---|---|---|---|---|---|
| `tests/lib/semantic-graph/wave2-mvp.test.ts::producer AST evidence` | flaky-async | semantic graph producer | PR #366 baseline, still present after W3 | medium | no | Split expensive AST producer traversal into a smaller fixture or raise the timeout for this semantic-graph integration test. | sprint-065 W4 |
