# Claude Code Research — Query Interface

Question-first retrieval surface for Claude-native capabilities.

Open this only when the question is about Claude Code features, hooks, agents, memory, scheduling, or Managed Agents. This directory is Claude capability evidence. It does not override project-local semantic authority.

## Role Split
- `BROWSE.md` chooses the smallest Claude-native read set for a concrete question.
- `INDEX.md` explains structure, provenance, scope, and authority boundaries.
- Project `BROWSE.md`, `INDEX.md`, ontology docs, and tests still own project semantics.

## Pure Claude Code Evidence (cc-evidence / cc-mixed)

Canonical Claude Code / Anthropic feature evidence. Internal palantir-mini interpretation sits in mixed halves of some files (marked `cc-mixed`); adhere to §Boundary Rules.

| Question | Open First | Class |
|----------|------------|-------|
| What feature or syntax does Claude Code support? | `features.md` (v2.1.113 baseline) | cc-mixed |
| What hook events exist in Claude Code v2.1.110+? | `hook-events-v2.md` | cc-mixed |
| How do plugin manifests work? | `plugin-system.md` | cc-mixed |
| How should I register an MCP server? | `mcp-server-registration.md` | cc-mixed |
| What is Managed Agents and how is it different from CC local agents? | `managed-agents.md` | cc-evidence |
| How should hooks, rules, memory, and custom agents be designed? | `agent-system-design.md` | cc-mixed |
| What is the ontology impact graph and how does it work? | `context-engineering.md` | cc-mixed |
| What monitors manifest schema does CC support? | `monitors-manifest-schema.md` | cc-mixed |
| What `additionalContext` / `permissionDecision` / `updatedInput` shapes does the hook protocol allow? | `features.md` §Hook output protocol | cc-mixed |
| Which CC version added `if` field / `permissionDecision: "defer"` / `updatedInput`? | `features.md` Version History (v2.1.85 / v2.1.89 / v2.1.91) | cc-evidence |
| How do UserPromptSubmit + SessionStart hooks compose `additionalContext`? | `hook-events-v2.md` + `agent-system-design.md` | cc-mixed |

## Legacy purged 2026-04-29

11 legacy-internal palantir-mini synthesis files (palantir-mini-blueprint / lead-system-v2 / harness-h3-retrospective / etc.) removed. Active palantir-mini synthesis lives in `~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md`.

## Working Rules
- If the question is about CC features, hooks, memory, rules, or tools, start with `features.md`.
- If the question is about hook enforcement or custom-agent design, start with `agent-system-design.md`.
- If the question is about the ontology impact graph, ImpactEdge, AST walker, or SQLite cache architecture, start with `context-engineering.md`.
- If the question is about cloud-hosted agent products, start with `managed-agents.md`.
- For palantir-mini infra direction (Lead Protocol v2 / harness improvements / 9-defect taxonomy / project-specific gaps) → `~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md`.
- Promote durable conclusions into project docs, settings, rules, hooks, tests, or code.

## Manifest substrate (2026-05-06 W1.C SSoT-9)

- This directory's `MANIFEST.json` declares 8 sources at `refreshClass=warm` (30d) — Claude Code feature pages + Anthropic engineering docs.
- Audit via `/palantir-mini:pm-research-staleness-audit` (wraps `mcp__palantir-mini__research_library_refresh dryRun=true`).
- SessionStart hook `research-staleness-check` auto-flags entries past `lastFetchedAt + expectedRefreshDays` and emits `skill_invocation_suggested` envelope (rule 02 §Research retrieval + rule 26 §Axis A3).
- When a Claude Code release lands (e.g., v2.1.115+), bump `lastFetchedAt` on affected MANIFEST entries via `pm-research-refresh` to clear staleness.

## Known limitation 2026-05-08 — CronCreate durable flag ignored

CC v2.1.132 silently ignores `CronCreate({durable:true})` — registered cron entries persist for the current session only and are discarded on session end, regardless of the `durable` flag value.

**Workaround**: `palantir-mini/hooks/harness-cron-auto-register.ts` (SessionStart async advisory hook) re-registers the weekly substrate audit cron on every session start if CronList does not already contain a matching entry. This is a temporary workaround until upstream CC fixes the `durable:true` behavior.

**To file upstream issue**: Check the Claude Code GitHub repo (`anthropics/claude-code`) for an open issue tracker when it becomes publicly available. Track the fix in `~/.claude/research/claude-code/MANIFEST.json` under the scheduling feature entry.
