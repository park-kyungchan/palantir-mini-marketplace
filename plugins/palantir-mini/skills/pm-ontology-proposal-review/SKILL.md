---
name: pm-ontology-proposal-review
category: core-workflow
surfaceStatus: public-core
description: "Append review verdict to an existing OntologyProposal/GlobalBranchingProposal —..."
allowed-tools: mcp__palantir-mini__apply_edit_function mcp__palantir-mini__commit_edits mcp__palantir-mini__compute_edits_dry_run mcp__palantir-mini__impact_query mcp__palantir-mini__emit_event Read Write Bash
effort: medium
disable-model-invocation: false
---

# pm-ontology-proposal-review — Proposal review verdict + lifecycle transition

## When to use

- A reviewer has read a proposal and is ready to record verdict.
- When `/palantir-mini:pm-ontology-proposal-review` is invoked or these phrases appear: "review proposal", "approve/reject proposal", "merge proposal X", "defer proposal".

## Prerequisites

- Schemas v1.37.0+ (OntologyProposalDeclaration) or v1.40+ (GlobalBranchingProposal).
- Open proposal from `/pm-ontology-proposal-create` (lifecycleState = "in-review" or "ready-for-review").
- Plugin v4.5.0+ (this skill).

## Inputs

- `<proposalId>`: target proposal RID
- `<verdict>`: `approve | reject | defer`
- `<reviewerIdentity>`: who is reviewing (matches eligibleReviewers when policy applies)
- `<rationale>`: free-text justification (1-3 sentences)
- Optional `<evalRunIds>`: AIP Evals run RIDs supporting the verdict

## How to run

### Step 1 — Load proposal

Read `<project>/.palantir-mini/ontology-proposals/<proposalId>.json`. Validate `<reviewerIdentity>` is in `reviewerIds[]` (v1.37) or `approvalPolicy.eligibleReviewers[]` (v1.40). Confirm `lifecycleState` is in `{ "in-review", "ready-for-review" }` (else fail with state error).

### Step 2 — Run impact_query for blast radius

```
mcp__palantir-mini__impact_query({ rids: proposal.affectedResources.map(r => r.rid) })
```

Capture `impactRadius` (count of downstream RIDs) + `resourceCheckResults` (array of `{ check, passed, message }`).

### Step 3 — Compute lifecycle transition

| Verdict | v1.37 status | v1.40 lifecycleState |
|---------|--------------|----------------------|
| approve (final approver per policy) | `approved` → `merged` | `approved` (or `merged` if `doNotMerge=false`) |
| approve (intermediate; more approvals needed) | unchanged (status remains `ready-for-review`) | `in-review` (record approval; await others) |
| reject | `rejected` | `rejected` |
| defer | `draft` (rolled back to draft for rework) | `in-review` (kept; rationale recorded for rework) |

For v1.40 Global proposals: tally approvals against `approvalPolicy.requiredApprovals`. If the count after this verdict matches the threshold AND `verdict==approve` AND `doNotMerge==false` → transition to `merged`.

### Step 4 — Update declaration + persist

Mutate the proposal JSON: `validationSummary.evalRunIds += evalRunIds`, `validationSummary.impactRadius = impactRadiusFromStep2`, `validationSummary.testsPassed = (verdict==="approve")`, `validationSummary.notes = rationale`, `lifecycleState = newState`, `resourceCheckResults = checkResultsFromStep2`, `updatedAt = ISO now`.

`apply_edit_function` → dry-run → commit_edits.

### Step 5 — Emit review event

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "ontology-proposal-reviewed", taskId: proposalId, validations: ["state-transition", "impact-query-passed", "reviewer-eligible"] },
  withWhat: {
    reasoning: "Proposal '<title>' verdict=<verdict> by <reviewerIdentity>; impactRadius=<N>; <rationale>",
    memoryLayers: ["semantic", "episodic"],
    refinementTarget: verdict === "reject" ? { kind: "other", filePathOrRid: proposalId, description: "Proposal rejected; rework required", confidenceLevel: "high" } : undefined
  },
  lineageRefs: { actionRid: proposalId, evidenceUrls: evalRunIds.map(...) }
})
```

## Output

```
# Proposal review recorded — <title>

Proposal ID: <proposalId>
Verdict: <verdict> by <reviewerIdentity>
New state: <newLifecycleState>
Impact radius: <N> downstream RIDs
Rationale: <rationale>

Next:
- approve→merged: changes propagate to target branch
- approve→in-review: <remaining> approvals still needed
- reject: source branch can rework + re-open via /pm-ontology-proposal-create
- defer: revisit when blocking concerns resolved
```

## Authority + cross-refs

- Schemas: `ontology-branch-proposal.ts` (v1.37+), `global-branching-proposal.ts` (v1.40+).
- MCP: `impact_query` (existing handler) for blast-radius computation.
- 1차 자료: `~/.claude/research/palantir-foundry/ontology/global-branching-overview-2026-05-05.md`.
- Companion: `/pm-ontology-branch-create`, `/pm-ontology-proposal-create`.
- Plan §3.W3.B — `~/.claude/plans/mossy-mapping-eich.md`.
