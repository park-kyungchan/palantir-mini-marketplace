import type {
  RuntimeId,
  RuntimeSupportDeclaration,
} from "../../core/contracts";
import {
  buildApplicationStateFromConversation,
  type ChatbotStudioApplicationState,
} from "./application-state";
import {
  buildRetrievalContextFromConversation,
  type ChatbotStudioRetrievalContext,
} from "./retrieval-context";
import type { SemanticConversationState } from "./semantic-conversation-state";
import { approvalRefToString } from "../lead-intent/contracts";

export const CHATBOT_STUDIO_DECLARATION_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-declaration/v1" as const;
export const CHATBOT_STUDIO_SESSION_STATE_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-session-state/v1" as const;
export const CHATBOT_STUDIO_EXCHANGE_STATE_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-exchange-state/v1" as const;
export const CHATBOT_STUDIO_EVAL_SURFACE_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-eval-surface/v1" as const;
export const CHATBOT_STUDIO_SEMANTIC_BOUNDARY_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-semantic-boundary/v1" as const;

const PALANTIR_CHATBOT_STUDIO_SOURCE_REFS = [
  "/home/palantirkc/.claude/research/palantir-official/foundry/architecture-center/aip-architecture.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/chatbot-studio/application-state.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/chatbot-studio/retrieval-context.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/chatbot-studio/tools.md",
] as const;

const PALANTIR_ONTOLOGY_SOURCE_REFS = [
  "/home/palantirkc/.claude/research/palantir-official/foundry/ontology/core-concepts.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/object-link-types/object-types-overview.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/object-link-types/link-types-overview.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/action-types/overview.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/functions/overview.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/interfaces/interface-overview.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/global-branching/overview.md",
  "/home/palantirkc/.claude/research/palantir-official/foundry/aip-evals/ontology-edits.md",
] as const;

export type ChatbotStudioApprovalPolicy =
  | "none"
  | "semantic-intent-required"
  | "dtc-approval-required"
  | "human-review-required";

export type ChatbotStudioToolKind =
  | "request-clarification"
  | "retrieval-context"
  | "draft-dtc"
  | "route-with-approved-dtc"
  | "eval-check";

export type ChatbotStudioSemanticBoundaryLayer =
  | "context-engineering"
  | "ontology-modeling";

export type ChatbotStudioContextEngineeringKind =
  | "DATA"
  | "LOGIC"
  | "ACTION"
  | "GOVERNANCE"
  | "SECURITY"
  | "EVAL"
  | "RUNTIME";

export type ChatbotStudioOntologyPrimitiveKind =
  | "ObjectType"
  | "LinkType"
  | "ActionType"
  | "Function"
  | "Interface"
  | "ObjectView"
  | "ObjectSet"
  | "Branch"
  | "Proposal"
  | "OntologyEdit";

export interface ChatbotStudioSemanticBoundaryRef {
  readonly refId: string;
  readonly layer: ChatbotStudioSemanticBoundaryLayer;
  readonly kind: ChatbotStudioContextEngineeringKind | ChatbotStudioOntologyPrimitiveKind;
  readonly title: string;
  readonly sourceAuthorityRefs: readonly string[];
  readonly localAnalogueStatus:
    | "context-state"
    | "ontology-modeling-concept"
    | "local-governance-analogue";
  readonly doesNotProve: readonly string[];
}

export interface ChatbotStudioSemanticBoundary {
  readonly schemaVersion: typeof CHATBOT_STUDIO_SEMANTIC_BOUNDARY_SCHEMA_VERSION;
  readonly localAnalogueOnly: true;
  readonly foundryParityClaimed: false;
  readonly providerIdentityAuthority: "metadata-only";
  readonly mutationAuthority: "approved-dtc-only";
  readonly sourceAuthorityRefs: readonly string[];
  readonly contextEngineeringRefs: readonly ChatbotStudioSemanticBoundaryRef[];
  readonly ontologyPrimitiveRefs: readonly ChatbotStudioSemanticBoundaryRef[];
  readonly nonInterchangeabilityWarnings: readonly string[];
  readonly noReferenceNoConfusionRules: readonly string[];
  readonly doesNotProve: readonly string[];
}

export interface ChatbotStudioRuntimeProjection {
  readonly runtime: RuntimeId;
  readonly support: RuntimeSupportDeclaration;
  readonly adapterContractRef: string;
  readonly packageSurface: "codex-plugin" | "absent";
  readonly runtimeGapRefs: readonly string[];
  readonly unsupportedSurfaceRefs: readonly string[];
}

export interface ChatbotStudioToolSurface {
  readonly surfaceId: string;
  readonly kind: ChatbotStudioToolKind;
  readonly title: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly approvalPolicy: ChatbotStudioApprovalPolicy;
  readonly inputStateRefs: readonly string[];
  readonly outputStateRefs: readonly string[];
  readonly runtimeRefs: readonly RuntimeId[];
  readonly blockedReason?: string;
}

export interface ChatbotStudioActionSurface {
  readonly actionId: string;
  readonly actionKind: "proposal" | "protected-mutation" | "publish-analogue";
  readonly title: string;
  readonly enabled: boolean;
  readonly approvalPolicy: ChatbotStudioApprovalPolicy;
  readonly approvalEvidenceRefs: readonly string[];
  readonly blockedReason?: string;
}

export interface ChatbotStudioEvalSurface {
  readonly schemaVersion: typeof CHATBOT_STUDIO_EVAL_SURFACE_SCHEMA_VERSION;
  readonly evalId: string;
  readonly evalKind:
    | "application-state"
    | "retrieval-context"
    | "semantic-boundary"
    | "tool-planning"
    | "action-approval"
    | "traceability";
  readonly required: boolean;
  readonly evidenceRefs: readonly string[];
  readonly commandRefs: readonly string[];
}

export interface ChatbotStudioDeclaration {
  readonly schemaVersion: typeof CHATBOT_STUDIO_DECLARATION_SCHEMA_VERSION;
  readonly declarationId: string;
  readonly conversationStateId: string;
  readonly sourceKind: "local-aip-chatbot-studio-analogue";
  readonly scope: "one-developer-local-analogue";
  readonly title: string;
  readonly description: string;
  readonly nonParityClaims: readonly string[];
  readonly applicationState: ChatbotStudioApplicationState;
  readonly retrievalContext: ChatbotStudioRetrievalContext;
  readonly semanticBoundary: ChatbotStudioSemanticBoundary;
  readonly runtimeProjections: readonly ChatbotStudioRuntimeProjection[];
  readonly toolSurfaces: readonly ChatbotStudioToolSurface[];
  readonly actionSurfaces: readonly ChatbotStudioActionSurface[];
  readonly evalSurfaces: readonly ChatbotStudioEvalSurface[];
}

export interface ChatbotStudioExchangeState {
  readonly schemaVersion: typeof CHATBOT_STUDIO_EXCHANGE_STATE_SCHEMA_VERSION;
  readonly exchangeId: string;
  readonly userInput: string;
  readonly responseMarkdown: string;
  readonly plannedToolSurfaceRefs: readonly string[];
  readonly blockedActionSurfaceRefs: readonly string[];
  readonly variableUpdateRefs: readonly string[];
  readonly evalTraceRefs: readonly string[];
  readonly createdAt: string;
}

export interface ChatbotStudioSessionState {
  readonly schemaVersion: typeof CHATBOT_STUDIO_SESSION_STATE_SCHEMA_VERSION;
  readonly sessionId: string;
  readonly declarationId: string;
  readonly conversationStateId: string;
  readonly lifecycle: "draft" | "blocked" | "ready-for-review" | "approved-boundary";
  readonly applicationVariableSnapshot: Readonly<Record<string, unknown>>;
  readonly exchanges: readonly ChatbotStudioExchangeState[];
  readonly traceRefs: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ChatbotStudioValidationIssue {
  readonly issueId: string;
  readonly path: string;
  readonly message: string;
}

export interface ChatbotStudioValidationResult {
  readonly status: "pass" | "fail";
  readonly issues: readonly ChatbotStudioValidationIssue[];
}

export interface BuildChatbotStudioDeclarationInput {
  readonly conversation: SemanticConversationState;
  readonly declarationId?: string;
  readonly title?: string;
  readonly description?: string;
}

export interface BuildChatbotStudioSessionStateInput {
  readonly declaration: ChatbotStudioDeclaration;
  readonly sessionId?: string;
  readonly userInput?: string;
  readonly responseMarkdown?: string;
  readonly now?: Date;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}:${value.replace(/[^A-Za-z0-9:_-]+/g, "-").replace(/-+/g, "-")}`;
}

function unique(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0
  )));
}

function contextBoundaryRef(
  kind: ChatbotStudioContextEngineeringKind,
  title: string,
  sourceAuthorityRefs: readonly string[],
): ChatbotStudioSemanticBoundaryRef {
  return {
    refId: `semantic-boundary:context-engineering:${kind}`,
    layer: "context-engineering",
    kind,
    title,
    sourceAuthorityRefs,
    localAnalogueStatus: "context-state",
    doesNotProve: [
      `${kind} is not an Ontology primitive declaration.`,
      `${kind} does not authorize local or Foundry ontology mutation.`,
    ],
  };
}

function ontologyBoundaryRef(
  kind: ChatbotStudioOntologyPrimitiveKind,
  title: string,
  sourceAuthorityRefs: readonly string[],
  localAnalogueStatus: ChatbotStudioSemanticBoundaryRef["localAnalogueStatus"] =
    "ontology-modeling-concept",
): ChatbotStudioSemanticBoundaryRef {
  return {
    refId: `semantic-boundary:ontology-modeling:${kind}`,
    layer: "ontology-modeling",
    kind,
    title,
    sourceAuthorityRefs,
    localAnalogueStatus,
    doesNotProve: [
      `${kind} grounding does not make the local workbench a Foundry SaaS runtime.`,
      `${kind} grounding does not bypass SIC/DTC approval, branch/proposal review, or mutation governance.`,
    ],
  };
}

export function buildChatbotStudioSemanticBoundary(
  conversation: SemanticConversationState,
  retrievalContext: ChatbotStudioRetrievalContext,
): ChatbotStudioSemanticBoundary {
  const sourceAuthorityRefs = unique([
    ...PALANTIR_CHATBOT_STUDIO_SOURCE_REFS,
    ...PALANTIR_ONTOLOGY_SOURCE_REFS,
    conversation.universalEntryRef,
    conversation.ontologyContextRef,
    ...retrievalContext.sourceRefs,
  ]);
  return {
    schemaVersion: CHATBOT_STUDIO_SEMANTIC_BOUNDARY_SCHEMA_VERSION,
    localAnalogueOnly: true,
    foundryParityClaimed: false,
    providerIdentityAuthority: "metadata-only",
    mutationAuthority: "approved-dtc-only",
    sourceAuthorityRefs,
    contextEngineeringRefs: [
      contextBoundaryRef("DATA", "Application state, retrieval context, and source data selection.", [
        PALANTIR_CHATBOT_STUDIO_SOURCE_REFS[0],
        PALANTIR_CHATBOT_STUDIO_SOURCE_REFS[1],
        PALANTIR_CHATBOT_STUDIO_SOURCE_REFS[2],
      ]),
      contextBoundaryRef("LOGIC", "Reasoning, routing, and tool-planning logic around gathered context.", [
        PALANTIR_CHATBOT_STUDIO_SOURCE_REFS[0],
        PALANTIR_CHATBOT_STUDIO_SOURCE_REFS[3],
      ]),
      contextBoundaryRef("ACTION", "Tool/action surfaces available to a local Chatbot Studio turn.", [
        PALANTIR_CHATBOT_STUDIO_SOURCE_REFS[3],
      ]),
      contextBoundaryRef("GOVERNANCE", "Approval boundaries, review gates, and local publish analogue constraints.", [
        PALANTIR_CHATBOT_STUDIO_SOURCE_REFS[0],
        "/home/palantirkc/.claude/research/palantir-official/foundry/global-branching/protecting-resources.md",
      ]),
      contextBoundaryRef("SECURITY", "Runtime separation and non-authorizing provider identity metadata.", [
        "/home/palantirkc/.claude/research/palantir-official/foundry/ai-fde/security-and-governance.md",
      ]),
      contextBoundaryRef("EVAL", "Evaluation and regression checks for local workbench outputs.", [
        "/home/palantirkc/.claude/research/palantir-official/foundry/aip-evals/ontology-edits.md",
      ]),
      contextBoundaryRef("RUNTIME", "Codex/Claude/Gemini runtime support status and reload evidence boundaries.", [
        "/home/palantirkc/.claude/research/palantir-official/foundry/palantir-mcp/overview.md",
        "docs/RUNTIME_LAYER_BOUNDARY.md",
      ]),
    ],
    ontologyPrimitiveRefs: [
      ontologyBoundaryRef("ObjectType", "Ontology object type modeling concept.", [
        PALANTIR_ONTOLOGY_SOURCE_REFS[1],
      ]),
      ontologyBoundaryRef("LinkType", "Ontology link type modeling concept.", [
        PALANTIR_ONTOLOGY_SOURCE_REFS[2],
      ]),
      ontologyBoundaryRef("ActionType", "Ontology action type and governed edit surface.", [
        PALANTIR_ONTOLOGY_SOURCE_REFS[3],
      ]),
      ontologyBoundaryRef("Function", "Foundry Function / Logic Function concept.", [
        PALANTIR_ONTOLOGY_SOURCE_REFS[4],
      ]),
      ontologyBoundaryRef("Interface", "Ontology interface concept.", [
        PALANTIR_ONTOLOGY_SOURCE_REFS[5],
      ]),
      ontologyBoundaryRef("ObjectView", "Object view presentation concept.", [
        "/home/palantirkc/.claude/research/palantir-official/foundry/object-views/overview.md",
      ]),
      ontologyBoundaryRef("ObjectSet", "Ontology object set concept used by tools and views.", [
        PALANTIR_ONTOLOGY_SOURCE_REFS[0],
        PALANTIR_CHATBOT_STUDIO_SOURCE_REFS[1],
      ]),
      ontologyBoundaryRef("Branch", "Global Branching branch lifecycle concept.", [
        PALANTIR_ONTOLOGY_SOURCE_REFS[6],
      ], "local-governance-analogue"),
      ontologyBoundaryRef("Proposal", "Global Branching proposal/review concept.", [
        PALANTIR_ONTOLOGY_SOURCE_REFS[6],
      ], "local-governance-analogue"),
      ontologyBoundaryRef("OntologyEdit", "Governed ontology edit/eval concept.", [
        PALANTIR_ONTOLOGY_SOURCE_REFS[7],
      ], "local-governance-analogue"),
    ],
    nonInterchangeabilityWarnings: [
      "Context Engineering DATA/LOGIC/ACTION/GOVERNANCE/SECURITY/EVAL/RUNTIME surfaces describe how local context, tools, approval, eval, and runtime gaps are gathered and governed; they are not ObjectType/LinkType/ActionType/Function/Interface declarations.",
      "A Chatbot Studio action tool is not an Ontology ActionType unless an approved, Palantir-grounded primitive ref says so.",
      "Application state, retrieval context, session ledger, and publish analogue are local workbench state; they are not Foundry Ontology mutation authority.",
      "Provider/runtime identity is metadata only; it does not create semantic authority or mutation authority.",
      "Local AIP Chatbot Studio is a one-developer analogue and does not claim Foundry SaaS parity.",
    ],
    noReferenceNoConfusionRules: [
      "Semantic implementation claims must cite local Palantir research SSoT under /home/palantirkc/.claude/research/palantir-official/.",
      "Local derived palantir-mini vocabulary cannot override Palantir official/research authority.",
      "Generated docs, tool descriptions, and workbench output must not collapse Context Engineering layer names into Ontology primitive names.",
      "Gemini support remains runtime_gap/unsupported until native evidence exists.",
      "Public Codex MCP input schemas must stay flat and avoid anyOf/oneOf/allOf/not composition keywords.",
    ],
    doesNotProve: [
      "Does not prove active runtime completion; plugin reinstall/reload and Codex process restart smoke evidence are still required.",
      "Does not prove Foundry SaaS, AIP Studio API, Workshop, Marketplace, or Palantir security parity.",
      "Does not authorize protected mutation without approved DTC evidence.",
      "Does not convert Chatbot Studio application state, retrieval context, or local ledger data into Ontology primitives.",
    ],
  };
}

export function defaultChatbotStudioRuntimeProjections(): readonly ChatbotStudioRuntimeProjection[] {
  return [
    {
      runtime: "codex",
      support: "adapter-native",
      adapterContractRef: "runtime-adapters/codex/contract.json",
      packageSurface: "codex-plugin",
      runtimeGapRefs: [
        "codex:source-complete-is-not-active-runtime-complete",
        "codex:requires-plugin-reinstall-reload-and-process-restart",
      ],
      unsupportedSurfaceRefs: [
        "codex:hook-event:PreToolUse:unmounted-until-opt-out-and-read-only-classification",
      ],
    },
    {
      runtime: "claude",
      support: "unsupported",
      adapterContractRef: "runtime-adapters/claude/contract.json",
      packageSurface: "absent",
      runtimeGapRefs: ["claude:install-surface-absent", "claude:hook-registry-absent"],
      unsupportedSurfaceRefs: [
        "claude:palantir-mini-runtime-package-absent",
        "claude:runtime-adapter-contract-only",
      ],
    },
    {
      runtime: "gemini",
      support: "unsupported",
      adapterContractRef: "runtime-adapters/gemini/contract.json",
      packageSurface: "absent",
      runtimeGapRefs: ["gemini:extension-absent", "gemini:runtime-gap-unsupported"],
      unsupportedSurfaceRefs: [
        "gemini:palantir-mini-runtime-package-absent",
        "gemini:native-evidence-absent",
      ],
    },
  ];
}

export function buildChatbotStudioEvalSurfaces(
  conversation: SemanticConversationState,
): readonly ChatbotStudioEvalSurface[] {
  const commonEvidence = unique([
    "lib/chatbot-studio/semantic-conversation-state.ts",
    "lib/chatbot-studio/application-state.ts",
    "lib/chatbot-studio/retrieval-context.ts",
    conversation.validationFacing?.suggestedCommands[0],
  ]);
  return [
    {
      schemaVersion: CHATBOT_STUDIO_EVAL_SURFACE_SCHEMA_VERSION,
      evalId: "chatbot-studio-local-regression:application-state",
      evalKind: "application-state",
      required: true,
      evidenceRefs: commonEvidence,
      commandRefs: ["bun test tests/lib/chatbot-studio/data-core.test.ts"],
    },
    {
      schemaVersion: CHATBOT_STUDIO_EVAL_SURFACE_SCHEMA_VERSION,
      evalId: "chatbot-studio-local-regression:retrieval-context",
      evalKind: "retrieval-context",
      required: true,
      evidenceRefs: commonEvidence,
      commandRefs: ["bun test tests/lib/chatbot-studio/data-core.test.ts"],
    },
    {
      schemaVersion: CHATBOT_STUDIO_EVAL_SURFACE_SCHEMA_VERSION,
      evalId: "chatbot-studio-local-regression:semantic-boundary",
      evalKind: "semantic-boundary",
      required: true,
      evidenceRefs: unique([
        ...PALANTIR_CHATBOT_STUDIO_SOURCE_REFS,
        ...PALANTIR_ONTOLOGY_SOURCE_REFS,
        "tests/lib/chatbot-studio/data-core.test.ts",
      ]),
      commandRefs: ["bun test tests/lib/chatbot-studio/data-core.test.ts"],
    },
    {
      schemaVersion: CHATBOT_STUDIO_EVAL_SURFACE_SCHEMA_VERSION,
      evalId: "chatbot-studio-local-regression:action-approval",
      evalKind: "action-approval",
      required: true,
      evidenceRefs: unique([
        conversation.contractFacing.semanticIntentContractRef,
        conversation.contractFacing.digitalTwinChangeContractRef,
        approvalRefToString(conversation.contractFacing.approvalRef),
      ]),
      commandRefs: ["bun test tests/lib/chatbot-studio/data-core.test.ts"],
    },
  ];
}

function toolSurfaces(conversation: SemanticConversationState): readonly ChatbotStudioToolSurface[] {
  const hasSemanticIntent = Boolean(conversation.contractFacing.semanticIntentContractRef);
  const hasQuestions = conversation.userFacing.unresolvedQuestions.length > 0;
  const dtcReady = conversation.contractFacing.dtcReady;
  return [
    {
      surfaceId: "tool:chatbot-studio:retrieval-context",
      kind: "retrieval-context",
      title: "Build retrieval context",
      description:
        "Build local retrieved prompt context from SemanticConversationState; Context Engineering refs are not Ontology primitive declarations.",
      enabled: true,
      approvalPolicy: "none",
      inputStateRefs: [conversation.stateId],
      outputStateRefs: ["retrievalContext"],
      runtimeRefs: ["codex"],
    },
    {
      surfaceId: "tool:chatbot-studio:request-clarification",
      kind: "request-clarification",
      title: "Request clarification",
      description: "Surface unresolved user-facing meaning questions before DTC approval.",
      enabled: hasQuestions,
      approvalPolicy: "none",
      inputStateRefs: [conversation.stateId],
      outputStateRefs: ["userFacing.unresolvedQuestions"],
      runtimeRefs: ["codex"],
      ...(hasQuestions ? {} : { blockedReason: "No unresolved clarification questions." }),
    },
    {
      surfaceId: "tool:chatbot-studio:draft-dtc",
      kind: "draft-dtc",
      title: "Draft Digital Twin boundary",
      description: "Draft a local DTC from approved semantic meaning; this is proposal-only.",
      enabled: hasSemanticIntent && !dtcReady,
      approvalPolicy: "semantic-intent-required",
      inputStateRefs: ["contractFacing.semanticIntentContractRef"],
      outputStateRefs: ["contractFacing.digitalTwinChangeContractRef"],
      runtimeRefs: ["codex"],
      ...(hasSemanticIntent && !dtcReady
        ? {}
        : { blockedReason: "Requires approved semantic intent and unapproved DTC boundary." }),
    },
    {
      surfaceId: "tool:chatbot-studio:route-with-approved-dtc",
      kind: "route-with-approved-dtc",
      title: "Route with approved DTC",
      description: "Route implementation only after prompt-front-door approval evidence exists.",
      enabled: dtcReady,
      approvalPolicy: "dtc-approval-required",
      inputStateRefs: [
        "contractFacing.digitalTwinChangeContractRef",
        "contractFacing.approvalRef",
      ],
      outputStateRefs: ["traceRefs"],
      runtimeRefs: ["codex"],
      ...(dtcReady ? {} : { blockedReason: "DTC approval evidence is missing." }),
    },
  ];
}

function actionSurfaces(conversation: SemanticConversationState): readonly ChatbotStudioActionSurface[] {
  const approvalEvidenceRefs = unique([
    conversation.contractFacing.digitalTwinChangeContractRef,
    approvalRefToString(conversation.contractFacing.approvalRef),
  ]);
  return [
    {
      actionId: "action:chatbot-studio:protected-mutation",
      actionKind: "protected-mutation",
      title: "Protected mutation",
      enabled: conversation.contractFacing.dtcReady,
      approvalPolicy: "dtc-approval-required",
      approvalEvidenceRefs,
      ...(conversation.contractFacing.dtcReady
        ? {}
        : { blockedReason: "Protected actions require approved DTC evidence." }),
    },
    {
      actionId: "action:chatbot-studio:publish-analogue",
      actionKind: "publish-analogue",
      title: "Publish analogue",
      enabled: false,
      approvalPolicy: "human-review-required",
      approvalEvidenceRefs,
      blockedReason: "PR6 data core records publish intent only; PR7 owns ledger-backed publish analogue.",
    },
  ];
}

export function buildChatbotStudioDeclarationFromConversation(
  input: BuildChatbotStudioDeclarationInput,
): ChatbotStudioDeclaration {
  const { conversation } = input;
  const applicationState = buildApplicationStateFromConversation(conversation);
  const retrievalContext = buildRetrievalContextFromConversation(conversation);
  const semanticBoundary = buildChatbotStudioSemanticBoundary(conversation, retrievalContext);
  return {
    schemaVersion: CHATBOT_STUDIO_DECLARATION_SCHEMA_VERSION,
    declarationId:
      input.declarationId ?? stableId("chatbot-studio-declaration", conversation.stateId),
    conversationStateId: conversation.stateId,
    sourceKind: "local-aip-chatbot-studio-analogue",
    scope: "one-developer-local-analogue",
    title:
      input.title ??
      conversation.userFacing.confirmedGoal ??
      conversation.userFacing.plainRequestSummary,
    description:
      input.description ??
      "Local, one-developer Chatbot Studio analogue derived from SemanticConversationState.",
    nonParityClaims: [
      "Not Foundry SaaS parity.",
      "Not Workshop, Marketplace, API, or Palantir security parity.",
      "Does not authorize protected mutation without DTC approval evidence.",
      "Context Engineering layers are not Ontology modeling primitives.",
    ],
    applicationState,
    retrievalContext,
    semanticBoundary,
    runtimeProjections: defaultChatbotStudioRuntimeProjections(),
    toolSurfaces: toolSurfaces(conversation),
    actionSurfaces: actionSurfaces(conversation),
    evalSurfaces: buildChatbotStudioEvalSurfaces(conversation),
  };
}

export function buildChatbotStudioSessionState(
  input: BuildChatbotStudioSessionStateInput,
): ChatbotStudioSessionState {
  const now = (input.now ?? new Date()).toISOString();
  const snapshot = Object.fromEntries(
    input.declaration.applicationState.variables.map((variable) => [
      variable.variableId,
      variable.value,
    ]),
  );
  const lifecycle = input.declaration.actionSurfaces.some(
    (action) => action.actionKind === "protected-mutation" && action.enabled,
  )
    ? "approved-boundary"
    : input.declaration.toolSurfaces.some((tool) => tool.enabled)
      ? "ready-for-review"
      : "blocked";
  const exchanges: ChatbotStudioExchangeState[] = [];
  if (input.userInput || input.responseMarkdown) {
    exchanges.push({
      schemaVersion: CHATBOT_STUDIO_EXCHANGE_STATE_SCHEMA_VERSION,
      exchangeId: stableId("chatbot-studio-exchange", `${input.declaration.declarationId}:${now}`),
      userInput: input.userInput ?? "",
      responseMarkdown: input.responseMarkdown ?? "",
      plannedToolSurfaceRefs: input.declaration.toolSurfaces
        .filter((tool) => tool.enabled)
        .map((tool) => tool.surfaceId),
      blockedActionSurfaceRefs: input.declaration.actionSurfaces
        .filter((action) => !action.enabled)
        .map((action) => action.actionId),
      variableUpdateRefs: [],
      evalTraceRefs: input.declaration.evalSurfaces.map((surface) => surface.evalId),
      createdAt: now,
    });
  }

  return {
    schemaVersion: CHATBOT_STUDIO_SESSION_STATE_SCHEMA_VERSION,
    sessionId: input.sessionId ?? stableId("chatbot-studio-session", input.declaration.declarationId),
    declarationId: input.declaration.declarationId,
    conversationStateId: input.declaration.conversationStateId,
    lifecycle,
    applicationVariableSnapshot: snapshot,
    exchanges,
    traceRefs: [
      input.declaration.declarationId,
      ...input.declaration.evalSurfaces.map((surface) => surface.evalId),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function appendChatbotStudioExchange(
  session: ChatbotStudioSessionState,
  exchange: ChatbotStudioExchangeState,
): ChatbotStudioSessionState {
  return {
    ...session,
    exchanges: [...session.exchanges, exchange],
    updatedAt: exchange.createdAt,
    traceRefs: unique([...session.traceRefs, ...exchange.evalTraceRefs]),
  };
}

function issue(issueId: string, path: string, message: string): ChatbotStudioValidationIssue {
  return { issueId, path, message };
}

export function validateChatbotStudioDeclaration(
  declaration: ChatbotStudioDeclaration,
): ChatbotStudioValidationResult {
  const issues: ChatbotStudioValidationIssue[] = [];
  if (declaration.schemaVersion !== CHATBOT_STUDIO_DECLARATION_SCHEMA_VERSION) {
    issues.push(issue("chatbot-studio.invalid-schema", "schemaVersion", "Invalid declaration schema version."));
  }
  if (declaration.sourceKind !== "local-aip-chatbot-studio-analogue") {
    issues.push(issue("chatbot-studio.invalid-source-kind", "sourceKind", "Source kind must remain local analogue."));
  }
  if (declaration.runtimeProjections.length !== 3) {
    issues.push(issue("chatbot-studio.runtime-count", "runtimeProjections", "Expected exactly three runtime projections."));
  }
  const runtimeSupport = new Map(declaration.runtimeProjections.map((projection) => [
    projection.runtime,
    projection,
  ]));
  if (runtimeSupport.get("codex")?.support !== "adapter-native") {
    issues.push(issue("chatbot-studio.codex-support", "runtimeProjections.codex", "Codex must be adapter-native."));
  }
  for (const runtime of ["claude", "gemini"] as const) {
    const projection = runtimeSupport.get(runtime);
    if (projection?.support !== "unsupported") {
      issues.push(issue(
        "chatbot-studio.unsupported-runtime",
        `runtimeProjections.${runtime}`,
        `${runtime} must remain unsupported/runtime_gap.`,
      ));
    }
    if (!projection?.runtimeGapRefs.length) {
      issues.push(issue(
        "chatbot-studio.runtime-gap-missing",
        `runtimeProjections.${runtime}.runtimeGapRefs`,
        `${runtime} must list runtime gap refs.`,
      ));
    }
  }
  if (!declaration.applicationState.variables.length) {
    issues.push(issue("chatbot-studio.application-state-empty", "applicationState.variables", "Application state must expose variables."));
  }
  if (!declaration.retrievalContext.retrievedPrompt) {
    issues.push(issue("chatbot-studio.retrieval-empty", "retrievalContext.retrievedPrompt", "Retrieval context must include a prompt."));
  }
  if (!declaration.retrievalContext.retrievedPrompt.includes("Context Engineering refs are not Ontology primitive declarations")) {
    issues.push(issue(
      "chatbot-studio.retrieval-boundary-missing",
      "retrievalContext.retrievedPrompt",
      "Retrieval context must state that Context Engineering refs are not Ontology primitive declarations.",
    ));
  }
  if (declaration.retrievalContext.ontologyRefs.some((ref) =>
    declaration.retrievalContext.issueRefs.includes(ref) ||
    declaration.retrievalContext.validationRefs.includes(ref)
  )) {
    issues.push(issue(
      "chatbot-studio.retrieval-ontology-ref-collapse",
      "retrievalContext.ontologyRefs",
      "Issue ids and validation packs must not be serialized as Ontology primitive refs.",
    ));
  }
  const boundary = declaration.semanticBoundary;
  if (!boundary || boundary.schemaVersion !== CHATBOT_STUDIO_SEMANTIC_BOUNDARY_SCHEMA_VERSION) {
    issues.push(issue(
      "chatbot-studio.semantic-boundary-missing",
      "semanticBoundary",
      "Declaration must include the semantic boundary contract.",
    ));
  } else {
    if (!boundary.localAnalogueOnly || boundary.foundryParityClaimed) {
      issues.push(issue(
        "chatbot-studio.semantic-boundary-parity",
        "semanticBoundary",
        "Semantic boundary must remain local-analogue-only and must not claim Foundry parity.",
      ));
    }
    if (!boundary.sourceAuthorityRefs.some((ref) =>
      ref.includes("/home/palantirkc/.claude/research/palantir-official/")
    )) {
      issues.push(issue(
        "chatbot-studio.semantic-boundary-source-missing",
        "semanticBoundary.sourceAuthorityRefs",
        "Semantic boundary claims require local Palantir research SSoT refs.",
      ));
    }
    const warningText = boundary.nonInterchangeabilityWarnings.join("\n");
    if (
      !warningText.includes("Context Engineering") ||
      !warningText.includes("ObjectType") ||
      !warningText.includes("ActionType")
    ) {
      issues.push(issue(
        "chatbot-studio.semantic-boundary-warning-missing",
        "semanticBoundary.nonInterchangeabilityWarnings",
        "Semantic boundary must explicitly separate Context Engineering layers from Ontology primitive names.",
      ));
    }
    if (boundary.providerIdentityAuthority !== "metadata-only") {
      issues.push(issue(
        "chatbot-studio.provider-identity-authority",
        "semanticBoundary.providerIdentityAuthority",
        "Provider identity must remain metadata-only.",
      ));
    }
  }
  if (!declaration.toolSurfaces.length || !declaration.actionSurfaces.length || !declaration.evalSurfaces.length) {
    issues.push(issue("chatbot-studio.surface-empty", "tool/action/evalSurfaces", "Tool, action, and eval surfaces are required."));
  }
  if (declaration.actionSurfaces.some((action) =>
    action.actionKind === "publish-analogue" && action.enabled
  )) {
    issues.push(issue("chatbot-studio.publish-enabled", "actionSurfaces.publish-analogue", "PR6 must not enable publish analogue."));
  }

  return { status: issues.length === 0 ? "pass" : "fail", issues };
}

export function validateChatbotStudioSessionState(
  session: ChatbotStudioSessionState,
  declaration: ChatbotStudioDeclaration,
): ChatbotStudioValidationResult {
  const issues: ChatbotStudioValidationIssue[] = [];
  if (session.schemaVersion !== CHATBOT_STUDIO_SESSION_STATE_SCHEMA_VERSION) {
    issues.push(issue("chatbot-studio-session.invalid-schema", "schemaVersion", "Invalid session schema version."));
  }
  if (session.declarationId !== declaration.declarationId) {
    issues.push(issue("chatbot-studio-session.declaration-mismatch", "declarationId", "Session must reference its declaration."));
  }
  if (session.conversationStateId !== declaration.conversationStateId) {
    issues.push(issue("chatbot-studio-session.conversation-mismatch", "conversationStateId", "Session must reference the declaration conversation."));
  }
  for (const exchange of session.exchanges) {
    const unknownToolRefs = exchange.plannedToolSurfaceRefs.filter(
      (ref) => !declaration.toolSurfaces.some((tool) => tool.surfaceId === ref),
    );
    if (unknownToolRefs.length > 0) {
      issues.push(issue(
        "chatbot-studio-session.unknown-tool-ref",
        "exchanges.plannedToolSurfaceRefs",
        `Unknown tool refs: ${unknownToolRefs.join(", ")}`,
      ));
    }
  }
  return { status: issues.length === 0 ? "pass" : "fail", issues };
}
