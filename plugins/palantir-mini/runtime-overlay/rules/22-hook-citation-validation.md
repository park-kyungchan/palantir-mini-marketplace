---
ruleId: 22
slug: hook-citation-validation
scope: global
version: 1.0.0
invariant: "Every 'rule NN' or 'rule NN (slug)' citation in a hook source file must reference an active rule; stale citations to retired or non-existent rule IDs are a blocking defect."
supersededBy: null
supersedes: []
crossRefs: [7, 10]
hookCitations: []
bodyLocCeiling: 30
---

# Rule 22 — Hook Citation Validation

Hook blocking messages cite specific rule numbers (CONTEXT.md §8.2). When a rule retires or its ID changes, any hook still citing the old number gives agents a dead reference — defeating the inline-invariant pattern entirely.

## §Validation trigger

- `rule-citation-validate` hook fires PostToolUse:Edit on `hooks/*.ts` files.
- Scans for patterns `rule \d+`, `rule \d+ \(`, `byId: \d+` in modified hook source.
- Each extracted rule ID validated against live rule registry (active set per CORE.md).
- Stale citation → emit `rule_citation_stale` event + block commit with actionable message.

## §MCP handler

- `validate_hook_citations` (W6 P4.1): standalone audit across all hook files.
- Returns `{ staleCount, staleRefs: [{ file, line, ruleId, reason }] }`.
- Run via `/palantir-mini:pm-rule-audit` (already chains this handler).

## §Fix protocol

- On stale citation: update hook source to the replacement rule ID (per `supersededBy` pointer).
- On retired rule with no replacement: remove the citation and inline the invariant text verbatim.
- NEVER leave a citation to a permanent-gap ID (03, 04, 05, 06, 09, 11, 13, 14, 15, 17, 18).
