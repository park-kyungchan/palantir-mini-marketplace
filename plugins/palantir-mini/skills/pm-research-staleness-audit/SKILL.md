---
name: pm-research-staleness-audit
category: research
surfaceStatus: public-core
description: "Audit research-library MANIFEST.json files for stale entries against their expected..."
allowed-tools: mcp__palantir-mini__research_library_refresh mcp__palantir-mini__emit_event Read Bash
effort: low
disable-model-invocation: false
---

# pm-research-staleness-audit — Manifest-driven research freshness report

## When to use

- Periodically (weekly is the implicit `hot` cadence; monthly for `warm`) before research-heavy work.
- When `research-staleness-check` SessionStart hook surfaces an advisory — the suggestion event names this skill.
- When `/palantir-mini:pm-research-staleness-audit` is invoked or any of these phrases appear: "audit research staleness", "research freshness check", "what research is stale", "research-source-manifest audit".

## NOT for

- Actually re-fetching stale sources — use `/palantir-mini:pm-research-refresh` (this skill is read-only).
- Comparing local mirror vs upstream content drift — use `/palantir-mini:pm-research-diff`.

## Prerequisites

- Schemas v1.39.0+ (ResearchSourceManifest primitive).
- Current official docs manifest plus legacy/canonical manifests:
  - `~/.claude/research/palantir-official/_manifest.json` (warm, 30d; generated official SSoT)
  - `~/.claude/research/palantir-foundry/MANIFEST.json` (legacy hot, 7d)
  - `~/.claude/research/anthropic/MANIFEST.json` (warm, 30d)
  - `~/.claude/research/palantir-vision/aipcon-devcon/MANIFEST.json` (cold, 90d)
  - `~/.claude/research/claude-code/MANIFEST.json` (warm, 30d)
- palantir-mini plugin v4.5.0+ (research-staleness-check hook + this skill).

## How to run

### Step 1 — Audit each library via research_library_refresh dry-run

Invoke calls in parallel:

```
mcp__plugin_palantir-mini_palantir-mini__research_library_refresh({
  libraryRoot: "/home/palantirkc/.claude/research/palantir-official",
  dryRun: true,
  staleThresholdDays: 30
})
```

Repeat for each library with its `staleThresholdDays`:
- palantir-official → 30 (warm; regenerate via importer when stale)
- palantir-foundry → 7 (legacy compatibility)
- anthropic → 30 (warm)
- palantir-vision/aipcon-devcon → 90 (cold)
- claude-code → 30 (warm)

The handler reads `MANIFEST.json` and reports per-source staleness without writing or fetching.

### Step 2 — Render markdown report

Aggregate results into a single report:

```markdown
# Research staleness audit — <ISO date>

| Library | Class | Total | Stale | Stale % |
|---------|-------|------:|------:|--------:|
| palantir-foundry | hot (7d) | N | M | M/N |
| anthropic | warm (30d) | N | M | M/N |
| palantir-vision/aipcon-devcon | cold (90d) | N | M | M/N |
| claude-code | warm (30d) | N | M | M/N |

## Stale sources (top 10)

1. <library>/<mirrorPath> — <daysSinceLastFetch>d / <expectedRefreshDays>d (class=<refreshClass>)
2. ...

## Recommendation

- N sources past hot threshold (>7d): refresh soon via /palantir-mini:pm-research-refresh
- M sources past warm threshold (>30d): schedule refresh this week
- K sources past cold threshold (>90d): annual review candidate
```

### Step 3 — Emit audit completion event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type: "phase_completed",
  payload: {
    phaseTag: "research-staleness-audit",
    taskId: "ad-hoc-or-current-sprint",
    validations: ["library-foundry", "library-anthropic", "library-aipcon-devcon", "library-claude-code"]
  },
  ...withWhat: {
    reasoning: "Manifest-driven staleness audit; <N> stale across 4 libraries",
    memoryLayers: ["semantic", "procedural"]
  }
})
```

## Output

Markdown report (≤80 LOC) to user, with stale entries highlighted + actionable next-step (refresh / review / ignore).

## Authority + cross-refs

- Schema: `~/.claude/schemas/ontology/primitives/research-source-manifest.ts` (v1.39.0+).
- Rule: `~/.claude/rules/02-research-retrieval.md` v3.1.0 §Research retrieval.
- Companion skills: `/palantir-mini:pm-research-refresh` (refresh), `/palantir-mini:pm-research-diff` (drift compare).
- Hook: `~/.claude/plugins/palantir-mini/hooks/research-staleness-check.ts` (SessionStart advisory).
- Plan §3.W1.C — `~/.claude/plans/mossy-mapping-eich.md`.
