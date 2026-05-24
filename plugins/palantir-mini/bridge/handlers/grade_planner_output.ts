// palantir-mini v2.18.0 — W1 Planner Output Meta-Rubric
// Domain: LEARN (prim-learn-02 evaluation / cheeky-wandering-yeti.md Gap 4)
//
// Grades harness-planner's spec.md against a 3-axis meta-rubric:
//   - featureCount:     ≥12 required for "pass"
//   - designSpecificity: 0 (vague) | 1 (medium) | 2 (exact hex/font)
//   - antiPatternCount: ≥3 anti-pattern callouts for "pass"
//
// Emits `planner_output_graded` event (schemas v1.23.0) per invocation.
// Consumed by pm-harness-plan skill — verdict="block" alerts Lead before
// Generator begins.

import * as fs from "fs";
import { emit } from "../../scripts/log";

export type MetaVerdict = "pass" | "warn" | "block";

export interface GradePlannerOutputArgs {
  specPath: string;
  rubricPath?: string;
  projectPath?: string;
  agentName?: string;
}

export interface MetaScores {
  featureCount: number;
  designSpecificity: 0 | 1 | 2;
  antiPatternCount: number;
}

export interface GradePlannerOutputResult {
  verdict: MetaVerdict;
  metaScores: MetaScores;
  reasoning: string;
  emittedEventCount: number;
}

export function computeMetaScores(spec: string): MetaScores {
  const featureCount = (
    spec.match(/^###\s+F-?\d+|^-\s+\*\*F\d+\b|^###\s+(?:Must|Should|Nice)\b/gm) ?? []
  ).length;
  const hexCount = (spec.match(/#[0-9a-fA-F]{6}\b/g) ?? []).length;
  const fontCount = (spec.match(/font-family\s*[:=]/gi) ?? []).length;
  const specificityHits = hexCount + fontCount;
  const designSpecificity: 0 | 1 | 2 = specificityHits >= 3 ? 2 : specificityHits >= 1 ? 1 : 0;
  const antiPatternCount = (spec.match(/anti[- ]pattern|avoid\b|❌|never\s+/gi) ?? []).length;
  return { featureCount, designSpecificity, antiPatternCount };
}

export function metaVerdict(scores: MetaScores): MetaVerdict {
  if (scores.featureCount >= 12 && scores.designSpecificity === 2 && scores.antiPatternCount >= 3) {
    return "pass";
  }
  if (scores.featureCount >= 8 && scores.antiPatternCount >= 1) return "warn";
  return "block";
}

export async function gradePlannerOutput(
  args: GradePlannerOutputArgs,
): Promise<GradePlannerOutputResult> {
  if (!fs.existsSync(args.specPath)) {
    throw new Error(`grade_planner_output: spec not found at ${args.specPath}`);
  }
  const spec = fs.readFileSync(args.specPath, "utf8");
  const metaScores = computeMetaScores(spec);
  const verdict = metaVerdict(metaScores);
  const reasoning =
    `featureCount=${metaScores.featureCount} (pass≥12); ` +
    `designSpecificity=${metaScores.designSpecificity} (pass=2); ` +
    `antiPatternCount=${metaScores.antiPatternCount} (pass≥3) → ${verdict}`;

  await emit({
    type: "planner_output_graded",
    payload: {
      specPath: args.specPath,
      ...(args.rubricPath !== undefined ? { rubricPath: args.rubricPath } : {}),
      metaScores,
      verdict,
    },
    toolName: "grade_planner_output",
    cwd: args.projectPath ?? "",
    agentName: args.agentName,
    reasoning,
    hypothesis:
      "Planner meta-rubric catches drift toward safe under-scoped specs before Generator begins, closing Part 2 Gap 4.",
  });

  return { verdict, metaScores, reasoning, emittedEventCount: 1 };
}

export default async function gradePlannerOutputHandler(
  rawArgs: unknown,
): Promise<GradePlannerOutputResult> {
  return gradePlannerOutput((rawArgs ?? {}) as GradePlannerOutputArgs);
}
