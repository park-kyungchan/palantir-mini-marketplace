import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { atomicWriteJson } from "../fs-atomic";
import { safeSegment } from "../id-segment";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import type { ApprovalRef } from "./approval-ref";
import type { PromptEnvelope, PromptRuntime } from "./envelope";

export const PROMPT_CONTRACT_RECORD_SCHEMA_VERSION = "prompt-front-door/contract/v1";

export type PromptStoredContractKind = "semantic-intent" | "digital-twin-change";
export type PromptStoredContract = SemanticIntentContract | DigitalTwinChangeContract;

export interface PromptContractRecord<TContract extends PromptStoredContract = PromptStoredContract> {
  readonly schemaVersion: typeof PROMPT_CONTRACT_RECORD_SCHEMA_VERSION;
  readonly kind: PromptStoredContractKind;
  readonly ref: string;
  readonly contractId: string;
  readonly status: TContract["status"];
  readonly approvalRef?: ApprovalRef;
  readonly promptId: string;
  readonly promptHash: string;
  readonly sessionId: string;
  readonly runtime: PromptRuntime;
  readonly projectRoot: string;
  readonly storedAt: string;
  readonly contract: TContract;
}

export interface ParsedPromptContractRef {
  readonly kind: PromptStoredContractKind;
  readonly sessionSegment: string;
  readonly promptSegment: string;
  readonly contractSegment: string;
}

export interface PromptCurrentPointer {
  readonly schemaVersion: "prompt-front-door/current/v1";
  readonly runtime: PromptRuntime;
  readonly sessionId: string;
  readonly promptId: string;
  readonly promptHash: string;
  readonly updatedAt: string;
}

export interface PromptFrontDoorStoreOptions {
  readonly projectRoot: string;
  readonly rootDir?: string;
}

const PROMPT_CONTRACT_REF_PREFIX = "prompt-front-door://contract/";

const PROMPT_SEGMENT_OPTS = {
  fallback: "unknown",
  maxLen: Infinity,
  allowColon: false,
} as const;

function contractIdFor(contract: PromptStoredContract): string {
  return contract.contractId;
}

export function promptContractRef(
  kind: PromptStoredContractKind,
  sessionId: string,
  promptId: string,
  contractId: string,
): string {
  return [
    PROMPT_CONTRACT_REF_PREFIX.replace(/\/$/, ""),
    kind,
    safeSegment(sessionId, PROMPT_SEGMENT_OPTS),
    safeSegment(promptId, PROMPT_SEGMENT_OPTS),
    safeSegment(contractId, PROMPT_SEGMENT_OPTS),
  ].join("/");
}

export function parsePromptContractRef(ref: string): ParsedPromptContractRef | null {
  if (!ref.startsWith(PROMPT_CONTRACT_REF_PREFIX)) return null;
  const parts = ref.slice(PROMPT_CONTRACT_REF_PREFIX.length).split("/");
  if (parts.length !== 4) return null;
  const [kind, sessionSegment, promptSegment, contractSegment] = parts;
  if (kind !== "semantic-intent" && kind !== "digital-twin-change") return null;
  if (!sessionSegment || !promptSegment || !contractSegment) return null;
  return { kind, sessionSegment, promptSegment, contractSegment };
}

export class PromptFrontDoorStore {
  readonly rootDir: string;

  constructor(options: PromptFrontDoorStoreOptions) {
    this.rootDir =
      options.rootDir ??
      path.join(options.projectRoot, ".palantir-mini", "session", "prompt-front-door");
  }

  envelopePath(sessionId: string, promptId: string): string {
    return path.join(
      this.rootDir,
      "sessions",
      safeSegment(sessionId, PROMPT_SEGMENT_OPTS),
      `${safeSegment(promptId, PROMPT_SEGMENT_OPTS)}.json`,
    );
  }

  currentPointerPath(runtime: PromptRuntime, sessionId: string): string {
    return path.join(
      this.rootDir,
      "current",
      `${safeSegment(runtime, PROMPT_SEGMENT_OPTS)}-${safeSegment(sessionId, PROMPT_SEGMENT_OPTS)}.json`,
    );
  }

  contractRecordPath(
    kind: PromptStoredContractKind,
    sessionId: string,
    promptId: string,
    contractId: string,
  ): string {
    return this.contractRecordPathBySegments({
      kind,
      sessionSegment: safeSegment(sessionId, PROMPT_SEGMENT_OPTS),
      promptSegment: safeSegment(promptId, PROMPT_SEGMENT_OPTS),
      contractSegment: safeSegment(contractId, PROMPT_SEGMENT_OPTS),
    });
  }

  contractRecordPathBySegments(ref: ParsedPromptContractRef): string {
    return path.join(
      this.rootDir,
      "contracts",
      ref.kind,
      ref.sessionSegment,
      ref.promptSegment,
      `${ref.contractSegment}.json`,
    );
  }

  async writeEnvelope(envelope: PromptEnvelope): Promise<void> {
    await atomicWriteJson(this.envelopePath(envelope.sessionId, envelope.promptId), envelope);
  }

  async readEnvelope(sessionId: string, promptId: string): Promise<PromptEnvelope | null> {
    try {
      return JSON.parse(
        await readFile(this.envelopePath(sessionId, promptId), "utf8"),
      ) as PromptEnvelope;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async writeCurrentPointer(envelope: PromptEnvelope): Promise<PromptCurrentPointer> {
    const pointer: PromptCurrentPointer = {
      schemaVersion: "prompt-front-door/current/v1",
      runtime: envelope.runtime,
      sessionId: envelope.sessionId,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      updatedAt: new Date().toISOString(),
    };
    await atomicWriteJson(this.currentPointerPath(envelope.runtime, envelope.sessionId), pointer);
    return pointer;
  }

  async readCurrentPointer(
    runtime: PromptRuntime,
    sessionId: string,
  ): Promise<PromptCurrentPointer | null> {
    try {
      return JSON.parse(
        await readFile(this.currentPointerPath(runtime, sessionId), "utf8"),
      ) as PromptCurrentPointer;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async saveEnvelope(envelope: PromptEnvelope): Promise<PromptCurrentPointer> {
    await this.writeEnvelope(envelope);
    return this.writeCurrentPointer(envelope);
  }

  async writeContractRecord<TContract extends PromptStoredContract>(
    envelope: PromptEnvelope,
    kind: PromptStoredContractKind,
    contract: TContract,
  ): Promise<PromptContractRecord<TContract>> {
    const contractId = contractIdFor(contract);
    const ref = promptContractRef(kind, envelope.sessionId, envelope.promptId, contractId);
    const record: PromptContractRecord<TContract> = {
      schemaVersion: PROMPT_CONTRACT_RECORD_SCHEMA_VERSION,
      kind,
      ref,
      contractId,
      status: contract.status,
      approvalRef: contract.approvalRef,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      projectRoot: envelope.projectRoot,
      storedAt: new Date().toISOString(),
      contract,
    };
    await atomicWriteJson(
      this.contractRecordPath(kind, envelope.sessionId, envelope.promptId, contractId),
      record,
    );
    return record;
  }

  async readContractRecordByRef<TContract extends PromptStoredContract = PromptStoredContract>(
    ref: string,
  ): Promise<PromptContractRecord<TContract> | null> {
    const parsed = parsePromptContractRef(ref);
    if (parsed === null) return null;
    try {
      return JSON.parse(
        await readFile(this.contractRecordPathBySegments(parsed), "utf8"),
      ) as PromptContractRecord<TContract>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}
