# 04 — Approve TECHNOLOGY recommendation

**Goal:** Clear the blocking `TECHNOLOGY` required-user-decision so the DTC can
validate downstream. **SKIP this stage entirely if no `TECHNOLOGY` decision is
open** — i.e. the ContextEngineeringPlan carries no TECHNOLOGY entry in its
`requiredUserDecisions`.

**Call:** `pm_ontology_engineering_workflow` `action:"approve_technology_recommendation"`

**Key params:**
- `projectRoot` — required; the handler refuses without it.
- `sessionId` — the FDE session this approval binds to (thread from Stage 00).
- `semanticIntentContract` — the **approved** SIC.
- `technologyRecommendation?` — optional; when absent the handler rebuilds the
  recommendation/decision from the plan (`resolveTechnologyRecommendationToApprove`).

**Returns:** `technologyApproval = { approved, technologyDecision, technologyApprovalCard? }`.
On approval the open `technologyDecision` flips `open → approved` and gains an
`approvalRef`. **Thread the approved `technologyDecision` / `approvalRef` forward**
so the DTC (Stage 05) sees the cleared blocker.

**Common failure → fix:**
- No TECHNOLOGY decision in the plan → **skip this stage**; calling it returns a
  no-op `technologyApproval` rather than advancing anything.
- Refusal → a confirm/correct `technologyApprovalCard` is surfaced. **Answer the
  card**, do not retry blind.

**Source:** `bridge/handlers/pm-ontology-engineering-workflow.ts`
(grep `approve_technology_recommendation`, `resolveTechnologyRecommendationToApprove`,
`buildTechnologyApprovalCard`); action enum in
`lib/ontology-engineering-workflow/types.ts` (grep `approve_technology_recommendation`).

**next:** `05-dtc-fill.md`
