---
name: pm-fde-report
category: fde-readiness
description: "Render an FDEGapReportDetailed (output of pm-fde-grade) as a human-readable markdown..."
allowed-tools: Read Write Bash
effort: low
disable-model-invocation: false
---

# pm-fde-report — FDE Gap Report Markdown Renderer

## Purpose

Render an `FDEGapReportDetailed` (produced by `pm-fde-grade` skill via
`handleGradeFDEReadiness`) as a human-readable markdown document and write it
to `<project>/.palantir-mini/plan/YYYY-MM-DD-fde-gap-report-<slug>.md`.

Returns the absolute file path for user navigation.

**HARD READ-ONLY INVARIANT**: The report is recommendation-only. This skill
NEVER writes mutation authority tokens. The markdown output carries a clear
header: "RECOMMENDATION ONLY — no mutation authority."

**`finalRecommendation === "ready-for-implementation"` ONLY when**:
- `submissionCriteriaNeedsHumanReview.length === 0`, AND
- No criterion has `passed === false && weightedContribution > 0`, AND
- No blocking gap in the session.

**NOT in MCP TOOLS array**: `grade_fde_readiness` and the report renderer are
NOT public MCP tools. This skill is the only authorized invocation path.

## When to use

- After `pm-fde-grade` produces an `FDEGapReportDetailed`, write it to a plan
  file for asynchronous review by Lead or human reviewers.
- Before requesting semantic approval from stakeholders.
- Generating audit evidence for the FDE governance review.

## Session-first invariant

Render reports from a session-first chain: `ontology_context_query` preview,
optional SIC/DTC refs, `pm-fde-grade`, then this report. Project docs and
`/home/palantirkc/docs/**` may be cited as `reference_only` /
`not_promoted` evidence, but this report must not promote them to source of
truth.

## How to invoke

```typescript
import { renderFDEGapReportMarkdown } from
  "lib/fde-build/gap-report-builder";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { resolvePlanRoot } from "lib/plan-root/resolve-plan-root";

// 1. Grade the session (pm-fde-grade step).
const report = await handleGradeFDEReadiness({ session, criteriaInUse });

// 2. Render to markdown.
const markdown = renderFDEGapReportMarkdown(report);

// 3. Write to plans dir.
const date = new Date().toISOString().slice(0, 10);
const slug = session.project.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const plansDir = resolvePlanRoot({ projectRoot: session.projectRoot ?? process.cwd() });
mkdirSync(plansDir, { recursive: true });
const filePath = join(plansDir, `${date}-fde-gap-report-${slug}.md`);
writeFileSync(filePath, markdown, "utf-8");
// Return filePath to user.
```

## Output

An absolute path to the written markdown file, e.g.:
`/home/palantirkc/.palantir-mini/plan/2026-05-14-fde-gap-report-my-project.md`

The file contains:
- Executive summary
- Overall score table
- 4 scorecard tables (ontology / chatbot / AI FDE MCP / governance+eval)
- Submission criteria needing human review
- Prioritized backlog (top 10)
- Risk register (high/blocking items)
- Branch + release plan (if declared)
- Eval plan (if declared)

## Hard invariants

1. The markdown document header includes: "Recommendation Only: YES (no mutation authority)".
2. `finalRecommendation: "ready-for-implementation"` is NEVER written unless
   both `submissionCriteriaNeedsHumanReview` is empty AND no criterion failed.
3. No `commitToken`, `applyToken`, `approvalToken`, or `authorizeMutation` appears
   in the markdown output.
4. The file is written to `<project>/.palantir-mini/plan/` (plugin-layer
   durable synthesis target). Legacy `~/.claude/plans/` remains readable
   provenance only. NEVER write this report to `~/docs/` or `research/`.
5. This skill is NOT callable via MCP TOOLS; only via direct lib import.

## Related skills

- `pm-fde-session-preview` — compose the session.
- `pm-fde-grade` — grade the session (required first step).
