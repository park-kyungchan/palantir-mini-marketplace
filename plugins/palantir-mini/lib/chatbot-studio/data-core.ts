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
        "codex:hook-event:SessionStart:unmounted",
        "codex:hook-event:UserPromptSubmit:unmounted",
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
      description: "Build local retrieved prompt context from SemanticConversationState.",
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
    ],
    applicationState,
    retrievalContext,
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
