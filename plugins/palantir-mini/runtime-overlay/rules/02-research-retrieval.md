---
ruleId: 2
slug: research-retrieval
scope: global
version: 3.2.0
tier: T2
invariant: "research/ is AI-agent read-only SSoT (BROWSE/INDEX-first retrieval); ~/docs/ is external long-term synthesis (read-only); internal synthesis writes to plans/; skill resolution plugin > user > repo; MEMORY.md is index-only with one-line entries + typed memory files; plans-index-drift-detect advisory fires SessionStart when plans/BROWSE.md drifts from filesystem."
supersededBy: null
supersedes: [9]
crossRefs: [01, 07]
hookCitations: [plans-index-drift-detect]
---

# Rule 02 — Research Retrieval + Skill Resolution + Memory

Consolidation per harness-base-mode blueprint §12 license (2026-04-29) — absorbs rule 09 (memory-schema). Memory discipline is paired with research/skill retrieval since both govern how Claude finds the smallest trustworthy read set.

## §Research retrieval

- `~/.claude/research/` is **AI-agent read-only SSoT**. Agents MUST NOT mutate evidence bodies. Only `BROWSE.md`/`INDEX.md` may be updated for navigation/policy corrections.
- Internal palantir-mini dev synthesis (retrospectives, blueprints, gap analyses, decision records, cost logs, canary run reports, review prompts, direction docs) writes to `~/.claude/plans/`, never to `research/`.
- If project-local `BROWSE.md` / `INDEX.md` exist, use them first. `BROWSE.md` chooses the minimal read set; `INDEX.md` explains structure + provenance + authority boundaries.
- Prefer exact retrieval over broad scanning. Use research to support semantic decisions, not to bypass project authority.

## §Skill resolution

- When multiple skills match a user utterance: **plugin-scope** > **user-scope** (`~/.claude/skills/`) > **repo-scope** (`<project>/.claude/skills/`).
- Override: user may invoke a skill explicitly via `/<plugin-name>:<skill-name>` form.
- During deprecation windows, user-scope skills with `deprecated: true` frontmatter delegate to the plugin version.
- Do NOT re-export a skill in multiple scopes unless deprecation window is active — prefer single source of truth.

## §Memory (absorbs 9)

- `MEMORY.md` is an index, not memory itself. Each entry is one line under ~150 characters — `- [Title](file.md) — one-line hook`.
- Memory content lives in separate files (types: `user`, `feedback`, `project`, `reference`) with frontmatter (`name`, `description`, `type`).
- When a memory could apply across ≥2 projects, promote the canonical version to `~/.claude/rules/` or shared docs and keep a short reference stub in each project's MEMORY.
- Staleness: before acting on a memory that names a specific file, function, or flag, verify it still exists — memory is frozen in time. Trust observed code over recalled memory when they conflict.

## §Authority across runtimes

- `~/docs/` is the **external long-term synthesis** layer: MYP math guides + `browse-index-standard.md` + `research-synthesis/` (8 files migrated 2026-05-01 from `palantir-vision/synthesis/`). Read-only for both humans and AI agents. NOT under `research/` AI-agent SSoT.
- Both Claude and Codex runtimes may read `~/docs/`; neither may mutate it.

## §Plans index drift detection (v3.2.0)

- `~/.claude/plans/` accumulates development records over multiple sprints (retrospectives, blueprints, gap analyses, decision records). Retrieval discipline depends on `plans/BROWSE.md` staying in sync with the filesystem.
- `plans-index-drift-detect` SessionStart advisory: compares `ls ~/.claude/plans/*.md` filesystem listing against entries in `~/.claude/plans/BROWSE.md`. Surfaces unindexed files as advisory (not blocking). Hook stub: `/home/palantirkc/palantir-mini/hooks/plans-index-drift-detect.ts`.
- Advisory output: lists files present on disk but absent from BROWSE.md, and BROWSE.md entries pointing to non-existent files (stale refs). Does NOT auto-update BROWSE.md — that requires Lead judgment.
- Rationale (R6-F18): plans/ is growth-only; index drift is silent and degrades cold-start retrieval quality over time.

## §Version history

- v3.2.0 (2026-05-09, sprint-060 W2.4): §Plans index drift detection + plans-index-drift-detect hookCitation; closes R6-F18.
- v3.1.0 (2026-04-29): absorbs rule 09 (memory-schema).
