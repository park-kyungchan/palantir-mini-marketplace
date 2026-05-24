// Review resolvers — Claude-slim of gstack review.ts (1021 LOC).
// Keeps: REVIEW_DASHBOARD, PLAN_FILE_REVIEW_REPORT, ADVERSARIAL_STEP,
// SCOPE_DRIFT, BENEFITS_FROM, SPEC_REVIEW_LOOP, PLAN_COMPLETION_AUDIT_*,
// PLAN_VERIFICATION_EXEC, CROSS_REVIEW_DEDUP.
// Drops: CODEX_SECOND_OPINION, CODEX_PLAN_REVIEW (rule 04 runtime boundary).

import type { TemplateContext } from "./types";

export function generateReviewDashboard(_ctx: TemplateContext): string {
  return `## Review Readiness Dashboard

Before proceeding past the investigation phase, confirm these signals are green:

| Signal | State | Source |
|--------|-------|--------|
| Base branch detected | green / yellow / red | Step 0 BASE_BRANCH_DETECT |
| Diff collected | green / yellow / red | \`git diff origin/<base>...HEAD\` non-empty |
| Prior learnings queried | green / yellow / red | \`mcp__palantir-mini__pm_learn_query\` returned result |
| Preamble complete | green / yellow / red | \`skill_started\` event emitted |
| Scope bounded | green / yellow / red | User has confirmed the scope of the review |

If any signal is red, STOP and resolve before proceeding. If yellow, note the caveat in the final report.`;
}

export function generatePlanFileReviewReport(_ctx: TemplateContext): string {
  return `## Plan File Review Report

When reviewing a plan file (design doc, TechBlueprint, RFC), structure the output report as:

1. **Premise check** — do the stated premises hold? Cite sources for each.
2. **Alternative survey** — what other approaches did the plan consider? Are they fairly represented?
3. **Scope grade** — is the scope right-sized? Too narrow (won't solve the problem)? Too broad (unshippable)?
4. **Risk surface** — what could break? Which risks are load-bearing?
5. **Decision list** — enumerate the key decisions. For each: who decided, when, on what evidence?
6. **Recommended action** — ship / revise / expand / reduce / reject.

Use confidence calibration on each section. Suppress findings below confidence 5.`;
}

export function generateAdversarialStep(_ctx: TemplateContext): string {
  return `## Adversarial step

Before finalizing the output, deliberately look for:

- **Confirmation bias** — what evidence CONTRADICTS the current conclusion? List it explicitly.
- **Hidden assumptions** — what did you treat as given that deserves scrutiny?
- **Missing alternatives** — what third or fourth option wasn't considered?
- **Failure modes** — if this ships and it's wrong, how would you know?
- **Reversibility** — is the proposed action reversible? If not, what's the blast radius?

If adversarial analysis surfaces a material concern, surface it in the output even if it weakens the main recommendation. Do NOT silently suppress counter-evidence to preserve a clean narrative.`;
}

export function generateScopeDrift(_ctx: TemplateContext): string {
  return `## Scope drift check

Before committing output, re-read the original user request. Ask:

- **Did I answer the asked question, or a different one I found more interesting?**
- **Did my response expand into areas the user did not ask about?**
- **Did I quietly drop a constraint the user stated?**

If any answer is yes, trim scope back to what was asked, note the dropped expansion as a follow-up for the user to opt into, and resubmit.`;
}

export function generateBenefitsFrom(ctx: TemplateContext): string {
  const list = ctx.benefitsFrom ?? [];
  if (list.length === 0) return "";

  const bullets = list.map((s) => `- \`/palantir-mini:${s}\``).join("\n");
  return `## Prerequisite Skill Offer

This skill's output quality improves when run after:

${bullets}

If you have not run the listed prerequisites, consider invoking them first. You can also continue without them — the current skill will note any reduced-context caveats in its final output.`;
}

export function generateSpecReviewLoop(_ctx: TemplateContext): string {
  return `## Spec review loop

If the finding requires a spec change, do NOT silently edit the spec. Instead:

1. Draft the proposed spec delta as a diff in the output.
2. Render a WorkflowContract turn-card decision with the proposed delta — let the user accept/reject.
3. Only upon acceptance: apply the delta, emit a \`plan_reviewed\` event via \`mcp__palantir-mini__emit_event\`, and continue.`;
}

export function generatePlanCompletionAuditShip(_ctx: TemplateContext): string {
  return `## Plan Completion Audit (ship)

Before shipping, verify each item in the original plan has a corresponding commit or explicit deferral:

1. List all items from the plan.
2. For each: find the commit SHA that delivered it, or mark as "deferred — reason".
3. If any item is missing both a commit AND a deferral, surface it — the plan is not complete.`;
}

export function generatePlanCompletionAuditReview(_ctx: TemplateContext): string {
  return `## Plan Completion Audit (review)

When reviewing a PR that claims to complete a plan, verify:

- Every plan item has a corresponding commit in this PR's range.
- Deferred items are explicitly noted in the PR body with a follow-up reference.
- No plan items are silently dropped.`;
}

export function generatePlanVerificationExec(_ctx: TemplateContext): string {
  return `## Plan verification execution

Run the plan's declared VERIFY steps literally. For each step:

1. Quote the VERIFY command from the plan.
2. Execute it.
3. Record exit code + output summary.
4. If any VERIFY fails, the plan is not verified — do not claim completion.`;
}

export function generateCrossReviewDedup(_ctx: TemplateContext): string {
  return `## Cross-review dedup

When multiple review skills (e.g. pm-review + pm-plan-eng-review + pm-cso) produce findings, dedup before final output:

1. Group findings by (file, line, category).
2. Within each group, keep the highest-confidence finding; list others as "also flagged by [skill]".
3. Preserve disagreements: if skills reached opposing conclusions, surface both and flag for user decision.`;
}
