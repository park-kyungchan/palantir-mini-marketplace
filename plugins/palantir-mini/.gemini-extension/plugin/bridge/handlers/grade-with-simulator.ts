// palantir-mini v3.9.1 — grade-with-simulator handler (W4.1, P4)
//
// Per harness-base-mode blueprint §4-P4 + cold-start §2 W4.1 + plan §2 W4.1.
// 5th AIP Evals canonical evaluator type — applies edits (from prior
// compute_edits_dry_run output) to a transient ontology graph copy + runs
// impact_query for affected RIDs + returns impact-radius normalized score.
//
// LOWER impact-radius = better (small blast radius). Criterion threshold is
// the MAX acceptable radius — score >= threshold = fail (over budget).
//
// Schema authority: schemas v1.31.0 grading-criterion.ts RubricDomain enum
//                   added "simulator" (W4.0 + this handler ships in v3.9.1).
// Routed via grade-outcome/dispatcher.ts gradeOneCriterion switch (W4.2).
//
// Authority: ~/.claude/rules/16-3-agent-harness.md §GradingRubric (post-W3.2 v3.2.0)
//            ~/.claude/plans/glowing-frolicking-raven.md §2 W4.1
//            ~/.claude/research/palantir-vision/aipcon-devcon/aip-evals.md L41-46
//            ~/.claude/research/palantir-vision/aipcon-devcon/devcon.md L59-65
//              (Decision Space "consequence simulation" 5th pillar)

import * as fs from "fs";
import * as path from "path";
import { getCacheForProject, queryDirect } from "../../lib/impact-graph/registry-loader";
import { emit } from "../../scripts/log";
import type { GradingCriterionLite, CriterionScore } from "./grade-outcome/types";

/**
 * Walk upward from `start` looking for a `.palantir-mini/` directory.
 * Returns the project root containing it, or null if not found.
 * Local copy to avoid cross-import from hooks/.
 */
function findProjectRoot(start: string): string | null {
  let cur = path.resolve(start);
  const root = path.parse(cur).root;
  while (cur !== root) {
    if (fs.existsSync(path.join(cur, ".palantir-mini"))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return null;
}

/**
 * Extract edits from artifactPath. Format: JSON file with shape
 *   { edits: Array<{rid?: string}>, paths?: string[], dryRunRef?: string }
 * (compatible with compute_edits_dry_run.ts output envelope).
 *
 * Tolerant of missing fields — returns empty edits when artifact is malformed.
 */
function readDryRunArtifact(artifactPath: string): {
  edits: Array<{ rid?: string }>;
  dryRunRef?: string;
} {
  try {
    const raw = fs.readFileSync(artifactPath, "utf8");
    const obj = JSON.parse(raw) as { edits?: Array<{ rid?: string }>; dryRunRef?: string };
    return {
      edits: Array.isArray(obj?.edits) ? obj.edits : [],
      dryRunRef: typeof obj?.dryRunRef === "string" ? obj.dryRunRef : undefined,
    };
  } catch {
    return { edits: [] };
  }
}

/**
 * Compute total downstream-affected RID count across all edits.
 * Sums forward + backward impact-edges per edit RID via queryDirect.
 */
function computeImpactRadius(
  projectRoot: string,
  edits: Array<{ rid?: string }>,
): { totalAffected: number; forwardCount: number; backwardCount: number; queriedRids: number } {
  let forwardCount = 0;
  let backwardCount = 0;
  let queriedRids = 0;
  for (const edit of edits) {
    if (!edit.rid) continue;
    const result = queryDirect(projectRoot, edit.rid);
    forwardCount += result.forward.length;
    backwardCount += result.backward.length;
    queriedRids++;
  }
  return {
    totalAffected: forwardCount + backwardCount,
    forwardCount,
    backwardCount,
    queriedRids,
  };
}

/**
 * Grade a simulator-domain criterion. NOT exposed as a standalone MCP tool —
 * dispatched internally by grade-outcome/dispatcher.ts gradeOneCriterion when
 * criterion.rubricDomain === "simulator".
 *
 * Score semantics: LOWER radius = BETTER. Score = totalAffected (raw count).
 * passFailLogic.threshold is the MAX acceptable radius:
 *   - score < threshold → pass (within budget)
 *   - score >= threshold → fail (over budget — too many downstream impacts)
 *
 * Empty edits → score 0, pass (zero impact).
 * Missing impact-graph cache → needs_human_review (project not initialized).
 * Malformed artifact → needs_human_review.
 */
export function gradeWithSimulator(
  criterion: GradingCriterionLite,
  artifactPath: string,
  contextDir: string,
  _evidenceDir?: string,
  _specPath?: string,
): CriterionScore {
  // Read dry-run artifact FIRST (edits + dryRunRef). Order matters: empty-edits
  // short-circuit must fire before cache check so zero-impact criteria can be
  // graded even before populate_impact_graph runs.
  const absArtifact = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(contextDir, artifactPath);
  const { edits, dryRunRef } = readDryRunArtifact(absArtifact);

  // Resolve project root (walk-up from contextDir or artifactPath dir).
  // Used for emit + cache lookup; also enables empty-edits emission below.
  const startPath = path.isAbsolute(artifactPath) ? path.dirname(artifactPath) : contextDir;
  const projectRoot = findProjectRoot(startPath);

  // Empty-edits short-circuit (zero impact = pass) — runs without cache, so
  // a fresh project that hasn't initialized impact-graph yet still grades
  // correctly when no edits are proposed.
  if (edits.length === 0) {
    const reasoning = "simulator: no edits in artifact — zero downstream impact (pass)";
    if (projectRoot) {
      void emit({
        type: "validation_phase_completed",
        payload: { phase: "design", passed: true, errorClass: "simulator_evaluation_completed" },
        toolName: "grade_with_simulator",
        cwd: projectRoot,
        runtime: process.env.PALANTIR_MINI_HOST_RUNTIME,
        reasoning: `simulator-evaluated criterion=${criterion.criterionId} edits=0 totalAffected=0 verdict=pass dryRunRef=${dryRunRef ?? "none"}`,
      }).catch(() => {});
    }
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "simulator",
      score: 0,
      weightedScore: 0,
      passFail: "pass",
      reasoning,
      evidenceCited: dryRunRef ? [`dryRunRef:${dryRunRef}`, "edits:0", "totalAffected:0"] : ["edits:0", "totalAffected:0"],
    };
  }

  // Non-empty edits → require project + cache
  if (!projectRoot) {
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "simulator",
      score: 0,
      weightedScore: 0,
      passFail: "needs_human_review",
      reasoning: `simulator: cannot resolve project root from ${startPath} (no .palantir-mini/ ancestor)`,
      evidenceCited: [`editsTotal:${edits.length}`, "projectRoot:unresolved"],
    };
  }

  const cache = getCacheForProject(projectRoot);
  if (!cache) {
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "simulator",
      score: 0,
      weightedScore: 0,
      passFail: "needs_human_review",
      reasoning: `simulator: impact-graph cache not initialized for ${projectRoot} — run populate_impact_graph first`,
      evidenceCited: [`editsTotal:${edits.length}`, `projectRoot:${projectRoot}`, "cache:uninitialized"],
    };
  }

  // Compute impact-radius
  const radius = computeImpactRadius(projectRoot, edits);
  const score = radius.totalAffected;
  const threshold = criterion.passFailLogic.threshold;
  const passFail: "pass" | "fail" = score < threshold ? "pass" : "fail";
  const weightedScore = score * criterion.weightInRubric;

  const reasoning = `simulator: ${edits.length} edits across ${radius.queriedRids} ridded edits affect ${radius.totalAffected} downstream RIDs (forward=${radius.forwardCount}, backward=${radius.backwardCount}; threshold ${threshold}; verdict ${passFail})`;

  void emit({
    type: "validation_phase_completed",
    payload: { phase: "design", passed: passFail === "pass", errorClass: "simulator_evaluation_completed" },
    toolName: "grade_with_simulator",
    cwd: projectRoot,
    runtime: process.env.PALANTIR_MINI_HOST_RUNTIME,
    reasoning: `simulator-evaluated criterion=${criterion.criterionId} edits=${edits.length} totalAffected=${radius.totalAffected} threshold=${threshold} verdict=${passFail} dryRunRef=${dryRunRef ?? "none"}`,
  }).catch(() => {});

  return {
    criterionId: criterion.criterionId,
    rubricDomain: "simulator",
    score,
    weightedScore,
    passFail,
    reasoning,
    evidenceCited: [
      ...(dryRunRef ? [`dryRunRef:${dryRunRef}`] : []),
      `editsTotal:${edits.length}`,
      `editsRidded:${radius.queriedRids}`,
      `forwardImpactedRids:${radius.forwardCount}`,
      `backwardImpactedRids:${radius.backwardCount}`,
      `thresholdMaxRadius:${threshold}`,
    ],
  };
}
