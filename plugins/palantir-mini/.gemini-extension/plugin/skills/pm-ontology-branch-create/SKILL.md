---
name: pm-ontology-branch-create
category: core-workflow
description: "Create an OntologyBranchDeclaration (Foundry Global Branching / AI FDE working branch / scenario branch) for a sandboxed ontology-edit cycle."
allowed-tools: mcp__palantir-mini__apply_edit_function mcp__palantir-mini__commit_edits mcp__palantir-mini__compute_edits_dry_run mcp__palantir-mini__emit_event Read Write Bash
effort: medium
disable-model-invocation: false
---

# pm-ontology-branch-create — OntologyBranchDeclaration authoring

## When to use

- Starting an AI FDE-style ontology edit cycle that should be reviewed before merging to production.
- Sandboxing a what-if scenario without mutating production ontology state.
- When `/palantir-mini:pm-ontology-branch-create` is invoked or these phrases appear: "create ontology branch", "branch from ontology", "AI FDE branch", "scenario branch".

## Prerequisites

- Schemas v1.37.0+ (`OntologyBranchDeclaration` primitive). Companion `GlobalBranchingProposal` lives in v1.40+.
- Plugin v4.5.0+ (this skill).

## Inputs

- `<branch-kind>`: `global-branch | ai-fde-working-branch | scenario-branch`
- `<purpose>`: 1-line natural-language description (e.g. "explore quarterly forecast revision")
- `<base-version>`: ontology version ref (default: current git HEAD SHA from project)
- `<isolation>`: `ontology-only | app-preview | full-sandbox` (default: `full-sandbox` for scenario, `ontology-only` for global-branch, `app-preview` for ai-fde)
- `<affected-resources>`: array of `OntologyResourceRef { kind, rid }` (kind ∈ object-type / link-type / interface-type / action-type / object-view / aip-logic-function / aip-agent / evaluation-suite / osdk-application)

## How to run

### Step 1 — Compose OntologyBranchDeclaration

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

### Step 2 — Persist via Two-Tier Action

`apply_edit_function({ functionName: "ontology-branch-create", params: { branchDecl }, hypotheticalEdits: [...] })` → dry-run → commit_edits.

Persists to `<project>/.palantir-mini/ontology-branches/<branchId>.json`.

### Step 3 — Emit creation event

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

## Output

```
# Ontology branch created

Branch ID: <branchId>
Kind: <branchKind>
Base: <baseVersion>
Isolation: <isolation>
Affected: <N> resources (<kind summary>)

Next: edit the affected resources, then /pm-ontology-proposal-create to open a review proposal.
```

## Authority + cross-refs

- Schemas: `ontology-branch-proposal.ts` (v1.37+), `global-branching-proposal.ts` (v1.40+).
- 1차 자료: `~/.claude/research/palantir-foundry/ontology/global-branching-overview-2026-05-05.md`.
- Companion: `/pm-ontology-proposal-create`, `/pm-ontology-proposal-review`.
- Plan §3.W3.B — `~/.claude/plans/mossy-mapping-eich.md`.
