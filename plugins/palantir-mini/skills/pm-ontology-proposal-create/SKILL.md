---
name: pm-ontology-proposal-create
category: core-workflow
surfaceStatus: public-core
description: "Create an OntologyProposalDeclaration (or GlobalBranchingProposal v1.40+) from a..."
allowed-tools: mcp__palantir-mini__apply_edit_function mcp__palantir-mini__commit_edits mcp__palantir-mini__compute_edits_dry_run mcp__palantir-mini__emit_event Read Write Bash
effort: medium
disable-model-invocation: false
---

# pm-ontology-proposal-create — OntologyProposal / GlobalBranchingProposal authoring

## When to use

- After `/pm-ontology-branch-create` + edits made; ready for review.
- When `/palantir-mini:pm-ontology-proposal-create` is invoked or these phrases appear: "create proposal", "open proposal", "request review for branch X", "global branching proposal".

## NOT for

- Mutating production ontology directly — proposals are review surfaces, not direct commits.
- Skipping review for low-risk changes — even single-property tweaks should go through this gate.

## Prerequisites

- Schemas v1.37.0+ (`OntologyProposalDeclaration`). v1.40+ for `GlobalBranchingProposal` (cross-app variant with approval policy + applicationsAffected[]).
- Existing branch from `/pm-ontology-branch-create`.
- Plugin v4.5.0+ (this skill).

## Inputs

- `<sourceBranchId>`: OntologyBranchRid from `/pm-ontology-branch-create`
- `<title>`: human-readable proposal title (e.g. "Q4 forecast revision review")
- `<targetBranchId>` (optional): target branch (default: production root branch)
- `<reviewerIds>`: array of identities authorized to approve
- `<applicationsAffected>` (v1.40+ Global): array of OSDK application slugs that depend on the changed resources
- `<approvalPolicy>` (v1.40+ Global): `{ eligibleReviewers, requiredApprovals (default 2), allowSelfApprove (default false) }`
- `<doNotMerge>` (v1.40+ Global; default false): block auto-merge even after approval (manual gate)

## How to run

### Step 1 — Detect kind

If `applicationsAffected.length > 0` OR `approvalPolicy` is provided → use `GlobalBranchingProposal` (schemas v1.40). Else → use `OntologyProposalDeclaration` (schemas v1.37).

### Step 2 — Compose declaration

```typescript
// v1.37 OntologyProposalDeclaration:
{
  proposalId: ontologyProposalRid("proposal:" + slugify(title) + ":" + Date.now()),
  sourceBranchId,
  targetBranchId,
  title,
  status: "ready-for-review",
  affectedResources: [<from sourceBranch.affectedResources>],
  reviewerIds,
  validationSummary: {
    evalRunIds: [/* from /pm-eval-suite if any */],
    testsPassed: undefined,  // populated by review step
    impactRadius: undefined,
    notes: undefined
  },
  createdAt: <ISO>,
  updatedAt: <ISO>
}

// v1.40 GlobalBranchingProposal extends with:
{
  ...above,
  applicationsAffected,
  approvalPolicy,
  doNotMerge,
  lifecycleState: "in-review",
  resourceCheckResults: []  // populated by review
}
```

### Step 3 — Persist + emit

`apply_edit_function` → dry-run → commit_edits. Persisted at `<project>/.palantir-mini/ontology-proposals/<proposalId>.json`.

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "ontology-proposal-opened", taskId: proposalId, validations: ["schema-conform", "reviewers-non-empty", "lifecycle-state=in-review"] },
  withWhat: {
    reasoning: "Proposal '<title>' opened from branch <sourceBranchId>; <N> reviewers; <M> apps affected",
    memoryLayers: ["semantic", "procedural", "episodic"]
  },
  lineageRefs: { actionRid: proposalId, evidenceUrls: [<sourceBranch path>] }
})
```

## Output

```
# Ontology proposal opened — <title>

Proposal ID: <proposalId>
Kind: OntologyProposal | GlobalBranchingProposal
Source branch: <sourceBranchId>
Reviewers: <list>
Apps affected: <list>
Approval policy: <required>/<eligible>

Next: reviewers run /pm-ontology-proposal-review on this proposalId.
```

## Authority + cross-refs

- Schemas: `ontology-branch-proposal.ts` (v1.37+), `global-branching-proposal.ts` (v1.40+).
- Design-authority (WHY, primary): `~/harness-upstream/ssot/palantir/global-branching/` (scan `ssot/palantir/BROWSE.md` → `INDEX.md` → smallest slice). Design grounds, source governs; distinct from the raw research firehose and pm's `.ssot-authority.json`.
- 1차 자료 (raw research, reference-only): `~/.claude/research/palantir-official/foundry/ontology/`.
- Companion: `/pm-ontology-branch-create` (precondition), `/pm-ontology-proposal-review`.
- Plan §3.W3.B — `~/.claude/plans/mossy-mapping-eich.md`.
