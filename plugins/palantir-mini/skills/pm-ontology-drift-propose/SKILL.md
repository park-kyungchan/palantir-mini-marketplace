---
name: pm-ontology-drift-propose
category: core-workflow
surfaceStatus: public-core
description: "MANUAL drift propose-step — compose re-elevation GlobalBranchingProposals from a per-file-sha staleness report, gated, NO commit…"
allowed-tools: mcp__palantir-mini__apply_edit_function mcp__palantir-mini__commit_edits mcp__palantir-mini__compute_edits_dry_run mcp__palantir-mini__emit_event Read Write Bash
effort: medium
disable-model-invocation: false
---

# pm-ontology-drift-propose — drift re-elevation proposal (Pillar C #2, gated)

## When to use

- MANUALLY, after the always-on drift advisory (`ontology_drift_detected`, the Stop-hook
  `ontology-drift-fold` lane) has surfaced a stale primitive and a human has decided the drift
  is worth a re-elevation proposal.
- When `/palantir-mini:pm-ontology-drift-propose` is invoked or: "propose drift re-elevation",
  "open a proposal for the drifted primitive".

## NOT for

- Auto-firing. This SKILL is **manually invoked**; it is NOT wired to the `ontology-drift-fold`
  Stop hook (#3). The Stop hook DETECTS only — it never proposes.
- Driving a proposal off a noisy comparator. The propose-step is **gated**: it emits proposals
  ONLY for a `per-file-sha` report (raw-sha is too coarse). The structural-fingerprint
  comparator (DESIGN OPEN #1) that would suppress benign same-file edits is **deferred** —
  until it lands, every proposal carries the detector's `noiseWarning` verbatim and a human
  must judge each one.
- Committing / re-registering directly. `drift-propose.ts` is pure + read-only; it NEVER calls
  `elevate`'s register path or `commit_edits`. The existing `/pm-ontology-proposal-review` +
  the `elevate` gate remain the sole commit path.

## Prerequisites

- Plugin v7.21.0+ (this skill + `lib/ontology-engineering-workflow/drift-propose.ts`).
- Schemas v1.40+ (`GlobalBranchingProposal`) — reused, no new schema this pass.
- A staleness report from `detectOntologyStalenessGit({ project })`
  (`lib/event-log/ontology-staleness.ts`) with `comparator === "per-file-sha"`.

## How to run

### Step 1 — Get the staleness report

Run the read-only detector for the project. Confirm `report.comparator === "per-file-sha"`
and `report.stale.length > 0`. If `comparator === "raw-sha"`, STOP — the propose-step gates it
out (a `raw-sha` report yields zero proposals by design).

### Step 2 — Compose proposals (pure)

```typescript
import { driftPropose } from "../../lib/ontology-engineering-workflow/drift-propose";
const { proposals, skipped, gateNote } = driftPropose(report);
```

- `proposals[]` — one FULL `GlobalBranchingProposal` per covered stale primitive
  (object / link / action / function), `lifecycleState:"in-review"`, single-reviewer
  `approvalPolicy`, `doNotMerge:false`, `report.noiseWarning` threaded into
  `validationSummary.notes`. Each satisfies `isGlobalBranchingProposal()===true`.
- `skipped[]` — `role` / `property` stale entries (the `OntologyResourceKind` enum gap,
  rule-08 follow-up). Surface them to the user; do NOT silently drop. They become proposable
  only after the additive enum widen lands (owned by the schema owner).
- `gateNote` — present when no proposals were emitted (gated comparator or nothing covered).

### Step 3 — Persist + emit (same as pm-ontology-proposal-create)

For each proposal: `apply_edit_function` → `compute_edits_dry_run` → `commit_edits`, persisted
at `<project>/.palantir-mini/ontology-proposals/<proposalId>.json`. Then:

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "ontology-proposal-opened", taskId: proposalId,
             validations: ["schema-conform", "comparator=per-file-sha", "lifecycle-state=in-review"] },
  withWhat: { reasoning: "Drift re-elevation proposal '<title>' opened for <rid>; noiseWarning threaded",
              memoryLayers: ["semantic", "procedural", "episodic"] },
  lineageRefs: { actionRid: proposalId }
})
```

The existing `/pm-ontology-proposal-review` + `elevate` gate handle commit. Report any
`skipped[]` entries to the user as a rule-08 follow-up.

## Output

```
# Drift re-elevation proposals opened — <N> proposal(s)

Comparator: per-file-sha (gated)
Proposed:   <list of proposalId → rid>
Skipped:    <role/property rids — OntologyResourceKind enum gap, rule-08 follow-up>
noiseWarning (verbatim): <report.noiseWarning>

Next: reviewers run /pm-ontology-proposal-review on each proposalId.
```

## Authority + cross-refs

- Pure compose: `lib/ontology-engineering-workflow/drift-propose.ts` (read-only, no commit).
- Detector: `lib/event-log/ontology-staleness.ts` (read-only; comparator honesty tags).
- Always-on detect lane (#3, manual-decoupled): `hooks/ontology-drift-fold.ts`.
- Schemas: `global-branching-proposal.ts` (v1.40+), `ontology-branch-proposal.ts` (v1.37+).
- Design-authority (WHY): `~/harness-upstream/ssot/palantir/global-branching/` (scan
  `ssot/palantir/BROWSE.md` → `INDEX.md` → smallest slice) +
  `~/harness-upstream/_workspace/2026-06-15-dynamic-ontology-design/DESIGN-dynamic-ontology-operation.md` §2.1.
- Companion: `/pm-ontology-proposal-create`, `/pm-ontology-proposal-review`.
