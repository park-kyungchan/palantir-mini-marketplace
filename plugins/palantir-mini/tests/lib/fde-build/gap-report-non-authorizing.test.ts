// palantir-mini sprint-138 Slice 3.B — gap-report non-authorizing invariant tests
import { describe, test, expect } from "bun:test";
import { buildFDEGapReportDetailed } from "../../../lib/fde-build/gap-report-builder";
import { gradeFDEReadiness } from "../../../lib/fde-build/rubric-grader";
import type { FDEOntologyBuildSession } from "../../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import { FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION } from "../../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import type { FDEGapReportDetailed } from "../../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-gap-report";

// =============================================================================
// Helpers
// =============================================================================

function makeMinimalSession(): FDEOntologyBuildSession {
  return {
    schemaVersion: FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION,
    sessionRid: "session:test:minimal",
    project: "/test/project",
    composedAt: "2026-05-14T00:00:00.000Z",
    mutationAuthorized: false,
    readOnly: true,
    readiness: "not-ready",
    requiresDigitalTwinChangeContract: false,
    plainLanguageStatus: "Minimal test session.",
    objectTypes: [],
    linkTypes: [],
    actionWriteback: [],
    functions: [],
    chatbotStudio: [],
    completedLevels: [],
    topGaps: [],
    allGaps: [],
  };
}

async function buildReport(
  sessionOverride: Partial<FDEOntologyBuildSession> = {},
  submissionCriteriaNeedsHumanReview: readonly string[] = [],
): Promise<FDEGapReportDetailed> {
  const session: FDEOntologyBuildSession = {
    ...makeMinimalSession(),
    ...sessionOverride,
  };
  const gradeResult = await gradeFDEReadiness({ session });
  return buildFDEGapReportDetailed({
    session,
    scorecard: gradeResult.perCriterion,
    overallScore: gradeResult.overallScore,
    overallThreshold: gradeResult.overallThreshold,
    overallPassed: gradeResult.overallPassed,
    submissionCriteriaNeedsHumanReview,
    nowIso: "2026-05-14T10:00:00.000Z",
  });
}

// =============================================================================
// Non-authorizing invariants
// =============================================================================

describe("FDEGapReportDetailed non-authorizing invariants", () => {
  test("report.recommendationOnly === true (literal)", async () => {
    const report = await buildReport();
    expect(report.recommendationOnly).toBe(true);
  });

  test("report has no commitToken field", async () => {
    const report = await buildReport();
    expect((report as unknown as Record<string, unknown>)["commitToken"]).toBeUndefined();
  });

  test("report has no applyToken field", async () => {
    const report = await buildReport();
    expect((report as unknown as Record<string, unknown>)["applyToken"]).toBeUndefined();
  });

  test("report has no approvalToken field", async () => {
    const report = await buildReport();
    expect((report as unknown as Record<string, unknown>)["approvalToken"]).toBeUndefined();
  });

  test("report has no authorizeMutation field", async () => {
    const report = await buildReport();
    expect((report as unknown as Record<string, unknown>)["authorizeMutation"]).toBeUndefined();
  });

  test("finalRecommendation enum excludes 'ready-for-production'", async () => {
    const report = await buildReport();
    const validValues = [
      "hold-design",
      "ready-for-semantic-approval",
      "ready-for-implementation",
      "ready-for-evaluation",
    ];
    expect(validValues).toContain(report.finalRecommendation);
    expect(report.finalRecommendation).not.toBe("ready-for-production");
  });
});

describe("FDEGapReportDetailed recommendation ladder invariants", () => {
  test("needs-review non-empty → finalRecommendation NOT 'ready-for-implementation'", async () => {
    const report = await buildReport(
      {},
      ["writebackOnlyApprovedActions"], // non-empty needs-review
    );
    expect(report.finalRecommendation).not.toBe("ready-for-implementation");
    expect(report.submissionCriteriaNeedsHumanReview).toContain(
      "writebackOnlyApprovedActions",
    );
  });

  test("needs-review non-empty → finalRecommendation is 'ready-for-semantic-approval' (cap)", async () => {
    const report = await buildReport({}, ["someDeferred"]);
    expect(report.finalRecommendation).toBe("ready-for-semantic-approval");
  });

  test("empty session + no needs-review → finalRecommendation is 'hold-design' (overallPassed=false)", async () => {
    const report = await buildReport({}, []);
    // Empty session → all model criteria score=0 → overallPassed=false → hold-design
    expect(report.overallPassed).toBe(false);
    expect(report.finalRecommendation).toBe("hold-design");
  });

  test("overallScore and overallThreshold present and numeric", async () => {
    const report = await buildReport();
    expect(typeof report.overallScore).toBe("number");
    expect(typeof report.overallThreshold).toBe("number");
    expect(report.overallThreshold).toBe(0.70);
  });

  test("4 scorecard slices cover all 17 criteria", async () => {
    const report = await buildReport();
    const total =
      report.ontologyScorecard.length +
      report.chatbotScorecard.length +
      report.aiFdeMcpScorecard.length +
      report.governanceEvalScorecard.length;
    expect(total).toBe(17);
  });

  test("schemaVersion matches constant", async () => {
    const report = await buildReport();
    expect(report.schemaVersion).toBe(
      "palantir-mini/fde-gap-report-detailed/v1",
    );
  });
});

describe("buildFDEGapReportDetailed — forced-pass scenario", () => {
  test("all criteria passed + no needs-review + no blocking gap → ready-for-evaluation or ready-for-implementation", async () => {
    const session = makeMinimalSession();
    // Build a synthetic scorecard where all criteria pass.
    const gradeResult = await gradeFDEReadiness({ session });
    // Override all scores to pass.
    const allPassScorecard = gradeResult.perCriterion.map((c) => ({
      ...c,
      score: c.threshold,
      passed: true,
      weightedContribution: c.weightInRubric, // 100% of weight
    }));
    const overallScore = 1.0; // perfect

    const report = buildFDEGapReportDetailed({
      session,
      scorecard: allPassScorecard,
      overallScore,
      overallThreshold: 0.70,
      overallPassed: true,
      submissionCriteriaNeedsHumanReview: [],
      nowIso: "2026-05-14T10:00:00.000Z",
    });

    expect(report.overallPassed).toBe(true);
    expect(["ready-for-evaluation", "ready-for-implementation"]).toContain(
      report.finalRecommendation,
    );
    expect(report.recommendationOnly).toBe(true);
  });
});
