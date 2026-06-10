// palantir-mini — the 5 SSoT agent-skill turn mechanics, as runtime-neutral helpers.
//
// AI FDE's understand-phase exposes 5 agent skills (turn-engine-agent-skills.md §4):
// request-clarification, generate-plan, change-mode, load-documentation, manage-context.
// pm draws on these for its Altitude-1 path (9-axis FDE-session → SIC → SIC→DTC). This
// module is the load-bearing first cut: small PURE projections (no I/O, no side effects,
// mutationAuthorized never touched) that runtime adapters (Claude skill, Codex) render.
// Bilingual (KO default / EN mirror), matching nine-axis-understand-session.ts.

import type {
  SemanticIntentContract,
  TurnCardDecisionChoice,
  TurnCardDecisionSpec,
} from "../lead-intent/contracts";
import type { NineAxisSicContract } from "./nine-axis-sic-fill-sequence";
import type {
  SemanticIntentAxes,
  SicAxis,
  SicAxisKey,
} from "#schemas/ontology/primitives/semantic-intent-contract";

/** Bilingual KO/EN axis labels for plan/clarification projections (non-developer friendly). */
const AXIS_LABEL: Record<SicAxisKey, string> = {
  data: "다루는 정보·대상 / Data",
  logic: "규칙·계산·판단 / Logic",
  action: "실제 변경·실행 / Action",
  governance: "권한·안전·승인 / Governance",
  context: "근거 자료·출처 / Context",
  successEval: "완료·정답 기준 / Success-Eval",
  constraintsNonGoals: "금지·범위 밖 / Constraints-NonGoals",
  actors: "실행자·권한 / Actors",
  memoryPrior: "재사용할 과거 결정 / Memory-Prior",
};

/** Iteration order matching the 9-axis sequence (DATA/LOGIC/ACTION/GOVERNANCE + 5 implicit). */
const AXIS_ORDER: readonly SicAxisKey[] = [
  "data",
  "logic",
  "action",
  "governance",
  "context",
  "successEval",
  "constraintsNonGoals",
  "actors",
  "memoryPrior",
] as const;

// --- discriminated union: one variant per SSoT agent skill -------------------

/** Request-clarification — a blocking clarification card surfacing unresolved fields. */
export interface RequestClarificationMechanic {
  readonly skill: "request-clarification";
  readonly card: TurnCardDecisionSpec;
}

/** Generate-plan — a reviewable plain-language projection of the SIC so far (the plan IS the SIC). */
export interface GeneratePlanMechanic {
  readonly skill: "generate-plan";
  /** Bilingual one-liner per axis (filled / not-applicable / open). */
  readonly axisLines: readonly string[];
  /** Axes still open (neither filled nor marked not-applicable). */
  readonly openItems: readonly string[];
  /** Bilingual one-line intent summary the plan is built around. */
  readonly intentSummary: string;
}

/** Change-mode — scope re-selection descriptor (re-project CONTEXT + tool surface). */
export interface ChangeModeMechanic {
  readonly skill: "change-mode";
  readonly targetMode: string;
}

/** Load-documentation — bounded CONTEXT pull descriptor (doc refs to load on demand). */
export interface LoadDocumentationMechanic {
  readonly skill: "load-documentation";
  readonly docRefs: readonly string[];
}

/** Manage-context — MEMORY-PRIOR curation descriptor (working-memory scope to keep). */
export interface ManageContextMechanic {
  readonly skill: "manage-context";
  readonly contextScope: readonly string[];
}

export type AgentSkillMechanic =
  | RequestClarificationMechanic
  | GeneratePlanMechanic
  | ChangeModeMechanic
  | LoadDocumentationMechanic
  | ManageContextMechanic;

// --- helpers (pure) ----------------------------------------------------------

function axisStatusFragment(axis: SicAxis | undefined): { open: boolean; note: string } {
  if (!axis || axis.status === "open") {
    return { open: true, note: "미정 / open" };
  }
  if (axis.status === "not-applicable") {
    return { open: false, note: "해당 없음 / N/A" };
  }
  return { open: false, note: axis.summary || "채움 / filled" };
}

// --- 1. request-clarification ------------------------------------------------

/**
 * Request-clarification (SSoT §4 row 1): intent disambiguation toward the SIC.
 * Returns a BLOCKING clarification card for one axis, listing what is unresolved
 * with user choices. Pure: same (axisKey, ambiguity) → same card.
 */
export function requestClarification(
  axisKey: SicAxisKey,
  ambiguity: string,
): RequestClarificationMechanic {
  const label = AXIS_LABEL[axisKey];
  const choices: readonly TurnCardDecisionChoice[] = [
    {
      choiceId: "clarify",
      label: "직접 설명 / Explain",
      consequence: `${axisKey} 축의 미해결 부분을 채움 / resolves the unresolved part of the ${axisKey} axis`,
      recommended: true,
    },
    {
      choiceId: "not-applicable",
      label: "해당 없음 / N/A",
      consequence:
        `${axisKey} 축을 not-applicable로 표시 — 사용자가 명시적으로 선택한 결정으로 기록됩니다` +
        ` / marks ${axisKey} not-applicable — recorded as the USER's explicit decision`,
    },
  ];
  return {
    skill: "request-clarification",
    card: {
      decisionId: `agent-skill:request-clarification:${axisKey}`,
      phase: axisKey,
      plainKoreanTitle: `명확화 필요: ${label}`,
      plainKoreanSummary: `Clarification needed: ${label}`,
      whyItMatters:
        `진행 전에 이 부분이 불명확합니다 / This is unresolved before proceeding: ${ambiguity}`,
      recommendedChoiceId: "clarify",
      choices,
      evidenceRefs: [],
      blocking: true,
      freeTextAllowed: true,
    },
  };
}

// --- 2. generate-plan --------------------------------------------------------

/**
 * Generate-plan (SSoT §4 row 2): a reviewable plan BEFORE DTC. The plan IS the SIC —
 * a pure plain-language projection (per-axis one-liners + open items), no mutation.
 * Pure: same contract → same projection.
 */
export function generatePlan(contract: SemanticIntentContract): GeneratePlanMechanic {
  const axes: SemanticIntentAxes | undefined = (contract as NineAxisSicContract).axes;
  const axisLines: string[] = [];
  const openItems: string[] = [];
  for (const key of AXIS_ORDER) {
    const { open, note } = axisStatusFragment(axes?.[key]);
    axisLines.push(`${AXIS_LABEL[key]}: ${note}`);
    if (open) openItems.push(AXIS_LABEL[key]);
  }
  const intent = contract.confirmedIntent || contract.rawIntent || "(미정 / not yet set)";
  return {
    skill: "generate-plan",
    axisLines,
    openItems,
    intentSummary: `의도 / Intent: ${intent}`,
  };
}

// --- 3-5. thin typed descriptors ---------------------------------------------

/** Change-mode (SSoT §4 row 3): re-project CONTEXT + tool surface onto a new task mode. */
export function changeMode(targetMode: string): ChangeModeMechanic {
  return { skill: "change-mode", targetMode };
}

/** Load-documentation (SSoT §4 row 4): bounded CONTEXT pull — doc refs to load on demand. */
export function loadDocumentation(docRefs: readonly string[]): LoadDocumentationMechanic {
  return { skill: "load-documentation", docRefs: [...docRefs] };
}

/** Manage-context (SSoT §4 row 5): MEMORY-PRIOR curation — the working-memory scope to keep. */
export function manageContext(contextScope: readonly string[]): ManageContextMechanic {
  return { skill: "manage-context", contextScope: [...contextScope] };
}
