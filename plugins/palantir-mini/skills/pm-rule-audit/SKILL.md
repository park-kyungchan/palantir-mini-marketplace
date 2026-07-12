---
name: pm-rule-audit
category: maintenance
surfaceStatus: public-core
description: "Comprehensive rules/ health check — audit | prune modes via palantir-mini MCP"
allowed-tools: mcp__palantir-mini__pm_rule_audit mcp__palantir-mini__pm_rule_query mcp__palantir-mini__pm_health_audit
effort: medium
disable-model-invocation: false
---

# pm-rule-audit — rules/ health check + substrate hygiene (audit | prune)

One skill, two modes selected by the first argument (bare invocation with no
argument defaults to `audit`, matching the pre-merge behavior):

| Mode | Trigger | Use when |
|------|---------|----------|
| `audit` | `/palantir-mini:pm-rule-audit` or `/palantir-mini:pm-rule-audit audit [strict]` | T1/T2 bottleneck, drift, stale-crossref/hook-citation, recycled-rule-id findings |
| `prune` | `/palantir-mini:pm-rule-audit prune [--dry-run\|--apply --confirm-prune <ids>]` | Unified prune-candidate list — combines `audit`'s `unused_rule_30d` findings with stale-memory findings; rule 26 substrate housekeeping |

---

## Mode: audit — rules/ health check

### When to use

- User asks for "rules audit", "rule drift check", or "rules health".
- After a large rule edit cycle — verify no stale crossRefs or exceeded ceilings.
- Proactively when `rule-audit` (mode=bottleneck or mode=drift) emits an advisory warning.
- Pre-merge sanity check before landing R-track PRs.

### What this does

Dispatches `pm_rule_audit` MCP handler (introduced plugin v2.2.1 + schemas v1.18.0 Rule primitive; current schemas v1.31.0 + plugin v3.11.0). Returns structured findings across 8 issue classes:

| Kind | Severity | What it catches |
|------|----------|-----------------|
| `drift:memory-counter` | advisory | MEMORY.md rule count mismatches registered |
| `drift:file-count` | warn | Global rule files on disk vs registered |
| `bottleneck:t1-total` | warn | CORE + CONTEXT + BROWSE LOC total |
| `bottleneck:t1-file` | warn/advisory | Per-file T1 ceiling violation |
| `bottleneck:t2-file` | advisory | Per-rule body size over ceiling |
| `bottleneck:t2-total` | warn | Sum of T2 catalog bodies over ceiling |
| `stale-crossref` | warn | crossRefs pointing to deleted/unregistered rule |
| `stale-hook-citation` | advisory | hookCitations pointing to non-existent hook |
| `recycled-rule-id` | **block** | Same ruleId in same scope (hard violation) |

Ceilings codified in `rules/CONTEXT.md §12`:

| Layer | Hard | Enforced by |
|-------|------|-------------|
| CORE.md | 25 LOC | `rule-audit --mode=bottleneck` |
| CONTEXT.md | 400 LOC | same |
| BROWSE.md | 30 LOC | same |
| T1 total | 445 LOC | same |
| T2 per rule | 50 LOC (frontmatter + body) | same |
| T2 catalog total | 700 LOC | `pm_rule_audit` (this skill) |

### Usage

#### A. Full audit (default, advisory included)

```
/palantir-mini:pm-rule-audit
```

Internal call:

```json
{ "includeAdvisory": true }
```

Returns `{ findings: RuleAuditFinding[], summary: { totalFindings, byKind, bySeverity, registeredRules } }`.

#### B. Actionable-only (drop advisory)

```
/palantir-mini:pm-rule-audit strict
```

Internal call:

```json
{ "includeAdvisory": false }
```

Returns only `warn` + `block` findings — these NEED action; advisory are informational.

### Output format

Render as:

```
# Rules Audit — <timestamp>

**Summary**: <totalFindings> findings across <registeredRules> rules
**By severity**: advisory=N, warn=M, block=K
**By kind**: <kind>: <count>, ...

## Findings

### BLOCK
- ruleId=<id>: <detail>  ← fix before next action

### WARN
- ruleId=<id>: <detail> (measured: X, ceiling: Y)

### ADVISORY
- ruleId=<id>: <detail>

## Suggested remediation

<per-finding guidance>
```

### Remediation guidance

Per finding kind:

- `bottleneck:t2-file` → trim rule body; consider splitting into 2 rules if over 50 LOC.
- `bottleneck:t1-file` → move detail from T1 doc to T2 catalog; keep CORE/CONTEXT lean.
- `stale-crossref` → update frontmatter `crossRefs` to remove deleted ruleId, or create a replacement rule.
- `stale-hook-citation` → remove from `hookCitations`, or rename hook to match, or create the cited hook.
- `drift:memory-counter` → update `~/.claude/projects/-home-palantirkc/memory/MEMORY.md` line matching `rules/: N files, ~M lines`.
- `drift:file-count` → reconcile `.claude/rules/*.md` disk vs registered entries; run `bun run .claude/schemas/scripts/gen-rule-registry.ts`.
- `recycled-rule-id` → **hard block**. Never recycle IDs per rule 04 gap precedent; pick next available (currently 19+).

### Event emission

Every invocation emits an `audit_completed` event (5-dim envelope, rule 10) with `payload.audit_kind: "pm-rule-audit"` + finding counts. Lets BackwardProp replay detect when rules drift was flagged historically.

### Ontology citations

- `rules/CONTEXT.md §12 ceilings` — authoritative ceiling values.
- `rules/CONTEXT.md §10 anti-patterns` — what this audit watches for.
- Schemas v1.18.0 `rule.ts` — `RuleAuditFinding` shape.

### §Hook Enforcement Levels (PR-13)

pm-rule-audit scans `hooks/*.ts` for the PR-13 enforcement-level frontmatter comment and reports a histogram:

| Level | Count | Examples |
|-------|-------|----------|
| blocking | 6 | commit-edits-governance, ontology-import-guard, value-grade-assigner, agent-ownership-validate, ontology-domain-classification-validate, semantic-frontmatter-validate |
| scoped-blocking | 2 | pre-delegation-check, pre-edit-impact-mcp-first |
| advisory | 7 | prompt-dtc-enforcement-gate, pre-edit-impact-check, lead-ontology-discovery-completeness, agent-decision-log, harness-worktree-advisory, researcher-citation-precision, lead-git-operation-watch |
| observe | 2 | pre-edit-ontology, concurrency-cap-fix |

Hooks without a frontmatter tag are flagged as `unaudited` and counted separately.

The histogram scan pattern: grep `^//   enforcement:` from each hooks/*.ts; count by level. Future MCP handler bump (post-PR-13) will integrate into `pm_rule_audit` structured output.

### Related

- R3 hooks (shipped v2.24.1) — consolidated `rule-audit` hook (`--mode=bottleneck` at PreCompact + `--mode=drift` at SessionStart + `--mode=citation` at PostToolUse:Edit on hooks/*.ts) automates this audit on a cadence.

---

## Mode: prune — substrate hygiene

### When to use

- Rule 26 substrate health is degrading → run to surface candidates.
- Quarterly substrate housekeeping.
- After session-start advisory `unused_rule_30d` or `staleMemoryFiles` recommendations fire.
- User says "prune rules", "prune memory", "what's stale", "/palantir-mini:pm-rule-memory-prune".

### NOT for

- Active rules with hook citations — those are load-bearing.
- Memory files with mtime < 30 days — too fresh to prune.
- Code cleanup — use `pm_handler_usage_audit` for handler dead-code detection.

### Modes

| Flag | Behavior | Risk |
|------|----------|------|
| `--dry-run` (default) | Print unified candidate list | none |
| `--apply --confirm-prune <id1,id2,...>` | Retire/delete specified candidates | medium — preserves PR history (stub-redirect for rules) |

### How to run

#### Step 1 — Run pm_rule_audit + pm_health_audit(mode='memory-layer') in parallel

```
mcp__plugin_palantir-mini_palantir-mini__pm_rule_audit({ projectRoot: "<project>" })
mcp__plugin_palantir-mini_palantir-mini__pm_health_audit({ mode: "memory-layer", project: "<project>" })
```

(`pm_memory_layer_audit` was consolidated into `pm_health_audit`'s mode router — this is
the corrected live tool name; the underlying implementation is unchanged,
`bridge/handlers/pm-memory-layer-audit.ts`.)

#### Step 2 — Filter to prune candidates

From `pm_rule_audit.findings`:
- Filter `kind === "unused_rule_30d"` → these are rule retirement candidates.

From `pm_health_audit(mode='memory-layer')`:
- Filter `staleMemoryFiles` array → these are memory prune candidates.

#### Step 3 — Render unified table

```markdown
# pm-rule-memory-prune candidates

Project: <project>
Audit window: 30 days (rolling)

## Unused rules (0 hook citations + 0 events.jsonl mentions over 30d)

| Rule ID | Slug | Last Modified | Hook Citations | Action |
|---------|------|---------------|----------------|--------|
| 99 | example-stale-rule | 2026-04-01 (38d ago) | 0 | retire (stub + supersededBy) |

## Stale memory (mtime > 30d)

| Path | Layer | Memory Type | Last Modified | Age | Action |
|------|-------|-------------|----------------|-----|--------|
| `.claude/projects/.../memory/feedback_old.md` | procedural | feedback | 2026-04-01 | 38d | review for prune |
```

#### Step 4 — If `--apply --confirm-prune <ids>`

For each confirmed rule ID:
- Add `supersededBy: <new-id-or-null>` to frontmatter.
- Replace body with stub: `# Rule N — RETIRED <date>` + `Superseded by: rule M (slug)`.
- Re-run `gen-rule-registry` to update generated registry.

For each confirmed memory path:
- Move to `~/.claude/.archive/memory/<YYYY-MM-DD>/<file>.md` (preserves history).
- Update `MEMORY.md` index (remove entry).

#### Step 5 — Surface confirmation

```
Pruned: <N> rules, <M> memory files.
Archive: ~/.claude/.archive/memory/<date>/
Rule registry regenerated: 27 → <N-pruned> rules.
Next: rerun /palantir-mini:pm-rule-audit to confirm 0 unused_rule_30d findings.
```

### Authority + cross-refs

- Rule 26 §Substrate routing — `~/.claude/rules/26-valuable-data-standard.md`.
- W3.A `unused_rule_30d` finding — `bridge/handlers/pm-rule-audit/detect-drift.ts:checkUnusedRules30d`.
- W3.B `staleMemoryFiles` — `bridge/handlers/pm-memory-layer-audit.ts:collectStaleMemoryFiles`.
- Sibling skills: `pm-rule-audit`, `pm-memory-map`.
- CONTEXT.md §6 (rule retirement default path: stub + supersededBy).
