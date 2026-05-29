/**
 * Pure derivation: DtcFillSequenceSession → DtcPanelProjection.
 *
 * No I/O. No side effects. Deterministic given the same inputs.
 * Consumed by lib/chatbot-studio/workbench-state.ts as the dtcPanel
 * optional field builder.
 *
 * HARD INVARIANT: mutationAuthorizedFromPanel is always the literal `false`.
 * This function surfaces fill-turn status only — never authorizes mutation.
 * Mutation authority remains with the approved DigitalTwinChangeContract +
 * approvalRef, NOT the panel projection.
 *
 * Source refs:
 *   ~/.claude/plugins/palantir-mini/lib/chatbot-studio/fde-panel-builder.ts (pattern)
 *   ~/.claude/plugins/palantir-mini/lib/semantic-intent/fill-sequence.ts §DTC_FILL_SEQUENCE
 */

import type { DtcFillSequenceSession } from "./dtc-fill-session";
import {
  assertDtcApprovalCardTextBeforeDisplay,
} from "../ontology-engineering-response-template";
import type {
  ApprovalRef,
  DigitalTwinDecisionDomain,
  DigitalTwinRequiredDecisionStatus,
  DigitalTwinRequiredUserDecision,
} from "../lead-intent/contracts";
import { DTC_FILL_SEQUENCE } from "../semantic-intent/fill-sequence";

export const DTC_PANEL_SCHEMA_VERSION = "palantir-mini/dtc-panel/v1" as const;

export interface DtcPanelBuilderHints {
  readonly hasApprovedSemanticIntentContract?: boolean;
  readonly hasApprovedDigitalTwinChangeContract?: boolean;
  readonly preferredLanguage?: "ko" | "en";
  readonly requiredUserDecisions?: readonly DigitalTwinRequiredUserDecision[];
}

export interface BuildDtcPanelInput {
  readonly session: DtcFillSequenceSession;
  readonly hints?: DtcPanelBuilderHints;
  readonly nowIso?: string;
}

export type DtcPanelStatus =
  | "not-started"
  | "in-progress"
  | "dtc-filled"
  | "dtc-approved";

export interface DtcPanelProjection {
  readonly schemaVersion: typeof DTC_PANEL_SCHEMA_VERSION;
  readonly composedAt: string;
  /** 0..6; -1 when no turn advanced. */
  readonly turnIndex: number;
  readonly question?: string;
  readonly questionEn?: string;
  /** Progress fraction 0..1. */
  readonly progress: number;
  readonly completedTurns: readonly number[];
  readonly blockingUnresolvedTerms: readonly string[];
  readonly decisionClosure: readonly DtcPanelDecisionClosure[];
  readonly status: DtcPanelStatus;
  readonly nextAllowedAction: readonly string[];
  /** Plain-language summary sentence (per hints.preferredLanguage). */
  readonly plainLanguageStatus: string;
  /** HARD INVARIANT marker. */
  readonly mutationAuthorizedFromPanel: false;
}

export interface DtcPanelDecisionClosure {
  readonly domain: DigitalTwinDecisionDomain;
  readonly status: DigitalTwinRequiredDecisionStatus;
  readonly blocking: boolean;
  readonly evidenceRefs: readonly string[];
  readonly approvalRef?: ApprovalRef;
  readonly acceptedRiskRef?: ApprovalRef;
  readonly mutationAuthorizedFromDecision: false;
}

// ---------------------------------------------------------------------------
// Bilingual status message tables
// ---------------------------------------------------------------------------

const STATUS_KO: Record<DtcPanelStatus, string> = {
  "not-started":
    "DTC fill을 시작하지 않았습니다. T0 — changeBoundary 질문부터 시작하세요.",
  "in-progress":
    "DTC fill 진행 중입니다. 현재 턴 답변을 입력하거나 agent 자동 채움을 사용하세요.",
  "dtc-filled":
    "DTC fill이 완료됐습니다 (verdict='dtc-filled'). 사용자 승인을 기다리는 중이에요.",
  "dtc-approved":
    "Digital Twin 변경 경계 승인 기록이 있습니다. 이제 라우터가 그 경계 안에서만 실행 후보를 고를 수 있습니다. 실제 변경은 WorkContract 또는 SprintContract와 검증을 통과해야 합니다.",
};

const STATUS_EN: Record<DtcPanelStatus, string> = {
  "not-started": "DTC fill not started. Begin with T0 — changeBoundary.",
  "in-progress":
    "DTC fill in progress. Answer the current turn or invoke agent auto-fill.",
  "dtc-filled":
    "DTC fill complete (verdict='dtc-filled'). Awaiting user approval.",
  "dtc-approved":
    "A Digital Twin change-boundary approval record exists. The router may now choose execution candidates only inside that boundary. Actual changes still require a WorkContract or SprintContract and validation.",
};

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

function plainLanguageStatus(
  status: DtcPanelStatus,
  lang: "ko" | "en" | undefined,
): string {
  if (lang === "en") return STATUS_EN[status];
  return STATUS_KO[status];
}

function deriveStatus(session: DtcFillSequenceSession): DtcPanelStatus {
  if (session.fillVerdict === "dtc-approved") return "dtc-approved";
  if (session.fillVerdict === "dtc-filled") return "dtc-filled";
  if (session.completedTurns.length === 0) return "not-started";
  return "in-progress";
}

function decisionClosure(
  decisions: readonly DigitalTwinRequiredUserDecision[] | undefined,
): readonly DtcPanelDecisionClosure[] {
  return (decisions ?? []).map((decision) => ({
    domain: decision.domain,
    status: decision.status,
    blocking: decision.blocking,
    evidenceRefs: [...decision.evidenceRefs],
    ...(decision.approvalRef ? { approvalRef: decision.approvalRef } : {}),
    ...(decision.acceptedRiskRef ? { acceptedRiskRef: decision.acceptedRiskRef } : {}),
    mutationAuthorizedFromDecision: false,
  }));
}

// ---------------------------------------------------------------------------
// Main derivation
// ---------------------------------------------------------------------------

export function buildDtcPanel(input: BuildDtcPanelInput): DtcPanelProjection {
  const { session, hints, nowIso } = input;
  const composedAt = nowIso ?? new Date().toISOString();
  const status = deriveStatus(session);
  const turnIndex = session.currentTurnIndex;
  const descriptor =
    turnIndex >= 0 && turnIndex < DTC_FILL_SEQUENCE.length
      ? DTC_FILL_SEQUENCE[turnIndex]
      : undefined;
  const completedTurns = [...session.completedTurns];
  const progress = completedTurns.length / DTC_FILL_SEQUENCE.length;

  const nextAllowedAction: readonly string[] =
    status === "dtc-approved"
      ? ["route-with-approved-dtc"]
      : status === "dtc-filled"
        ? ["request-dtc-approval", "revise-dtc-turn"]
        : ["answer-dtc-turn", "revise-dtc-turn", "dtc-auto-fill-remaining", "hold-dtc-fill"];
  const plainLanguageStatusText = plainLanguageStatus(status, hints?.preferredLanguage);
  assertDtcApprovalCardTextBeforeDisplay({
    surface: "chatbot-studio.dtcPanel.plainLanguageStatus",
    text: plainLanguageStatusText,
  });

  return {
    schemaVersion: DTC_PANEL_SCHEMA_VERSION,
    composedAt,
    turnIndex,
    ...(descriptor?.question !== undefined ? { question: descriptor.question } : {}),
    ...(descriptor?.questionEn !== undefined ? { questionEn: descriptor.questionEn } : {}),
    progress,
    completedTurns,
    blockingUnresolvedTerms: session.blockingUnresolvedTerms ?? [],
    decisionClosure: decisionClosure(hints?.requiredUserDecisions),
    status,
    nextAllowedAction,
    plainLanguageStatus: plainLanguageStatusText,
    mutationAuthorizedFromPanel: false,
  };
}
