/**
 * @stable — GradingCriterion primitive (prim-data-08, v1.42.0)
 *
 * Single rubric axis. Instances aggregate into a GradingRubric (composition
 * pattern: rubric = ordered Set<GradingCriterion> with sum of weights = 1).
 * Follows Palantir AIP Evals 5-evaluator taxonomy (code / rule / model /
 * human / hybrid) — a generalization of Prithvi's 4-criteria rubric
 * (Design / Originality / Craft / Functionality) which is recoverable as
 * a frontend-domain rubric instance.
 *
 * v1.42.0 (sprint-047 W2.A.4) — adds 5-level `tier` field via
 * `GraderEffortLevel` enum to express grader-effort routing (Sonnet 4.6 /
 * Opus 4.7 + GPT-5.5 effort ladder). Backwards-compat: rubrics that
 * previously used informal binary `tier="default" | "critical"` map to
 * `"normal" | "critical"`; missing `tier` is treated as `"normal"`.
 *
 * Design rationale (user intent 2026-04-20):
 *   "앞으로 palantir-mini Ontology 기반으로 수많은 프로젝트들을 생성할 것인데,
 *    유지/보수/확장을 고려할 때 가장 좋은 판단을 해야한다. AIP Evals 패턴기반
 *    으로 더 좋은 판단 해봐."
 *   → Criterion primitive is the composable atom; rubrics are assembled
 *     per-domain from criteria. Prithvi's 4 criteria are a frontend preset.
 *     3D-scene/mathcrew gets its own 5-criteria preset. Ontology audit gets
 *     its own. All share the same Criterion primitive structure.
 *
 * Authority:
 *   - research/palantir-foundry/aip/aip-evals-*.md (10 docs, verbatim official)
 *     in particular: aip-evals-create-suite.md, aip-evals-intermediate-
 *     parameters.md, aip-evals-analyze-run-results.md
 *   - research/palantir-vision/aipcon-devcon/aip-evals.md (interpretation
 *     layer; 5-evaluator-type mapping to LEARN-02 in our ontology)
 *
 * D/L/A domain: DATA (declarative rubric spec — stored fact, not logic,
 * not a mutation; composes into rubrics but each criterion is atomic data)
 * @owner palantirkc-ontology
 * @purpose AIP Evals-aligned grading criterion primitive
 */

export type GradingCriterionRid = string & { readonly __brand: "GradingCriterionRid" };

export const gradingCriterionRid = (s: string): GradingCriterionRid =>
  s as GradingCriterionRid;

/**
 * AIP Evals 6-evaluator taxonomy (v1.31.0 W4 P4 added "simulator" — 5th AIP
 * Evals canonical evaluator type per `~/.claude/research/palantir-vision/
 * aipcon-devcon/aip-evals.md` lines 41-46). Core insight: different criteria
 * need different scoring mechanisms, and the primitive must support all.
 *
 *   code      — deterministic assertion (regex, shell exit code, HTTP status,
 *               test runner pass/fail). Use validationExpression.
 *   rule      — JSONSchema conformance, regex match against evidence text.
 *               Use validationExpression.
 *   model     — LLM judge with rubric prompt + expected structured output.
 *               Use scoringPrompt.
 *   human     — manual review marker; no automated score. Surfaces for user.
 *               No expression needed.
 *   hybrid    — composes ≥2 of above via subCriteriaRids + combinator logic.
 *   simulator — apply edits to a transient ontology graph copy, run
 *               impact_query for affected RIDs, return impact-radius
 *               normalized score (LOWER radius = better). Use
 *               validationExpression as JSON config:
 *               {dryRunHandlerArgs, impactRadiusScale}. v1.31.0 W4 NEW.
 */
/**
 * `visual` — screenshot-diff / Playwright-evidence scoring. Pairs with
 * `grade-outcome/visual.ts` handler which reads evidenceDir for PNG snapshots
 * produced by `run_playwright_scenario` MCP and returns a CriterionScore.
 * Full Playwright integration is W4+; W3.E ships the stub + domain enum.
 */
export type RubricDomain = "code" | "rule" | "model" | "human" | "hybrid" | "simulator" | "visual";

/**
 * Applicability scope — limits where this criterion may be applied.
 * Prevents applying a frontend design-quality rubric to a 3D scene or an
 * ontology-audit. "any" opts out of scoping (use sparingly).
 */
export type CriterionApplicability =
  | "frontend"
  | "backend"
  | "3d-scene"
  | "ontology"
  | "teaching"
  | "cli"
  | "api"
  | "infrastructure"
  | "any";

export interface PassFailLogic {
  /** Minimum score value for PASS (inclusive) */
  readonly threshold: number;
  /** Score scale */
  readonly scale: "0-1" | "0-10" | "pass-fail";
  /**
   * For rubricDomain="hybrid": how sub-criterion scores combine.
   *   min       — worst sub-score wins (strictest)
   *   avg       — arithmetic mean
   *   weighted  — use each sub's weightInRubric (weighted average)
   *   all-pass  — all sub-criteria must PASS for PASS
   */
  readonly combinator?: "min" | "avg" | "weighted" | "all-pass";
}

export interface GradingCriterionDeclaration {
  readonly criterionId: GradingCriterionRid;
  readonly title: string;
  readonly description: string;
  readonly rubricDomain: RubricDomain;
  readonly passFailLogic: PassFailLogic;
  /**
   * Relative weight within its parent rubric. Rubric-level invariant:
   * sum of weights across criteria in a rubric = 1.0. Prithvi's frontend
   * preset: Design 0.3 / Originality 0.2 / Craft 0.3 / Functionality 0.2.
   */
  readonly weightInRubric: number;
  /**
   * JSONSchema (JSON-serialized as string for RID-safety) describing what
   * Evaluator must attach as evidence when scoring this criterion
   * (screenshots, log excerpts, assertion outputs, stack traces, etc.).
   */
  readonly evidenceSchema: string;
  /**
   * For rubricDomain="model": LLM judge prompt template.
   * Supports placeholders: {{artifact}}, {{spec}}, {{rubric}},
   * {{evidence}}, {{scale}}. Output must match evidenceSchema.
   */
  readonly scoringPrompt?: string;
  /**
   * For rubricDomain="code" or "rule": deterministic expression.
   *   code  — shell command, exit 0 = PASS, non-zero = FAIL (exit code
   *           scaled to score via passFailLogic.scale)
   *   rule  — regex pattern OR JSONSchema (detect via leading `^` vs `{`)
   */
  readonly validationExpression?: string;
  /** Domain scope — criterion only applies when target is this domain */
  readonly appliesToDomain: CriterionApplicability;
  /**
   * For rubricDomain="hybrid": ordered sub-criterion references. Each
   * sub is another GradingCriterion; combinator drives resolution.
   *
   * Field-name compatibility (plugin v2.13.2+, B-29 harness-h4 canary):
   * `grade_outcome_with_rubric` handler also accepts the short-form alias
   * `subCriteria` on the input rubric. Canonical name for new rubrics is
   * `subCriteriaRids` (this schema); the alias exists to accommodate
   * Planner-authored rubrics in the wild using the shorter form. Prefer
   * `subCriteriaRids` when authoring new rubrics by hand.
   */
  readonly subCriteriaRids?: readonly string[];
  /**
   * Optional provenance — cites AIP Evals or Prithvi original by URL/path.
   * Surfaces in replay_lineage for rubric auditing.
   */
  readonly provenance?: string;
  /**
   * v1.35.0+ Optional restriction — criterion only applies when the agent
   * being graded is operating in one of the listed agentic memory layers.
   * Absent / empty array → applies to all memory modes (default).
   *
   * Rule cross-ref: rule 26 §Axis E.
   */
  readonly memoryLayerApplicability?: readonly import("./agentic-memory-layer").AgenticMemoryLayer[];
  /**
   * v1.42.0+ Optional grader-effort tier — drives `pm_grader_dispatch`
   * model selection + Claude Code CLI `/effort` flag mapping.
   *
   * 5-level enum (`GraderEffortLevel`):
   *   - `none`     — deterministic-only criterion (skip model call;
   *                   evaluate `validationExpression` directly).
   *   - `low`      — default thinking, low budget (cheapest model path).
   *   - `normal`   — Sonnet 4.6 default (matches pre-v1.42 binary
   *                   `tier="default"` semantics).
   *   - `high`     — Sonnet 4.6 with `/effort high` (extended thinking on).
   *   - `critical` — Opus 4.7 with `/effort xhigh` (deepest reasoning;
   *                   matches pre-v1.42 binary `tier="critical"` semantics).
   *
   * Backwards-compat: rubrics authored before v1.42 omitted this field;
   * graders MUST treat absent `tier` as `"normal"`. Rubrics that used the
   * informal string literal `"default"` map to `"normal"`.
   *
   * Rule cross-refs: rule 16 v4.1.0 §Roles (`pm_grader_dispatch` Sonnet
   * 4.6 / Opus 4.7 split); rule 26 v1.0.0 §Axis B (Verifiable).
   *
   * Authority: research/anthropic/opus-4-7-whats-new-platform.md (xhigh)
   * + research/openai/gpt-5-5-introducing-2026-04-23.md (5-level enum).
   */
  readonly tier?: import("./grader-effort").GraderEffortLevel;
}

export class GradingCriterionRegistry {
  private readonly items = new Map<GradingCriterionRid, GradingCriterionDeclaration>();

  register(decl: GradingCriterionDeclaration): void {
    this.items.set(decl.criterionId, decl);
  }

  get(rid: GradingCriterionRid): GradingCriterionDeclaration | undefined {
    return this.items.get(rid);
  }

  byDomain(domain: CriterionApplicability): GradingCriterionDeclaration[] {
    return [...this.items.values()].filter(
      (c) => c.appliesToDomain === domain || c.appliesToDomain === "any",
    );
  }

  byRubricDomain(rd: RubricDomain): GradingCriterionDeclaration[] {
    return [...this.items.values()].filter((c) => c.rubricDomain === rd);
  }

  keys(): IterableIterator<GradingCriterionRid> {
    return this.items.keys();
  }

  list(): GradingCriterionDeclaration[] {
    return [...this.items.values()];
  }
}

export const GRADING_CRITERION_REGISTRY = new GradingCriterionRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "over-specified",
  foundryType: "GradingCriterion (AIP Evals 5-evaluator)",
  extensions: ["hybrid", "simulator", "visual"],
};
export { categoryFoundryEquivalent as gradingCriterionFoundryEquivalent };
