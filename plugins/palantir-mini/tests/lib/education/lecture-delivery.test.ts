import { describe, expect, test } from "bun:test";
import {
  buildSequenceContext,
  createSequencerDraft,
  evaluateLectureGovernance,
  ingestProblem,
  runPresenterReadinessCheck,
  type SolutionStep,
} from "../../../lib/education/lecture-delivery";

const evidenceRefs = ["solution.md#step-1", "seq-data.json#frame-1"];

function sampleProblem() {
  return ingestProblem({
    problemId: "15-abs-cubic-integral-extrema",
    title: "Absolute cubic integral extrema",
    prompt: "Find extrema for an absolute-value cubic integral expression.",
    source: "solution-md",
    learningObjectives: ["Connect algebraic structure to extrema reasoning."],
    constraints: ["Use problem 15 evidence as read-only fixture data."],
    evidenceRefs: [
      {
        ref: "solution.md#problem-15",
        source: "solution-md",
        description: "Authoritative authored solution.",
      },
    ],
  });
}

function sampleSteps(): SolutionStep[] {
  return [
    {
      stepId: "step-1",
      title: "Establish the expression boundary",
      body: "Identify the absolute-value split and the interval under consideration.",
      mathStatements: ["|f(x)| changes behavior at roots of f(x)."],
      evidenceRefs,
    },
  ];
}

describe("Lecture Delivery Kernel v0", () => {
  test("ingests a LectureProblem and builds a shape-preserving LectureSequence", () => {
    const problem = sampleProblem();
    const sequence = buildSequenceContext(problem, sampleSteps());

    expect(sequence.problem.problemId).toBe("15-abs-cubic-integral-extrema");
    expect(sequence.solutionSteps).toHaveLength(1);
    expect(sequence.sequenceSteps[0]?.requiredEvidenceRefs).toEqual(evidenceRefs);
    expect(sequence.sequenceSteps[0]?.presenterCheckpoints[0]?.surface).toBe("presenter");
  });

  test("rejects sequence steps that lack evidence when evidence is required", () => {
    const problem = sampleProblem();
    expect(() =>
      buildSequenceContext(problem, [
        {
          stepId: "step-without-evidence",
          title: "Unsupported step",
          body: "This should not be presenter-ready.",
          mathStatements: [],
          evidenceRefs: [],
        },
      ]),
    ).toThrow(/requires at least one evidence ref/);
  });

  test("creates SequencerDraft edits without mutating runtime artifacts", () => {
    const sequence = buildSequenceContext(sampleProblem(), sampleSteps());
    const draft = createSequencerDraft(sequence, {
      teacherApproval: {
        status: "approved",
        approvedBy: "teacher",
        approvedAt: "2026-05-11T04:00:00.000Z",
        notes: [],
      },
    });

    expect(draft.edits).toHaveLength(1);
    expect(draft.edits[0]?.kind).toBe("create-frame");
    expect(draft.edits[0]?.targetRef).toBe("15-abs-cubic-integral-extrema:frame-1");
    expect(draft.readinessCheckpoints).toHaveLength(1);
  });

  test("readiness fails closed until evidence and teacher approval are both present", () => {
    const sequence = buildSequenceContext(sampleProblem(), sampleSteps());
    const pendingDraft = createSequencerDraft(sequence);

    const missingEvidence = runPresenterReadinessCheck(pendingDraft, {
      evidenceRefs: ["solution.md#step-1"],
    });
    expect(missingEvidence.status).toBe("needs-evidence");
    expect(missingEvidence.missingEvidenceRefs).toEqual(["seq-data.json#frame-1"]);

    const pendingApproval = runPresenterReadinessCheck(pendingDraft, {
      evidenceRefs,
    });
    expect(pendingApproval.status).toBe("needs-approval");

    const approvedDraft = createSequencerDraft(sequence, {
      teacherApproval: {
        status: "approved",
        approvedBy: "teacher",
        approvedAt: "2026-05-11T04:00:00.000Z",
        notes: [],
      },
    });
    expect(runPresenterReadinessCheck(approvedDraft, { evidenceRefs }).status).toBe("ready");
  });

  test("governance evaluation ties sequence, draft, and readiness together", () => {
    const sequence = buildSequenceContext(sampleProblem(), sampleSteps());
    const draft = createSequencerDraft(sequence, {
      teacherApproval: {
        status: "approved",
        approvedBy: "teacher",
        approvedAt: "2026-05-11T04:00:00.000Z",
        notes: [],
      },
    });
    const readiness = runPresenterReadinessCheck(draft, { evidenceRefs });
    const evaluation = evaluateLectureGovernance({ sequence, draft, readiness });

    expect(evaluation.status).toBe("pass");
    expect(evaluation.score).toBe(1);
    expect(evaluation.requiredActions).toEqual([]);
  });
});
