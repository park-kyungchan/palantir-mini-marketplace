import { createHash } from "node:crypto";
import type { ApprovalRef } from "./approval-ref";
import type { PalantirMiniPluginOptOut } from "../ontology-engineering-response-template";
import type { PromptOriginClass } from "./prompt-origin-classifier";

export const PROMPT_FRONT_DOOR_SCHEMA_VERSION = "prompt-front-door/v1";

export const PROMPT_RUNTIMES = ["claude", "codex", "cursor", "gemini", "unknown"] as const;

export type PromptRuntime = typeof PROMPT_RUNTIMES[number];

export function isPromptRuntime(value: unknown): value is PromptRuntime {
  return typeof value === "string" && PROMPT_RUNTIMES.includes(value as PromptRuntime);
}

export type PromptFrontDoorState =
  | "captured"
  | "semantic_intent_questions_open"
  | "semantic_intent_drafted"
  | "semantic_intent_user_review"
  | "semantic_intent_approved"
  | "digital_twin_questions_open"
  | "digital_twin_drafted"
  | "digital_twin_user_review"
  | "digital_twin_approved"
  | "superseded";

export interface PromptContractRefs {
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly approvalRef?: ApprovalRef;
  readonly semanticIntentApprovalRef?: ApprovalRef;
  readonly digitalTwinApprovalRef?: ApprovalRef;
}

export interface PromptEnvelope {
  readonly schemaVersion: typeof PROMPT_FRONT_DOOR_SCHEMA_VERSION;
  readonly promptId: string;
  readonly promptHash: string;
  readonly promptExcerpt: string;
  readonly promptLength: number;
  readonly sessionId: string;
  readonly runtime: PromptRuntime;
  readonly projectRoot: string;
  readonly capturedAt: string;
  readonly state: PromptFrontDoorState;
  readonly contractRefs: PromptContractRefs;
  readonly previousPromptHash?: string;
  readonly supersededByPromptId?: string;
  readonly palantirMiniPluginOptOut?: PalantirMiniPluginOptOut;
  readonly rawPrompt?: string;
  readonly originClass?: PromptOriginClass;
}

export interface CreatePromptEnvelopeInput {
  readonly rawPrompt: string;
  readonly sessionId: string;
  readonly runtime?: PromptRuntime;
  readonly projectRoot: string;
  readonly capturedAt?: string;
  readonly sequence?: number;
  readonly previousPromptHash?: string;
  readonly palantirMiniPluginOptOut?: PalantirMiniPluginOptOut;
  readonly retainRawPrompt?: boolean;
  readonly excerptLength?: number;
  readonly originClass?: PromptOriginClass;
}

export function hashPrompt(rawPrompt: string): string {
  return createHash("sha256").update(rawPrompt, "utf8").digest("hex");
}

export function excerptPrompt(rawPrompt: string, maxLength = 240): string {
  const normalized = rawPrompt.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

function stableSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "session";
}

export function createPromptId(input: {
  readonly sessionId: string;
  readonly promptHash: string;
  readonly capturedAt: string;
  readonly sequence?: number;
}): string {
  const timeSegment = input.capturedAt
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[^0-9a-zA-Z]+/g, "")
    .slice(0, 15);
  const sequenceSegment = input.sequence === undefined ? "0" : String(input.sequence);
  return [
    "prompt",
    stableSegment(input.sessionId),
    timeSegment || "time",
    sequenceSegment,
    input.promptHash.slice(0, 16),
  ].join("-");
}

export function createPromptEnvelope(input: CreatePromptEnvelopeInput): PromptEnvelope {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const promptHash = hashPrompt(input.rawPrompt);
  const promptId = createPromptId({
    sessionId: input.sessionId,
    promptHash,
    capturedAt,
    sequence: input.sequence,
  });

  return {
    schemaVersion: PROMPT_FRONT_DOOR_SCHEMA_VERSION,
    promptId,
    promptHash,
    promptExcerpt: excerptPrompt(input.rawPrompt, input.excerptLength),
    promptLength: input.rawPrompt.length,
    sessionId: input.sessionId,
    runtime: input.runtime ?? "unknown",
    projectRoot: input.projectRoot,
    capturedAt,
    state: "captured",
    contractRefs: {},
    previousPromptHash: input.previousPromptHash,
    ...(input.palantirMiniPluginOptOut
      ? { palantirMiniPluginOptOut: input.palantirMiniPluginOptOut }
      : {}),
    ...(input.retainRawPrompt ? { rawPrompt: input.rawPrompt } : {}),
    ...(input.originClass !== undefined ? { originClass: input.originClass } : {}),
  };
}

export function withPromptState(
  envelope: PromptEnvelope,
  state: PromptFrontDoorState,
  contractRefs: PromptContractRefs = envelope.contractRefs,
): PromptEnvelope {
  return {
    ...envelope,
    state,
    contractRefs,
  };
}
