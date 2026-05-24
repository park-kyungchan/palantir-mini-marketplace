// palantir-mini - Lecture Delivery Kernel v0.
//
// The kernel is intentionally runtime-neutral. It converts authored lecture
// evidence into proposed sequencer edits and presenter-readiness checks without
// mutating sequencer or presenter artifacts.

export type LectureProblemSource =
  | "solution-md"
  | "seq-data"
  | "seq-frames"
  | "manual"
  | "fixture";

export interface LectureEvidenceRef {
  readonly ref: string;
  readonly source: LectureProblemSource;
  readonly description: string;
}

export interface LectureProblem {
  readonly problemId: string;
  readonly title: string;
  readonly prompt: string;
  readonly source: LectureProblemSource;
  readonly learningObjectives: readonly string[];
  readonly constraints: readonly string[];
  readonly evidenceRefs: readonly LectureEvidenceRef[];
}

export interface SolutionStep {
  readonly stepId: string;
  readonly title: string;
  readonly body: string;
  readonly mathStatements: readonly string[];
  readonly evidenceRefs: readonly string[];
}

export interface IngestLectureProblemInput {
  readonly problemId: string;
  readonly title: string;
  readonly prompt: string;
  readonly source?: LectureProblemSource;
  readonly learningObjectives?: readonly string[];
  readonly constraints?: readonly string[];
  readonly evidenceRefs?: readonly LectureEvidenceRef[];
}

export interface LectureSequenceStep {
  readonly sequenceStepId: string;
  readonly solutionStepId: string;
  readonly title: string;
  readonly teacherAction: string;
  readonly learnerVisibleText: string;
  readonly requiredEvidenceRefs: readonly string[];
  readonly presenterCheckpoints: readonly PresenterCheckpoint[];
}

export interface LectureSequence {
  readonly sequenceId: string;
  readonly problem: LectureProblem;
  readonly solutionSteps: readonly SolutionStep[];
  readonly sequenceSteps: readonly LectureSequenceStep[];
  readonly policy: {
    readonly requireTeacherApproval: boolean;
    readonly requireEvidenceForEveryStep: boolean;
  };
}

export type PresenterCheckpointSurface =
  | "solution"
  | "sequencer"
  | "presenter"
  | "artifact";

export interface PresenterCheckpoint {
  readonly checkpointId: string;
  readonly surface: PresenterCheckpointSurface;
  readonly expectation: string;
  readonly required: boolean;
  readonly evidenceRefs: readonly string[];
}

export type TeacherApprovalStatus =
  | "pending"
  | "approved"
  | "needs-revision"
  | "blocked";

export interface TeacherApproval {
  readonly status: TeacherApprovalStatus;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly notes: readonly string[];
}

export type SequencerEditKind =
  | "create-frame"
  | "update-frame"
  | "link-evidence"
  | "annotate"
  | "noop";

export interface SequencerEdit {
  readonly editId: string;
  readonly kind: SequencerEditKind;
  readonly targetRef: string;
  readonly payload: Record<string, unknown>;
  readonly evidenceRefs: readonly string[];
}

export interface SequencerDraft {
  readonly draftId: string;
  readonly sourceSequenceId: string;
  readonly edits: readonly SequencerEdit[];
  readonly readinessCheckpoints: readonly PresenterCheckpoint[];
  readonly teacherApproval: TeacherApproval;
}

export interface PresenterCheckpointResult {
  readonly checkpointId: string;
  readonly surface: PresenterCheckpointSurface;
  readonly passed: boolean;
  readonly missingEvidenceRefs: readonly string[];
  readonly details: string;
}

export type PresenterReadinessStatus =
  | "ready"
  | "needs-evidence"
  | "needs-approval"
  | "blocked";

export interface PresenterReadiness {
  readonly status: PresenterReadinessStatus;
  readonly checks: readonly PresenterCheckpointResult[];
  readonly missingEvidenceRefs: readonly string[];
  readonly blockedReasons: readonly string[];
}

export interface LectureGovernanceFinding {
  readonly id: string;
  readonly severity: "pass" | "warn" | "fail";
  readonly details: string;
}

export interface LectureGovernanceEvaluation {
  readonly status: "pass" | "warn" | "fail";
  readonly score: number;
  readonly findings: readonly LectureGovernanceFinding[];
  readonly requiredActions: readonly string[];
}

export interface BuildSequenceContextOptions {
  readonly requireTeacherApproval?: boolean;
  readonly requireEvidenceForEveryStep?: boolean;
}

export interface CreateSequencerDraftOptions {
  readonly draftId?: string;
  readonly teacherApproval?: TeacherApproval;
}

export interface RunPresenterReadinessOptions {
  readonly evidenceRefs?: readonly string[];
}

function nonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Lecture Delivery Kernel: ${field} is required`);
  }
  return trimmed;
}

function uniqueStrings(values: readonly string[] = []): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function stableId(prefix: string, value: string): string {
  return `${prefix}:${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function defaultCheckpoint(step: SolutionStep): PresenterCheckpoint {
  return {
    checkpointId: stableId("checkpoint", step.stepId),
    surface: "presenter",
    expectation: `Presenter can render and explain ${step.title}.`,
    required: true,
    evidenceRefs: step.evidenceRefs,
  };
}

export function ingestProblem(input: IngestLectureProblemInput): LectureProblem {
  return {
    problemId: nonEmpty(input.problemId, "problemId"),
    title: nonEmpty(input.title, "title"),
    prompt: nonEmpty(input.prompt, "prompt"),
    source: input.source ?? "manual",
    learningObjectives: uniqueStrings(input.learningObjectives),
    constraints: uniqueStrings(input.constraints),
    evidenceRefs: [...(input.evidenceRefs ?? [])],
  };
}

export function normalizeSolutionSteps(steps: readonly SolutionStep[]): SolutionStep[] {
  if (steps.length === 0) {
    throw new Error("Lecture Delivery Kernel: at least one SolutionStep is required");
  }

  return steps.map((step, index) => ({
    stepId: nonEmpty(step.stepId || `step-${index + 1}`, `solutionSteps[${index}].stepId`),
    title: nonEmpty(step.title, `solutionSteps[${index}].title`),
    body: nonEmpty(step.body, `solutionSteps[${index}].body`),
    mathStatements: uniqueStrings(step.mathStatements),
    evidenceRefs: uniqueStrings(step.evidenceRefs),
  }));
}

export function buildSequenceContext(
  problem: LectureProblem,
  solutionSteps: readonly SolutionStep[],
  options: BuildSequenceContextOptions = {},
): LectureSequence {
  const normalizedSteps = normalizeSolutionSteps(solutionSteps);
  const requireEvidenceForEveryStep = options.requireEvidenceForEveryStep ?? true;

  const sequenceSteps: LectureSequenceStep[] = normalizedSteps.map((step, index) => {
    const evidenceRefs = uniqueStrings(step.evidenceRefs);
    if (requireEvidenceForEveryStep && evidenceRefs.length === 0) {
      throw new Error(
        `Lecture Delivery Kernel: ${step.stepId} requires at least one evidence ref`,
      );
    }

    return {
      sequenceStepId: stableId("lecture-sequence-step", `${problem.problemId}-${index + 1}`),
      solutionStepId: step.stepId,
      title: step.title,
      teacherAction: `Introduce ${step.title} and connect it to the previous reasoning state.`,
      learnerVisibleText: step.body,
      requiredEvidenceRefs: evidenceRefs,
      presenterCheckpoints: [defaultCheckpoint(step)],
    };
  });

  return {
    sequenceId: stableId("lecture-sequence", problem.problemId),
    problem,
    solutionSteps: normalizedSteps,
    sequenceSteps,
    policy: {
      requireTeacherApproval: options.requireTeacherApproval ?? true,
      requireEvidenceForEveryStep,
    },
  };
}

export function createSequencerDraft(
  sequence: LectureSequence,
  options: CreateSequencerDraftOptions = {},
): SequencerDraft {
  const draftId = options.draftId ?? stableId("sequencer-draft", sequence.sequenceId);
  const edits: SequencerEdit[] = sequence.sequenceSteps.map((step, index) => ({
    editId: `${draftId}:edit-${index + 1}`,
    kind: "create-frame",
    targetRef: `${sequence.problem.problemId}:frame-${index + 1}`,
    payload: {
      title: step.title,
      teacherAction: step.teacherAction,
      learnerVisibleText: step.learnerVisibleText,
      sourceStepId: step.solutionStepId,
      sequenceStepId: step.sequenceStepId,
    },
    evidenceRefs: step.requiredEvidenceRefs,
  }));

  return {
    draftId,
    sourceSequenceId: sequence.sequenceId,
    edits,
    readinessCheckpoints: sequence.sequenceSteps.flatMap((step) => step.presenterCheckpoints),
    teacherApproval: options.teacherApproval ?? {
      status: "pending",
      notes: ["Teacher approval required before presenter-ready status."],
    },
  };
}

export function runPresenterReadinessCheck(
  draft: SequencerDraft,
  options: RunPresenterReadinessOptions = {},
): PresenterReadiness {
  const availableEvidence = new Set(uniqueStrings(options.evidenceRefs));
  const missingEvidence = new Set<string>();

  const checks = draft.readinessCheckpoints.map((checkpoint) => {
    const missingForCheckpoint = checkpoint.evidenceRefs.filter(
      (ref) => checkpoint.required && !availableEvidence.has(ref),
    );
    for (const ref of missingForCheckpoint) missingEvidence.add(ref);
    return {
      checkpointId: checkpoint.checkpointId,
      surface: checkpoint.surface,
      passed: missingForCheckpoint.length === 0,
      missingEvidenceRefs: missingForCheckpoint,
      details:
        missingForCheckpoint.length === 0
          ? checkpoint.expectation
          : `Missing evidence for ${checkpoint.expectation}`,
    };
  });

  const blockedReasons: string[] = [];
  if (draft.edits.length === 0) blockedReasons.push("SequencerDraft has no edits.");
  if (draft.teacherApproval.status === "blocked") {
    blockedReasons.push("Teacher approval is blocked.");
  }

  let status: PresenterReadinessStatus = "ready";
  if (blockedReasons.length > 0) {
    status = "blocked";
  } else if (missingEvidence.size > 0) {
    status = "needs-evidence";
  } else if (draft.teacherApproval.status !== "approved") {
    status = "needs-approval";
  }

  return {
    status,
    checks,
    missingEvidenceRefs: [...missingEvidence].sort(),
    blockedReasons,
  };
}

export function evaluateLectureGovernance(input: {
  readonly sequence: LectureSequence;
  readonly draft: SequencerDraft;
  readonly readiness: PresenterReadiness;
}): LectureGovernanceEvaluation {
  const findings: LectureGovernanceFinding[] = [];

  findings.push({
    id: "problem-learning-objectives",
    severity: input.sequence.problem.learningObjectives.length > 0 ? "pass" : "warn",
    details:
      input.sequence.problem.learningObjectives.length > 0
        ? "Problem carries at least one learning objective."
        : "Problem has no learning objectives.",
  });

  const mappedStepIds = new Set(input.sequence.sequenceSteps.map((step) => step.solutionStepId));
  const unmapped = input.sequence.solutionSteps.filter((step) => !mappedStepIds.has(step.stepId));
  findings.push({
    id: "solution-step-coverage",
    severity: unmapped.length === 0 ? "pass" : "fail",
    details:
      unmapped.length === 0
        ? "Every SolutionStep is mapped into the LectureSequence."
        : `Unmapped SolutionStep ids: ${unmapped.map((step) => step.stepId).join(", ")}`,
  });

  findings.push({
    id: "sequencer-draft-edits",
    severity: input.draft.edits.length >= input.sequence.sequenceSteps.length ? "pass" : "fail",
    details: `SequencerDraft edits: ${input.draft.edits.length}; sequence steps: ${input.sequence.sequenceSteps.length}.`,
  });

  findings.push({
    id: "presenter-readiness",
    severity: input.readiness.status === "ready" ? "pass" : "fail",
    details: `PresenterReadiness status is ${input.readiness.status}.`,
  });

  const passCount = findings.filter((finding) => finding.severity === "pass").length;
  const failCount = findings.filter((finding) => finding.severity === "fail").length;
  const score = findings.length === 0 ? 0 : passCount / findings.length;

  const requiredActions = findings
    .filter((finding) => finding.severity !== "pass")
    .map((finding) => `${finding.id}: ${finding.details}`);

  return {
    status: failCount > 0 ? "fail" : requiredActions.length > 0 ? "warn" : "pass",
    score,
    findings,
    requiredActions,
  };
}
