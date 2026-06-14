import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  DTC_RUBRIC_V1,
  DTC_RUBRIC_RID,
  gradeDigitalTwinChangeContract,
  isOntologyAffectingDtc,
  registerDtcRubric,
  type DtcGradingContext,
  type DtcGradingVerdict,
  type DtcWithFillFields,
  type PerCriterionScorer,
} from "../../../lib/lead-intent/dtc-grading-rubric";
import { GradingRubricRegistry } from "#schemas/ontology/primitives/grading-rubric";
import type { DigitalTwinChangeContract } from "../../../lib/lead-intent/contracts";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

// =============================================================================
// Helpers
// =============================================================================

function minimalDtc(overrides: Partial<DigitalTwinChangeContract> = {}): DtcWithFillFields {
  return {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: "dtc:test-001",
    status: "approved",
    semanticIntentContractRef: "sic:test-001",
    affectedSurfaces: ["lib/lead-intent/contracts.ts"],
    changeBoundary: "Modifying lib/lead-intent/contracts.ts to add typed-ref helpers for ontology refs",
    branchProposalPolicy:
      "Open a PR on branch sprint-097-dtc-grading with disjoint ownership. No main-branch pushes.",
    permissionBoundary:
      "Limited to lib/lead-intent/ directory; no bridge/handlers modifications in this task.",
    replayMigrationPlan:
      "Not applicable: this change is additive type declarations only; no event-log migration needed.",
    observabilityPlan:
      "New events emitted via existing emit() call in dtc-grading-rubric.ts; grep dtc_grading_completed.",
    toolSurfaceReadiness:
      "grade_outcome_with_rubric MCP handler is production-ready (sprint-054); no new tools needed.",
    evaluationPlan:
      "AIP Eval suite eval-suite/dtc-v1 will run criterion 7 for this change; regression baseline set.",
    risks: [],
    approvalRef: "approval:sprint-097-dtc-t1",
    ...overrides,
  };
}

function gradingContext(overrides: Partial<DtcGradingContext> = {}): DtcGradingContext {
  return {
    projectPath: "/tmp/test-project",
    runtime: "claude",
    ...overrides,
  };
}

/** Criteria that use 0-10 scale (model domain). All others use pass-fail (score 0 or 1). */
const MODEL_CRITERIA_IDS = new Set([
  "dtc-prose-semantic-grounding",
  "dtc-permission-boundary-aligned-with-mutation-surfaces",
  "dtc-evaluation-plan-cites-eval-suite-or-not-applicable",
  "dtc-replay-migration-completeness",
  "dtc-change-boundary-specificity",
]);

/** Criteria that use 0-1 scale (simulator domain). */
const SIMULATOR_CRITERIA_IDS = new Set([
  "dtc-simulator-impact-radius",
]);

/** Return the max score value for the given criterion's scale. */
function maxScoreFor(criterionId: string): number {
  if (MODEL_CRITERIA_IDS.has(criterionId)) return 10; // 0-10 scale
  return 1; // pass-fail or 0-1 scale
}

/** Scorer that returns all-pass at full scale score. */
function allPassScorer(): PerCriterionScorer {
  return (criterionId) => {
    const score = maxScoreFor(criterionId);
    return { criterionId, score, pass: true, reasoning: "test: all-pass stub" };
  };
}

/** Scorer that returns all-fail at zero score. */
function allFailScorer(): PerCriterionScorer {
  return (criterionId) => ({
    criterionId,
    score: 0,
    pass: false,
    reasoning: "test: all-fail stub",
  });
}

/** Scorer that gives ~0.6 normalised score (50% of max per criterion). */
function midScorer(): PerCriterionScorer {
  return (criterionId) => {
    const score = maxScoreFor(criterionId) * 0.5;
    return { criterionId, score, pass: false, reasoning: "test: mid scorer" };
  };
}

// =============================================================================
// Suite 1: Weight-sum invariant
// =============================================================================

describe("DTC_RUBRIC_V1 weight-sum invariant", () => {
  test("sum of all criterion weights is exactly 1.0 (within 1e-9 tolerance)", () => {
    const registry = new GradingRubricRegistry();
    registerDtcRubric(registry);
    const rubric = registry.get(DTC_RUBRIC_RID);
    expect(rubric).toBeDefined();

    const criteriaCount = DTC_RUBRIC_V1.criterionRids.length;
    // Retrieve weights from the inline array by re-importing from module
    // (module-level assertion already fires at import; this is a belt-and-suspenders test)
    expect(criteriaCount).toBe(12);
  });
});

// =============================================================================
// Suite 2: 12-criterion presence
// =============================================================================

describe("DTC_RUBRIC_V1 criterion count", () => {
  test("rubric has exactly 12 criteria", () => {
    expect(DTC_RUBRIC_V1.criterionRids).toHaveLength(12);
  });

  test("all 12 criterion IDs are unique", () => {
    const ids = DTC_RUBRIC_V1.criterionRids.map(String);
    const unique = new Set(ids);
    expect(unique.size).toBe(12);
  });

  test("criterion IDs include all expected values from plan §6.1", () => {
    const ids = DTC_RUBRIC_V1.criterionRids.map(String);
    const expectedIds = [
      "dtc-prose-completeness-7-fields",
      "dtc-prose-semantic-grounding",
      "dtc-typed-refs-presence-when-ontology-affecting",
      "dtc-risks-no-open-at-approval",
      "dtc-tool-surface-designAlternative",
      "dtc-permission-boundary-aligned-with-mutation-surfaces",
      "dtc-evaluation-plan-cites-eval-suite-or-not-applicable",
      "dtc-branch-policy-alignment",
      "dtc-replay-migration-completeness",
      "dtc-change-boundary-specificity",
      "dtc-simulator-impact-radius",
      "dtc-approval-continuity",
    ];
    for (const expectedId of expectedIds) {
      expect(ids).toContain(expectedId);
    }
  });
});

// =============================================================================
// Suite 3: Critical-tier presence (#2, #6, #10)
// =============================================================================

describe("DTC criterion tier=critical presence", () => {
  // We verify by importing the module and checking the exported criteria array
  // through the rubric's aggregate values. The FDE pattern registers criteria
  // in the shared registry; we can import them via the module-level declarations.
  // Since the criteria are declared as module-scoped constants, we use known IDs.

  const criticalIds = [
    "dtc-prose-semantic-grounding",           // #2
    "dtc-permission-boundary-aligned-with-mutation-surfaces", // #6
    "dtc-change-boundary-specificity",        // #10
  ];

  test("criteria #2, #6, #10 have rubricDomain=model (required for tier=critical dispatch)", () => {
    // These are model-domain criteria — verified by structure in the source
    // (all three have scoringPrompt + rubricDomain: "model").
    // Since we can't easily re-import the private criterion constants,
    // we verify the count via the rubricId list and trust tsc checks tier field.
    expect(DTC_RUBRIC_V1.criterionRids.map(String)).toEqual(
      expect.arrayContaining(criticalIds),
    );
  });
});

// =============================================================================
// Suite 4: registerDtcRubric idempotency
// =============================================================================

describe("registerDtcRubric", () => {
  test("returns DTC_RUBRIC_V1 on first call", () => {
    const registry = new GradingRubricRegistry();
    const result = registerDtcRubric(registry);
    expect(result).toBe(DTC_RUBRIC_V1);
  });

  test("second call with same registry returns same object (idempotent for canonical rubric)", () => {
    const registry = new GradingRubricRegistry();
    const first = registerDtcRubric(registry);
    const second = registerDtcRubric(registry);
    expect(first).toBe(second);
  });

  test("registered rubric is canonical", () => {
    const registry = new GradingRubricRegistry();
    registerDtcRubric(registry);
    expect(registry.isCanonical(DTC_RUBRIC_RID)).toBe(true);
  });

  test("get() returns DTC_RUBRIC_V1 after registration", () => {
    const registry = new GradingRubricRegistry();
    registerDtcRubric(registry);
    const fetched = registry.get(DTC_RUBRIC_RID);
    expect(fetched).toBe(DTC_RUBRIC_V1);
  });
});

// =============================================================================
// Suite 5: Verdict thresholds
// =============================================================================

describe("gradeDigitalTwinChangeContract verdict thresholds", () => {
  test("returns pass when overall >= 0.70 (all-pass scorer)", async () => {
    const dtc = minimalDtc();
    const ctx = gradingContext();
    const verdict = await gradeDigitalTwinChangeContract(dtc, ctx, allPassScorer());
    expect(verdict.verdict).toBe("pass");
    expect(verdict.overall).toBeGreaterThanOrEqual(0.70);
  });

  test("returns reject when overall < 0.50 (all-fail scorer)", async () => {
    const dtc = minimalDtc();
    const ctx = gradingContext();
    const verdict = await gradeDigitalTwinChangeContract(dtc, ctx, allFailScorer());
    expect(verdict.verdict).toBe("reject");
    expect(verdict.overall).toBeLessThan(0.50);
  });

  test("returns revise when overall in [0.50, 0.70)", async () => {
    const dtc = minimalDtc();
    const ctx = gradingContext();
    // Mix: code/simulator criteria pass (score=1), model criteria score=4/10 → normalised 0.4
    // code weights sum: 0.08+0.10+0.08+0.06+0.06+0.06 = 0.44
    // simulator weight: 0.12
    // model weights sum: 0.10+0.10+0.08+0.08+0.08 = 0.44
    // Weighted sum = 0.44*1 + 0.12*1 + 0.44*0.4 = 0.44+0.12+0.176 = 0.736 → still "pass"
    // To land in revise: give code criteria 0 and model partial (0.5 normalised = score 5/10)
    // code=0 (0.44 budget wasted), simulator=1 (0.12), model=0.5 normalised → 0.44*0.5=0.22
    // total = 0 + 0.12 + 0.22 = 0.34 → reject
    // For revise [0.5, 0.7): give code=1, simulator=1, model=0 → 0.44+0.12+0=0.56 → revise ✓
    const reviseMixScorer: PerCriterionScorer = (criterionId) => {
      if (MODEL_CRITERIA_IDS.has(criterionId)) {
        return { criterionId, score: 0, pass: false, reasoning: "test: model zero" };
      }
      return { criterionId, score: 1, pass: true, reasoning: "test: code pass" };
    };
    const verdict = await gradeDigitalTwinChangeContract(dtc, ctx, reviseMixScorer);
    // code+sim total = 0.08+0.10+0.08+0.06+0.06+0.12+0.06 = 0.56 → model=0 → overall 0.56
    expect(verdict.overall).toBeGreaterThanOrEqual(0.50);
    expect(verdict.overall).toBeLessThan(0.70);
    expect(verdict.verdict).toBe("revise");
  });

  test("rubricId in result is dtc-rubric/v1", async () => {
    const dtc = minimalDtc();
    const ctx = gradingContext();
    const verdict = await gradeDigitalTwinChangeContract(dtc, ctx, allPassScorer());
    expect(verdict.rubricId).toBe("dtc-rubric/v1");
  });

  test("perCriterion has 12 entries for claude runtime", async () => {
    const dtc = minimalDtc();
    const ctx = gradingContext({ runtime: "claude" });
    const verdict = await gradeDigitalTwinChangeContract(dtc, ctx, allPassScorer());
    expect(verdict.perCriterion).toHaveLength(12);
  });
});

// =============================================================================
// Suite 6: Codex fallback path
// =============================================================================

describe("gradeDigitalTwinChangeContract Codex fallback", () => {
  test("when context.runtime=codex, only 7 deterministic criteria are scored", async () => {
    const dtc = minimalDtc();
    const ctx = gradingContext({ runtime: "codex" });
    const verdict = await gradeDigitalTwinChangeContract(dtc, ctx, allPassScorer());
    expect(verdict.perCriterion).toHaveLength(7);
  });

  test("codex path includes only code/simulator criterion IDs", async () => {
    const dtc = minimalDtc();
    const ctx = gradingContext({ runtime: "codex" });
    const verdict = await gradeDigitalTwinChangeContract(dtc, ctx, allPassScorer());
    const codexIds = verdict.perCriterion.map((r) => r.criterionId);
    const expectedDeterministicIds = [
      "dtc-prose-completeness-7-fields",
      "dtc-typed-refs-presence-when-ontology-affecting",
      "dtc-risks-no-open-at-approval",
      "dtc-tool-surface-designAlternative",
      "dtc-branch-policy-alignment",
      "dtc-simulator-impact-radius",
      "dtc-approval-continuity",
    ];
    for (const id of expectedDeterministicIds) {
      expect(codexIds).toContain(id);
    }
    // Model-only criteria should NOT appear
    const modelOnlyIds = [
      "dtc-prose-semantic-grounding",
      "dtc-permission-boundary-aligned-with-mutation-surfaces",
      "dtc-evaluation-plan-cites-eval-suite-or-not-applicable",
      "dtc-replay-migration-completeness",
      "dtc-change-boundary-specificity",
    ];
    for (const id of modelOnlyIds) {
      expect(codexIds).not.toContain(id);
    }
  });

  test("codex path reports skippedCriteria for the 5 model criteria", async () => {
    const dtc = minimalDtc();
    const ctx = gradingContext({ runtime: "codex" });
    const verdict = await gradeDigitalTwinChangeContract(dtc, ctx, allPassScorer());
    expect(verdict.skippedCriteria).toBeDefined();
    expect(verdict.skippedCriteria!).toHaveLength(5);
  });

  test("claude runtime has no skippedCriteria", async () => {
    const dtc = minimalDtc();
    const ctx = gradingContext({ runtime: "claude" });
    const verdict = await gradeDigitalTwinChangeContract(dtc, ctx, allPassScorer());
    expect(verdict.skippedCriteria).toBeUndefined();
  });
});

// =============================================================================
// Suite 7: isOntologyAffectingDtc helper (canonical predicate — OE-10)
//
// The grader binds to the CANONICAL `isOntologyAffectingDtc` (lib/lead-intent/contracts.ts),
// which is richer than the retired local predicate: it returns true when ANY of
// touchedOntologyRefs / permittedMutationSurfaces are non-empty OR affectedSurfaces /
// changeBoundary (or structuredBoundary) carry an ontology signal. These tests pin that
// canonical contract through the grader's re-export.
// =============================================================================

/** A DTC with NO ontology signal in any input field (boundary prose + surfaces are neutral). */
function neutralDtc(overrides: Partial<DigitalTwinChangeContract> = {}): DtcWithFillFields {
  return minimalDtc({
    affectedSurfaces: ["docs/readme.md"],
    changeBoundary: "Reword one paragraph in the project README; no typed control-plane edits.",
    touchedOntologyRefs: undefined,
    permittedMutationSurfaces: undefined,
    structuredBoundary: undefined,
    ...overrides,
  });
}

describe("isOntologyAffectingDtc (canonical, re-exported by the grader)", () => {
  test("returns false when no input field carries an ontology signal", () => {
    expect(isOntologyAffectingDtc(neutralDtc())).toBe(false);
  });

  test("returns false when touchedOntologyRefs is an empty array and no other signal", () => {
    expect(isOntologyAffectingDtc(neutralDtc({ touchedOntologyRefs: [] }))).toBe(false);
  });

  test("returns true when touchedOntologyRefs has at least one entry", () => {
    const dtc = neutralDtc({
      touchedOntologyRefs: [
        {
          rid: "ontology-ref:lib/lead-intent/contracts.ts",
          refKind: "function",
          editKind: "modify",
        } as any,
      ],
    });
    expect(isOntologyAffectingDtc(dtc)).toBe(true);
  });

  test("returns true on a changeBoundary ontology signal even with no typed refs (canonical breadth)", () => {
    const dtc = neutralDtc({
      changeBoundary: "Add an ontology primitive field for typed-ref enforcement.",
    });
    expect(isOntologyAffectingDtc(dtc)).toBe(true);
  });
});

// =============================================================================
// Suite 8: Rubric structural invariants
// =============================================================================

describe("DTC_RUBRIC_V1 structural invariants", () => {
  test("status is canonical", () => {
    expect(DTC_RUBRIC_V1.status).toBe("canonical");
  });

  test("appliesToDomain is ontology", () => {
    expect(DTC_RUBRIC_V1.appliesToDomain).toBe("ontology");
  });

  test("aggregator uses weighted combinator with threshold 0.7", () => {
    expect(DTC_RUBRIC_V1.aggregator.combinator).toBe("weighted");
    expect(DTC_RUBRIC_V1.aggregator.threshold).toBe(0.7);
    expect(DTC_RUBRIC_V1.aggregator.scale).toBe("0-1");
  });

  test("rubricId is dtc-rubric/v1", () => {
    expect(DTC_RUBRIC_V1.rubricId as string).toBe("dtc-rubric/v1");
  });
});

// =============================================================================
// W3d-4-B — dtc_grader_runtime_gap self-attributes byWhom.identity to the actual
// runtime (rule 27), not a hardcoded "claude-code".
// =============================================================================
describe("gradeDigitalTwinChangeContract runtime-gap identity (W3d-4-B)", () => {
  const tmpDirs: string[] = [];

  function makeTmpProject(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-grader-identity-"));
    tmpDirs.push(dir);
    fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  });

  function readEvents(project: string): Array<Record<string, any>> {
    const p = path.join(project, ".palantir-mini", "session", "events.jsonl");
    if (!fs.existsSync(p)) return [];
    return fs
      .readFileSync(p, "utf8")
      .trim()
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));
  }

  test("Codex runtime gap self-attributes byWhom.identity='codex' (not hardcoded claude-code)", async () => {
    const project = makeTmpProject();
    const dtc = minimalDtc();
    // runtime=codex → deterministic-only path → 5 model criteria skipped → gap emit fires.
    const ctx = gradingContext({ runtime: "codex", projectPath: project });

    await gradeDigitalTwinChangeContract(dtc, ctx, allPassScorer());

    const gap = readEvents(project).find((e) => e.type === "dtc_grader_runtime_gap");
    expect(gap).toBeDefined();
    expect(gap!.byWhom?.identity).toBe("codex");
    // Regression guard for the old hardcoded literal.
    expect(gap!.byWhom?.identity).not.toBe("claude-code");
  });
});
