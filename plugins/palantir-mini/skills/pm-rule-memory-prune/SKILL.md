---
name: pm-rule-memory-prune
category: maintenance
surfaceStatus: public-core
description: "Unified prune-candidate list combining pm_rule_audit (unused_rule_30d findings) +..."
costClass: free
effort: medium
---

# pm-rule-memory-prune — substrate hygiene skill

## When to use

- Rule 26 substrate health is degrading → run to surface candidates.
- Quarterly substrate housekeeping.
- After session-start advisory `unused_rule_30d` or `staleMemoryFiles` recommendations fire.
- User says "prune rules", "prune memory", "what's stale", "/palantir-mini:pm-rule-memory-prune".

## NOT for

- Active rules with hook citations — those are load-bearing.
- Memory files with mtime < 30 days — too fresh to prune.
- Code cleanup — use `pm_handler_usage_audit` for handler dead-code detection.

## Modes

| Flag | Behavior | Risk |
|------|----------|------|
| `--dry-run` (default) | Print unified candidate list | none |
| `--apply --confirm-prune <id1,id2,...>` | Retire/delete specified candidates | medium — preserves PR history (stub-redirect for rules) |

## How to run

### Step 1 — Run pm_rule_audit + pm_memory_layer_audit in parallel

```
mcp__plugin_palantir-mini_palantir-mini__pm_rule_audit({ projectRoot: "<project>" })
mcp__plugin_palantir-mini_palantir-mini__pm_memory_layer_audit({ project: "<project>" })
```

### Step 2 — Filter to prune candidates

From `pm_rule_audit.findings`:
- Filter `kind === "unused_rule_30d"` → these are rule retirement candidates.

From `pm_memory_layer_audit`:
- Filter `staleMemoryFiles` array → these are memory prune candidates.

### Step 3 — Render unified table

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

### Step 4 — If `--apply --confirm-prune <ids>`

For each confirmed rule ID:
- Add `supersededBy: <new-id-or-null>` to frontmatter.
- Replace body with stub: `# Rule N — RETIRED <date>` + `Superseded by: rule M (slug)`.
- Re-run `gen-rule-registry` to update generated registry.

For each confirmed memory path:
- Move to `~/.claude/.archive/memory/<YYYY-MM-DD>/<file>.md` (preserves history).
- Update `MEMORY.md` index (remove entry).

### Step 5 — Surface confirmation

```
Pruned: <N> rules, <M> memory files.
Archive: ~/.claude/.archive/memory/<date>/
Rule registry regenerated: 27 → <N-pruned> rules.
Next: rerun /palantir-mini:pm-rule-audit to confirm 0 unused_rule_30d findings.
```

## Authority + cross-refs

- Rule 26 §Substrate routing — `~/.claude/rules/26-valuable-data-standard.md`.
- W3.A `unused_rule_30d` finding — `bridge/handlers/pm-rule-audit/detect-drift.ts:checkUnusedRules30d`.
- W3.B `staleMemoryFiles` — `bridge/handlers/pm-memory-layer-audit.ts:collectStaleMemoryFiles`.
- Sibling skills: `pm-rule-audit`, `pm-memory-map`.
- CONTEXT.md §6 (rule retirement default path: stub + supersededBy).
