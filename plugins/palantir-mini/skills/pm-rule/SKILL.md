---
name: pm-rule
category: delete-candidate
surfaceStatus: deprecated-candidate
description: "Fetch or enumerate Claude-local overlay rules from ~/.claude/rules/ via..."
allowed-tools: mcp__palantir-mini__pm_rule_query
effort: low
disable-model-invocation: false
---

# pm-rule — on-demand rule retrieval

## When to use

- User asks about a specific numbered rule — "what's rule 08?", "show me rule 10", "rule 27 detail".
- Hook blocking message cites a rule number and you need the full text.
- Cold-start discovery — "what rules do we have?" → call `pm_rule_query` with no discriminators (list mode).
- Keyword search across rule bodies — "any rule about events.jsonl?" → search mode.
- Investigating a rule's hook citations or cross-refs.

## What this does

Wraps the consolidated `pm_rule_query` MCP handler (plugin v2.26.0 — D9 consolidation; replaces v2.2.0–v2.25.x trio of `pm_rule_get` + `pm_rule_list` + `pm_rule_search`). One handler, three modes selected by argument discriminator:

| Mode | Trigger | Use when |
|------|---------|----------|
| `get` | `byId: 10` OR `bySlug: "events-jsonl"` | User asks about specific rule |
| `search` | `byQuery: "events.jsonl"` | Keyword scan across invariants + bodies |
| `list` | no discriminators | Discovery / cold-start / audit |

Result is mode-discriminated — switch on `result.mode` to handle each shape.

## Usage

### A. Fetch one rule by ID or slug (get mode)

```
/palantir-mini:pm-rule 10
/palantir-mini:pm-rule events-jsonl
```

Internal call:

```json
{
  "byId": 10,
  "withFollow": true,
  "withContext": false
}
```

Response includes:
- `mode: "get"`
- `rule` — full `RuleDeclaration` (frontmatter fields).
- `body` — rule markdown content.
- `followedFrom` (optional) — set when auto-followed through `supersededBy` or `scopeMigratedTo`.
- `contextRules` (optional, when `withContext: true`) — crossRef neighbors' invariants.

### B. List rules (discovery — list mode)

```
/palantir-mini:pm-rule list
/palantir-mini:pm-rule list compact
/palantir-mini:pm-rule list scope:project:your-project
```

Internal call for compact discovery:

```json
{
  "compact": true,
  "includeRetired": false
}
```

Response:
- `mode: "list"`
- `count` — number of returned entries
- `entries` — `{ ruleId, slug, invariant }[]` when `compact: true`, else full `RuleDeclaration[]`
- `totalRegistered` — total registry size

### C. Keyword search (search mode)

```
/palantir-mini:pm-rule search "events.jsonl"
```

Internal call:

```json
{
  "byQuery": "events.jsonl",
  "limit": 10
}
```

Response:
- `mode: "search"`
- `query` — echoed query string
- `count` — number of returned hits (after limit)
- `hits` — `{ ruleId, slug, scope, matchedIn, snippet, score }[]` ranked by score (invariant matches weighted 2× over body)

## Output format

For `get` mode: render as

```
# Rule <ruleId> — <slug>

**Invariant**: <invariant>
**Scope**: <scope>
**Version**: <version>
**Cross-refs**: <crossRefs>

<body>
```

For `list` mode (compact): render as a table —

| ID | Slug | Invariant |
|----|------|-----------|
| 10 | events-jsonl | events.jsonl is append-only; every edit emits a 5-dim event... |

For `search` mode: render as ranked list of hits with snippet.

## Failure modes

- `pm_rule_query: rule not found` (get mode) — user cited a non-existent rule ID or slug; suggest `pm_rule_query` list mode for discovery.
- `pm_rule_query: at most ONE of { byId, bySlug, byQuery } may be set` — caller passed multiple discriminators; keep exactly one of `byId`, `bySlug`, or `byQuery`, or omit all three for list mode.
- `pm_rule_query: byQuery must be non-empty for search mode` — caller selected search mode with an empty query; provide a keyword string or omit `byQuery` for list mode.
- Body file missing — rare; indicates codegen drift (run `bun run .claude/schemas/scripts/gen-rule-registry.ts` to regenerate).
- Scope migrated but target not found — rare; follow links stop at first unresolvable step.

## Ontology citations

- `rules/CONTEXT.md §8.1` — MCP handler contracts.
- `rules/CORE.md` — invariant distillation; cites `pm_rule_query` for detail.
- `rules/BROWSE.md` — query router; users graduate from BROWSE to this skill when they need the actual body.
- Schemas v1.18.0 `rule.ts` — RuleDeclaration + RuleRegistry primitive.

## Related

- Blueprint: `~/.claude/plans/2026-04-22-rules-redesign-blueprint.md` (merged).
- R1: 17 rules slimmed + frontmatter added + scope migrations (PR #126, merged).
- R2a: Rule primitive (PR #129, merged).
- R2b: codegen + handlers + this skill (merged v2.2.0).
- R2c (shipped v2.2.1): `pm_rule_search` + `pm_rule_audit` handlers + `/pm-rule-audit` skill.
- R3 (shipped v2.24.1): hook inlining of excerpts + consolidated `rule-audit` hook (`--mode={bottleneck|drift|citation}` dispatch).
- D9 (shipped v2.26.0): `pm_rule_query` consolidation — `pm_rule_get` + `pm_rule_list` + `pm_rule_search` retired; this skill rewrapped.
