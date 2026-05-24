import { describe, expect, test } from "bun:test";
import {
  buildSequenceContext,
  createSequencerDraft,
  evaluateLectureGovernance,
  ingestProblem,
  runPresenterReadinessCheck,
  type SolutionStep,
} from "../../lib/education/lecture-delivery";
import {
  formatLectureKernelEvalReport,
  runLectureKernelEvalSuite,
  type LectureKernelEvalCase,
} from "../../lib/education/lecture-kernel-eval-suite";
import suiteDeclaration from "../../eval-suites/lecture-delivery-kernel-v0.json";

function problem() {
  return ingestProblem({
    problemId: "lecture-kernel-fixture",
    title: "Lecture Kernel Fixture",
    prompt: "Explain a one-step algebraic transformation.",
    source: "fixture",
    learningObjectives: ["Explain the transformation as a sequence step."],
  });
}

const steps: SolutionStep[] = [
  {
    stepId: "step-1",
    title: "Transform",
    body: "Apply the declared transformation.",
    mathStatements: ["a = b"],
    evidenceRefs: ["fixture:solution-step-1"],
  },
];

function approvedDraft() {
  const sequence = buildSequenceContext(problem(), steps);
  return createSequencerDraft(sequence, {
    teacherApproval: {
      status: "approved",
      approvedBy: "eval",
      approvedAt: "2026-05-11T04:00:00.000Z",
      notes: [],
    },
  });
}

function makeEvalCases(): LectureKernelEvalCase[] {
  return [
    {
      id: "testcase:lecture-problem-ingestion",
      title: "LectureProblem ingestion preserves problem identity",
      category: "ingestion",
      run() {
        const ingested = problem();
        return {
          passed: ingested.problemId === "lecture-kernel-fixture",
          details: "Problem identity is deterministic.",
          metrics: { objectiveCount: ingested.learningObjectives.length },
        };
      },
    },
    {
      id: "testcase:solution-step-sequence-context",
      title: "SolutionStep compiles into LectureSequenceStep",
      category: "sequence",
      run() {
        const sequence = buildSequenceContext(problem(), steps);
        return {
          passed:
            sequence.solutionSteps.length === 1 &&
            sequence.sequenceSteps[0]?.solutionStepId === "step-1",
          details: "One solution step maps to one lecture sequence step.",
        };
      },
    },
    {
      id: "testcase:sequencer-draft-proposes-edits",
      title: "SequencerDraft proposes frame edits without runtime mutation",
      category: "sequencer_draft",
      run() {
        const draft = approvedDraft();
        return {
          passed: draft.edits[0]?.kind === "create-frame",
          details: "Draft contains proposed create-frame edit.",
          evidence: draft.edits[0]?.evidenceRefs,
        };
      },
    },
    {
      id: "testcase:presenter-readiness-requires-evidence",
      title: "Presenter readiness fails closed without evidence",
      category: "presenter_readiness",
      run() {
        const readiness = runPresenterReadinessCheck(approvedDraft(), { evidenceRefs: [] });
        return {
          passed: readiness.status === "needs-evidence",
          details: `Readiness status: ${readiness.status}`,
          metrics: { missingEvidenceCount: readiness.missingEvidenceRefs.length },
        };
      },
    },
    {
      id: "testcase:lecture-governance-ready-path",
      title: "Governance passes when draft is approved and evidenced",
      category: "governance",
      run() {
        const sequence = buildSequenceContext(problem(), steps);
        const draft = createSequencerDraft(sequence, {
          teacherApproval: {
            status: "approved",
            approvedBy: "eval",
            approvedAt: "2026-05-11T04:00:00.000Z",
            notes: [],
          },
        });
        const readiness = runPresenterReadinessCheck(draft, {
          evidenceRefs: ["fixture:solution-step-1"],
        });
        const governance = evaluateLectureGovernance({ sequence, draft, readiness });
        return {
          passed: governance.status === "pass",
          details: `Governance status: ${governance.status}`,
          metrics: { score: governance.score },
        };
      },
    },
  ];
}

describe("Lecture Delivery Kernel v0 eval suite", () => {
  test("suite declaration matches executable cases", async () => {
    const cases = makeEvalCases();
    const declared = new Set(suiteDeclaration.suite.testCaseIds);
    expect(cases.map((testCase) => testCase.id)).toEqual(suiteDeclaration.suite.testCaseIds);
    expect(cases.every((testCase) => declared.has(testCase.id))).toBe(true);

    const report = await runLectureKernelEvalSuite(cases, {
      generatedAt: "2026-05-11T04:00:00.000Z",
    });
    expect(report.suiteId).toBe("suite:lecture-delivery-kernel-v0");
    expect(report.passed).toBe(cases.length);
    expect(report.failed).toBe(0);
    expect(formatLectureKernelEvalReport(report)).toContain("Aggregate: 5/5 passed");
  });
});
