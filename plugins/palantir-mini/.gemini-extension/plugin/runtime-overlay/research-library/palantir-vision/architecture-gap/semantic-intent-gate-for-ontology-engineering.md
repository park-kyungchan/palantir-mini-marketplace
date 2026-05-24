---
title: Semantic Intent Gate for Ontology Engineering
slug: semantic-intent-gate-for-ontology-engineering
fileClass: vision-architecture-gap
provenanceMarkers: [Official, Adapter, Synthesis]
primaryCitations:
  - { source: "https://www.palantir.com/docs/foundry/ontology/overview/", fetched: 2026-05-09, localMirror: "~/.claude/research/palantir-foundry/architecture/ontology-overview.md" }
  - { source: "https://www.palantir.com/docs/foundry/ai-fde/overview/", fetched: 2026-05-09, localMirror: "~/.claude/research/palantir-foundry/aip/ai-fde-overview.md" }
  - { source: "https://www.palantir.com/docs/foundry/ai-fde/security-and-governance/", fetched: 2026-05-09, localMirror: "~/.claude/research/palantir-foundry/aip/ai-fde-security-and-governance.md" }
  - { source: "https://www.palantir.com/docs/foundry/palantir-mcp/overview/", fetched: 2026-05-09, localMirror: "~/.claude/research/palantir-foundry/dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26.md" }
  - { source: "https://www.palantir.com/docs/foundry/aip-evals/ontology-edits/", fetched: 2026-05-09, localMirror: "~/.claude/research/palantir-foundry/aip/aip-evals-ontology-edits.md" }
  - { source: "https://www.palantir.com/docs/foundry/global-branching/overview/", fetched: 2026-05-09, localMirror: "~/.claude/research/palantir-foundry/ontology/global-branching-overview-2026-05-05.md" }
adapterTargets:
  - "~/.claude/plugins/palantir-mini/skills/pm-intent-to-ontology/SKILL.md"
  - "~/.claude/plugins/palantir-mini/skills/pm-orchestrate/SKILL.md"
  - "~/.claude/plugins/palantir-mini/skills/pm-autoplan/SKILL.md"
  - "~/.claude/rules/12-lead-protocol-v2.md"
  - "~/.claude/rules/16-3-agent-harness.md"
lastVerified: 2026-05-09
harnessSpeciesMentioned: [palantir-mini-sprint-harness, Claude Code CLI harness]
ssotTier: T3
---

# Semantic Intent Gate for Ontology Engineering

## WHAT

This document defines the gap between Palantir-style Ontology Engineering and the current local `palantir-mini` Lead + Harness runtime, then proposes a required **Semantic Intent Elicitation Gate** before any Ontology Engineering work begins.

The core claim:

> "Understanding Ontology Engineering" is not the ability to find files. It is the ability to explain and validate a change as a change to the operational world model: objects, properties, links, actions, functions, security, application surfaces, lineage, evaluation, and branch/review lifecycle.

Therefore the Lead must not start by filling a semantic artifact from private inference alone. The Lead must first close ambiguity with the user, record the decisions, obtain explicit approval, and only then run the Intent-to-Ontology and Harness paths.

## WHY

### Official Palantir baseline

[Official] Palantir's Ontology docs route Ontology building through a broad surface: ontology proposals, object/link types, properties, action types, functions, object views, Ontology Manager, permissions, testing, and branching. The local mirror shows that the official ontology page is not just a schema page; it is a routing surface for the operational system around object types, links, actions, functions, views, and governance.

[Official] AI FDE starts from natural language by analyzing the user's intent and context, selecting the Foundry operations to execute, using native tool support, and returning contextual explanations. Its capabilities include ontology editing, functions editing, exploration, governance, OSDK React, and platform Q&A. By default it proposes work through Global Branch proposals or Code Repository PRs for review.

[Official] AI FDE governance requires existing user permissions, explicit approval for mutating operations, and audit logging. This matters locally: a Lead that edits ontology semantics without user-confirmed intent is weaker than Palantir's own mutating-action model.

[Official] AIP Evals executes ontology-edit functions in Ontology simulation so created, edited, and deleted objects can be verified without changing the actual ontology. This maps directly to local `simulator` grading and dry-run expectations.

[Official] Global Branching makes cross-application ontology changes testable on a branch, reviewable through resource approval policies, and mergeable only after checks and approvals pass. The local Harness should mirror this proposal/review posture, not collapse intent discovery, plan, edit, and commit into one Lead inference.

[Official] Palantir MCP separates builder-side ontology type modification from consumer-side ontology data writes. The local `palantir-mini` MCP should preserve the same boundary: builder semantics need explicit intent, scope, and approval before mutation.

## Current Local Runtime

### What is already strong

[Adapter] `palantir-mini` is already positioned as an Ontology-First Brain for multi-harness agent swarms, grounded in append-only lineage, schema ontology, and 5-dimensional Decision Lineage.

[Adapter] Rule 12 requires the Lead to run `delegate_or_direct` for non-trivial work, use MCP-first impact tools before edits, follow an 8-step Intent-to-Ontology protocol for complex prompts, and use plan approval for complex tasks.

[Adapter] Rule 16 makes `palantir-mini-sprint-harness` default-on for tracked edits. Its loop is:

```text
negotiate -> propose -> dry-run -> grade -> commit | revise -> analyzer-synthesize
```

[Adapter] The Harness has structural protections: SprintContract, dry-run, external grader dispatch for model-domain criteria, commit precondition hooks, and simulator-domain intent for ontology-impact scoring.

[Adapter] `pm-orchestrate` already contains a user-decision phase and `WorkflowContract turn-card decision` templates. It explicitly says the user decides what to keep, delete, or improve and that the Lead must never assume.

[Adapter] `pm-autoplan` already distinguishes Mechanical decisions, Taste decisions, and User Challenges. It says User Challenges and premise confirmation are never auto-decided.

### The actual gap

The current Lead can be forced into Ontology-discovery mechanics, but not yet into **user-confirmed semantic intent**.

Observed gaps:

1. `pm-intent-to-ontology` Step 1 is "Identify intent + scope" and is internal to Lead. It does not require a user-facing clarification loop.
2. `pm-orchestrate` has the right `WorkflowContract turn-card decision` posture, but it is not a mandatory precondition for `pm-intent-to-ontology` or SprintContract binding.
3. `pm-autoplan` can auto-decide Taste items, which is useful for plan review but dangerous if used to fill the semantic artifact that defines ontology meaning.
4. In sprint-062, `impact_query` and `semantic_change_plan` are skipped in `pm-intent-to-ontology` due to the producer-ontology Wave 3 emission gap, so the Lead has less machine-checked semantic impact than the rule name implies.
5. The `lead-ontology-discovery-completeness` hook is advisory initially. The blocking version is planned for sprint-063 after W6 C13.
6. The commit gate checks SprintContract and dry-run/grading state, but it does not yet check that the SprintContract was derived from an approved Semantic Intent Contract.
7. `delegate_or_direct` chooses route/agent/skills after an intent string exists; it does not prove that the intent string was user-confirmed.

## Proposed Runtime Primitive

Introduce a required **SemanticIntentContract** before `pm-intent-to-ontology` Step 1 completes and before `negotiate_sprint_contract` binds.

### Artifact shape

```ts
type SemanticIntentContract = {
  contractId: string;
  rawUserRequest: string;
  confirmedIntent: string;
  workMode:
    | "analysis-only"
    | "ontology-model-change"
    | "runtime-change"
    | "cleanup-refactor"
    | "full-redesign"
    | "research-update";
  operatingOutcome: string;
  ontologyTargets: {
    objects?: string[];
    properties?: string[];
    links?: string[];
    actions?: string[];
    functions?: string[];
    security?: string[];
    objectViewsOrApps?: string[];
    lineageOrEval?: string[];
    branchOrRelease?: string[];
  };
  inScope: string[];
  outOfScope: string[];
  assumptions: { text: string; approvedByUser: boolean }[];
  openAmbiguities: { question: string; riskIfUnresolved: string }[];
  decisionLog: {
    question: string;
    options: string[];
    answer: string;
    rationale: string;
    capturedAt: string;
  }[];
  successCriteria: string[];
  evalPlan: string[];
  branchAndApprovalPolicy: string;
  riskClass: "read-only" | "branch-only" | "mutating" | "production-risk";
  userApprovalRef: string;
  sourceRefs: string[];
};
```

Hard invariant:

```text
openAmbiguities.length === 0
AND every assumption.approvedByUser === true
AND userApprovalRef exists
```

If that invariant is false, Lead may research and ask questions, but may not bind SprintContract or perform non-trivial edits.

## Ask Framework

The Lead should classify uncertainty into these buckets:

| Bucket | Ask? | Rule |
|---|---:|---|
| Mechanical | Usually no | If exactly one correct answer follows from local authority, record as assumption. |
| Taste | Yes for ontology semantics | Do not auto-decide semantic meaning. Ask or mark out-of-scope. |
| User Challenge | Always yes | If reviewers think the user's stated direction should change, present the challenge and let the user decide. |
| Scope Boundary | Always yes when mutating | Preserve/delete/improve/change-mode decisions require explicit user answer. |
| Ontology Target | Always yes when unclear | Object/link/action/function/security/view/lineage target must be known. |
| Approval/Risk | Always yes for mutating | Branch-only, dry-run-only, or production-risk posture must be confirmed. |

Question rounds should be short:

```text
1-3 questions per round
2-4 concrete options per question
recommended option first
plain language
re-ask if the user answer still leaves semantic ambiguity
```

Do not ask for implementation details the system can discover. Ask only for semantic choices that determine the operational model.

## Integration Point

### New or upgraded skill

Preferred implementation:

```text
/palantir-mini:pm-semantic-intent-gate "<raw request>"
```

Alternative:

```text
Upgrade /palantir-mini:pm-intent-to-ontology so Step 1 invokes the gate.
```

The gate outputs a `SemanticIntentContract` and a short human-readable summary. `pm-intent-to-ontology` then accepts `semanticIntentContractRef` instead of a free-form intent string.

### Hook enforcement

Add a PreToolUse hook for:

```text
negotiate_sprint_contract
apply_edit_function
commit_edits
Write/Edit/MultiEdit tracked files
```

Blocking condition:

```text
complex task AND no approved SemanticIntentContract
```

Exemptions:

```text
read-only research
BROWSE.md / INDEX.md routing edits
trivial one-file mechanical fix
explicit user says "do not ask; make best assumptions" AND riskClass <= branch-only
```

Bypass:

```text
PALANTIR_MINI_SEMANTIC_INTENT_BYPASS=1
```

The bypass must emit an audited event and should not allow production-risk mutation unless the user explicitly authorizes that risk.

### Event lineage

Emit these event types:

```text
semantic_intent_draft_created
semantic_intent_question_asked
semantic_intent_decision_recorded
semantic_intent_contract_approved
semantic_intent_contract_required
semantic_intent_bypass_invoked
```

The approved contract becomes the parent of:

```text
intent_to_ontology_skill_invoked
sprint_contract_bound
edit_proposed
dry_run_computed
dry_run_graded
edit_committed
```

## Claude Runtime Recommendation

Claude, Codex, and other runtimes should render the same WorkflowContract turn-card decision semantics for the gate. Runtime-native question UI is not a semantic authority; any missing native surface must be recorded as a runtime gap while preserving the plugin-owned decision contract.

For Claude, this should be a hard standard:

```text
If semantic artifact fields are ambiguous, Lead asks.
If the answer changes ontology meaning, Lead asks again until closed.
After closure, Lead presents the SemanticIntentContract summary.
Only after user approval does Ontology Engineering begin.
```

## Acceptance Criteria

1. Complex ontology-affecting work cannot bind SprintContract without `semanticIntentContractRef`.
2. `pm-intent-to-ontology` rejects contracts where `openAmbiguities.length > 0`.
3. `pm-recap` reports: questions asked, user decisions captured, assumptions approved, unresolved ambiguity count, and bypass count.
4. Harness grader output cites the approved contract when evaluating semantic conformance.
5. Tests cover:
   - no-contract block,
   - unresolved-ambiguity block,
   - approved-contract pass,
   - bypass audit,
   - read-only exemption,
   - BROWSE/INDEX exemption,
   - `pm-autoplan` Taste auto-decisions not allowed to fill ontology semantics without final approval.

## Rollout

1. Advisory skill: add `pm-semantic-intent-gate` and contract schema, no blocking.
2. Integrate `pm-intent-to-ontology`: require `semanticIntentContractRef` for complex tasks, still advisory.
3. Add SprintContract field: `semanticIntentContractRef`.
4. Promote hook to blocking for complex tasks.
5. Add `pm-recap` and Harness grader reporting.

## Practical Bottom Line

The local runtime is close to Palantir's shape in Harness, lineage, MCP-first posture, and evaluation. The missing bridge is **semantic consent**: the Lead must prove that the semantic artifact reflects user intent before it treats the artifact as ontology truth.

Once this gate exists, Harness efficiency improves because the generator, grader, and analyzer evaluate against a user-approved operational model instead of a Lead-inferred prompt interpretation.

## Sources

- `~/.claude/research/palantir-foundry/architecture/ontology-overview.md`
- `~/.claude/research/palantir-foundry/aip/ai-fde-overview.md`
- `~/.claude/research/palantir-foundry/aip/ai-fde-best-practices.md`
- `~/.claude/research/palantir-foundry/aip/ai-fde-security-and-governance.md`
- `~/.claude/research/palantir-foundry/dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26.md`
- `~/.claude/research/palantir-foundry/aip/aip-evals-overview.md`
- `~/.claude/research/palantir-foundry/aip/aip-evals-ontology-edits.md`
- `~/.claude/research/palantir-foundry/ontology/global-branching-overview-2026-05-05.md`
- `~/.claude/plugins/palantir-mini/skills/pm-intent-to-ontology/SKILL.md`
- `~/.claude/plugins/palantir-mini/skills/pm-orchestrate/SKILL.md`
- `~/.claude/plugins/palantir-mini/skills/pm-orchestrate/references/ask-templates.md`
- `~/.claude/plugins/palantir-mini/skills/pm-autoplan/SKILL.md`
- `~/.claude/rules/12-lead-protocol-v2.md`
- `~/.claude/rules/16-3-agent-harness.md`
