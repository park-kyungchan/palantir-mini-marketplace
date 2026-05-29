---
name: pm-self-test
category: maintenance
description: "End-to-end smoke test of the plugin-only substrate. Runs schema pin check, codegen..."
allowed-tools: Read Bash mcp__plugin_palantir-mini_palantir-mini__verify_schema_pin mcp__plugin_palantir-mini_palantir-mini__verify_codegen_headers mcp__plugin_palantir-mini_palantir-mini__pm_plugin_self_check mcp__plugin_palantir-mini_palantir-mini__pm_rule_audit mcp__plugin_palantir-mini_palantir-mini__emit_event mcp__plugin_palantir-mini_palantir-mini__pm_preamble
effort: high
disable-model-invocation: false
---

# /palantir-mini:pm-self-test — Plugin Substrate Smoke Test

Sequential checks that verify the plugin-only substrate is healthy end-to-end.

Start by calling `mcp__plugin_palantir-mini_palantir-mini__pm_preamble` to load project context.

## Check 1 — Schema pin

```
mcp__plugin_palantir-mini_palantir-mini__verify_schema_pin({})
```

Expected: `{ status: "pass" }`. Plugin `compatibleSchemaVersions` must match installed `~/.claude/schemas/` version. A mismatch here means the bundle was built against a different schema version than the current machine.

## Check 2 — Codegen headers

```
mcp__plugin_palantir-mini_palantir-mini__verify_codegen_headers({ fixture: "canary" })
```

Expected: `{ status: "pass", checkedFiles: N }`. Verifies that all generated files under `src/generated/` carry the required schema-version + generator-version headers (rule 08 §Codegen authority).

## Check 3 — Plugin substrate aggregator

```
mcp__plugin_palantir-mini_palantir-mini__pm_plugin_self_check({})
```

Expected: `{ schemaPinResult: "pass", codegenHeadersResult: "pass", ruleAuditResult: { driftLines: 0, staleCrossRefs: 0 }, declaredAgentsExist: true, declaredSkillsExist: true }`.

This MCP aggregates checks 1 + 2 + rule audit + agent/skill existence checks in one call. Use when a quick all-green signal is needed.

## Check 4 — Canned harness sprint

Run a minimal harness sprint against the built-in canary spec to verify the 3-agent loop works end-to-end:

1. Invoke `/palantir-mini:pm-harness-sprint` with argument `canary` (or the canned spec path `~/.claude/plugins/palantir-mini/tests/fixtures/canary-spec.md` if harness-sprint supports file path).
2. Observe: Planner produces `spec.md` + `eval-rubric.md`. Generator produces output. Evaluator scores ≥ threshold. Expected to pass in 1 iteration.
3. If the harness loop is not available (no active project), skip this check and note "skip — no active project".

## Check 5 — Rule audit

```
mcp__plugin_palantir-mini_palantir-mini__pm_rule_audit({})
```

Expected: `{ driftLines: 0, bottleneckFlags: 0, staleCrossRefs: 0, unclaimedHookCitations: 0 }`.

## Aggregate verdict

```
## /palantir-mini:pm-self-test — Result

| Check | Result | Detail |
|-------|--------|--------|
| 1. Schema pin | PASS/FAIL | <message> |
| 2. Codegen headers | PASS/FAIL | <N files checked> |
| 3. Plugin self-check | PASS/FAIL | <aggregated> |
| 4. Harness sprint | PASS/SKIP/FAIL | <verdict or skip reason> |
| 5. Rule audit | PASS/FAIL | <driftLines: N> |

**Overall: GREEN / RED**

<If RED: list failed checks and suggested remediation>
```

Emit `self_test_completed` event with `{ verdict: "green"|"red", failedChecks: [...] }` after printing the verdict.

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — `self_test_completed` event emitted.
- `~/.claude/rules/08-schema-versioning.md §Codegen authority` — check 2 validates generated-header invariant.
- `~/.claude/rules/16-3-agent-harness.md` — check 4 validates harness loop.
