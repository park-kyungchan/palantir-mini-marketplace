import type { ContractGateResult } from "../lead-intent/contracts";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import { DTC_FILL_SEQUENCE } from "../semantic-intent/fill-sequence";
import type { DtcWithFillFields } from "../semantic-intent/dtc-fill-sequence";
import type { OntologyActivation } from "../context-engineering/ontology-activation";
import type { Layer0IntentBridge } from "../context-engineering/intent-bridge";
import type { PromptContractRefs, PromptEnvelope, PromptRuntime } from "../prompt-front-door";

export const SEMANTIC_CONVERSATION_STATE_SCHEMA_VERSION =
  "palantir-mini/semantic-conversation-state/v1";

export interface SkillOntologyRef {
  readonly skillId: string;
  readonly skillPath?: string;
  readonly displayName?: string;
  readonly confidence?: "exact" | "inferred" | "candidate";
}

export interface CapabilityOntologyRef {
  readonly capabilityId: string;
  readonly sourceKind?: string;
  readonly sourceRef?: string;
  readonly displayName?: string;
  readonly confidence?: "exact" | "inferred" | "candidate";
}

export interface SemanticConversationQuestion {
  readonly questionId: string;
  readonly plainQuestion: string;
  readonly whyItMatters: string;
  readonly recommendedAnswer: string;
  readonly whatWillNotHappen: readonly string[];
  readonly answer?: string;
  readonly materiality: "blocking" | "important" | "non-blocking";
}

export interface SemanticConversationState {
  readonly stateId: string;
  readonly schemaVersion: typeof SEMANTIC_CONVERSATION_STATE_SCHEMA_VERSION;
  readonly universalEntryRef?: string;
  readonly ontologyContextRef?: string;

  readonly prompt: {
    readonly promptId?: string;
    readonly promptHash?: string;
    readonly sessionId?: string;
    readonly runtime?: PromptRuntime;
  };

  readonly userFacing: {
    readonly preferredLanguage: "ko" | "en";
    readonly userExpertise: "non_programmer" | "technical" | "developer";
    readonly plainRequestSummary: string;
    readonly confirmedGoal?: string;
    readonly confirmedNonGoals: readonly string[];
    readonly unresolvedQuestions: readonly SemanticConversationQuestion[];
  };

  readonly ontologyFacing: {
    readonly activatedObjectRefs: readonly string[];
    readonly activatedActionRefs: readonly string[];
    readonly activatedSurfaceRefs: readonly string[];
    readonly activatedLaneRefs: readonly string[];
    readonly forbiddenSurfaceRefs: readonly string[];
  };

  readonly skillFacing: {
    readonly candidateSkillRefs: readonly SkillOntologyRef[];
    readonly selectedSkillRefs: readonly SkillOntologyRef[];
    readonly rejectedSkillRefs?: readonly {
      readonly skillId: string;
      readonly reason: string;
    }[];
    readonly skillRoutingReason: string;
  };

  readonly capabilityFacing?: {
    readonly candidateCapabilityRefs: readonly CapabilityOntologyRef[];
    readonly selectedCapabilityRefs: readonly CapabilityOntologyRef[];
    readonly rejectedCapabilityRefs?: readonly {
      readonly capabilityId: string;
      readonly reason: string;
    }[];
    readonly capabilityRoutingReason: string;
  };

  readonly contractFacing: {
    readonly semanticIntentContractRef?: string;
    readonly digitalTwinChangeContractRef?: string;
    readonly approvalRef?: PromptContractRefs["approvalRef"];
    readonly dtcReady: boolean;
    // ADDITIVE — DTC fill progress fields (absent when no DTC fill in progress)
    readonly dtcFillTurnsCompleted?: number;
    readonly dtcFillNextQuestion?: string;
    readonly dtcFillUnresolvedTerms?: readonly string[];
  };

  readonly projectFacing: {
    readonly projectRoot: string;
    readonly projectId?: string;
    readonly projectScopeLaneIds: readonly string[];
    readonly requiredValidationPacks: readonly string[];
  };

  readonly impactFacing?: {
    readonly directSurfaceRefs: readonly string[];
    readonly downstreamSurfaceRefs: readonly string[];
    readonly confidence: "low" | "medium" | "high";
  };

  readonly issueFacing?: {
    readonly knownIssueIds: readonly string[];
    readonly warnings: readonly string[];
  };

  readonly validationFacing?: {
    readonly requiredValidationPacks: readonly string[];
    readonly suggestedCommands: readonly string[];
  };

  readonly lifecycle:
    | "captured"
    | "clarifying"
    | "semantic-approved"
    | "dtc-drafted"
    | "dtc-fill-in-progress"
    | "dtc-approved"
    | "routed";
}

export interface SemanticConversationGateInputLike {
  readonly project: string;
  readonly rawIntent: string;
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly sessionId?: string;
  readonly runtime?: PromptRuntime;
  readonly preferredLanguage?: "ko" | "en";
  readonly userExpertise?: "non_programmer" | "technical" | "developer";
}

export interface SemanticConversationAskQuestionLike {
  readonly questionId: string;
  readonly materiality: SemanticConversationQuestion["materiality"];
  readonly decisionSpec: {
    readonly plainKoreanSummary: string;
    readonly recommendedChoiceId: string;
    readonly choices: readonly {
      readonly choiceId: string;
      readonly consequence: string;
    }[];
  };
  readonly whyItMatters: string;
  readonly whatWillNotHappen: readonly string[];
}

export interface SemanticConversationReviewCardLike {
  readonly plainSummary: string;
  readonly questions: readonly {
    readonly questionId: string;
    readonly plainQuestion: string;
    readonly whyItMatters: string;
    readonly recommendedAnswer: string;
  }[];
}

export interface BuildSemanticConversationStateInput {
  readonly gateInput: SemanticConversationGateInputLike;
  readonly gate: ContractGateResult;
  readonly bridge: Layer0IntentBridge;
  readonly turnCardDecisionQueue: readonly SemanticConversationAskQuestionLike[];
  readonly userReviewCard?: SemanticConversationReviewCardLike;
  readonly ontologyActivation?: OntologyActivation;
  readonly universalEntryRef?: string;
  readonly ontologyContextRef?: string;
  readonly candidateSkills?: readonly SkillOntologyRef[];
  readonly selectedSkills?: readonly SkillOntologyRef[];
  readonly rejectedSkills?: readonly {
    readonly skillId: string;
    readonly reason: string;
  }[];
  readonly skillRoutingReason?: string;
  readonly candidateCapabilities?: readonly CapabilityOntologyRef[];
  readonly selectedCapabilities?: readonly CapabilityOntologyRef[];
  readonly rejectedCapabilities?: readonly {
    readonly capabilityId: string;
    readonly reason: string;
  }[];
  readonly capabilityRoutingReason?: string;
  readonly impactFacing?: SemanticConversationState["impactFacing"];
  readonly issueFacing?: SemanticConversationState["issueFacing"];
  readonly validationFacing?: SemanticConversationState["validationFacing"];
  readonly contractRefs?: PromptContractRefs;
  readonly promptEnvelope?: PromptEnvelope;
  readonly semanticIntentContract?: SemanticIntentContract;
  readonly digitalTwinChangeContract?: DigitalTwinChangeContract;
}

function unique(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0
  )));
}

function buildStateId(input: BuildSemanticConversationStateInput): string {
  const promptId = input.promptEnvelope?.promptId ?? input.gateInput.promptId;
  const promptHash = input.promptEnvelope?.promptHash ?? input.gateInput.promptHash;
  const seed =
    promptId ??
    promptHash ??
    input.semanticIntentContract?.contractId ??
    input.gateInput.rawIntent.slice(0, 80);
  return `semantic-conversation:${seed}`;
}

function mapQuestions(
  input: BuildSemanticConversationStateInput,
): readonly SemanticConversationQuestion[] {
  const cardQuestions = new Map(
    (input.userReviewCard?.questions ?? []).map((question) => [question.questionId, question]),
  );

  return input.turnCardDecisionQueue.map((question) => {
    const card = cardQuestions.get(question.questionId);
    const recommended = question.decisionSpec.choices.find(
      (choice) => choice.choiceId === question.decisionSpec.recommendedChoiceId,
    );
    return {
      questionId: question.questionId,
      plainQuestion: card?.plainQuestion ?? question.decisionSpec.plainKoreanSummary,
      whyItMatters: card?.whyItMatters ?? question.whyItMatters,
      recommendedAnswer: card?.recommendedAnswer ?? recommended?.consequence ?? "",
      whatWillNotHappen: question.whatWillNotHappen,
      materiality: question.materiality,
    };
  });
}

function deriveLifecycle(input: BuildSemanticConversationStateInput): SemanticConversationState["lifecycle"] {
  if (input.gate.allowsRouting && input.gate.digitalTwin.valid && input.contractRefs?.digitalTwinChangeContractRef) {
    return "dtc-approved";
  }
  // NEW BRANCH: DTC fill in progress — after dtc-drafted, before dtc-approved
  const dtc = input.digitalTwinChangeContract as DtcWithFillFields | undefined;
  if (dtc?.verdict === "dtc-filled" && !input.gate.digitalTwin.valid) {
    return "dtc-fill-in-progress";
  }
  if (
    dtc?.dtcFillSequence &&
    dtc.dtcFillSequence.length > 0 &&
    dtc.dtcFillSequence.length < DTC_FILL_SEQUENCE.length
  ) {
    return "dtc-fill-in-progress";
  }
  if (input.contractRefs?.digitalTwinChangeContractRef) return "dtc-drafted";
  if (input.gate.semanticIntent.valid || input.contractRefs?.semanticIntentContractRef) {
    return "semantic-approved";
  }
  if (input.turnCardDecisionQueue.length > 0) return "clarifying";
  return "captured";
}

function approvalRef(input: BuildSemanticConversationStateInput): PromptContractRefs["approvalRef"] | undefined {
  return (
    input.contractRefs?.approvalRef ??
    input.contractRefs?.digitalTwinApprovalRef ??
    input.contractRefs?.semanticIntentApprovalRef ??
    input.digitalTwinChangeContract?.approvalRef ??
    input.semanticIntentContract?.approvalRef
  );
}

export function buildSemanticConversationState(
  input: BuildSemanticConversationStateInput,
): SemanticConversationState {
  const prompt = input.promptEnvelope ?? input.gateInput;
  const semanticIntent = input.semanticIntentContract;
  const activation = input.ontologyActivation;
  const lifecycle = deriveLifecycle(input);
  const approval = approvalRef(input);
  const dtcReady =
    input.gate.digitalTwin.valid &&
    Boolean(input.contractRefs?.digitalTwinChangeContractRef) &&
    Boolean(approval);

  return {
    stateId: buildStateId(input),
    schemaVersion: SEMANTIC_CONVERSATION_STATE_SCHEMA_VERSION,
    universalEntryRef: input.universalEntryRef,
    ontologyContextRef: input.ontologyContextRef,
    prompt: {
      promptId: prompt.promptId,
      promptHash: prompt.promptHash,
      sessionId: prompt.sessionId,
      runtime: prompt.runtime,
    },
    userFacing: {
      preferredLanguage: input.gateInput.preferredLanguage ?? "ko",
      userExpertise: input.gateInput.userExpertise ?? "non_programmer",
      plainRequestSummary: input.userReviewCard?.plainSummary ?? input.gateInput.rawIntent,
      confirmedGoal:
        semanticIntent?.status === "approved" ? semanticIntent.confirmedIntent : undefined,
      confirmedNonGoals: semanticIntent?.status === "approved" ? semanticIntent.nonGoals : [],
      unresolvedQuestions: mapQuestions(input),
    },
    ontologyFacing: {
      activatedObjectRefs: unique([
        ...(activation?.approvedNouns ?? []),
        ...(semanticIntent?.approvedObjectTypeRefs ?? []).map(String),
        ...(semanticIntent?.approvedLinkTypeRefs ?? []).map(String),
      ]),
      activatedActionRefs: unique([
        ...(activation?.approvedVerbs ?? []),
        ...(activation?.actionRefs ?? []),
      ]),
      activatedSurfaceRefs: unique([
        ...(activation?.affectedSurfaces ?? []),
        ...(activation?.ontologyRefs ?? []),
        ...(semanticIntent?.approvedSurfaceRefs ?? []).map(String),
      ]),
      activatedLaneRefs: unique([...(semanticIntent?.approvedLaneRefs ?? []).map(String)]),
      forbiddenSurfaceRefs: unique([
        ...(activation?.forbiddenSurfaces ?? []),
        ...(semanticIntent?.downstreamForbidden ?? []),
      ]),
    },
    skillFacing: {
      candidateSkillRefs: input.candidateSkills ?? [],
      selectedSkillRefs: input.selectedSkills ?? [],
      rejectedSkillRefs: input.rejectedSkills,
      skillRoutingReason:
        input.skillRoutingReason ??
        "No project skill ontology router has selected skills for this phase.",
    },
    capabilityFacing: {
      candidateCapabilityRefs: input.candidateCapabilities ?? [],
      selectedCapabilityRefs: input.selectedCapabilities ?? [],
      rejectedCapabilityRefs: input.rejectedCapabilities,
      capabilityRoutingReason:
        input.capabilityRoutingReason ??
        "No generic capability router has selected capabilities for this phase.",
    },
    contractFacing: {
      semanticIntentContractRef:
        input.contractRefs?.semanticIntentContractRef ?? input.semanticIntentContract?.contractId,
      digitalTwinChangeContractRef:
        input.contractRefs?.digitalTwinChangeContractRef ?? input.digitalTwinChangeContract?.contractId,
      approvalRef: approval,
      dtcReady,
      // ADDITIVE — DTC fill progress (absent when no DTC fill sequence)
      ...((() => {
        const dtc = input.digitalTwinChangeContract as DtcWithFillFields | undefined;
        if (!dtc?.dtcFillSequence) return {};
        const turnsCompleted = dtc.dtcFillSequence.length;
        const nextDescriptor = DTC_FILL_SEQUENCE[turnsCompleted];
        return {
          dtcFillTurnsCompleted: turnsCompleted,
          ...(nextDescriptor ? { dtcFillNextQuestion: nextDescriptor.question } : {}),
          ...(dtc.touchedOntologyRefs && dtc.touchedOntologyRefs.length > 0
            ? {
                dtcFillUnresolvedTerms: dtc.touchedOntologyRefs
                  .filter(
                    (r) =>
                      (r as unknown as { unresolved?: boolean }).unresolved === true,
                  )
                  .map((r) => String((r as unknown as { rid?: string }).rid ?? JSON.stringify(r))),
              }
            : {}),
        };
      })()),
    },
    projectFacing: {
      projectRoot: input.gateInput.project,
      projectScopeLaneIds: unique([
        ...input.bridge.requiredAxes,
        ...input.bridge.directionalAxes,
        ...(semanticIntent?.approvedLaneRefs ?? []).map(String),
      ]),
      requiredValidationPacks: input.validationFacing?.requiredValidationPacks ?? [],
    },
    impactFacing: input.impactFacing,
    issueFacing: input.issueFacing,
    validationFacing: input.validationFacing,
    lifecycle,
  };
}
