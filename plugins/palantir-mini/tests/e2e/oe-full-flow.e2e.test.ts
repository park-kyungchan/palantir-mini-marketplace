// palantir-mini — OE FULL GOVERNED FLOW e2e (campaign moving gate).
//
// One COMPLEX, realistic end-to-end harness driving the REAL pm Ontology-Engineering
// flow on a hard paragraph of Korean intent:
//   intent (T0) → 9-axis SACRED turn session → SIC (Q2 refusal + pass) → DTC build
//   sequence → governed write-path (elevate/register through the gates) → the
//   intentional envelope-bound escape-hatch (OP-2).
//
// AUTHORED AT STEP 0 (DP-deepening campaign, BUILD-SEQUENCE.md §STEP 0). It carries
// the FULL Stages A–E assertion catalog from E2E-DESIGN.md §6. Assertions whose
// production support lands in a LATER tranche are staged as `test.todo(...)` with a
// pointer to the unblocking step; each subsequent campaign step flips the `.todo()`s
// it makes real. The e2e is the campaign's single moving gate — never re-authored,
// only extended/flipped.
//
// BASELINE LIVE NOW (Tranche-1 `feat/pm-oe-front-half-elicitation-unify` + descendants):
//   A1 A2 B1a B1b B2 B3 C1 D1u D1a D2p D2m E1 E2.
// `test.todo()` at Step 0, flipped later:
//   C2  (govern-fold access-boundary REQUIRED) — flips at OE-4 / Step 12.
//   C3  (SUCCESS-EVAL ↔ ACTION enforced cross-axis bind) — flips at OE-8 / Step 8.
//   D-ingest (submissionCriteria + cardinality + property-security survive ingest)
//        — flips at OE-11 / Step 13 (cardinality) + ingest-widening tranche.
//   DP-facet shape groups (data-graph / logic-block / action-writeback / access-boundary)
//        + per-"draft"-axis confirmation-debt — flip across DP-1..DP-5 (Steps 2–5).
//
// MUST run on `feat/pm-oe-front-half-elicitation-unify` or a descendant — on the
// pre-Tranche-1 working tree the Q2 (b1) gate + the `draft` axis status are absent,
// so B1 would not refuse (E2E-DESIGN.md §5 note).
//
// Composes the established fixture patterns proven in:
//   tests/bridge/handlers/ontology-engineering-elevate.test.ts (tmp project + SOURCE jsonl + handleOntologyEngineeringWorkflow + getOntology)
//   tests/lib/semantic-intent/approved-contract.test.ts        (9-axis fill + Q2)
//   tests/hooks/ontology-engineering-workflow-enforcement-gate.test.ts (gate assess...)
//   tests/lib/ontology-engineering-workflow/source-mutation-approval.test.ts (fake EnvelopeStore for OP-2)

import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// --- Stage A: 9-axis SACRED turn session -----------------------------------
import {
  startNineAxisSession,
  answerCard,
  isSessionComplete,
  sessionContract,
  type NineAxisSession,
} from "../../lib/semantic-intent/nine-axis-understand-session";
import {
  NINE_AXIS_SIC_SEQUENCE,
  advanceNineAxisSicSequence,
  isNineAxisSicComplete,
} from "../../lib/semantic-intent/nine-axis-sic-fill-sequence";
import {
  canApproveRequiredUserDecision,
  draftSemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import { buildContextEngineeringPlanV2 } from "../../lib/context-engineering/context-plan-builder";
import type { SemanticIntentContract } from "../../lib/lead-intent/contracts";
import type { SicWithFillFields } from "../../lib/semantic-intent/sic-fill-types";
import {
  SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
  isSemanticIntentContract,
} from "#schemas/ontology/primitives/semantic-intent-contract";

// --- Stage B: SIC approval through Q2 --------------------------------------
import {
  approveSemanticIntentContract,
  isApprovedSemanticIntentContract,
} from "../../lib/semantic-intent/approved-contract";
import {
  createSemanticIntentContractDraftFromFDEOntologySession,
  deriveDraftAxisConfirmationDebt,
} from "../../lib/fde-ontology-engineering/sic-from-session";
import { FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION } from "../../lib/fde-ontology-engineering/types";
import type { FDEOntologyEngineeringSession } from "../../lib/fde-ontology-engineering/types";

// --- Stage C: DTC build sequence -------------------------------------------
import {
  advanceOntologyDTCBuildSequence,
  ONTOLOGY_DTC_BUILD_SEQUENCE,
  ontologyDtcBuildReadinessIssues,
} from "../../lib/semantic-intent/ontology-dtc-build-sequence";
import type { DigitalTwinChangeContract } from "../../lib/lead-intent/contracts";

// --- Stage D: governed write-path (elevate/register + gate) ----------------
import { handleOntologyEngineeringWorkflow } from "../../bridge/handlers/pm-ontology-engineering-workflow";
import getOntology from "../../bridge/handlers/get-ontology";
import { projectPrimitiveRid } from "../../lib/actions/project-primitive-rid";
import { assessOntologyEngineeringWorkflowHook } from "../../hooks/ontology-engineering-workflow-enforcement-gate";
import {
  ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
  type OntologyEngineeringWorkflowState,
  writeOntologyEngineeringWorkflowState,
} from "../../lib/ontology-engineering-workflow";

// --- Stage E: the intentional envelope-bound escape-hatch (OP-2) -----------
import {
  reverifySourceMutationApprovalAgainstEnvelope,
  type EnvelopeStore,
} from "../../lib/ontology-engineering-workflow/source-mutation-approval";
import type { SourceMutationApprovalRecord } from "../../lib/ontology-engineering-workflow/types";
import {
  createPromptEnvelope,
  type PromptEnvelope,
  type PromptRuntime,
} from "../../lib/prompt-front-door/envelope";

// ===========================================================================
// The COMPLEX scenario — a hard paragraph of intent (E2E-DESIGN.md §1).
// ONE paragraph fans out across all 9 SACRED axes + the govern-fold + a
// cross-axis SUCCESS-EVAL↔ACTION binding.
// ===========================================================================

const HARD_KOREAN_INTENT =
  "우리 학교 채점 시스템에 새 흐름을 만들고 싶다. 학생의 한 과제 제출물(Submission)을 새로운 객체로 두고, " +
  "각 제출물은 정확히 하나의 채점기준표(Rubric)에 묶인다(여러 제출물 → 하나의 Rubric). 교사가 최종 점수를 " +
  "확정하면 그 점수를 학생 기록에 되써넣는(write-back) 액션이 실행되는데, 이 액션은 '루브릭의 모든 항목이 채점됨 + " +
  "교사 승인'이라는 제출 기준(submission criteria)을 통과해야만 실행된다. 점수(score) 속성은 본인 학생과 담당 " +
  "교사만 읽을 수 있어야 하고(속성 단위 접근 보안), 다른 학생에게는 절대 노출되면 안 된다. 성공은 '모든 제출물이 " +
  "정확히 한 번 최종 점수를 받고, 점수 합이 기록과 일치할 때'로 본다. 부모에게 자동 통지하는 일은 범위 밖이다.";

/**
 * One realistic user answer per nine-axis turn (T0 intent + 9 SACRED axes), each
 * decomposed from the hard paragraph above. Index 0 is the T0 intent turn; indices
 * 1..9 map to DATA/LOGIC/ACTION/GOVERNANCE/CONTEXT/SUCCESS-EVAL/CONSTRAINTS-NONGOALS/
 * ACTORS/MEMORY-PRIOR (the SACRED order).
 */
const SCENARIO_AXIS_ANSWERS = [
  HARD_KOREAN_INTENT, // T0 intent
  "Submission (새 객체), Rubric (기존), score 속성", // DATA
  "제출 기준 판정: 루브릭 모든 항목 채점됨 + 교사 승인", // LOGIC
  "finalizeScore — 최종 점수를 학생 기록에 write-back", // ACTION
  "교사만 최종 확정; score는 본인 학생과 담당 교사만 읽기 (속성 단위 접근 보안)", // GOVERNANCE (incl. govern-fold)
  "루브릭 시트, 성적부(gradebook)", // CONTEXT
  "모든 제출물이 정확히 한 번 최종 점수를 받고, 점수 합이 기록과 일치 — 제출 기준에 묶임", // SUCCESS-EVAL
  "부모 자동 통지는 범위 밖; score는 다른 학생에게 절대 노출 금지", // CONSTRAINTS-NONGOALS
  "교사가 확정; 관리자(admin)가 권한 부여", // ACTORS
  "지난 학기 루브릭 바인딩 결정 재사용", // MEMORY-PRIOR
] as const;

/** Drive a complete, USER-confirmed 9-axis SIC by answering every turn with `text`. */
function driveCompleteUserConfirmedSession(): NineAxisSession {
  let session = startNineAxisSession(draftSemanticIntentContract({ intent: HARD_KOREAN_INTENT }));
  for (let turn = 0; turn < SCENARIO_AXIS_ANSWERS.length; turn++) {
    session = answerCard(session, { text: SCENARIO_AXIS_ANSWERS[turn] });
  }
  return session;
}

/**
 * A `FDEOntologyEngineeringSession` carrying the scenario's candidate signal. Its
 * session-DERIVED SIC has `draft` axes + an EMPTY fillSequence (the state the turn
 * engine has NOT confirmed) — used for the Q2 (b1) refusal (B1a/B1b).
 */
const SCENARIO_SIGNAL_SESSION: FDEOntologyEngineeringSession = {
  schemaVersion: FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
  sessionId: "fde-session:grading-flow",
  projectRoot: "/tmp/pm-grading-flow",
  universalOntologyEntryRef: "universal-ontology-entry:grading-flow",
  phase: "semantic-contract-ready",
  turnCount: 3,
  userFacingSummary: "Write a finalized score back to the student record.",
  confirmedUserGoal: "Let a teacher finalize a submission's score and write it back.",
  confirmedNonGoals: ["Do not auto-notify parents.", "Never expose score to other students."],
  latentHypotheses: [],
  acceptedHypothesisIds: [],
  rejectedHypothesisIds: [],
  missionModel: {
    operationalDecision: "Finalize a submission score under the rubric criteria.",
    decisionOwnerRole: "teacher",
    successSignals: ["every submission scored exactly once"],
  },
  evidenceModel: {
    evidenceDefinition: "The rubric sheet + gradebook drive the decision.",
    observableSignals: ["all rubric items graded", "teacher approval"],
    sourceArtifactRefs: ["evidence://rubric", "evidence://gradebook"],
    missingEvidenceQuestions: [],
  },
  objectCandidates: [
    {
      candidateId: "obj:submission",
      plainName: "Submission",
      whyItMayMatter: "A student's single assignment submission — the new object.",
      evidenceRefs: ["evidence://submission"],
    },
    {
      candidateId: "obj:rubric",
      plainName: "Rubric",
      whyItMayMatter: "The grading rubric each submission binds to.",
      evidenceRefs: ["evidence://rubric"],
    },
  ],
  propertyCandidates: [
    {
      candidateId: "prop:score",
      plainName: "score",
      ownerObjectName: "Submission",
      dataType: "number",
      whyItMayMatter: "The finalized score written back to the student record.",
      evidenceRefs: ["evidence://score"],
    },
  ],
  linkCandidates: [
    {
      candidateId: "edge:submission-rubric",
      plainName: "belongsToRubric",
      sourceObject: "Submission",
      targetObject: "Rubric",
      businessMeaning: "Each submission binds to exactly one rubric (many submissions → one Rubric).",
      evidenceRefs: ["evidence://belongs-to-rubric"],
    },
  ],
  actionCandidates: [
    {
      candidateId: "act:finalize-score",
      plainName: "finalizeScore",
      operationalIntent: "Write the finalized score back to the student record.",
      writebackRisk: "high",
      // The scenario's per-action submission criteria ("루브릭의 모든 항목이 채점됨 + 교사 승인").
      submissionCriteria: ["all rubric items graded", "teacher approval"],
      evidenceRefs: ["evidence://finalize"],
    },
  ],
  functionCandidates: [
    {
      candidateId: "fn:criteria",
      plainName: "제출 기준 판정",
      logicIntent: "All rubric items graded + teacher approval.",
      evidenceRefs: ["evidence://criteria"],
    },
  ],
  roleCandidates: [],
  chatbotContextCandidates: [],
  unresolvedQuestions: [],
  sourceRefs: ["evidence://session-source"],
  recentTurnSummaries: [],
  turnRecordIds: [],
  createdAt: "2026-06-14T00:00:00.000Z",
  updatedAt: "2026-06-14T00:00:00.000Z",
};

// ===========================================================================
// SOURCE jsonl fixture (drives `elevate` ingest — real schema, E2E-DESIGN.md §3).
// Materializes (via AUTHORIZED elevate): ObjectTypes Submission+Rubric, Property
// score, Function 제출기준 판정, ActionType finalizeScore, Role Teacher, LinkType
// belongsToRubric (Submission→Rubric).
// ===========================================================================

const SOURCE_RECORDS: ReadonlyArray<Record<string, unknown>> = [
  {
    kg_layer: "DATA",
    record_type: "kg_submission_data_atom_candidate",
    candidate_id: "sub-001",
    label_ko: "Submission",
    description_ko: "학생의 한 과제 제출물",
    atom_kind: "entity",
    source_basis_refs: ["ref:submission"],
  },
  {
    kg_layer: "DATA",
    record_type: "kg_rubric_data_atom_candidate",
    candidate_id: "rub-001",
    label_ko: "Rubric",
    description_ko: "채점기준표",
    atom_kind: "entity",
    source_basis_refs: ["ref:rubric"],
  },
  {
    kg_layer: "DATA",
    record_type: "kg_score_property_candidate",
    candidate_id: "score-001",
    label_ko: "score",
    description_ko: "확정 점수 (속성)",
    atom_kind: "property",
    value_type: "number",
    source_basis_refs: ["ref:score"],
  },
  {
    kg_layer: "LOGIC",
    record_type: "kg_criteria_logic_atom_candidate",
    candidate_id: "crit-001",
    label_ko: "제출기준 판정",
    description_ko: "모든 루브릭 항목 채점됨 + 교사 승인",
    logic_kind: "computation",
    source_basis_refs: ["ref:criteria"],
  },
  {
    kg_layer: "ACTION",
    record_type: "kg_finalize_action_atom_candidate",
    candidate_id: "fin-001",
    label_ko: "finalizeScore",
    description_ko: "최종 점수를 학생 기록에 되써넣는다",
    action_kind: "writeback",
    source_basis_refs: ["ref:finalize"],
  },
  {
    kg_layer: "GOVERNANCE",
    record_type: "kg_teacher_role_candidate",
    candidate_id: "role-001",
    label_ko: "Teacher",
    description_ko: "점수 확정 권한",
    role_kind: "approver",
    governed_action_policy: "finalizeScore-approval",
    source_basis_refs: ["ref:teacher"],
  },
  {
    kg_layer: "EDGE",
    record_type: "kg_submission_rubric_edge_candidate",
    candidate_id: "edge-001",
    source_candidate_id: "sub-001",
    target_candidate_id: "rub-001",
    edge_kind: "belongsToRubric",
  },
];

const tmpRoots: string[] = [];
const tmpFiles: string[] = [];

function setupProjectRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-oe-e2e-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

function writeSourceFixture(): string {
  const file = path.join(
    os.tmpdir(),
    `pm-oe-e2e-source-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
  );
  fs.writeFileSync(file, SOURCE_RECORDS.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  tmpFiles.push(file);
  return file;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
  for (const f of tmpFiles.splice(0)) fs.rmSync(f, { force: true });
});

// ===========================================================================
// STAGE A — 9-axis SACRED turn session
// ===========================================================================

describe("E2E Stage A — 9-axis SACRED turn session", () => {
  test("A1 (baseline): the complete user-confirmed 9-axis SIC is structurally complete", () => {
    const session = driveCompleteUserConfirmedSession();
    expect(isSessionComplete(session)).toBe(true);

    const contract = sessionContract(session) as SemanticIntentContract;
    expect(isNineAxisSicComplete(contract)).toBe(true);

    // 10 user-sourced turns (T0 intent + 9 axes); every step source === "user".
    const filled = contract as SicWithFillFields;
    expect((filled.fillSequence ?? []).length).toBe(10);
    for (const step of filled.fillSequence ?? []) {
      expect(step.source).toBe("user");
    }

    // schemaVersion is the live SIC version (v2 today) — never re-derived.
    expect(contract.schemaVersion).toBe(SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION);
  });

  test("A2 (baseline): SACRED-9 structural guard — exactly the 9 named axes; Security is NOT an axis; 10 turns", () => {
    // The SACRED sequence is T0 (intent, no targetAxis) + EXACTLY 9 axis turns.
    expect(NINE_AXIS_SIC_SEQUENCE.length).toBe(10);
    const axisTurns = NINE_AXIS_SIC_SEQUENCE.filter((d) => d.targetAxis !== undefined);
    expect(axisTurns.length).toBe(9);

    const session = driveCompleteUserConfirmedSession();
    const axes = (sessionContract(session) as SemanticIntentContract).axes;
    if (!axes) throw new Error("axes missing");
    const axisKeys = Object.keys(axes).sort();
    expect(axisKeys).toEqual(
      [
        "action",
        "actors",
        "constraintsNonGoals",
        "context",
        "data",
        "governance",
        "logic",
        "memoryPrior",
        "successEval",
      ].sort(),
    );
    // GOVERN-FOLD structural guard: Security is NOT a 10th axis key — it folds into GOVERNANCE.
    expect(axisKeys).not.toContain("security");
    expect(axisTurns.map((d) => d.targetAxis)).not.toContain("security");
  });
});

// ===========================================================================
// STAGE B — SIC approval through Q2 (the refusal + the pass)
// ===========================================================================

describe("E2E Stage B — SIC approval through Q2", () => {
  test("B1a (baseline): a session-derived draft (draft axes, empty fillSequence) is REFUSED on field 'fillSequence'", () => {
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(SCENARIO_SIGNAL_SESSION);
    expect(draft.axes?.data.status).toBe("draft");
    expect((draft as SicWithFillFields).fillSequence ?? []).toHaveLength(0);

    const result = approveSemanticIntentContract(draft, { approverIdentity: "claude-code" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected Q2 (b1) refusal");
    expect(result.issues.some((i) => i.field === "fillSequence")).toBe(true);
    expect(result.unconfirmedAxes).toContain("data");
  });

  test("B1b (baseline): a force-stamped status:'approved' session draft is STILL refused on 'fillSequence' (D1-3)", () => {
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(SCENARIO_SIGNAL_SESSION);
    const forceApproved: SemanticIntentContract = {
      ...draft,
      status: "approved",
      approvalRef: "user:approved:forced-bypass",
    } as SemanticIntentContract;

    const result = approveSemanticIntentContract(forceApproved, { approverIdentity: "claude-code" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected Q2 (b1) refusal despite status:'approved'");
    expect(result.issues.some((i) => i.field === "fillSequence")).toBe(true);
    expect(result.reason).toMatch(/fillSequence/i);
  });

  test("B2 (baseline): the complete user-confirmed 9-axis SIC is APPROVED with a structured approvalRef", () => {
    const draft = sessionContract(driveCompleteUserConfirmedSession()) as SemanticIntentContract;
    expect(draft.status).toBe("draft");
    expect(isNineAxisSicComplete(draft)).toBe(true);

    const result = approveSemanticIntentContract(draft, { approverIdentity: "claude-code" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected approval to succeed");
    expect(result.contract.status).toBe("approved");
    expect(isApprovedSemanticIntentContract(result.contract)).toBe(true);
    expect(typeof result.contract.approvalRef).toBe("object");
    // Pure: the input draft is not mutated.
    expect(draft.status).toBe("draft");
  });

  test("B3 (baseline): Q2 names an AI-filled axis (one axis step flipped to source:'agent')", () => {
    const draft = sessionContract(driveCompleteUserConfirmedSession()) as SicWithFillFields;
    const logicTurn = NINE_AXIS_SIC_SEQUENCE[2]!; // targetAxis === "logic"
    const withAgentStep: SemanticIntentContract = {
      ...(draft as SemanticIntentContract),
      fillSequence: (draft.fillSequence ?? []).map((step) =>
        step.step === logicTurn.step ? { ...step, source: "agent" as const } : step,
      ),
    } as SemanticIntentContract;

    const result = approveSemanticIntentContract(withAgentStep, { approverIdentity: "claude-code" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected Q2 refusal");
    expect(result.unconfirmedAxes).toContain("logic");
    expect(result.reason).toContain("LOGIC");
    // Bilingual KO/EN cue.
    expect(result.reason).toMatch(/사용자 확인/);
  });
});

// ===========================================================================
// STAGE C — DTC synthesis (the per-primitive build sequence)
// ===========================================================================

/** Drive the ontology-dtc-build sequence T0..T6 with the scenario's typed refs. */
function driveDtcBuildSequence(): DigitalTwinChangeContract {
  let dtc: DigitalTwinChangeContract = {
    contractId: "digital-twin:grading-flow",
    status: "draft",
    semanticIntentContractRef: "semantic-intent:grading-flow",
    affectedSurfaces: ["ontology/data/submission.ts"],
    changeBoundary: "Add Submission + belongsToRubric + finalizeScore + score.",
    branchProposalPolicy: "Proposal PR before merge.",
    permissionBoundary: "Teacher finalizes; score readable by owner+teacher only.",
    replayMigrationPlan: "Additive primitives only.",
    observabilityPlan: "Emit gate events.",
    toolSurfaceReadiness: "Refs threaded additively.",
    evaluationPlan: "Targeted typecheck and tests.",
    touchedOntologyRefs: [],
    requiredEvaluationRefs: [],
    risks: [],
  } as unknown as DigitalTwinChangeContract;

  // The semantic term ref (term:...) is supplied at T6 (the readiness/verdict turn).
  // The semantic-consistency leg parses a term ref from ANY turn's input; supplying
  // it on T6 — where the per-turn readiness patch is computed from the already-
  // accumulated readiness — avoids the production spread-order quirk that clobbers a
  // leaf readiness array (applicationStateRefs / evaluationRefs) when a semantic term
  // is parsed from the SAME turn that sets that array.
  const perTurnInput: Record<number, string> = {
    0: "ObjectType:ri.ontology.main.object-type.submission,ObjectType:ri.ontology.main.object-type.rubric",
    1: "LinkType:ri.ontology.main.link-type.belongs-to-rubric",
    2: "ActionType:ri.ontology.main.action-type.finalize-score",
    3: "Function:ri.ontology.main.function.submission-criteria",
    4: "lib/gradebook/app-state.ts",
    5: "Additive only|Emit gate events|Targeted tests||ValidationPack:ri.validation.pack.grading",
    6: "term:grading.submission",
  };
  for (let turn = 0; turn < ONTOLOGY_DTC_BUILD_SEQUENCE.length; turn++) {
    dtc = advanceOntologyDTCBuildSequence(dtc, turn, perTurnInput[turn] ?? "").dtcDraft;
  }
  return dtc;
}

describe("E2E Stage C — DTC synthesis (per-primitive build sequence)", () => {
  test("C1 (baseline): the DTC build sequence exposes ObjectType + LinkType(cardinality) + ActionType(submission-criteria/permission) turns; readiness → ready-for-dtc", () => {
    // Structural: the SACRED-adjacent DTC sequence carries the per-primitive turns
    // this scenario needs (ObjectType, LinkType-cardinality, ActionType submission-criteria/permission).
    const objectTurn = ONTOLOGY_DTC_BUILD_SEQUENCE[0]!;
    expect(objectTurn.secondaryFields).toContain("touchedOntologyRefs[kind=ObjectType]");
    expect(objectTurn.secondaryFields).toContain("objectSecurityPolicy");

    const linkTurn = ONTOLOGY_DTC_BUILD_SEQUENCE[1]!;
    expect(linkTurn.secondaryFields).toContain("touchedOntologyRefs[kind=LinkType]");
    expect(`${linkTurn.question} ${linkTurn.questionEn}`.toLowerCase()).toContain("cardinality");

    const actionTurn = ONTOLOGY_DTC_BUILD_SEQUENCE[2]!;
    expect(actionTurn.secondaryFields).toContain("permissionBoundary");
    expect(`${actionTurn.question} ${actionTurn.questionEn}`.toLowerCase()).toContain("submission criteria");

    // Drive readiness to ready-for-dtc with the scenario's refs → no readiness issues.
    const dtc = driveDtcBuildSequence();
    const issues = ontologyDtcBuildReadinessIssues(dtc);
    expect(issues).toEqual([]);
  });

  // ---- LATER TRANCHE (flip to live at the named step) ----

  test.todo(
    "C2 (LATER — govern-fold, flips at OE-4 / Step 12): property accessBoundary for 'score' is REQUIRED on the GOVERNANCE axis (fail-closed, not advisory); the V3 SECURITY cast is gone",
    () => {},
  );

  test.todo(
    "C3 (LATER — binding, flips at OE-8 / Step 8): SUCCESS-EVAL binds to ACTION submission criteria as an ENFORCED cross-axis relation (a SUCCESS-EVAL that omits/contradicts finalizeScore criteria is flagged)",
    () => {},
  );
});

// ===========================================================================
// STAGE D — governed write-path (elevate/register through the gates)
// ===========================================================================

describe("E2E Stage D — governed write-path (elevate + gate)", () => {
  test("D1u (baseline): elevate WITHOUT approval fields → 'awaiting-approval', NOTHING registered", async () => {
    const P = setupProjectRoot("d1u");
    const fixture = writeSourceFixture();

    const result = await handleOntologyEngineeringWorkflow({
      action: "elevate",
      project: P,
      sourceJsonlPath: fixture,
    });

    expect(result.elevate?.phase).toBe("awaiting-approval");
    expect(result.elevate?.register).toBeUndefined();
    // Steps still ran (advisory): ingest counts + sic ref present.
    expect(result.elevate?.ingest.counts.objects).toBeGreaterThan(0);
    expect(result.elevate?.sic.contractRef).toBeTruthy();

    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(reg.objectTypes.length).toBe(0);
    expect(reg.actionTypes.length).toBe(0);
    expect(reg.functions.length).toBe(0);
    expect(reg.linkTypes.length).toBe(0);
    expect(reg.roles.length).toBe(0);
    expect(reg.properties.length).toBe(0);
  });

  test("D1a (baseline): elevate WITH approved SIC+DTC+readiness → 'elevated', register.committed, all primitive kinds READABLE", async () => {
    const P = setupProjectRoot("d1a");
    const fixture = writeSourceFixture();

    const result = await handleOntologyEngineeringWorkflow({
      action: "elevate",
      project: P,
      sourceJsonlPath: fixture,
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractStatus: "approved",
      readyForDigitalTwin: true,
    });

    expect(result.elevate?.phase).toBe("elevated");
    expect(result.elevate?.register?.committed).toBe(true);

    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    const has = (
      bucket: ReadonlyArray<{ rid: string }>,
      kind: Parameters<typeof projectPrimitiveRid>[1],
      name: string,
    ) => bucket.map((e) => e.rid).includes(projectPrimitiveRid(P, kind, name));

    expect(has(reg.objectTypes, "object-type", "Submission")).toBe(true);
    expect(has(reg.objectTypes, "object-type", "Rubric")).toBe(true);
    expect(has(reg.properties, "property", "score")).toBe(true);
    expect(has(reg.functions, "function", "제출기준 판정")).toBe(true);
    expect(has(reg.actionTypes, "action-type", "finalizeScore")).toBe(true);
    expect(has(reg.roles, "role", "Teacher")).toBe(true);
    expect(has(reg.linkTypes, "link-type", "belongsToRubric")).toBe(true);
  });

  test("D2p (baseline): the gate BLOCKS SIC authoring before FDE workflow provenance exists", () => {
    const P = setupProjectRoot("d2p");
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: P,
      tool_name: "mcp__palantir_mini__pm_semantic_intent_gate",
      tool_input: {
        project: P,
        rawIntent: "Start Ontology Engineering WorkflowContract SIC and DTC for object types.",
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("FDE workflow provenance");
  });

  test("D2m (baseline): the gate BLOCKS a protected-surface mutation when mutationAuthorized:false; ALLOWS when true", () => {
    const P = setupProjectRoot("d2m");
    const protectedPath = path.join(P, ".claude/plugins/palantir-mini/hooks/hooks.json");

    writeWorkflowState(P, false);
    const blocked = assessOntologyEngineeringWorkflowHook({
      cwd: P,
      tool_name: "Edit",
      tool_input: { file_path: protectedPath },
    });
    expect(blocked.decision).toBe("block");
    expect(blocked.reason).toContain("mutation requires approved SIC and DTC");

    writeWorkflowState(P, true);
    const allowed = assessOntologyEngineeringWorkflowHook({
      cwd: P,
      tool_name: "Edit",
      tool_input: { file_path: protectedPath },
    });
    expect(allowed.decision).toBe("continue");
  });

  // ---- LATER TRANCHE (flip to live at the named step) ----

  test.todo(
    "D-ingest (LATER — ingest-widening; cardinality flips at OE-11 / Step 13): submissionCriteria + many-to-one cardinality + property access-security survive the SOURCE jsonl ingest into the registered declarations",
    () => {},
  );
});

/** Write an OE workflow state (mutationAuthorized true/false) for the gate's D2m teeth. */
function writeWorkflowState(projectRoot: string, mutationAuthorized: boolean): void {
  const now = "2026-06-14T00:00:00.000Z";
  const state: OntologyEngineeringWorkflowState = {
    schemaVersion: ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
    contractId: "ontology-engineering-workflow:e2e",
    projectRoot,
    fdeSessionId: "fde-e2e",
    fdeSessionRef: "fde-ontology-engineering://session/fde-e2e",
    semanticIntentContractRef: mutationAuthorized
      ? "semantic-intent:approved:e2e"
      : "semantic-intent:draft:e2e",
    semanticIntentContractStatus: mutationAuthorized ? "approved" : "draft",
    digitalTwinChangeContractRef: mutationAuthorized
      ? "digital-twin-change:approved:e2e"
      : "digital-twin-change:draft:e2e",
    digitalTwinChangeContractStatus: mutationAuthorized ? "approved" : "draft",
    phase: mutationAuthorized ? "mutation-authorized" : "semantic-contract-drafted",
    allowedNextActions: ["status"],
    mutationAuthorized,
    sourceRefs: ["fde-ontology-engineering://session/fde-e2e"],
    turnDecisionSpecs: [],
    userDecisionRecords: [],
    decisionLedgerAuditFindings: [],
    createdAt: now,
    updatedAt: now,
  };
  writeOntologyEngineeringWorkflowState(state);
}

// ===========================================================================
// STAGE E — the INTENTIONAL escape-hatch (OP-2) works, while a SILENT edit is caught
// ===========================================================================

interface PointerShape {
  readonly promptId: string;
  readonly promptHash: string;
}

/** Fake in-memory EnvelopeStore — the model-unforgeable trust anchor, faked (production-test pattern). */
class FakeEnvelopeStore implements EnvelopeStore {
  private readonly envelopes = new Map<string, PromptEnvelope>();
  private readonly pointers = new Map<string, PointerShape>();
  private envKey(sessionId: string, promptId: string): string {
    return `${sessionId}::${promptId}`;
  }
  private ptrKey(runtime: PromptRuntime, sessionId: string): string {
    return `${runtime}::${sessionId}`;
  }
  putEnvelope(envelope: PromptEnvelope): void {
    this.envelopes.set(this.envKey(envelope.sessionId, envelope.promptId), envelope);
  }
  setPointer(runtime: PromptRuntime, sessionId: string, pointer: PointerShape): void {
    this.pointers.set(this.ptrKey(runtime, sessionId), pointer);
  }
  async readEnvelope(sessionId: string, promptId: string): Promise<PromptEnvelope | null> {
    return this.envelopes.get(this.envKey(sessionId, promptId)) ?? null;
  }
  async readCurrentPointer(
    runtime: PromptRuntime,
    sessionId: string,
  ): Promise<PointerShape | null> {
    return this.pointers.get(this.ptrKey(runtime, sessionId)) ?? null;
  }
}

const E_SESSION_ID = "sess-e2e-hatch";
const E_RUNTIME: PromptRuntime = "claude";
const E_PROJECT_ROOT = "/tmp/pm-oe-e2e-hatch";
const E_NOW_MS = Date.parse("2026-06-14T12:00:00.000Z");
const E_TOUCHED = ["hooks/ontology-engineering-workflow-enforcement-gate.ts"];
const APPROVING_PROMPT =
  "Go ahead and apply the hotfix to hooks/ontology-engineering-workflow-enforcement-gate.ts — I approve this source edit.";

function makeEnvelope(rawPrompt: string): PromptEnvelope {
  return createPromptEnvelope({
    rawPrompt,
    sessionId: E_SESSION_ID,
    runtime: E_RUNTIME,
    projectRoot: E_PROJECT_ROOT,
    capturedAt: "2026-06-14T11:58:00.000Z",
    sequence: 1,
  });
}

function makeRecord(
  envelope: PromptEnvelope,
  userQuote: string,
): SourceMutationApprovalRecord {
  return {
    kind: "developer-source-mutation",
    approvalRef: {
      schemaVersion: "prompt-front-door/approval-ref/v1",
      kind: "user-explicit-natural-language",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: E_SESSION_ID,
      runtime: E_RUNTIME,
      approvedAt: new Date(E_NOW_MS).toISOString(),
      userVisibleSummaryHash: "sha256:deadbeef",
      userAnswerExcerpt: userQuote,
      approvalSurface: "developer-source-mutation",
    },
    approvedSourcePaths: ["hooks/ontology-engineering-workflow-enforcement-gate.ts"],
    approvedAtPromptId: envelope.promptId,
    approvedPromptHash: envelope.promptHash,
    runtime: E_RUNTIME,
    sessionId: E_SESSION_ID,
    approvedAt: new Date(E_NOW_MS).toISOString(),
    userQuote,
  };
}

describe("E2E Stage E — intentional escape-hatch (OP-2) + silent-edit caught", () => {
  test("E1 (baseline): the OP-2 hatch WORKS — a re-verified envelope-bound approval lets the gate CONTINUE a protected-surface Edit", async () => {
    const envelope = makeEnvelope(APPROVING_PROMPT);
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(E_RUNTIME, E_SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    const record = makeRecord(envelope, "I approve this source edit");

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      E_TOUCHED,
      E_NOW_MS,
    );
    expect(verdict.authorized).toBe(true);

    // Feed the re-verified verdict as the gate's sourceMutationFastPath on a
    // protected-surface Edit with mutationAuthorized:false → the gate CONTINUES.
    const P = setupProjectRoot("e1");
    writeWorkflowState(P, false);
    const gate = assessOntologyEngineeringWorkflowHook(
      {
        cwd: P,
        tool_name: "Edit",
        tool_input: { file_path: path.join(P, ".claude/plugins/palantir-mini/hooks/hooks.json") },
      },
      { authorized: true, reason: verdict.reason ?? "re-verified against captured envelope" },
    );
    expect(gate.decision).toBe("continue");
  });

  test("E2 (baseline): a SILENT no-signal edit is CAUGHT — no approval verb (HOLE-2) → authorized:false → gate DENIES (fails closed, never 'closed')", async () => {
    // Envelope excerpt MENTIONS the protected surface but carries NO approval verb.
    const noVerb = "Please don't edit hooks/ontology-engineering-workflow-enforcement-gate.ts for now — just read it.";
    const envelope = makeEnvelope(noVerb);
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(E_RUNTIME, E_SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    const record = makeRecord(envelope, "don't edit hooks/");

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      E_TOUCHED,
      E_NOW_MS,
    );
    expect(verdict.authorized).toBe(false);

    // With no authorized fast-path, the gate DENIES the protected-surface Edit (fails closed).
    const P = setupProjectRoot("e2");
    writeWorkflowState(P, false);
    const gate = assessOntologyEngineeringWorkflowHook(
      {
        cwd: P,
        tool_name: "Edit",
        tool_input: { file_path: path.join(P, ".claude/plugins/palantir-mini/hooks/hooks.json") },
      },
      { authorized: false, reason: verdict.reason ?? "no unforgeable approval signal" },
    );
    expect(gate.decision).toBe("block");
    expect(gate.reason).toContain("mutation requires approved SIC and DTC");
  });
});

// ===========================================================================
// DP-DEEPENING facet groups — staged `test.todo()` at Step 0 (BUILD-SEQUENCE §STEP 1+).
// Each flips to live at the DP step that lands its facet substrate.
// ===========================================================================

describe("E2E DP-deepening — typed-facet substrate (staged; flip per DP step)", () => {
  test("DP-0 (LIVE at Step 1): the additive SicAxis.facet substrate breaks no guard — a session-derived SIC still satisfies isSemanticIntentContract; schemaVersion is still v2", () => {
    // DP-0 lands `SicAxis.facet?` + the `SicAxisFacet` union additively. The
    // guard does not validate axis internals, so a session-derived SIC (whose
    // axes may later carry `facet`) still conforms and stays on the live v2.
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(SCENARIO_SIGNAL_SESSION);
    expect(isSemanticIntentContract(draft)).toBe(true);
    expect(draft.schemaVersion).toBe(SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION);
    expect(draft.schemaVersion).toBe("prompt-dtc/semantic-intent-contract/v2");

    // The `facet` field is additive-optional: the guard ignores axis internals, so
    // a SIC conforms whether or not an axis carries one. DP-1 (Step 2) lands the
    // DATA `data-graph` facet, DP-3 (Step 3) the ACTION `action-writeback` facet,
    // and DP-2 (Step 4) the LOGIC `logic-block` facet; the remaining axes stay
    // facet-free until they carry signal. (At Step 1 NO axis carried a facet; that
    // invariant is intentionally retired for DATA + ACTION + LOGIC as their DP steps
    // land.) GOVERNANCE stays facet-free here because the base scenario session
    // carries NO governance signal (default-deny: no signal ⇒ no access-boundary).
    const { data, action, logic, ...otherAxes } = draft.axes ?? ({} as NonNullable<typeof draft.axes>);
    expect(data.facet).toBeDefined();
    expect(action.facet).toBeDefined();
    expect(logic.facet).toBeDefined();
    for (const axis of Object.values(otherAxes)) {
      expect(axis.facet).toBeUndefined();
    }
  });

  test("DP-1 (flips at Step 2): the DATA axis carries a 'data-graph' facet — Submission+Rubric objects + folded score property + belongsToRubric link with endpointsResolved", () => {
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(SCENARIO_SIGNAL_SESSION);
    const dataAxis = draft.axes?.data;
    if (!dataAxis) throw new Error("DATA axis missing");

    // Prose summary + status stay byte-identical to the un-enriched axis (the
    // facet is the additive machine projection, not a prose change).
    expect(dataAxis.status).toBe("draft");
    expect(dataAxis.summary).toBe("Operational objects and application state: Submission, Rubric");

    const facet = dataAxis.facet;
    if (!facet || facet.kind !== "data-graph") throw new Error("expected a data-graph facet");

    // Submission + Rubric become typed noun-graph objects; score folds onto its owner.
    expect(facet.objects.map((o) => o.name)).toEqual(["Submission", "Rubric"]);
    const submission = facet.objects.find((o) => o.name === "Submission")!;
    expect(submission.properties).toEqual([{ name: "score", dataType: "number" }]);
    const rubric = facet.objects.find((o) => o.name === "Rubric")!;
    expect(rubric.properties).toEqual([]);

    // belongsToRubric (Submission→Rubric): both endpoints present ⇒ endpointsResolved.
    expect(facet.links).toHaveLength(1);
    const link = facet.links[0]!;
    expect(link.name).toBe("belongsToRubric");
    expect(link.sourceObject).toBe("Submission");
    expect(link.targetObject).toBe("Rubric");
    expect(link.endpointsResolved).toBe(true);
  });
  test("DP-2 (flips at Step 4): the LOGIC axis carries a 'logic-block' facet — evaluatorKind + invokingActorScopeRef threaded into the GOVERNANCE accessBoundary toolScopes", () => {
    // Enrich the scenario's criteria function: it ROUTES THROUGH the finalizeScore
    // Apply-action under the Teacher's invoking-actor scope (the SSoT's "tool calls
    // run under the invoking user's permissions" rule). The base scenario fixture
    // carries no evaluatorKind/role, so the resolved binding is exercised here.
    const session: FDEOntologyEngineeringSession = {
      ...SCENARIO_SIGNAL_SESSION,
      functionCandidates: [
        {
          ...SCENARIO_SIGNAL_SESSION.functionCandidates[0]!,
          evaluatorKind: "routes-through-apply-action",
          invokingActorScopeRef: "role:teacher",
        },
      ],
      roleCandidates: [
        {
          candidateId: "role:teacher",
          plainName: "Teacher",
          principalKind: "agent",
          permissions: ["finalize-score"],
          evidenceRefs: ["evidence://teacher-role"],
        },
      ],
    };
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(session);

    const logic = draft.axes?.logic.facet;
    if (!logic || logic.kind !== "logic-block") throw new Error("expected a logic-block facet");
    expect(logic.functions).toHaveLength(1);
    expect(logic.functions[0]!.evaluatorKind).toBe("routes-through-apply-action");
    expect(logic.functions[0]!.invokingActorScope).toBe("Teacher");

    // The resolved invoking-actor scope threads into the GOVERNANCE accessBoundary.
    const governance = draft.axes?.governance.facet;
    if (!governance || governance.kind !== "access-boundary") {
      throw new Error("expected an access-boundary facet");
    }
    expect(governance.accessBoundary.toolScopes).toEqual([
      { toolName: "제출 기준 판정", actorScope: "Teacher", resolved: true },
    ]);
  });
  test("DP-3 (flips at Step 3): the ACTION axis carries an 'action-writeback' facet — writebackRisk + submissionCriteria; SUCCESS-EVAL refs gain typed submission-criteria:// proposal refs (elicitation-side only; requiredEvaluationRefs/synthesizeOntologyDtcBuildFields UNTOUCHED)", () => {
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(SCENARIO_SIGNAL_SESSION);

    // ACTION axis: writebackRisk + per-action submissionCriteria projected onto the facet.
    const actionAxis = draft.axes?.action;
    if (!actionAxis) throw new Error("ACTION axis missing");
    const facet = actionAxis.facet;
    if (!facet || facet.kind !== "action-writeback") throw new Error("expected an action-writeback facet");
    expect(facet.actions.map((a) => a.name)).toEqual(["finalizeScore"]);
    const finalize = facet.actions[0]!;
    expect(finalize.writebackRisk).toBe("high");
    expect(finalize.submissionCriteria).toEqual(["all rubric items graded", "teacher approval"]);

    // SUCCESS-EVAL axis: each submission criterion threads in as a typed proposal ref
    // (the cross-axis ACTION→SUCCESS-EVAL elicitation binding) + a summary mention.
    const successEval = draft.axes?.successEval;
    if (!successEval) throw new Error("SUCCESS-EVAL axis missing");
    expect(successEval.refs).toEqual([
      "submission-criteria://finalizeScore/0",
      "submission-criteria://finalizeScore/1",
    ]);
    expect(successEval.summary).toContain("Per-action submission criteria:");
    expect(successEval.summary).toContain("submission-criteria://finalizeScore/0");

    // BOUNDARY GUARD (front-half scope): the elicitation binding is a PROPOSAL only —
    // it never reaches into the back-half enforcement (requiredEvaluationRefs / the
    // DTC synthesis gate synthesizeOntologyDtcBuildFields). That line is OE-8 / Step 8
    // (the e2e C3 below stays test.todo until then).
    expect((draft as { requiredEvaluationRefs?: unknown }).requiredEvaluationRefs).toBeUndefined();
  });
  test("DP-4 (flips at Step 4): the GOVERNANCE axis carries an 'access-boundary' facet — failClosed===true, default-deny accessibleSurfaces (a surface with no session signal is ABSENT); an unresolved toolScope blocks V2 approval (fail-closed teeth, never a default grant); DigitalTwinDecisionDomain stays EXACTLY 5 members (no SECURITY)", () => {
    // A session with a Teacher role (governance signal) + object/function/action
    // signal but NO function routing through an Apply-action ⇒ no toolScope ⇒ the
    // "tools" surface is ABSENT (default-deny). failClosed is the literal `true` the
    // type itself carries — an access boundary is never constructed default-open.
    const governanceSignalSession: FDEOntologyEngineeringSession = {
      ...SCENARIO_SIGNAL_SESSION,
      roleCandidates: [
        {
          candidateId: "role:teacher",
          plainName: "Teacher",
          principalKind: "agent",
          permissions: ["finalize-score"],
          evidenceRefs: ["evidence://teacher-role"],
        },
      ],
    };
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(governanceSignalSession);
    const facet = draft.axes?.governance.facet;
    if (!facet || facet.kind !== "access-boundary") throw new Error("expected an access-boundary facet");
    expect(facet.accessBoundary.failClosed).toBe(true);
    expect(facet.accessBoundary.accessibleSurfaces).toEqual(["data", "logic", "action"]);
    expect(facet.accessBoundary.accessibleSurfaces).not.toContain("tools");

    // FAIL-CLOSED V2 gate (the load-bearing teeth): a function that routes through
    // an Apply-action with an UNRESOLVED invoking-actor scope ⇒ resolved:false ⇒ the
    // GOVERNANCE required-decision CANNOT be approved on an ontology-affecting plan.
    const unresolvedSession: FDEOntologyEngineeringSession = {
      ...SCENARIO_SIGNAL_SESSION,
      functionCandidates: [
        {
          ...SCENARIO_SIGNAL_SESSION.functionCandidates[0]!,
          evaluatorKind: "routes-through-apply-action",
          invokingActorScopeRef: "role:absent", // resolves to no role ⇒ fail-closed
        },
      ],
      roleCandidates: [],
    };
    const unresolvedDraft = createSemanticIntentContractDraftFromFDEOntologySession(unresolvedSession);
    const unresolvedFacet = unresolvedDraft.axes?.governance.facet;
    if (!unresolvedFacet || unresolvedFacet.kind !== "access-boundary") {
      throw new Error("expected an access-boundary facet");
    }
    expect(unresolvedFacet.accessBoundary.toolScopes.some((s) => s.resolved === false)).toBe(true);
    // NEVER a default grant: no toolScope is minted resolved:true for the unresolved ref.
    expect(unresolvedFacet.accessBoundary.toolScopes.some((s) => s.resolved === true)).toBe(false);

    const unresolvedPlan = buildContextEngineeringPlanV2({
      semanticIntentContract: { ...unresolvedDraft, status: "approved", approvalRef: "user:approved:grading-flow" },
      fdeSession: unresolvedSession,
      projectIndex: { projectRoot: unresolvedSession.projectRoot, indexRef: "INDEX.md", sourceRefs: ["evidence://session-source"] },
    });
    const unresolvedGov = unresolvedPlan.requiredUserDecisions.find((d) => d.domain === "GOVERNANCE")!;
    expect(canApproveRequiredUserDecision(unresolvedGov, { ontologyAffecting: true })).toBe(false);

    // Resolving the scope (a user GOVERNANCE turn) lets it approve — both directions.
    const resolvedSession: FDEOntologyEngineeringSession = {
      ...unresolvedSession,
      functionCandidates: [
        { ...unresolvedSession.functionCandidates[0]!, invokingActorScopeRef: "role:teacher" },
      ],
      roleCandidates: [
        {
          candidateId: "role:teacher",
          plainName: "Teacher",
          principalKind: "agent",
          permissions: ["finalize-score"],
          evidenceRefs: ["evidence://teacher-role"],
        },
      ],
    };
    const resolvedDraft = createSemanticIntentContractDraftFromFDEOntologySession(resolvedSession);
    const resolvedPlan = buildContextEngineeringPlanV2({
      semanticIntentContract: { ...resolvedDraft, status: "approved", approvalRef: "user:approved:grading-flow" },
      fdeSession: resolvedSession,
      projectIndex: { projectRoot: resolvedSession.projectRoot, indexRef: "INDEX.md", sourceRefs: ["evidence://session-source"] },
    });
    const resolvedGov = resolvedPlan.requiredUserDecisions.find((d) => d.domain === "GOVERNANCE")!;
    expect(canApproveRequiredUserDecision(resolvedGov, { ontologyAffecting: true })).toBe(true);

    // GOVERN-FOLD structural: the live V2 plan has EXACTLY the 5 decision domains —
    // Security folded onto the GOVERNANCE decision's accessBoundary, NO SECURITY member.
    const domains = resolvedPlan.requiredUserDecisions.map((d) => d.domain);
    expect(domains).toEqual(["DATA", "LOGIC", "ACTION", "TECHNOLOGY", "GOVERNANCE"]);
    expect(domains).not.toContain("SECURITY");
    expect(
      resolvedPlan.requiredUserDecisions
        .filter((d) => d.accessBoundary !== undefined)
        .map((d) => d.domain),
    ).toEqual(["GOVERNANCE"]);
  });
  test("DP-5 (LIVE at Step 5): every 'draft'-status axis emits a typed LatentIntentHypothesis confirmation-debt (facet-bound riskIfWrong + readinessRequirementIds); an 'open' axis emits NO debt; the debt self-clears when the turn engine confirms the axis (status → filled)", () => {
    // The base scenario session carries DATA + ACTION (+ LOGIC) signal but NO
    // GOVERNANCE signal (no roleCandidates, no Apply-action routing) ⇒ the
    // GOVERNANCE axis is "open" (nothing proposed), while DATA/ACTION are "draft"
    // proposals the turn engine has not yet confirmed = standing confirmation debt.
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(SCENARIO_SIGNAL_SESSION);
    const axes = draft.axes;
    if (!axes) throw new Error("axes missing");

    // GOVERNANCE has no session signal ⇒ "open" ⇒ NO debt for it.
    expect(axes.governance.status).toBe("open");

    const debt = deriveDraftAxisConfirmationDebt(draft);
    const debtAxes = new Set(debt.map((h) => h.decisionAxis));

    // Every "draft" axis self-declares debt; the "open" GOVERNANCE axis does NOT.
    const draftAxisKeys = (Object.keys(axes) as (keyof typeof axes)[]).filter(
      (k) => axes[k].status === "draft",
    );
    expect(debt).toHaveLength(draftAxisKeys.length);
    expect(debt.every((h) => h.status === "inferred")).toBe(true);
    // GOVERNANCE is "open" ⇒ no debt hypothesis carries its decisionAxis.
    expect(debtAxes.has("governance")).toBe(false);

    // DATA debt: correct decisionAxis + facet-bound riskIfWrong (the data-graph
    // facet's belongsToRubric endpoints are BOTH resolved here, so the risk is the
    // generic DATA-proposal risk, not the dangling-endpoint one) + readinessRequirementIds.
    const dataDebt = debt.find((h) => h.decisionAxis === "data")!;
    expect(dataDebt.decisionAxis).toBe("data");
    expect(dataDebt.readinessRequirementIds).toEqual(["axes.data"]);
    expect(dataDebt.riskIfWrong.length).toBeGreaterThan(0);
    expect(dataDebt.whyLeadInferredThis).toContain("Submission");

    // ACTION debt: the finalizeScore facet HAS submission criteria, so the
    // facet-bound risk does not trigger; the generic ACTION risk applies. The
    // decisionAxis + the axis turn id are the load-bearing assertions.
    const actionDebt = debt.find((h) => h.decisionAxis === "action")!;
    expect(actionDebt.decisionAxis).toBe("action");
    expect(actionDebt.readinessRequirementIds).toEqual(["axes.action"]);
    expect(actionDebt.riskIfWrong.length).toBeGreaterThan(0);

    // FACET-BOUND risk (the DP-1/DP-3 binding): an UNRESOLVED DATA endpoint surfaces
    // the dangling-relationship risk; a write-back action with NO submission criteria
    // surfaces the unchecked-mutation risk — each in its own axis's debt.
    const danglingSession: FDEOntologyEngineeringSession = {
      ...SCENARIO_SIGNAL_SESSION,
      linkCandidates: [
        {
          candidateId: "edge:dangling",
          plainName: "belongsToGhost",
          sourceObject: "Submission",
          targetObject: "Ghost", // not an object ⇒ endpointsResolved:false
          businessMeaning: "Dangling endpoint — confirmation debt, not a silent link.",
          evidenceRefs: ["evidence://dangling"],
        },
      ],
      actionCandidates: [
        {
          candidateId: "act:no-criteria",
          plainName: "commitRaw",
          operationalIntent: "Write back with no submission gate.",
          writebackRisk: "high",
          submissionCriteria: [],
          evidenceRefs: ["evidence://no-criteria"],
        },
      ],
    };
    const danglingDraft = createSemanticIntentContractDraftFromFDEOntologySession(danglingSession);
    const danglingDebt = deriveDraftAxisConfirmationDebt(danglingDraft);
    expect(danglingDebt.find((h) => h.decisionAxis === "data")!.riskIfWrong).toContain(
      "unresolved endpoint",
    );
    expect(danglingDebt.find((h) => h.decisionAxis === "action")!.riskIfWrong).toContain(
      "no submission criteria",
    );

    // SELF-CLEAR (paired): drive the 9-axis turn engine to CONFIRM the DATA axis
    // (turn index 1) — it mints status:"filled". Re-deriving yields NO DATA debt.
    const dataTurnIndex = NINE_AXIS_SIC_SEQUENCE.findIndex((d) => d.targetAxis === "data");
    const afterDataConfirm = advanceNineAxisSicSequence(
      draft as SemanticIntentContract,
      dataTurnIndex,
      "Submission (새 객체), Rubric (기존), score 속성",
    );
    expect(afterDataConfirm.axes?.data.status).toBe("filled");
    const debtAfterConfirm = deriveDraftAxisConfirmationDebt(afterDataConfirm);
    expect(debtAfterConfirm.some((h) => h.decisionAxis === "data")).toBe(false);
    // ACTION is still "draft" (unconfirmed) ⇒ its debt persists — the debt tracks
    // LIVE draft status and self-clears ONLY for the confirmed axis.
    expect(debtAfterConfirm.some((h) => h.decisionAxis === "action")).toBe(true);
  });
});
