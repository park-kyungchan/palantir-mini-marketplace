/**
 * Pure derivation: FDEOntologyBuildSession → FDEPanelProjection.
 *
 * No I/O. No side effects. Deterministic given the same inputs.
 * Consumed by lib/chatbot-studio/workbench-state.ts as the fdePanel
 * optional field builder.
 *
 * HARD INVARIANT: mutationAuthorizedFromPanel is always the literal `false`.
 * This function surfaces status only — never authorizes mutation.
 */

import type {
  FDEOntologyBuildSession,
  FDEReadinessVerdict,
  FDEReviewLevel,
  FDEReviewLevelGap,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import type {
  FDEPanelBuilderHints,
  FDEPanelProjection,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-panel";
import { FDE_PANEL_SCHEMA_VERSION } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-panel";

export interface BuildFDEPanelInput {
  readonly session: FDEOntologyBuildSession;
  readonly hints?: FDEPanelBuilderHints;
  readonly nowIso?: string;
}

// ---------------------------------------------------------------------------
// Plain-language status messages
// ---------------------------------------------------------------------------

const STATUS_KO: Record<FDEReadinessVerdict, string> = {
  "not-ready":
    "지금은 어떤 결정을 개선하는지 아직 명확하지 않습니다. mission/decision부터 정리하시죠.",
  "mission-clear":
    "미션과 결정 목표가 확인됐습니다. 이제 오브젝트 타입을 검토할 차례예요.",
  "object-link-clear":
    "오브젝트와 링크 타입 검토가 완료됐습니다. 액션/라이트백 단계로 넘어가세요.",
  "action-clear":
    "액션 라이트백 검토가 완료됐습니다. 챗봇 스튜디오 구성을 살펴볼게요.",
  "chatbot-clear":
    "챗봇 스튜디오 검토가 완료됐습니다. 이제 Eval 및 관찰 가능성을 확인하세요.",
  "eval-clear":
    "Eval 검토가 완료됐습니다. 시맨틱 승인 준비 단계에 거의 다 왔어요.",
  "ready-for-semantic-approval":
    "기본 검토는 끝났습니다. 다음은 FDE에서 확인한 의미를 승인된 SIC 경계로 기록하고, DTC와 검증 계획을 따로 확인하는 단계입니다. 이 화면만으로 구현은 시작되지 않습니다.",
};

const STATUS_EN: Record<FDEReadinessVerdict, string> = {
  "not-ready":
    "The decision this surface should support is not yet clear. Start with mission/decision.",
  "mission-clear":
    "Mission and decision are confirmed. Next: review object types.",
  "object-link-clear":
    "Object and link type review is done. Proceed to action/writeback.",
  "action-clear":
    "Action writeback review is done. Review chatbot studio configuration.",
  "chatbot-clear":
    "Chatbot studio review is done. Check eval and observability posture.",
  "eval-clear":
    "Eval review is done. Almost ready for semantic approval.",
  "ready-for-semantic-approval":
    "The FDE review is ready. Next, record the FDE-confirmed meaning as the SIC boundary, then review the DTC and validation plan separately. This panel does not start implementation.",
};

function plainLanguageStatus(
  readiness: FDEReadinessVerdict,
  lang: "ko" | "en" | undefined,
): string {
  const table = lang === "ko" ? STATUS_KO : STATUS_EN;
  return table[readiness];
}

// ---------------------------------------------------------------------------
// missionDecisionSummary derivation
// ---------------------------------------------------------------------------

function deriveMissionDecisionSummary(
  session: FDEOntologyBuildSession,
): string {
  const { missionDecision } = session;
  if (!missionDecision) return "";

  const parts: string[] = [];
  if (missionDecision.useCaseName) parts.push(missionDecision.useCaseName);
  if (missionDecision.operationalDecision)
    parts.push(missionDecision.operationalDecision);
  return parts.join(" — ");
}

// ---------------------------------------------------------------------------
// Main derivation
// ---------------------------------------------------------------------------

/** Pure derivation: FDEOntologyBuildSession → FDEPanelProjection. */
export function buildFDEPanel(input: BuildFDEPanelInput): FDEPanelProjection {
  const { session, hints, nowIso } = input;

  const composedAt = nowIso ?? new Date().toISOString();

  // currentLevel: last element of completedLevels, or "none"
  const currentLevel: FDEReviewLevel | "none" =
    session.completedLevels.length > 0
      ? (session.completedLevels[session.completedLevels.length - 1] as FDEReviewLevel)
      : "none";

  const completedLevels: readonly FDEReviewLevel[] = [...session.completedLevels];

  const missionDecisionSummary = deriveMissionDecisionSummary(session);

  // topGaps: up to 5, mapped to panel gap shape
  const topGaps = session.topGaps.slice(0, 5).map(
    (g: FDEReviewLevelGap): FDEPanelProjection["topGaps"][number] => ({
      gapId: g.gapId,
      level: g.level,
      severity: g.severity,
      description: g.description,
      ...(g.nextQuestion !== undefined ? { nextQuestion: g.nextQuestion } : {}),
    }),
  );

  const readiness = session.readiness;

  // semanticApprovalReady: readiness === "ready-for-semantic-approval" AND
  // hints.hasApprovedSemanticIntentContract === true
  const semanticApprovalReady =
    readiness === "ready-for-semantic-approval" &&
    hints?.hasApprovedSemanticIntentContract === true;

  // readOnly: session is read-only OR readiness not ready-for-semantic-approval
  // OR no approved SIC
  const readOnly =
    session.readOnly ||
    readiness !== "ready-for-semantic-approval" ||
    !hints?.hasApprovedSemanticIntentContract;

  // dtcNeededNow: only when semanticApprovalReady AND no DTC approved yet
  const dtcNeededNow =
    semanticApprovalReady && hints?.hasApprovedDigitalTwinChangeContract !== true;

  const lang = hints?.preferredLanguage;

  const statusText = plainLanguageStatus(readiness, lang);

  // nextQuestion: session.nextQuestion ?? topGaps[0].nextQuestion ?? undefined
  const nextQuestion: string | undefined =
    session.nextQuestion ??
    topGaps[0]?.nextQuestion ??
    undefined;

  return {
    schemaVersion: FDE_PANEL_SCHEMA_VERSION,
    composedAt,
    currentLevel,
    completedLevels,
    missionDecisionSummary,
    topGaps,
    readiness,
    readOnly,
    semanticApprovalReady,
    dtcNeededNow,
    plainLanguageStatus: statusText,
    ...(nextQuestion !== undefined ? { nextQuestion } : {}),
    mutationAuthorizedFromPanel: false,
  };
}
