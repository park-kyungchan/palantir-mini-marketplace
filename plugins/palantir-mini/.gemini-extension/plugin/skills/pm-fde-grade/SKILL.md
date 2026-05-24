---
name: pm-fde-grade
category: fde-readiness
description: "Grade an FDEOntologyBuildSession against the 17-criterion FDE Ontology Build Readiness rubric (rubric:fde-readiness/v1). Returns FDEGapReportDetailed with per-criterion..."
allowed-tools: Read Bash
effort: medium
disable-model-invocation: false
---

# pm-fde-grade — FDE Ontology Build Readiness Grader

## Purpose

Grade a live `FDEOntologyBuildSession` against the 17-criterion FDE Ontology
Build Readiness rubric (`rubric:fde-readiness/v1`) and produce a
`FDEGapReportDetailed` scorecard.

**HARD READ-ONLY INVARIANT**: This skill is recommendation-only. The resulting
report carries `recommendationOnly: true` (literal type). It NEVER authorizes
mutation. Mutation authority requires SemanticIntentContract +
DigitalTwinChangeContract pipeline.

**NOT in MCP TOOLS array**: `grade_fde_readiness` is NOT a public MCP tool.
This skill is the only authorized invocation path.

## When to use

- Lead has a composed `FDEOntologyBuildSession` (from `pm-fde-session-preview`)
  and wants a scored readiness summary.
- Preparing an FDE gap analysis report before requesting semantic approval.
- Checking which of the 17 criteria are failing before escalating to reviewers.

## Session-first invariant

Grade only a session that was composed from `ontology_context_query` read
context plus any already-approved SIC/DTC refs. Missing contracts should lower
readiness or produce backlog items; the grader must not synthesize approval or
turn reference evidence into authority.

## How to invoke

```typescript
import { handleGradeFDEReadiness } from
  "bridge/handlers/grade-fde-readiness";

const report = await handleGradeFDEReadiness({
  session,           // FDEOntologyBuildSession (required)
  criteriaInUse,     // optional: { name, type }[] for deferred-type detection
  nowIso,            // optional: ISO8601 timestamp override
  preferredLanguage, // optional: "ko" | "en" (default "en")
});
```

## Output

`FDEGapReportDetailed` with:
- `recommendationOnly: true` (literal — always present)
- `finalRecommendation`: one of `hold-design | ready-for-semantic-approval | ready-for-implementation | ready-for-evaluation`
- 4 scorecard slices: `ontologyScorecard`, `chatbotScorecard`, `aiFdeMcpScorecard`, `governanceEvalScorecard`
- `overallScore` (0.0-1.0), `overallThreshold` (0.70), `overallPassed`
- `submissionCriteriaNeedsHumanReview`: deferred ObjectQueryResult/GroupMember criteria
- `prioritizedBacklog`, `riskRegister`

## Hard invariants

1. `report.recommendationOnly === true` — always.
2. `report.finalRecommendation` is NEVER `"ready-for-implementation"` when
   `submissionCriteriaNeedsHumanReview.length > 0`.
3. `report.finalRecommendation` is NEVER `"ready-for-implementation"` when any
   criterion has `passed === false && weightedContribution > 0`.
4. No `commitToken`, `applyToken`, `approvalToken`, or `authorizeMutation` field
   exists on the output object.
5. This skill is NOT callable via MCP TOOLS; only via direct lib import.

## Model-domain criteria note

The handler does not wire a `modelGrader` — model-domain criteria (9 of 17)
default to `score=0` (conservative). For production use with actual model
evaluation, callers should invoke `gradeFDEReadiness` directly with a
`modelGrader` callback or use `grade_outcome_with_rubric` MCP for those criteria.

## 4 scorecard slices

| Slice | Criteria |
|-------|----------|
| `ontologyScorecard` | mission_decision_alignment, object_type_quality, link_type_quality, action_type_and_writeback_quality, submission_criteria_quality, function_contract_quality |
| `chatbotScorecard` | aip_chatbot_studio_configuration, application_state_determinism, retrieval_context_quality, citation_and_evidence_quality |
| `aiFdeMcpScorecard` | ai_fde_branching_and_tool_governance, palantir_mcp_omcp_boundary_control, osdk_resource_scoping |
| `governanceEvalScorecard` | eval_coverage, auditability_and_observability, release_and_change_management, post_rename_naming_compliance |

## Related skills

- `pm-fde-session-preview` — compose the session first.
- `pm-fde-report` — render the graded report to a markdown plan file.
