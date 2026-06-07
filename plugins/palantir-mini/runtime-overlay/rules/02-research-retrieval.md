---
ruleId: 2
slug: research-retrieval
scope: global
version: 3.3.0
invariant: "research/ is AI-agent read-only SSoT (BROWSE/INDEX-first retrieval); ~/docs/ is external long-term synthesis (read-only); internal synthesis writes to plans/; skill resolution plugin > user > repo; MEMORY.md is index-only with one-line entries + typed memory files."
supersededBy: null
supersedes: [9]
crossRefs: [01, 07]
hookCitations: []
---

# Rule 02 — Research Retrieval + Skill Resolution + Memory

## §Research retrieval
- `~/.claude/research/` is AI-agent read-only SSoT. BROWSE/INDEX-first. Internal dev synthesis writes to `~/.claude/plans/`, never to `research/`.
- Prefer exact retrieval over broad scanning.

## §Skill resolution
- Priority: plugin-scope > user-scope > repo-scope. Explicit invoke: `/<plugin>:<skill>`.
- Do NOT re-export a skill in multiple scopes — prefer single source of truth.

## §Memory (absorbs 9)
- `MEMORY.md` is an index only; each entry ≤150 chars. Content in typed sibling files.
- Staleness: verify file/function/flag still exists before acting on memory.

## §Authority across runtimes
- `~/docs/` is external long-term synthesis (read-only). Neither Claude nor Codex may mutate it.

## §Version history
- v3.3.0 (2026-06-07): removed plans-index-drift-detect hook section (solo-dev lean).
