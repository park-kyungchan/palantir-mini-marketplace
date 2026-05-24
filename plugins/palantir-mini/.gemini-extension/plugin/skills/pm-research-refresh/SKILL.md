---
name: pm-research-refresh
category: research
description: "Audit and refresh manifest-backed palantir-mini research libraries through the research_library_refresh MCP bridge. Supports canonical libraryRoot calls plus compatibility..."
allowed-tools: mcp__palantir-mini__research_context_select mcp__palantir-mini__research_library_refresh mcp__palantir-mini__emit_event
effort: medium
disable-model-invocation: false
---

# pm-research-refresh — Research library lifecycle orchestration

## When to use

- A research file is suspected stale (source doc has been updated upstream).
- User says "refresh research", "re-fetch docs", "update library", "sync library", "audit research", "check library drift".
- After a major upstream release where fetched docs may have changed.
- Proactively before a research-heavy session when library freshness is uncertain.
- On any session where `/palantir-mini:pm-research-refresh` is invoked.

## What this orchestrates

Current exposed MCP surface:

0. **`research_context_select`** — minimal context-injection router. Given a
   task query, returns only the necessary research/schema read set plus latest
   watch targets. Use before broad research reads whenever the task is about
   Palantir AIP/Foundry, Claude capability facts, skills, or interaction.
   If a current runtime has not reloaded the MCP server and the tool is not
   exposed yet, use a fresh-process fallback and record the runtime gap:
   `bun -e 'import select from "/home/palantirkc/.claude/plugins/palantir-mini/bridge/handlers/research-context-select.ts"; console.log(JSON.stringify(await select({ query: process.argv.slice(1).join(" "), topic: "palantir-official", includeSchemas: true, includeLatestWatch: true }), null, 2));' -- "<task query>"`.
1. **`research_library_refresh`** — reads `_manifest.json`, accepts both `docs[]` and legacy `entries[]`, identifies stale entries using `lastVerified` / legacy `fetched`, supports `dryRun`, and emits `learning_captured` events only on non-dry-run stale entries.
2. Compatibility input: callers may pass either `libraryRoot` (preferred) or `source` (`palantir-official`, `palantir-foundry`, `claude-code`, `palantir-vision`, `interaction`, `skills`, `all`).
3. Non-dry-run fetch is best-effort and only uses manifest entries that provide a direct `url` field. Legacy `source` URLs are provenance, not automatically treated as safe markdown fetch targets.

Planned but not currently exposed through this MCP surface:

- `research_library_diff` — structural diff.
- `research_library_prune` — archive/move stale or uncited docs.

Event lineage emitted by the exposed handler:

- `learning_captured` — one per stale doc on non-dry-run refresh.
- Dry-run emits no events and writes no files.

## Flow

### Phase 0 — Minimal context selection

```
mcp__palantir-mini__research_context_select({
  query: "<user task>",
  topic: "palantir-official",
  maxFiles: 12,
  includeSchemas: true,
  includeLatestWatch: true
})
```

Read only the returned files unless the selected file explicitly routes to a
more precise child. Do not inject whole research/schema directories.

### Phase A — Staleness preview (recommended first)

```
mcp__palantir-mini__research_library_refresh({
  libraryRoot: "~/.claude/research/palantir-official/",
  staleThresholdDays: 30,
  dryRun: true,
  agentName: "pm-research-refresh"
})
```

Output surface to the user — `totalDocs`, `staleDocs`, `wouldRefresh`, `manifestMissing`, and per-doc preview rows.

Compatibility selector form:

```
mcp__palantir-mini__research_library_refresh({
  source: "palantir-official",
  dryRun: true,
  agentName: "pm-research-refresh"
})
```

### Phase B — Refresh (only after preview is acceptable)

```
mcp__palantir-mini__research_library_refresh({
  libraryRoot: "<target library root>",
  staleThresholdDays: 30,
  dryRun: false,
  agentName: "pm-research-refresh"
})
```

If `_manifest.json` is absent the handler returns `manifestMissing: true` — surface this to the user as "A5 / pm-research-index has not run yet for this library; refresh blocked."

Do not run non-dry refresh blindly on official web docs. Legacy `entries[]` manifests carry `source` provenance URLs, but those are not guaranteed direct markdown fetch targets.

## Inputs

- `$ARGUMENTS` — optional library root path or source selector. Prefer an explicit `libraryRoot`. Accepts `"all"` to iterate over top-level library dirs (`palantir-official`, `claude-code`, `palantir-foundry`, `palantir-vision`, `interaction`, `skills`) and surface a combined dry-run summary first.

## Success criteria

- Context selection returns a small read set with routers first and exact
  schema primitives only when implementation is in scope.
- Dry-run returns a populated `docs[]` preview, `staleDocs`, `wouldRefresh`, and `emittedEventCount: 0`.
- Non-dry-run either returns `refreshed` count OR clearly reports `manifestMissing: true`.
- Every non-dry refresh event uses the 5-dim Decision Lineage envelope through the shared event emitter.

## Palantir latest-signal cadence

- Weekly or before Palantir-heavy work: inspect official Foundry announcements,
  Palantir blog/newsroom, and official `@PalantirTech` X.
- Treat `research_context_select.currentnessNotes` as the first context guard:
  future DevCon/AIPCon names are watch targets until an official source is
  captured.
- Event-triggered: search official sources for next conference numbers
  (DevCon 6, AIPCon 10, etc.) and record the checked date before promoting.
- Monthly: run `research_library_refresh({ source: "all", dryRun: true })`;
  treat `manifestMissingCount` and `staleUnfetchableDocs` as action items.
- Promote only verified deltas through research -> schemas -> shared-core ->
  project ontology/runtime, then emit a lineage event explaining the change.

## Failure modes surfaced to the user

| Symptom | Likely cause | Remediation |
|---------|--------------|-------------|
| `manifestMissing: true` | `_manifest.json` not generated yet | Run A5 (`pm-research-index`) or hand-author a stub manifest |
| `missing 'docs' or legacy 'entries' array` | Manifest shape is neither current nor legacy seed-manifest format | Regenerate or repair `_manifest.json` |
| `errors > 0` on non-dry-run | Best-effort direct fetch failed for one or more entries | Re-run dry-run; inspect entries that provide `url`; avoid treating provenance `source` as direct markdown |
| Too many stale docs | Manifest `lastVerified` / legacy `fetched` dates are old | Use `dryRun: true` first and narrow via a smaller libraryRoot or newer `since` value |

## Rule citations

- `rules/02-research-retrieval.md` — BROWSE/INDEX-first retrieval; refresh keeps library authoritative.
- `rules/07-plugins-and-mcp.md` — plugin manifest + MCP handler ownership.
- `rules/10-events-jsonl.md` — refresh emits append-only events with 5-dim Decision Lineage.
- `rules/12-lead-protocol.md` — plugin-scope skill resolution wins; keep the task scoped and auditable.
- Research library BROWSE route: `~/.claude/research/BROWSE.md` (query-first router — consult first to decide which library root to target).

## Related MCPs

- Library structure primitives: `~/.claude/schemas/ontology/primitives/research-document.ts` (RID brand + Declaration shape).
- Manifest generation: `pm-research-index` skill (A5) writes `_manifest.json` this orchestration consumes.
- Diff against upstream: future `pm-research-diff` exposure should report HTTP-side drift before non-dry refresh.
