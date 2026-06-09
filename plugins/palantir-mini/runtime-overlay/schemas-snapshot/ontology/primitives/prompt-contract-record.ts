/**
 * @stable — PromptContractRecord primitive (prim-learn-27, v1.51.0)
 *
 * Prompt-local persistence record for SemanticIntentContract and
 * DigitalTwinChangeContract artifacts.
 *
 * @owner palantirkc-ontology
 * @purpose Prompt-front-door contract persistence record
 */

import type { ApprovalRef, PromptRuntime } from "./approval-ref";
import type { DigitalTwinChangeContract } from "./digital-twin-change-contract";
import type { SemanticIntentContract } from "./semantic-intent-contract";

export const PROMPT_CONTRACT_RECORD_SCHEMA_VERSION = "prompt-front-door/contract/v1";

export type PromptStoredContractKind = "semantic-intent" | "digital-twin-change";
export type PromptStoredContract = SemanticIntentContract | DigitalTwinChangeContract;

export interface PromptContractRecord<
  TContract extends PromptStoredContract = PromptStoredContract,
> {
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

export function isPromptContractRecord(x: unknown): x is PromptContractRecord {
  if (typeof x !== "object" || x === null) return false;
  const record = x as PromptContractRecord;
  return (
    record.schemaVersion === PROMPT_CONTRACT_RECORD_SCHEMA_VERSION &&
    (record.kind === "semantic-intent" || record.kind === "digital-twin-change") &&
    typeof record.ref === "string" &&
    record.ref.length > 0 &&
    typeof record.contractId === "string" &&
    record.contractId.length > 0 &&
    typeof record.promptId === "string" &&
    record.promptId.length > 0 &&
    typeof record.promptHash === "string" &&
    record.promptHash.length > 0 &&
    typeof record.contract === "object" &&
    record.contract !== null
  );
}
