---
name: pm-research
category: research
surfaceStatus: public-core
description: "Research-library lifecycle — diff (local vs upstream drift) | refresh (manifest-backed re-fetch) | audit (manifest staleness report) modes."
allowed-tools: mcp__palantir-mini__research_context_select mcp__palantir-mini__research_library_refresh mcp__palantir-mini__emit_event Read Bash
effort: medium
disable-model-invocation: false
---

# pm-research — Research library lifecycle (diff | refresh | audit)

One skill, three modes selected by the first argument:

| Mode | Trigger | Use when |
|------|---------|----------|
| `diff` | `/palantir-mini:pm-research diff [<entry-key>]` | Show drift between local mirror and upstream sources (read-only) |
| `refresh` | `/palantir-mini:pm-research refresh [<libraryRoot|source>]` | Audit + re-fetch manifest-backed libraries |
| `audit` | `/palantir-mini:pm-research audit` | Manifest-driven staleness report across all libraries (read-only) |

Pick `diff` before deciding whether to `refresh`; pick `audit` for a periodic freshness sweep.

---

## Mode: diff — drift between local library and upstream sources

### When to use

- User asks "what changed in the library", "is the research stale", or invokes `/palantir-mini:pm-research diff`.
- Before deciding whether to `refresh` — diff first, then decide.
- After an upstream release to assess impact before committing to a full refresh.

### What it does

Invokes `mcp__palantir-mini__research_library_refresh` with `dryRun: true` which:
1. Reads the declared source URL(s) for each library entry.
2. Fetches current upstream content (read-only; does NOT write locally).
3. Produces a structured diff: sections added, removed, or modified.
4. Reports `fetchedAt` age and byte delta per entry.
5. Emits a `research_diff_completed` event with entry count and drift summary.

```
mcp__palantir-mini__research_library_refresh({
  dryRun: true,
  entries: ["<entry-key>"]         // omit to diff all tracked entries
})
```

### Output

```
# research-diff — <entry-key>
fetchedAt: 2026-04-10T08:00Z  (10 days ago)
upstream bytes: 12,400  local bytes: 11,800  delta: +600

## Added sections (N)
- §3.2 New parameter: actionTypeRid

## Removed sections (M)
- §1.4 Deprecated: legacyMode flag

## Modified sections (K)
- §2.1 Example updated (diff: +3/-1 lines)
```

Success: output is read-only (no local file modified); all tracked entries reported (or the filtered set); `research_diff_completed` event in `events.jsonl`.

---

## Mode: refresh — research library lifecycle orchestration

### When to use

- A research file is suspected stale (source doc updated upstream).
- User says "refresh research", "re-fetch docs", "update library", "sync library".
- After a major upstream release where fetched docs may have changed.
- Proactively before a research-heavy session when library freshness is uncertain.

### What it orchestrates

Current exposed MCP surface:

0. **`research_context_select`** — minimal context-injection router. Given a task query, returns only the necessary research/schema read set plus latest watch targets. Use before broad research reads whenever the task is about Palantir AIP/Foundry, Claude capability facts, skills, or interaction. Fresh-process fallback if the tool is not yet reloaded:
   `bun -e 'import select from "/home/palantirkc/.claude/plugins/palantir-mini/bridge/handlers/research-context-select.ts"; console.log(JSON.stringify(await select({ query: process.argv.slice(1).join(" "), topic: "palantir-official", includeSchemas: true, includeLatestWatch: true }), null, 2));' -- "<task query>"`.
1. **`research_library_refresh`** — reads `_manifest.json`, accepts both `docs[]` and legacy `entries[]`, identifies stale entries using `lastVerified` / legacy `fetched`, supports `dryRun`, and emits `learning_captured` events only on non-dry-run stale entries.
2. Compatibility input: callers may pass `libraryRoot` (preferred) or `source` (`palantir-official`, `palantir-foundry`, `claude-code`, `palantir-vision`, `interaction`, `skills`, `all`).
3. Non-dry-run fetch is best-effort and only uses manifest entries that provide a direct `url` field. Legacy `source` URLs are provenance, not automatically safe markdown fetch targets.

Event lineage emitted: `learning_captured` (one per stale doc on non-dry-run refresh). Dry-run emits no events and writes no files.

### Flow

**Phase 0 — Minimal context selection**

```
mcp__palantir-mini__research_context_select({
  query: "<user task>", topic: "palantir-official",
  maxFiles: 12, includeSchemas: true, includeLatestWatch: true
})
```

Read only the returned files unless a selected file explicitly routes to a more precise child. Do not inject whole research/schema directories.

**Phase A — Staleness preview (recommended first)**

```
mcp__palantir-mini__research_library_refresh({
  libraryRoot: "~/.claude/research/palantir-official/",
  staleThresholdDays: 30, dryRun: true, agentName: "pm-research"
})
```

Surface `totalDocs`, `staleDocs`, `wouldRefresh`, `manifestMissing`, and per-doc preview rows.

**Phase B — Refresh (only after preview is acceptable)**

```
mcp__palantir-mini__research_library_refresh({
  libraryRoot: "<target library root>",
  staleThresholdDays: 30, dryRun: false, agentName: "pm-research"
})
```

If `_manifest.json` is absent the handler returns `manifestMissing: true` — surface as "pm-research-index has not run yet for this library; refresh blocked." Do not run non-dry refresh blindly on official web docs; legacy `entries[]` `source` URLs are provenance, not guaranteed direct fetch targets.

### Inputs

- `$ARGUMENTS` — optional library root path or source selector. Prefer an explicit `libraryRoot`. Accepts `"all"` to iterate top-level library dirs and surface a combined dry-run summary first.

### Failure modes surfaced to the user

| Symptom | Likely cause | Remediation |
|---------|--------------|-------------|
| `manifestMissing: true` | `_manifest.json` not generated yet | Run pm-research-index or hand-author a stub manifest |
| `missing 'docs' or legacy 'entries' array` | Manifest shape neither current nor legacy | Regenerate or repair `_manifest.json` |
| `errors > 0` on non-dry-run | Best-effort direct fetch failed | Re-run dry-run; inspect `url` entries; avoid treating provenance `source` as direct markdown |
| Too many stale docs | `lastVerified` / legacy `fetched` dates old | Use `dryRun: true` first; narrow via smaller libraryRoot |

---

## Mode: audit — manifest-driven research freshness report

### When to use

- Periodically (weekly `hot` cadence; monthly `warm`) before research-heavy work.
- When the `research-staleness-check` SessionStart hook surfaces an advisory.
- Phrases: "audit research staleness", "research freshness check", "what research is stale".

NOT for re-fetching (use `refresh`) or upstream content drift (use `diff`).

### How to run

**Step 1 — Audit each library via `research_library_refresh` dry-run** (parallel):

```
mcp__palantir-mini__research_library_refresh({
  libraryRoot: "/home/palantirkc/.claude/research/palantir-official",
  dryRun: true, staleThresholdDays: 30
})
```

Repeat per library with its `staleThresholdDays`:
- palantir-official → 30 (warm; regenerate via importer when stale)
- palantir-foundry → 7 (legacy hot)
- anthropic → 30 (warm)
- palantir-vision/aipcon-devcon → 90 (cold)
- claude-code → 30 (warm)

The handler reads `MANIFEST.json` and reports per-source staleness without writing or fetching.

**Step 2 — Render markdown report**

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

## Recommendation
- N sources past hot threshold (>7d): refresh soon via `/palantir-mini:pm-research refresh`
- M sources past warm threshold (>30d): schedule refresh this week
- K sources past cold threshold (>90d): annual review candidate
```

**Step 3 — Emit audit completion event**

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "research-staleness-audit", taskId: "ad-hoc-or-current-sprint", validations: ["library-foundry", "library-anthropic", "library-aipcon-devcon", "library-claude-code"] },
  withWhat: { reasoning: "Manifest-driven staleness audit; <N> stale across libraries", memoryLayers: ["semantic", "procedural"] }
})
```

---

## Palantir latest-signal cadence

- Weekly or before Palantir-heavy work: inspect official Foundry announcements, Palantir blog/newsroom, and official `@PalantirTech` X.
- Treat `research_context_select.currentnessNotes` as the first context guard: future DevCon/AIPCon names are watch targets until an official source is captured.
- Monthly: `research_library_refresh({ source: "all", dryRun: true })`; treat `manifestMissingCount` + `staleUnfetchableDocs` as action items.
- Promote only verified deltas through research → schemas → shared-core → project ontology/runtime, then emit a lineage event explaining the change.

## Rule citations

- `rules/02-research-retrieval.md` — BROWSE/INDEX-first retrieval; exact retrieval over broad scanning; diff/refresh keep the library authoritative.
- `rules/07-plugins-and-mcp.md` — plugin manifest + MCP handler ownership.
- `rules/10-events-jsonl.md` — diff/refresh/audit emit append-only 5-dim events; never mutate the log or library files outside the declared write path.

## Authority + cross-refs

- Schema: `~/.claude/schemas/ontology/primitives/research-source-manifest.ts` (v1.39.0+), `research-document.ts` (RID brand + Declaration shape).
- Handlers: `bridge/handlers/research-library-diff.ts`, `research-library-refresh.ts`, `research-context-select.ts`.
- Manifest generation: `pm-research-index` skill writes the `_manifest.json` this orchestration consumes.
- Hook: `~/.claude/plugins/palantir-mini/hooks/research-staleness-check.ts` (SessionStart advisory).
- Research library BROWSE route: `~/.claude/research/BROWSE.md` (query-first router).
- Plan §3.W1.C — `~/.claude/plans/mossy-mapping-eich.md`.

## Memory layer declaration

`semantic` (typed library structure) + `procedural` (lifecycle orchestration).
