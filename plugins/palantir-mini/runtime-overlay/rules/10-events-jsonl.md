---
ruleId: 10
slug: events-jsonl
scope: global
version: 2.2.0
invariant: "events.jsonl is append-only; every ontology edit emits a 5-dim event BEFORE writing files; optional 6th field propagationDepth tracks ForwardProp/BackwardProp chain depth with auto-derivation from emitter path. PreCompact gate blocks non-conformant compaction."
supersededBy: null
supersedes: [18]
crossRefs: [08, 12, 16, 22]
hookCitations: [events-5d-gate, session-start, pre-compact-state]
bodyLocCeiling: 45
---

# Rule 10 — events.jsonl Append-Only Log

## Substrate invariant

- `events.jsonl` is append-only. Never rewrite, truncate, reformat, re-emit.
- Every ontology-state edit emits an event BEFORE writing files (via `mcp__palantir-mini__emit_event`).
- Event log = BackwardProp substrate: `pm-recap` folds, `pm-replay` queries by 5-dim, `pm-verify` checks invariants.

## The 5 dimensions (required on every row)

| Dim | Field | Shape |
|-----|-------|-------|
| **when** | ISO8601 | `"2026-04-20T14:32:15.489Z"` |
| **atopWhich** | commit SHA | `"a1b2c3d..."` |
| **throughWhich** | surface/tool | `{ surface, tool }` |
| **byWhom** | agent id | `{ agent, identity }` |
| **withWhat** | reasoning | `{ reasoning, hypothesis? }` |

## PreCompact gate + remediation

- `events-5d-gate` fires BEFORE compaction. Order: `pre-compact-state` (structural) → `events-5d-gate` (semantic). Policy `lineage-conformance-policy`: `strict` blocks, `advisory` warns, `disabled` skips. Snapshots written via `pre-compact-state`.
- Missing dims at origin → fix emitting hook/handler. Post-hoc → emit `orphan_event_reconciled` linking incomplete sequence to corrected context. Policy tuning → edit `~/.claude/schemas/ontology/primitives/lineage-conformance-policy.ts`.

## §propagationDepth (optional 6th field, v2.1.0+)

- `propagationDepth` is an optional integer field on any event row indicating depth in the ForwardProp or BackwardProp chain (0 = origin layer; rule 01 §ForwardProp/BackwardProp Audit).
- Schema primitive: `PropagationDepthField` (schemas v1.34.0+). Omitting the field is valid; present value must be ≥ 0.
- `propagation_audit_forward` and `propagation_audit_backward` handlers (W6) use this field for chain reconstruction.

### §Auto-derivation policy (v2.2.0)

- `emit_event` MCP handler infers `propagationDepth` heuristically from the emitter's file/context path when the caller omits the field:
  - Path under `research/` or `schemas/` → depth **0** (origin layer).
  - Path under `ontology/shared-core/` → depth **1**.
  - Path under `project ontology/` → depth **2**.
  - Path under `contracts/` or `hooks/` → depth **3**.
  - Path under `runtime/` or `src/` → depth **4**.
  - Unclassified / caller-supplied explicit value → used as-is or omitted.
- Auto-derived depth is tagged `propagationDepthSource: "auto"` in the envelope; caller-supplied is `"explicit"`.
- Heuristic is best-effort: callers may override by supplying `propagationDepth` explicitly. Conflicts: explicit wins.

## §Version history

- v2.2.0 (2026-05-09, sprint-060 W2.4): §propagationDepth auto-derivation policy; closes R1-F8.
- v2.1.0: initial propagationDepth field (optional 6th dim + W6 audit handlers).

## Canonical scope (v3.2.0 W9)

- Per-project `<projectRoot>/.palantir-mini/session/events.jsonl` is canonical. Plugin internals write to plugin scope (self-test).
- `replay_lineage` + `pm_retro_query` take `project` arg explicitly; cross-project replay = caller queries + merges client-side.
- `lib/event-log/read.ts:readEvents` auto-merges `<sessionDir>/archive/events-rotated-*.jsonl` (post-G3 v3.2.0). Rotation = atomic rename, not rewrite.
