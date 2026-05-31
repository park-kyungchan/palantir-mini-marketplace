import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  appendChatbotStudioExchange,
  buildChatbotStudioDeclarationFromConversation,
  buildChatbotStudioSessionState,
  CHATBOT_STUDIO_EXCHANGE_STATE_SCHEMA_VERSION,
  type ChatbotStudioActionSurface,
  type ChatbotStudioDeclaration,
  type ChatbotStudioExchangeState,
  type ChatbotStudioRuntimeProjection,
  type ChatbotStudioSessionState,
} from "./data-core";
import type {
  ChatbotStudioApplicationState,
  ChatbotStudioApplicationVariable,
} from "./application-state";
import type { SemanticConversationState } from "./semantic-conversation-state";

export const CHATBOT_STUDIO_LOCAL_WORKBENCH_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-local-workbench/v1" as const;
export const CHATBOT_STUDIO_LEDGER_ENTRY_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-ledger-entry/v1" as const;
export const CHATBOT_STUDIO_PUBLISH_ANALOGUE_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-publish-analogue/v1" as const;

export interface ChatbotStudioVariableUpdate {
  readonly variableId: string;
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly updateMode: "local-input";
  readonly persistedToRuntime: false;
}

export interface ChatbotStudioRuntimeGapView {
  readonly runtime: ChatbotStudioRuntimeProjection["runtime"];
  readonly support: ChatbotStudioRuntimeProjection["support"];
  readonly adapterContractRef: string;
  readonly runtimeGapRefs: readonly string[];
  readonly unsupportedSurfaceRefs: readonly string[];
}

export interface ChatbotStudioPublishAnalogue {
  readonly schemaVersion: typeof CHATBOT_STUDIO_PUBLISH_ANALOGUE_SCHEMA_VERSION;
  readonly publishId: string;
  readonly status: "blocked" | "ready-for-local-review";
  readonly externalPublishAuthorized: false;
  readonly requiredApprovalRefs: readonly string[];
  readonly blockedActionSurfaceRefs: readonly string[];
  readonly runtimeGapRefs: readonly string[];
  readonly nonParityClaims: readonly string[];
  readonly markdownSummary: string;
}

export interface LocalChatbotStudioWorkbenchResult {
  readonly schemaVersion: typeof CHATBOT_STUDIO_LOCAL_WORKBENCH_SCHEMA_VERSION;
  readonly declaration: ChatbotStudioDeclaration;
  readonly session: ChatbotStudioSessionState;
  readonly exchange: ChatbotStudioExchangeState;
  readonly responseMarkdown: string;
  readonly sessionId: string;
  readonly variableUpdates: readonly ChatbotStudioVariableUpdate[];
  readonly plannedToolSurfaceRefs: readonly string[];
  readonly blockedActionSurfaceRefs: readonly string[];
  readonly traceRefs: readonly string[];
  readonly runtimeGaps: readonly ChatbotStudioRuntimeGapView[];
  readonly publishAnalogue: ChatbotStudioPublishAnalogue;
}

export interface RunLocalChatbotStudioTurnInput {
  readonly conversation: SemanticConversationState;
  readonly userInput: string;
  readonly sessionId?: string;
  readonly variableInputs?: Readonly<Record<string, unknown>>;
  readonly ledgerPath?: string;
  readonly now?: Date;
}

export interface ChatbotStudioLedgerEntry {
  readonly schemaVersion: typeof CHATBOT_STUDIO_LEDGER_ENTRY_SCHEMA_VERSION;
  readonly entryId: string;
  readonly sessionId: string;
  readonly exchangeId: string;
  readonly declarationId: string;
  readonly when: string;
  readonly userInput: string;
  readonly responseMarkdown: string;
  readonly variableUpdateRefs: readonly string[];
  readonly plannedToolSurfaceRefs: readonly string[];
  readonly blockedActionSurfaceRefs: readonly string[];
  readonly traceRefs: readonly string[];
  readonly runtimeGapRefs: readonly string[];
  readonly publishStatus: ChatbotStudioPublishAnalogue["status"];
}

function stableId(prefix: string, value: string): string {
  return `${prefix}:${value.replace(/[^A-Za-z0-9:_-]+/g, "-").replace(/-+/g, "-")}`;
}

function unique(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0
  )));
}

function updateApplicationState(
  applicationState: ChatbotStudioApplicationState,
  variableInputs: Readonly<Record<string, unknown>>,
): {
  readonly applicationState: ChatbotStudioApplicationState;
  readonly variableUpdates: readonly ChatbotStudioVariableUpdate[];
} {
  const updates: ChatbotStudioVariableUpdate[] = [];
  const variables = applicationState.variables.map((variable) => {
    if (!(variable.variableId in variableInputs)) return variable;
    const nextValue = variableInputs[variable.variableId];
    updates.push({
      variableId: variable.variableId,
      previousValue: variable.value,
      nextValue,
      updateMode: "local-input",
      persistedToRuntime: false,
    });
    return { ...variable, value: nextValue } satisfies ChatbotStudioApplicationVariable;
  });

  return {
    applicationState: { ...applicationState, variables },
    variableUpdates: updates,
  };
}

function withVariableInputs(
  declaration: ChatbotStudioDeclaration,
  variableInputs: Readonly<Record<string, unknown>> | undefined,
): {
  readonly declaration: ChatbotStudioDeclaration;
  readonly variableUpdates: readonly ChatbotStudioVariableUpdate[];
} {
  if (!variableInputs || Object.keys(variableInputs).length === 0) {
    return { declaration, variableUpdates: [] };
  }
  const updated = updateApplicationState(declaration.applicationState, variableInputs);
  return {
    declaration: {
      ...declaration,
      applicationState: updated.applicationState,
    },
    variableUpdates: updated.variableUpdates,
  };
}

function runtimeGapView(
  projections: readonly ChatbotStudioRuntimeProjection[],
): readonly ChatbotStudioRuntimeGapView[] {
  return projections.map((projection) => ({
    runtime: projection.runtime,
    support: projection.support,
    adapterContractRef: projection.adapterContractRef,
    runtimeGapRefs: projection.runtimeGapRefs,
    unsupportedSurfaceRefs: projection.unsupportedSurfaceRefs,
  }));
}

function localReviewReady(actions: readonly ChatbotStudioActionSurface[]): boolean {
  return actions.some((action) =>
    action.actionKind === "protected-mutation" && action.enabled
  );
}

export function buildChatbotStudioPublishAnalogue(
  declaration: ChatbotStudioDeclaration,
): ChatbotStudioPublishAnalogue {
  const blockedActions = declaration.actionSurfaces.filter((action) => !action.enabled);
  const requiredApprovalRefs = unique(
    declaration.actionSurfaces.flatMap((action) => action.approvalEvidenceRefs),
  );
  const runtimeGapRefs = unique(
    declaration.runtimeProjections.flatMap((projection) => projection.runtimeGapRefs),
  );
  const status = localReviewReady(declaration.actionSurfaces)
    ? "ready-for-local-review"
    : "blocked";
  return {
    schemaVersion: CHATBOT_STUDIO_PUBLISH_ANALOGUE_SCHEMA_VERSION,
    publishId: stableId("chatbot-studio-publish", declaration.declarationId),
    status,
    externalPublishAuthorized: false,
    requiredApprovalRefs,
    blockedActionSurfaceRefs: blockedActions.map((action) => action.actionId),
    runtimeGapRefs,
    nonParityClaims: [
      "Local publish analogue only.",
      "No Foundry SaaS, security, Workshop, API, or Marketplace publication is performed.",
      "No runtime cache or installed plugin payload is mutated.",
    ],
    markdownSummary: status === "ready-for-local-review"
      ? "Local review package is ready; external publish remains unauthorized."
      : "Local review package is blocked until approval evidence exists; external publish remains unauthorized.",
  };
}

function responseMarkdownFor(
  declaration: ChatbotStudioDeclaration,
  publishAnalogue: ChatbotStudioPublishAnalogue,
): string {
  const enabledTools = declaration.toolSurfaces
    .filter((tool) => tool.enabled)
    .map((tool) => `- ${tool.surfaceId}`)
    .join("\n") || "- none";
  const blockedActions = publishAnalogue.blockedActionSurfaceRefs
    .map((actionId) => {
      const action = declaration.actionSurfaces.find((surface) => surface.actionId === actionId);
      return action?.blockedReason
        ? `- ${actionId}: ${action.blockedReason}`
        : `- ${actionId}`;
    })
    .join("\n") || "- none";
  const runtimeGaps = publishAnalogue.runtimeGapRefs
    .map((ref) => `- ${ref}`)
    .join("\n") || "- none";
  return [
    `# ${declaration.title}`,
    "",
    "## Planned Tools",
    enabledTools,
    "",
    "## Blocked Actions",
    blockedActions,
    "",
    "## Runtime Gaps",
    runtimeGaps,
    "",
    "## Publish Analogue",
    publishAnalogue.markdownSummary,
  ].join("\n");
}

export function buildChatbotStudioLedgerEntry(
  result: LocalChatbotStudioWorkbenchResult,
  when: string,
): ChatbotStudioLedgerEntry {
  return {
    schemaVersion: CHATBOT_STUDIO_LEDGER_ENTRY_SCHEMA_VERSION,
    entryId: stableId("chatbot-studio-ledger-entry", `${result.sessionId}:${result.exchange.exchangeId}`),
    sessionId: result.sessionId,
    exchangeId: result.exchange.exchangeId,
    declarationId: result.declaration.declarationId,
    when,
    userInput: result.exchange.userInput,
    responseMarkdown: result.responseMarkdown,
    variableUpdateRefs: result.variableUpdates.map((update) => update.variableId),
    plannedToolSurfaceRefs: result.plannedToolSurfaceRefs,
    blockedActionSurfaceRefs: result.blockedActionSurfaceRefs,
    traceRefs: result.traceRefs,
    runtimeGapRefs: result.runtimeGaps.flatMap((gap) => gap.runtimeGapRefs),
    publishStatus: result.publishAnalogue.status,
  };
}

export function serializeChatbotStudioLedgerEntry(
  entry: ChatbotStudioLedgerEntry,
): string {
  return `${JSON.stringify(entry)}\n`;
}

export function appendChatbotStudioLedgerEntry(
  ledgerPath: string,
  entry: ChatbotStudioLedgerEntry,
): void {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  appendFileSync(ledgerPath, serializeChatbotStudioLedgerEntry(entry), "utf8");
}

export function readChatbotStudioLedger(
  ledgerPath: string,
): readonly ChatbotStudioLedgerEntry[] {
  if (!existsSync(ledgerPath)) return [];
  return readFileSync(ledgerPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as ChatbotStudioLedgerEntry);
}

export function runLocalChatbotStudioTurn(
  input: RunLocalChatbotStudioTurnInput,
): LocalChatbotStudioWorkbenchResult {
  const now = input.now ?? new Date();
  const when = now.toISOString();
  const baseDeclaration = buildChatbotStudioDeclarationFromConversation({
    conversation: input.conversation,
  });
  const { declaration, variableUpdates } = withVariableInputs(
    baseDeclaration,
    input.variableInputs,
  );
  const publishAnalogue = buildChatbotStudioPublishAnalogue(declaration);
  const responseMarkdown = responseMarkdownFor(declaration, publishAnalogue);
  const session = buildChatbotStudioSessionState({
    declaration,
    sessionId: input.sessionId,
    userInput: input.userInput,
    responseMarkdown,
    now,
  });
  const existingExchange = session.exchanges[0];
  const exchange: ChatbotStudioExchangeState = {
    schemaVersion: CHATBOT_STUDIO_EXCHANGE_STATE_SCHEMA_VERSION,
    exchangeId:
      existingExchange?.exchangeId ??
      stableId("chatbot-studio-exchange", `${session.sessionId}:${when}`),
    userInput: input.userInput,
    responseMarkdown,
    plannedToolSurfaceRefs: declaration.toolSurfaces
      .filter((tool) => tool.enabled)
      .map((tool) => tool.surfaceId),
    blockedActionSurfaceRefs: publishAnalogue.blockedActionSurfaceRefs,
    variableUpdateRefs: variableUpdates.map((update) => update.variableId),
    evalTraceRefs: declaration.evalSurfaces.map((surface) => surface.evalId),
    createdAt: when,
  };
  const sessionWithExchange = existingExchange
    ? { ...session, exchanges: [exchange] }
    : appendChatbotStudioExchange(session, exchange);
  const result: LocalChatbotStudioWorkbenchResult = {
    schemaVersion: CHATBOT_STUDIO_LOCAL_WORKBENCH_SCHEMA_VERSION,
    declaration,
    session: sessionWithExchange,
    exchange,
    responseMarkdown,
    sessionId: sessionWithExchange.sessionId,
    variableUpdates,
    plannedToolSurfaceRefs: exchange.plannedToolSurfaceRefs,
    blockedActionSurfaceRefs: exchange.blockedActionSurfaceRefs,
    traceRefs: sessionWithExchange.traceRefs,
    runtimeGaps: runtimeGapView(declaration.runtimeProjections),
    publishAnalogue,
  };

  if (input.ledgerPath) {
    appendChatbotStudioLedgerEntry(
      input.ledgerPath,
      buildChatbotStudioLedgerEntry(result, when),
    );
  }

  return result;
}
