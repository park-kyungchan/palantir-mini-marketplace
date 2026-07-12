---
name: pm-ontology-proposal
category: core-workflow
surfaceStatus: public-core
description: "Ontology proposal lifecycle — create | review | branch | drift modes"
allowed-tools: mcp__palantir-mini__apply_edit_function mcp__palantir-mini__commit_edits mcp__palantir-mini__emit_event mcp__palantir-mini__impact_query Read Write Bash
effort: medium
disable-model-invocation: false
---

# pm-ontology-proposal — Ontology proposal lifecycle (create | review | branch | drift)

One skill, four modes selected by the first argument:

| Mode | Trigger | Use when |
|------|---------|----------|
| `create` | `/palantir-mini:pm-ontology-proposal create …` | Open a review proposal (OntologyProposal / GlobalBranchingProposal) from an edited branch |
| `review` | `/palantir-mini:pm-ontology-proposal review …` | Record a reviewer verdict (approve / reject / defer) on an open proposal |
| `branch` | `/palantir-mini:pm-ontology-proposal branch …` | Create an ontology branch / AI FDE working branch / scenario sandbox before editing |
| `drift` | `/palantir-mini:pm-ontology-proposal drift …` | MANUALLY propose re-elevation for a drifted primitive flagged by the drift advisory |

Typical order: `branch` → edit affected resources → `create` → `review` → (merged). `drift`
is a separate, manually-invoked entry point (not wired to any auto-fire hook).

---

## Mode: create — OntologyProposal / GlobalBranchingProposal authoring

### When to use

- After `/pm-ontology-branch-create` + edits made; ready for review.
- When `/palantir-mini:pm-ontology-proposal-create` is invoked or these phrases appear: "create proposal", "open proposal", "request review for branch X", "global branching proposal".

### NOT for

- Mutating production ontology directly — proposals are review surfaces, not direct commits.
- Skipping review for low-risk changes — even single-property tweaks should go through this gate.

### Prerequisites

- Schemas v1.37.0+ (`OntologyProposalDeclaration`). v1.40+ for `GlobalBranchingProposal` (cross-app variant with approval policy + applicationsAffected[]).
- Existing branch from `/pm-ontology-branch-create`.
- Plugin v4.5.0+ (this skill).

### Inputs

- `<sourceBranchId>`: OntologyBranchRid from `/pm-ontology-branch-create`
- `<title>`: human-readable proposal title (e.g. "Q4 forecast revision review")
- `<targetBranchId>` (optional): target branch (default: production root branch)
- `<reviewerIds>`: array of identities authorized to approve
- `<applicationsAffected>` (v1.40+ Global): array of OSDK application slugs that depend on the changed resources
- `<approvalPolicy>` (v1.40+ Global): `{ eligibleReviewers, requiredApprovals (default 2), allowSelfApprove (default false) }`
- `<doNotMerge>` (v1.40+ Global; default false): block auto-merge even after approval (manual gate)

### How to run

#### Step 1 — Detect kind

If `applicationsAffected.length > 0` OR `approvalPolicy` is provided → use `GlobalBranchingProposal` (schemas v1.40). Else → use `OntologyProposalDeclaration` (schemas v1.37).

#### Step 2 — Compose declaration

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

#### Step 3 — Persist + emit

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

### Output

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

### Authority + cross-refs

- Schemas: `ontology-branch-proposal.ts` (v1.37+), `global-branching-proposal.ts` (v1.40+).
- Design-authority (WHY, primary): `~/harness-upstream/ssot/palantir/global-branching/` (scan `ssot/palantir/BROWSE.md` → `INDEX.md` → smallest slice). Design grounds, source governs; distinct from the raw research firehose and pm's `.ssot-authority.json`.
- 1차 자료 (raw research, reference-only): `~/.claude/research/palantir-official/foundry/ontology/`.
- Companion: `/pm-ontology-branch-create` (precondition), `/pm-ontology-proposal-review`.
- Plan §3.W3.B — `~/.claude/plans/mossy-mapping-eich.md`.

---

## Mode: review — Proposal review verdict + lifecycle transition

### When to use

- A reviewer has read a proposal and is ready to record verdict.
- When `/palantir-mini:pm-ontology-proposal-review` is invoked or these phrases appear: "review proposal", "approve/reject proposal", "merge proposal X", "defer proposal".

### Prerequisites

- Schemas v1.37.0+ (OntologyProposalDeclaration) or v1.40+ (GlobalBranchingProposal).
- Open proposal from `/pm-ontology-proposal-create` (lifecycleState = "in-review" or "ready-for-review").
- Plugin v4.5.0+ (this skill).

### Inputs

- `<proposalId>`: target proposal RID
- `<verdict>`: `approve | reject | defer`
- `<reviewerIdentity>`: who is reviewing (matches eligibleReviewers when policy applies)
- `<rationale>`: free-text justification (1-3 sentences)
- Optional `<evalRunIds>`: AIP Evals run RIDs supporting the verdict

### How to run

#### Step 1 — Load proposal

Read `<project>/.palantir-mini/ontology-proposals/<proposalId>.json`. Validate `<reviewerIdentity>` is in `reviewerIds[]` (v1.37) or `approvalPolicy.eligibleReviewers[]` (v1.40). Confirm `lifecycleState` is in `{ "in-review", "ready-for-review" }` (else fail with state error).

#### Step 2 — Run impact_query for blast radius

```
mcp__palantir-mini__impact_query({ rids: proposal.affectedResources.map(r => r.rid) })
```

Capture `impactRadius` (count of downstream RIDs) + `resourceCheckResults` (array of `{ check, passed, message }`).

#### Step 3 — Compute lifecycle transition

| Verdict | v1.37 status | v1.40 lifecycleState |
|---------|--------------|----------------------|
| approve (final approver per policy) | `approved` → `merged` | `approved` (or `merged` if `doNotMerge=false`) |
| approve (intermediate; more approvals needed) | unchanged (status remains `ready-for-review`) | `in-review` (record approval; await others) |
| reject | `rejected` | `rejected` |
| defer | `draft` (rolled back to draft for rework) | `in-review` (kept; rationale recorded for rework) |

For v1.40 Global proposals: tally approvals against `approvalPolicy.requiredApprovals`. If the count after this verdict matches the threshold AND `verdict==approve` AND `doNotMerge==false` → transition to `merged`.

#### Step 4 — Update declaration + persist

Mutate the proposal JSON: `validationSummary.evalRunIds += evalRunIds`, `validationSummary.impactRadius = impactRadiusFromStep2`, `validationSummary.testsPassed = (verdict==="approve")`, `validationSummary.notes = rationale`, `lifecycleState = newState`, `resourceCheckResults = checkResultsFromStep2`, `updatedAt = ISO now`.

`apply_edit_function` → dry-run → commit_edits.

#### Step 5 — Emit review event

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

### Output

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

### Authority + cross-refs

- Schemas: `ontology-branch-proposal.ts` (v1.37+), `global-branching-proposal.ts` (v1.40+).
- MCP: `impact_query` (existing handler) for blast-radius computation.
- 1차 자료: `~/.claude/research/palantir-foundry/ontology/global-branching-overview-2026-05-05.md`.
- Companion: `/pm-ontology-branch-create`, `/pm-ontology-proposal-create`.
- Plan §3.W3.B — `~/.claude/plans/mossy-mapping-eich.md`.

---

## Mode: branch — OntologyBranchDeclaration authoring

### When to use

- Starting an AI FDE-style ontology edit cycle that should be reviewed before merging to production.
- Sandboxing a what-if scenario without mutating production ontology state.
- When `/palantir-mini:pm-ontology-branch-create` is invoked or these phrases appear: "create ontology branch", "branch from ontology", "AI FDE branch", "scenario branch".

### Prerequisites

- Schemas v1.37.0+ (`OntologyBranchDeclaration` primitive). Companion `GlobalBranchingProposal` lives in v1.40+.
- Plugin v4.5.0+ (this skill).

### Inputs

- `<branch-kind>`: `global-branch | ai-fde-working-branch | scenario-branch`
- `<purpose>`: 1-line natural-language description (e.g. "explore quarterly forecast revision")
- `<base-version>`: ontology version ref (default: current git HEAD SHA from project)
- `<isolation>`: `ontology-only | app-preview | full-sandbox` (default: `full-sandbox` for scenario, `ontology-only` for global-branch, `app-preview` for ai-fde)
- `<affected-resources>`: array of `OntologyResourceRef { kind, rid }` (kind ∈ object-type / link-type / interface-type / action-type / object-view / aip-logic-function / aip-agent / evaluation-suite / osdk-application)

### How to run

#### Step 1 — Compose OntologyBranchDeclaration

```typescript
{
  branchId: ontologyBranchRid("branch:" + branchKind + ":" + slugify(purpose) + ":" + Date.now()),
  kind: branchKind,
  baseOntologyVersion: ontologyVersionRef(baseVersion),
  parentBranchId: undefined,  // top-level branch
  purpose,
  createdBy: <session.byWhom.identity>,
  createdAt: <ISO now>,
  isolation,
  affectedResources
}
```

#### Step 2 — Persist via Two-Tier Action

`apply_edit_function({ functionName: "ontology-branch-create", params: { branchDecl }, hypotheticalEdits: [...] })` → dry-run → commit_edits.

Persists to `<project>/.palantir-mini/ontology-branches/<branchId>.json`.

#### Step 3 — Emit creation event

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "ontology-branch-created", taskId: branchId, validations: ["schema-conform", "isolation-set", "affected-resources-non-empty"] },
  withWhat: {
    reasoning: "Ontology branch '<purpose>' created (kind=<branchKind>, isolation=<isolation>); <N> resources affected",
    memoryLayers: ["semantic", "procedural"]
  },
  lineageRefs: { actionRid: branchId }
})
```

### Output

```
# Ontology branch created

Branch ID: <branchId>
Kind: <branchKind>
Base: <baseVersion>
Isolation: <isolation>
Affected: <N> resources (<kind summary>)

Next: edit the affected resources, then /pm-ontology-proposal-create to open a review proposal.
```

### Authority + cross-refs

- Schemas: `ontology-branch-proposal.ts` (v1.37+), `global-branching-proposal.ts` (v1.40+).
- Design-authority (WHY, primary): `~/harness-upstream/ssot/palantir/global-branching/` (scan `ssot/palantir/BROWSE.md` → `INDEX.md` → smallest slice). Design grounds, source governs; distinct from the raw research firehose and pm's `.ssot-authority.json`.
- 1차 자료 (raw research, reference-only): `~/.claude/research/palantir-official/foundry/ontology/`.
- Companion: `/pm-ontology-proposal-create`, `/pm-ontology-proposal-review`.
- Plan §3.W3.B — `~/.claude/plans/mossy-mapping-eich.md`.

---

## Mode: drift — drift re-elevation proposal (Pillar C #2, gated)

### When to use

- MANUALLY, after the always-on drift advisory (`ontology_drift_detected`, the Stop-hook
  `ontology-drift-fold` lane) has surfaced a stale primitive and a human has decided the drift
  is worth a re-elevation proposal.
- When `/palantir-mini:pm-ontology-drift-propose` is invoked or: "propose drift re-elevation",
  "open a proposal for the drifted primitive".

### NOT for

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

### Prerequisites

- Plugin v7.21.0+ (this skill + `lib/ontology-engineering-workflow/drift-propose.ts`).
- Schemas v1.40+ (`GlobalBranchingProposal`) — reused, no new schema this pass.
- A staleness report from `detectOntologyStalenessGit({ project })`
  (`lib/event-log/ontology-staleness.ts`) with `comparator === "per-file-sha"`.

### How to run

#### Step 1 — Get the staleness report

Run the read-only detector for the project. Confirm `report.comparator === "per-file-sha"`
and `report.stale.length > 0`. If `comparator === "raw-sha"`, STOP — the propose-step gates it
out (a `raw-sha` report yields zero proposals by design).

#### Step 2 — Compose proposals (pure)

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

#### Step 3 — Persist + emit (same as pm-ontology-proposal-create)

For each proposal: `apply_edit_function` → `commit_edits` (validateOnly: true) → `commit_edits`, persisted
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

### Output

```
# Drift re-elevation proposals opened — <N> proposal(s)

Comparator: per-file-sha (gated)
Proposed:   <list of proposalId → rid>
Skipped:    <role/property rids — OntologyResourceKind enum gap, rule-08 follow-up>
noiseWarning (verbatim): <report.noiseWarning>

Next: reviewers run /pm-ontology-proposal-review on each proposalId.
```

### Authority + cross-refs

- Pure compose: `lib/ontology-engineering-workflow/drift-propose.ts` (read-only, no commit).
- Detector: `lib/event-log/ontology-staleness.ts` (read-only; comparator honesty tags).
- Always-on detect lane (#3, manual-decoupled): `hooks/ontology-drift-fold.ts`.
- Schemas: `global-branching-proposal.ts` (v1.40+), `ontology-branch-proposal.ts` (v1.37+).
- Design-authority (WHY): `~/harness-upstream/ssot/palantir/global-branching/` (scan
  `ssot/palantir/BROWSE.md` → `INDEX.md` → smallest slice) +
  `~/harness-upstream/_workspace/2026-06-15-dynamic-ontology-design/DESIGN-dynamic-ontology-operation.md` §2.1.
- Companion: `/pm-ontology-proposal-create`, `/pm-ontology-proposal-review`.
