import type { PromptEnvelope } from "../prompt-front-door";

export interface PreMutationGovernanceDecision {
  readonly schemaVersion: "palantir-mini/pre-mutation-governance/v1";
  readonly decisionId: string;
  readonly createdAt: string;
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly toolName: string;
  readonly targetFiles: readonly string[];
  readonly allowed: boolean;
  readonly reason: string;
  readonly refs: {
    readonly semanticIntentContractRef?: string;
    readonly digitalTwinChangeContractRef?: string;
    readonly approvalRef?: PromptEnvelope["contractRefs"]["approvalRef"];
    readonly universalOntologyEntryRef?: string;
    readonly ontologyContextQueryRef?: string;
    /**
     * Which DTC fill turn (0-6) the decision refers to.
     * -1 when N/A (no DTC fill sequence in progress).
     */
    readonly dtcFillSequenceStep?: number;
  };
}

function stableSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").slice(0, 48) || "decision";
}

export function preMutationGovernance(input: {
  readonly promptEnvelope?: PromptEnvelope;
  readonly toolName: string;
  readonly targetFiles: readonly string[];
  readonly allowed: boolean;
  readonly reason: string;
  readonly universalOntologyEntryRef?: string;
  readonly ontologyContextQueryRef?: string;
  readonly now?: Date;
}): PreMutationGovernanceDecision {
  const createdAt = (input.now ?? new Date()).toISOString();
  const prompt = input.promptEnvelope;
  const seed = [
    prompt?.promptId ?? "no-prompt",
    input.toolName,
    input.allowed ? "allow" : "deny",
    input.targetFiles.join("|"),
    createdAt,
  ].join(":");

  return {
    schemaVersion: "palantir-mini/pre-mutation-governance/v1",
    decisionId: `pre-mutation-governance:${stableSegment(seed)}`,
    createdAt,
    promptId: prompt?.promptId,
    promptHash: prompt?.promptHash,
    toolName: input.toolName,
    targetFiles: input.targetFiles,
    allowed: input.allowed,
    reason: input.reason,
    refs: {
      semanticIntentContractRef: prompt?.contractRefs.semanticIntentContractRef,
      digitalTwinChangeContractRef: prompt?.contractRefs.digitalTwinChangeContractRef,
      approvalRef: prompt?.contractRefs.approvalRef,
      universalOntologyEntryRef: input.universalOntologyEntryRef,
      ontologyContextQueryRef: input.ontologyContextQueryRef,
    },
  };
}
