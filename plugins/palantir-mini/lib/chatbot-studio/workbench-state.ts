import type {
  CapabilityOntologyRef,
  SemanticConversationQuestion,
  SemanticConversationState,
  SkillOntologyRef,
} from "./semantic-conversation-state";
import type { FDEOntologyBuildSession } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import type {
  FDEPanelBuilderHints,
  FDEPanelProjection,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-panel";
import { buildFDEPanel } from "./fde-panel-builder";
import type { FDEOntologyEngineeringSession } from "../fde-ontology-engineering/types";
import type { FDEEngineeringPanelProjection } from "./fde-engineering-panel-builder";
import { buildFDEEngineeringPanel } from "./fde-engineering-panel-builder";
import type {
  LeadOntologyTurnCard,
  LeadOntologyTurnCardV2,
  LeadOntologyTurnCardV3,
} from "./lead-ontology-turn-card";
import {
  buildLeadOntologyTurnCard,
  buildLeadOntologyTurnCardV2,
  buildLeadOntologyTurnCardV3,
} from "./lead-ontology-turn-card";
import type { DtcPanelBuilderHints, DtcPanelProjection } from "./dtc-panel-builder";
import { buildDtcPanel } from "./dtc-panel-builder";
import type { DtcFillSequenceSession } from "./dtc-fill-session";
import { DTC_FILL_SEQUENCE } from "../semantic-intent/fill-sequence";

export const SEMANTIC_WORKBENCH_STATE_SCHEMA_VERSION =
  "palantir-mini/semantic-workbench-state/v1";

export interface SemanticWorkbenchChoice {
  readonly choiceId?: string;
  readonly kind?: string;
  readonly label: string;
  readonly consequence: string;
  readonly targetHypothesisId?: string;
  readonly appliesToRequirementIds?: readonly string[];
  readonly internalAction?: unknown;
}

export interface SemanticWorkbenchReviewCard {
  readonly title: string;
  readonly plainSummary: string;
  readonly choices: readonly SemanticWorkbenchChoice[];
}

export interface SemanticWorkbenchState {
  readonly schemaVersion: typeof SEMANTIC_WORKBENCH_STATE_SCHEMA_VERSION;
  readonly conversation: SemanticConversationState;
  readonly reviewCards: readonly SemanticWorkbenchReviewCard[];
  readonly ontologyPreview: {
    readonly objects: readonly string[];
    readonly actions: readonly string[];
    readonly surfaces: readonly string[];
    readonly forbidden: readonly string[];
  };
  readonly impactPreview: {
    readonly directSurfaces: readonly string[];
    readonly downstreamSurfaces: readonly string[];
    readonly confidence: "low" | "medium" | "high";
  };
  readonly issuePreview: readonly {
    readonly issueId: string;
    readonly title: string;
    readonly severity: string;
    readonly recommendedAction: string;
  }[];
  readonly validationPreview: readonly {
    readonly validationPack: string;
    readonly command?: string;
    readonly required: boolean;
  }[];
  readonly candidateSkills: readonly SkillOntologyRef[];
  readonly selectedSkills: readonly SkillOntologyRef[];
  readonly rejectedSkills: readonly {
    readonly skillId: string;
    readonly reason: string;
  }[];
  readonly candidateCapabilities: readonly CapabilityOntologyRef[];
  readonly selectedCapabilities: readonly CapabilityOntologyRef[];
  readonly rejectedCapabilities: readonly {
    readonly capabilityId: string;
    readonly reason: string;
  }[];
  readonly nextAllowedActions: readonly string[];
  /** Optional FDE workbench projection. Populated only when input.fdeSession is supplied.
   *  Backward-compat: undefined when fdeSession absent — guarantees byte-identical
   *  output for callers that don't opt in. */
  readonly fdePanel?: FDEPanelProjection;
  /** Optional FDE ontology-engineering projection. This is separate from the
   * readiness-oriented fdePanel and never authorizes mutation. */
  readonly fdeEngineeringPanel?: FDEEngineeringPanelProjection;
  /** Optional Lead-facing ontology turn card. Present only for explicit FDE
   * engineering sessions; never authorizes mutation. */
  readonly leadOntologyTurnCard?: LeadOntologyTurnCard;
  readonly leadOntologyTurnCardV2?: LeadOntologyTurnCardV2;
  readonly leadOntologyTurnCardV3?: LeadOntologyTurnCardV3;
  /** Optional DTC fill turn projection. Populated only when input.dtcSession is supplied.
   *  Backward-compat: undefined when dtcSession absent — guarantees byte-identical
   *  output for callers that don't opt in. */
  readonly dtcPanel?: DtcPanelProjection;
}

export interface BuildSemanticWorkbenchStateInput {
  readonly conversation: SemanticConversationState;
  readonly reviewTitle?: string;
  readonly nextAllowedActions?: readonly string[];
  readonly fdeSession?: FDEOntologyBuildSession;
  readonly fdePanelHints?: FDEPanelBuilderHints;
  readonly fdeEngineeringSession?: FDEOntologyEngineeringSession;
  readonly dtcSession?: DtcFillSequenceSession;
  readonly dtcPanelHints?: DtcPanelBuilderHints;
}

function questionCard(question: SemanticConversationQuestion): SemanticWorkbenchReviewCard {
  return {
    title: question.materiality === "blocking"
      ? "Blocking clarification"
      : "Meaning check",
    plainSummary: question.plainQuestion,
    choices: [
      {
        label: "Accept recommendation",
        consequence: question.recommendedAnswer,
      },
      {
        label: "Revise meaning",
        consequence: question.whyItMatters,
      },
      {
        label: "Hold",
        consequence: question.whatWillNotHappen.join(" "),
      },
    ],
  };
}

function defaultReviewCards(
  conversation: SemanticConversationState,
  reviewTitle?: string,
  dtcSession?: DtcFillSequenceSession,
  fdeEngineeringSession?: FDEOntologyEngineeringSession,
): readonly SemanticWorkbenchReviewCard[] {
  // DTC fill turn pre-emption — surface turn card BEFORE other cards
  if (
    dtcSession &&
    dtcSession.fillVerdict !== "dtc-approved" &&
    dtcSession.currentTurnIndex >= 0 &&
    dtcSession.currentTurnIndex < DTC_FILL_SEQUENCE.length
  ) {
    const descriptor = DTC_FILL_SEQUENCE[dtcSession.currentTurnIndex]!;
    const turnNumber = dtcSession.currentTurnIndex + 1;
    return [
      {
        title: `DTC Turn ${turnNumber} of ${DTC_FILL_SEQUENCE.length}`,
        plainSummary: descriptor.question,
        choices: [
          {
            label: "Answer this turn",
            consequence: `Capture user input into ${descriptor.targetField} and advance to T${dtcSession.currentTurnIndex + 1}.`,
          },
          {
            label: "Agent auto-fill",
            consequence: `Run ${descriptor.autoFillStrategy} to populate ${descriptor.targetField} via MCP impact_query.`,
          },
          {
            label: "Hold DTC fill",
            consequence: "No DTC mutation boundary advances until this turn is answered.",
          },
        ],
      },
    ];
  }

  const questionCards = conversation.userFacing.unresolvedQuestions.map(questionCard);
  const fdeLeadCard = fdeEngineeringSession
    ? buildLeadOntologyTurnCard({ session: fdeEngineeringSession })
    : undefined;
  const fdeLeadCardV2 = fdeEngineeringSession
    ? buildLeadOntologyTurnCardV2({ session: fdeEngineeringSession })
    : undefined;
  const fdeReviewCard: SemanticWorkbenchReviewCard | undefined = fdeLeadCard
    ? {
        title: fdeLeadCard.title,
        plainSummary: fdeLeadCard.plainSummary,
        choices: fdeLeadCardV2?.choices ?? fdeLeadCard.choices,
      }
    : undefined;

  if (questionCards.length > 0) {
    return fdeReviewCard ? [fdeReviewCard, ...questionCards] : questionCards;
  }

  const title = reviewTitle ?? (
    conversation.contractFacing.dtcReady
      ? "Approved DTC boundary"
      : "Semantic meaning captured"
  );

  const defaultCard = {
    title,
    plainSummary:
      conversation.userFacing.confirmedGoal ??
      conversation.userFacing.plainRequestSummary,
    choices: conversation.contractFacing.dtcReady
      ? [
          {
            label: "Route inside boundary",
            consequence:
              "Implementation may proceed only inside the approved Digital Twin boundary.",
          },
        ]
      : [
          {
            label: "Draft DTC",
            consequence:
              "Use the approved meaning to draft a project-scoped Digital Twin boundary.",
          },
          {
            label: "Hold before mutation",
            consequence:
              "No file-changing implementation is opened until the DTC boundary is approved.",
          },
        ],
  } satisfies SemanticWorkbenchReviewCard;

  return fdeReviewCard ? [fdeReviewCard, defaultCard] : [
    {
      ...defaultCard,
    },
  ];
}

function defaultNextAllowedActions(
  conversation: SemanticConversationState,
  dtcSession?: DtcFillSequenceSession,
): readonly string[] {
  if (
    dtcSession &&
    dtcSession.fillVerdict !== "dtc-approved" &&
    dtcSession.completedTurns.length < DTC_FILL_SEQUENCE.length
  ) {
    return ["answer-dtc-turn", "revise-dtc-turn", "dtc-auto-fill-remaining", "hold-dtc-fill"];
  }

  if (conversation.userFacing.unresolvedQuestions.length > 0) {
    return ["answer-clarification", "revise-semantic-meaning", "hold-before-dtc"];
  }

  if (!conversation.contractFacing.semanticIntentContractRef) {
    return ["approve-semantic-intent", "revise-semantic-meaning", "hold-before-dtc"];
  }

  if (!conversation.contractFacing.dtcReady) {
    return ["draft-dtc", "request-dtc-approval", "hold-before-mutation"];
  }

  return ["route-with-approved-dtc", "run-validation", "record-lineage"];
}

function issuePreview(
  conversation: SemanticConversationState,
): SemanticWorkbenchState["issuePreview"] {
  const warnings = conversation.issueFacing?.warnings ?? [];
  return (conversation.issueFacing?.knownIssueIds ?? []).map((issueId, index) => {
    const warning = warnings[index] ?? issueId;
    const match = /^(low|medium|high|blocking|warning):\s*(.*?)\s+-\s*(.*)$/i.exec(warning);
    return {
      issueId,
      title: match?.[2] ?? warning,
      severity: match?.[1] ?? "warning",
      recommendedAction: match?.[3] ?? warning,
    };
  });
}

function validationPreview(
  conversation: SemanticConversationState,
): SemanticWorkbenchState["validationPreview"] {
  const packs =
    conversation.validationFacing?.requiredValidationPacks ??
    conversation.projectFacing.requiredValidationPacks;
  const commands = conversation.validationFacing?.suggestedCommands ?? [];
  return packs.map((pack, index) => ({
    validationPack: pack,
    command: commands[index],
    required: true,
  }));
}

export function buildSemanticWorkbenchState(
  input: BuildSemanticWorkbenchStateInput,
): SemanticWorkbenchState {
  const { conversation } = input;

  const fdePanel: FDEPanelProjection | undefined = input.fdeSession
    ? buildFDEPanel({ session: input.fdeSession, hints: input.fdePanelHints })
    : undefined;
  const fdeEngineeringPanel: FDEEngineeringPanelProjection | undefined =
    input.fdeEngineeringSession
      ? buildFDEEngineeringPanel({ session: input.fdeEngineeringSession })
      : undefined;
  const leadOntologyTurnCard: LeadOntologyTurnCard | undefined =
    input.fdeEngineeringSession
      ? buildLeadOntologyTurnCard({ session: input.fdeEngineeringSession })
      : undefined;
  const leadOntologyTurnCardV2: LeadOntologyTurnCardV2 | undefined =
    input.fdeEngineeringSession
      ? buildLeadOntologyTurnCardV2({ session: input.fdeEngineeringSession })
      : undefined;
  const leadOntologyTurnCardV3: LeadOntologyTurnCardV3 | undefined =
    input.fdeEngineeringSession
      ? buildLeadOntologyTurnCardV3({ session: input.fdeEngineeringSession })
      : undefined;

  // ADDITIVE: dtcPanel build path — byte-identical guard so absent dtcSession
  // produces same output as pre-change (no new key in Object.keys())
  const dtcPanel: DtcPanelProjection | undefined = input.dtcSession
    ? buildDtcPanel({ session: input.dtcSession, hints: input.dtcPanelHints })
    : undefined;

  return {
    schemaVersion: SEMANTIC_WORKBENCH_STATE_SCHEMA_VERSION,
    conversation,
    reviewCards: defaultReviewCards(
      conversation,
      input.reviewTitle,
      input.dtcSession,
      input.fdeEngineeringSession,
    ),
    ontologyPreview: {
      objects: conversation.ontologyFacing.activatedObjectRefs,
      actions: conversation.ontologyFacing.activatedActionRefs,
      surfaces: conversation.ontologyFacing.activatedSurfaceRefs,
      forbidden: conversation.ontologyFacing.forbiddenSurfaceRefs,
    },
    impactPreview: {
      directSurfaces: conversation.impactFacing?.directSurfaceRefs ?? [],
      downstreamSurfaces: conversation.impactFacing?.downstreamSurfaceRefs ?? [],
      confidence: conversation.impactFacing?.confidence ?? "low",
    },
    issuePreview: issuePreview(conversation),
    validationPreview: validationPreview(conversation),
    candidateSkills: conversation.skillFacing.candidateSkillRefs,
    selectedSkills: conversation.skillFacing.selectedSkillRefs,
    rejectedSkills: conversation.skillFacing.rejectedSkillRefs ?? [],
    candidateCapabilities: conversation.capabilityFacing?.candidateCapabilityRefs ?? [],
    selectedCapabilities: conversation.capabilityFacing?.selectedCapabilityRefs ?? [],
    rejectedCapabilities: conversation.capabilityFacing?.rejectedCapabilityRefs ?? [],
    nextAllowedActions:
      input.nextAllowedActions && input.nextAllowedActions.length > 0
        ? input.nextAllowedActions
        : defaultNextAllowedActions(conversation, input.dtcSession),
    // ADDITIVE: only present when fdePanel defined to preserve byte-identical
    // legacy output (Object.keys() order matters for golden snapshot tests)
    ...(fdePanel !== undefined ? { fdePanel } : {}),
    ...(fdeEngineeringPanel !== undefined ? { fdeEngineeringPanel } : {}),
    ...(leadOntologyTurnCard !== undefined ? { leadOntologyTurnCard } : {}),
    ...(leadOntologyTurnCardV2 !== undefined ? { leadOntologyTurnCardV2 } : {}),
    ...(leadOntologyTurnCardV3 !== undefined ? { leadOntologyTurnCardV3 } : {}),
    // ADDITIVE: byte-identical guard pattern (same as fdePanel above)
    ...(dtcPanel !== undefined ? { dtcPanel } : {}),
  };
}
