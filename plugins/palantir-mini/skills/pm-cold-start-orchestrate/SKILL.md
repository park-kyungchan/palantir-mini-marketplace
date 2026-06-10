---
name: pm-cold-start-orchestrate
category: core-workflow
surfaceStatus: public-core
description: "Auto-fired at SessionStart (via cold-start-browse-index-loader hook) — deep-injects..."
allowed-tools: mcp__palantir-mini__research_library_refresh mcp__palantir-mini__emit_event Read Bash
effort: high
disable-model-invocation: false
---

# pm-cold-start-orchestrate — Deep canonical source injection

## When to use

- **Auto-trigger**: `cold-start-browse-index-loader` SessionStart hook fires this skill automatically at each new session start (W2.B companion).
- **Manual invocation**: `/palantir-mini:pm-cold-start-orchestrate` — re-injection mid-session when research context feels stale or truncated.
- **Phrase triggers**: "cold start", "deep injection", "orchestrate cold start", "inject canonical sources", "reload research context", "fresh context load".
- **After `/clear`**: context compacted — call this to restore canonical research surface.

## NOT for

- Re-fetching or updating stale source content — use `/palantir-mini:pm-research refresh`.
- Producing a session state recap — use `/palantir-mini:pm-recap`.
- Auditing staleness percentages — use `/palantir-mini:pm-research audit`.

## How it works

Four sequential phases. Phases 1-2 are read-only. Phase 3 is a dry-run audit. Phase 4 emits lineage.

### Phase 1 — Top-level routers

Read the two global routing files that determine which evidence files to consult:

```
Read({ file_path: "/home/palantirkc/.claude/research/BROWSE.md" })
Read({ file_path: "/home/palantirkc/.claude/research/INDEX.md" })
```

These files declare the minimal read-set for any research query. They are the canonical entry points per rule 02 §Research retrieval ("BROWSE.md chooses the minimal read set; INDEX.md explains structure + provenance + authority boundaries").

### Phase 2 — Per-subdir BROWSE.md injection

Read sub-directory routing files in parallel for the 4 research subdirectories:

```
Read({ file_path: "/home/palantirkc/.claude/research/anthropic/BROWSE.md" })
Read({ file_path: "/home/palantirkc/.claude/research/palantir-foundry/BROWSE.md" })
Read({ file_path: "/home/palantirkc/.claude/research/palantir-vision/aipcon-devcon/BROWSE.md" })
Read({ file_path: "/home/palantirkc/.claude/research/claude-code/BROWSE.md" })
```

**Palantir 1차 자료 (5 canonical files)**:
- `palantir-foundry/aip/blog-connecting-agents-2026-04-29.md` — Decision Lineage + 4 agentic memory categories
- `palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` — 5-evaluator taxonomy
- `palantir-foundry/aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md` — Agentic runtime security
- `palantir-vision/aipcon-devcon/devcon.md` — DC5-02 §3 conditions for human-agent leverage
- `palantir-vision/aipcon-devcon/blog-connecting-agents-2026-04-29.md` — Vision synthesis

**ClaudeCodeNativeRuntime 1차 자료 (3 canonical files)**:
- `anthropic/lance-martin-scaling-managed-agents-2026-04-08.md` — Harness genus + Brain/Hands/Session layer model
- `anthropic/prithvi-rajasekaran-harness-design-2026-03-24.md` — 3-agent harness pattern
- `anthropic/justin-young-effective-harnesses-2025-11-26.md` — Long-running agent harness design

**Claude Code reference (2 files)**:
- `claude-code/BROWSE.md` — Claude Code capability routing
- `~/.claude/research/BROWSE.md` — top-level already read in Phase 1

### Phase 3 — Research staleness audit (dry-run)

Run 4 parallel dry-run refresh calls — read-only, no fetching:

```
mcp__plugin_palantir-mini_palantir-mini__research_library_refresh({
  libraryRoot: "/home/palantirkc/.claude/research/palantir-foundry",
  dryRun: true,
  staleThresholdDays: 7
})
mcp__plugin_palantir-mini_palantir-mini__research_library_refresh({
  libraryRoot: "/home/palantirkc/.claude/research/anthropic",
  dryRun: true,
  staleThresholdDays: 30
})
mcp__plugin_palantir-mini_palantir-mini__research_library_refresh({
  libraryRoot: "/home/palantirkc/.claude/research/palantir-vision/aipcon-devcon",
  dryRun: true,
  staleThresholdDays: 90
})
mcp__plugin_palantir-mini_palantir-mini__research_library_refresh({
  libraryRoot: "/home/palantirkc/.claude/research/claude-code",
  dryRun: true,
  staleThresholdDays: 30
})
```

Flag any library with stale entries in the output report. Do NOT block injection on staleness — surface it as advisory only.

### Phase 4 — Emit lineage event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type: "cold_start_deep_injected",
  payload: {
    phaseTag: "cold-start-deep-injection",
    injectedSources: {
      topLevelRouters: 2,
      subdirBrowse: 4,
      palantir1차: 5,
      claudeCodeNativeRuntime1차: 3,
      claudeCodeRef: 2
    },
    stalenessFlags: ["<library-name>/<mirrorPath> if stale, else none"],
    triggeredBy: "auto-hook | manual-invocation"
  },
  withWhat: {
    reasoning: "Cold-start deep injection complete; canonical sources injected into Lead context per user directive #10a",
    hypothesis: "Lead context now contains full canonical source surface; no manual research prompts needed this session",
    memoryLayers: ["procedural", "semantic"]
  }
})
```

## MCP calls summary

| Phase | Call | Mode |
|-------|------|------|
| 1 | `Read` × 2 (BROWSE.md + INDEX.md) | read-only |
| 2 | `Read` × 4 (per-subdir BROWSE.md) | read-only, parallel |
| 3 | `research_library_refresh` × 4 | dryRun=true, parallel |
| 4 | `emit_event` (cold_start_deep_injected) | append-only |

## Output

Markdown report (≤80 LOC) rendered to the user:

```markdown
# Cold-start injection — <ISO date>

## Injected sources

| Category | Files read |
|----------|------------|
| Top-level routers (BROWSE + INDEX) | 2 |
| Per-subdir BROWSE.md | 4 |
| Palantir 1차 자료 | 5 |
| ClaudeCodeNativeRuntime 1차 자료 | 3 |
| Claude Code reference | 2 |

**Total**: 16 canonical source files injected.

## Staleness flags

- <library>/<mirrorPath> — <N>d past <threshold>d threshold (class=<hot|warm|cold>)
- (none if all fresh)

## Context status

Lead context loaded with full canonical source surface.
Reminder: re-run `/palantir-mini:pm-cold-start-orchestrate` after `/clear` to restore.
```

## Authority + cross-refs

- Rule 02 v3.1.0 §Research retrieval — BROWSE.md-first minimal read set; `research/` AI-agent read-only SSoT.
- Rule 26 v1.0.0 §Axis A3 (evidence-cited) — canonical source injection satisfies A3 for subsequent emit events.
- `~/.claude/rules/CONTEXT.md §15 Glossary` — harness taxonomy; Palantir 1차 자료 source list.
- Companion: `cold-start-browse-index-loader.ts` hook (W2.B) — auto-fires this skill at SessionStart.
- Companion: `CanonicalSourceRegistry` schema primitive (W2.C) — typed registry that governs which files Phase 2 reads.
- Companion skill: `/palantir-mini:pm-research audit` — deeper staleness report with per-source table.
- Plan §3 Wave 2 W2.A — `~/.claude/plans/vast-giggling-mccarthy.md`.

## Memory layer declaration

- **procedural (E4)**: Skill body is a procedural artifact — refines Lead's executable cold-start workflow.
- **semantic (E3)**: Skill description encodes typed knowledge (trigger phrases, canonical file paths, MCP call shape).
