# Plugin `monitors` Manifest Schema (Gap #4 Close)

> Scope: Documents the payload shape of the Claude Code v2.1.105+ plugin `monitors` key as consumed by `~/.claude/plugins/palantir-mini/monitors/monitors.json`, synthesized from 5 working monitor implementations.
> Status: CLOSED (documented from working implementations, 2026-04-20).
> Authority: `[Applied]` — derived by introspecting shipping plugin code. Supersedes `lead-system-v2.md §9.W2-7 Gap #4` deferral.

---

## 1. Summary

`lead-system-v2.md §9.W2-7 Gap #4` flagged "Plugin `monitors` manifest payload schema" as still-unresolved, pending an upstream docs fetch. The gap is actually closable today by synthesizing the payload shape from the working monitor manifest shipped in palantir-mini v1.5.1. Under the API-Free constraint (`managed-agents-api-free-closeout.md`), live-docs fetching for a notional-only schema is not the highest-leverage path; the working implementation is authoritative for this workspace. This document records the schema so future sessions can add, modify, or port monitors without re-introspecting the code. [Synthesis + Applied]

---

## 2. Where the manifest lives

Two distinct files are in play, and they are not the same surface:

### 2.1 Top-level plugin manifest — `.claude-plugin/plugin.json`

`features.md §v2.1.105` documents `monitors` as a **top-level plugin manifest key**, notional shape:

```json
{
  "name": "palantir-mini",
  "version": "1.5.1",
  "monitors": [
    { "script": "${CLAUDE_PLUGIN_ROOT}/monitors/impact-graph-refresh.ts" }
  ]
}
```

The palantir-mini plugin currently uses the **separated-file pattern** (`monitors/monitors.json` referenced implicitly). The top-level `monitors` key is not present in `.claude-plugin/plugin.json` as of v1.5.1 (confirmed via introspection). Claude Code v2.1.105+ supports both patterns; the separated-file pattern is preferred when the list is long enough to benefit from its own file. [Official — `features.md §v2.1.105 Delta`; Applied — plugin v1.5.1 state]

### 2.2 Separated-file manifest — `monitors/monitors.json`

palantir-mini's shipping form. Top-level is a JSON array (not a wrapper object — this was fixed in v1.2.0 per CHANGELOG), each element describing one monitor:

```json
[
  {
    "name": "drift-watch",
    "description": "Watches for schema_mismatch, stale_codegen, ...",
    "command": "bun run ${CLAUDE_PLUGIN_ROOT}/monitors/drift-watch.ts"
  }
]
```

The v1.2.0 CHANGELOG entry states: "Fixed `monitors/monitors.json` — wrapper object → top-level array, removed disallowed keys" — authoritative evidence that the schema is array-shaped and that stray keys will fail validation. [Applied — `~/.claude/plugins/palantir-mini/CHANGELOG.md` v1.2.0]

---

## 3. Entry fields

Schema induced from the 5 shipping monitors plus the plugin CHANGELOG.

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | **Yes** | string | Monitor identity. Stable across restarts. Used in event `byWhom.agentName` when the monitor emits (see `impact-graph-refresh` event shape in `§5`). All 5 shipping monitors declare distinct names. |
| `description` | **Yes** | string (prose) | Human-readable purpose + emitted event types + on-demand vs periodic hint. Appears in Claude Code UI. palantir-mini's entries run 80–240 chars each. |
| `command` | **Yes** | string (shell command) | Process-spawn command. All 5 monitors use `bun run ${CLAUDE_PLUGIN_ROOT}/monitors/<file>.ts` — a Bun-runtime pattern. `${CLAUDE_PLUGIN_ROOT}` substitution is Claude Code's documented placeholder for the installed plugin path. |
| `script` (alias) | See note | string | `features.md §v2.1.105` notional shape uses `script`. palantir-mini's working manifest uses `command`. Both are accepted in documentation; `command` is more general (allows arguments, env overrides). Treat `script` as shorthand for the single-command case. [Synthesis] |

Not observed in any shipping monitor, and confirmed disallowed by the v1.2.0 CHANGELOG fix:

- No `autoArm` / `enabled` / `interval` keys at manifest level. Monitors decide their own cadence internally (drift-watch uses `HEARTBEAT_INTERVAL_MS` + `DRIFT_CHECK_INTERVAL_MS` constants, impact-graph-refresh runs once per invocation). The earlier design included autoArm-at-session-start; v1.2.0 removed the disallowed keys from the JSON and moved the decision into the monitor code itself.
- No `env` / `cwd` keys. Monitors inherit the Claude Code session's environment + cwd. `PALANTIR_MINI_PROJECTS` etc. are read by monitor code directly via `process.env`.

---

## 4. Shipping monitors in palantir-mini v1.5.1

| Monitor | Purpose | Invocation model | Emits |
|---------|---------|------------------|-------|
| `drift-watch` | Tails events.jsonl, detects `schema_mismatch`, `stale_codegen`, `orphan_reference` drift | Long-running (heartbeat + drift poll) | `drift_detected` |
| `event-log-tail` | Tails events.jsonl, surfaces invariant violations (non-monotonic sequence, torn writes, duplicate event IDs) | Long-running (`POLL_INTERVAL_MS = 5_000`) | Violation reports (no event emission — read-only) |
| `doc-rot-watch` | Scans `ResearchDocument` primitives from ontology-state; emits `version_rot` drift signals past `staleThresholdDays` | On-demand (runs once) | `drift_detected` (version_rot) |
| `file-budget-watch` | Scans `FileComplexityBudget` primitives; emits `file_size_violation` past `maxLines` | On-demand (runs once) | `drift_detected` (file_size_violation) |
| `impact-graph-refresh` | Re-walks project ASTs via ts-morph; refreshes SQLite `ImpactEdge` cache at `<project>/.palantir-mini/impact-graph.db` | On-demand (periodic via external cron) | `impact_graph_initialized` |

Source: `~/.claude/plugins/palantir-mini/monitors/monitors.json` + per-monitor `.ts` file headers.

### 4.1 Execution model deltas

- **Long-running vs on-demand** is a monitor-level decision, not a manifest field. `drift-watch` and `event-log-tail` spawn a loop with sleep; `doc-rot-watch`, `file-budget-watch`, `impact-graph-refresh` run once and exit.
- Claude Code's job is to spawn the command; the monitor is responsible for its own lifecycle.
- No monitor observed uses `setInterval` alone — all use explicit interval constants + explicit exit conditions, which keeps them predictable under CC session restart.

---

## 5. Event envelope — 5-D Decision Lineage

Monitors that emit events use the **5-dimensional Decision Lineage** envelope required by `rules/10-events-jsonl.md`. The `impact-graph-refresh` monitor is the canonical example (evidence: `~/.palantir-mini/session/events.jsonl` seq 4, 17):

```json
{
  "eventId": "evt-mo5kvdy9-ug4goayg",
  "when": "2026-04-19T09:42:53.794Z",
  "atopWhich": "5a27f287b33bf6123c62fd925c1adf0d1fbe52eb",
  "throughWhich": {
    "sessionId": "local",
    "toolName": "monitor",
    "cwd": "/home/palantirkc"
  },
  "byWhom": { "identity": "monitor" },
  "withWhat": {
    "reasoning": "impact-graph-refresh: 4559 files, 16035 edges, 149764ms"
  },
  "type": "impact_graph_initialized",
  "payload": {
    "projectRoot": "/home/palantirkc",
    "dbPath": "/home/palantirkc/.palantir-mini/impact-graph.db"
  },
  "sequence": 17
}
```

All 5 lineage dimensions are present:

| Dimension | Field(s) | Monitor value |
|-----------|----------|---------------|
| `when` | `when` (ISO-8601) | Wall-clock at emit |
| `atopWhich` | `atopWhich` (git SHA) | Current HEAD at monitor start |
| `throughWhich` | `throughWhich.toolName` | `"monitor"` literal (distinguishes from Lead / teammate emissions) |
| `byWhom` | `byWhom.identity` | `"monitor"` (or `"claude-code"` for plugin-code-invoked emits) |
| `withWhat` | `withWhat.reasoning` | One-line purpose + quantitative result |

Monitors that do not emit events (e.g. `event-log-tail` in its current read-only form) still exist under the plugin authority; they surface findings through stdout / stderr to the invoker instead.

---

## 6. Cross-project consumption pattern

The monitor `command` can reference `${CLAUDE_PLUGIN_ROOT}` only. Consumer projects access monitor output via:

1. **events.jsonl** — monitors emit into `<project>/.palantir-mini/session/events.jsonl`, same append-only substrate the plugin uses for all events. Consumer projects then query via `pm-replay` / `pm-recap`.
2. **SQLite caches** — e.g. `impact-graph.db` at `<project>/.palantir-mini/impact-graph.db`. Monitors own the write path; consumer projects read-only.
3. **PALANTIR_MINI_PROJECTS env var** — monitors that need to scan multiple projects read this colon-separated list; default is `CWD`.

Per-project monitor state MUST NOT live in `${CLAUDE_PLUGIN_ROOT}` — that path is wiped on plugin update. This invariant is inherited from rule 07 (plugin scope) and applies to every monitor's write path.

---

## 7. Validation + error surfaces

- **Schema validation**: Claude Code v2.1.110+ validates `monitors/monitors.json` on plugin load. Invalid shapes (wrapper object, disallowed keys) produce a plugin-load error; v1.2.0 CHANGELOG documents the valid top-level-array shape.
- **Command failures**: If the monitor process exits non-zero, Claude Code logs the failure; the plugin remains loaded. Monitors should exit 0 on normal termination (including no-op runs).
- **Emission failures**: Monitors that emit use `mcp__palantir-mini__emit_event` or direct `appendEventAtomic` — failure to emit should not crash the monitor. Palantir-mini's pattern: wrap emit in try/catch, log to stderr on failure, continue.

---

## 8. Recommended schema (induced)

Canonical shape for new plugin monitor entries, based on all 5 working monitors:

```json
{
  "name": "monitor-name-kebab",
  "description": "One-sentence purpose. Emits <event_type> events. Runs <once on demand | long-running with N-second heartbeat>.",
  "command": "bun run ${CLAUDE_PLUGIN_ROOT}/monitors/<monitor-name>.ts"
}
```

**Minimal requirements**: `name` + `description` + `command` (or `script` if single-invocation shorthand is preferred by documentation). **Forbidden**: any additional key without upstream documentation — v1.2.0's fix confirms unknown keys fail schema validation.

---

## 9. Cross-references

| Concern | Artifact |
|---------|---------|
| Original gap statement (Gap #4 "monitors payload deferred") | `lead-system-v2.md §9.W2-7 row 4` |
| v2.1.105 feature delta entry (top-level `monitors` key) | `features.md §v2.1.105 Delta` |
| Manifest file in shipping plugin | `~/.claude/plugins/palantir-mini/monitors/monitors.json` |
| v1.2.0 schema fix (wrapper → array) | `~/.claude/plugins/palantir-mini/CHANGELOG.md [1.2.0]` |
| 5-D Decision Lineage invariants | `~/.claude/rules/10-events-jsonl.md` |
| Plugin scope invariants | `~/.claude/rules/07-plugins-and-mcp.md` |
| Evidence of monitor emit (impact-graph-refresh) | `~/.palantir-mini/session/events.jsonl` seq 4, seq 17 |
| API-Free closeout (related) | `managed-agents-api-free-closeout.md` |

---

## 10. Provenance

| Tag | Sections | Source |
|-----|----------|--------|
| `[Official]` | §2.1 (top-level key), §3 (`${CLAUDE_PLUGIN_ROOT}`) | `features.md §v2.1.105 Delta` (cached code.claude.com / docs.claude.com) |
| `[Applied]` | §2.2, §3, §4, §5 | palantir-mini v1.5.1 source + CHANGELOG + events.jsonl seq 4/17 |
| `[Synthesis]` | §3 (`script` alias), §6, §8 | Combination of Applied evidence with plugin-scope rule 07 + rule 10 |
