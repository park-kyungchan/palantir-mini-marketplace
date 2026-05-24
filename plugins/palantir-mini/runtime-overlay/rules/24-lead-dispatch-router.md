---
ruleId: 24
slug: lead-dispatch-router
scope: global
version: 1.1.0
invariant: "Lead (Brain-of-Swarms) dispatches via a canonical decision tree: identify harness species → cost-profile check → select orchestration mode → bind contract → spawn; every dispatch emits a lineage event before the first Edit/Write."
supersededBy: null
supersedes: []
crossRefs: [12, 16, 20]
hookCitations: []
bodyLocCeiling: 40
---

# Rule 24 — Lead Dispatch Router

palantir-mini is the Ontology-First Brain for multi-harness agent swarms (CONTEXT.md §15). Lead must follow a canonical dispatch sequence to ensure consistent lineage, correct mode selection, and audit-trail completeness across all species.

## §Dispatch flowchart

```
task arrives
    |
    v
1. Is this cross-species? (Agent SDK / Managed Agents / task-specific harness)
   YES → Lead-only; document species rationale; use species-native contract.
   NO  → continue (Claude Code CLI species) ↓
    |
    v
2. Rule 20 mode ladder: Lead-direct / Quick / Full / Agent Teams?
    |
    v
3. Bind SprintContract (rule 16 §SprintContract) or confirm auto-bootstrapped Quick Sprint.
    |
    v
4. Emit lineage event (rule 10 5-dim) BEFORE first Edit/Write.
    |
    v
5. Spawn Generator (or act as Lead-direct). Rule 12 §Briefing template required.
    |
    v
6. On completion: emit edit_committed; Lead synthesizes; close contract.
```

## §Cost-aware dispatch (v1.1.0)

Canonical cost ref: `HarnessSpeciesCostProfile` (schemas v1.42.0). Consult at step 1.

- **Bulk / throughput-heavy**: prefer `claude-code-cli-max` — flat $200/mo eliminates per-token marginal cost (3rd pricing arbitrage; CONTEXT.md §17).
- **Sporadic / short**: prefer `anthropic-managed-agents` ($0.08/session-hour) — per-event billing beats flat subscription at low utilization.
- `dispatch-route-decide` handler (`bridge/handlers/dispatch-route-decide.ts`) returns `{recommendedSpecies, recommendedMode, costRationale, profileRid}` for machine-readable routing.

## §Brain-of-Swarms invariants

- Lead NEVER bypasses step 3 (contract bind) for tracked-project work.
- Lead NEVER skips step 4 (lineage event) — append-only substrate (rule 10).
- Cross-species dispatch is Lead-only and requires explicit plan entry under `~/.claude/plans/`.
