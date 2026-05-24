export interface OntologyWorkflowTrace {
  readonly schemaVersion: "palantir-mini/ontology-workflow-trace/v1";
  readonly traceId: string;
  readonly createdAt: string;
  readonly refs: {
    readonly universalOntologyEntryRef?: string;
    readonly ontologyContextQueryRef?: string;
    readonly capabilityRefs: readonly string[];
    readonly knownIssueRefs: readonly string[];
    readonly validationPackRefs: readonly string[];
    readonly semanticIntentContractRef?: string;
    readonly digitalTwinChangeContractRef?: string;
    readonly implementationRefs: readonly string[];
    readonly ratchetRefs: readonly string[];
  };
  readonly mode:
    | "context-only"
    | "semantic-gate"
    | "dtc-fill-finalized"
    | "router"
    | "pre-mutation"
    | "implementation";
}

function stableSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").slice(0, 80) || "trace";
}

export function createOntologyWorkflowTrace(input: {
  readonly mode: OntologyWorkflowTrace["mode"];
  readonly universalOntologyEntryRef?: string;
  readonly ontologyContextQueryRef?: string;
  readonly capabilityRefs?: readonly string[];
  readonly knownIssueRefs?: readonly string[];
  readonly validationPackRefs?: readonly string[];
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly implementationRefs?: readonly string[];
  readonly ratchetRefs?: readonly string[];
  readonly now?: Date;
}): OntologyWorkflowTrace {
  const createdAt = (input.now ?? new Date()).toISOString();
  const traceSeed = [
    input.mode,
    input.universalOntologyEntryRef,
    input.ontologyContextQueryRef,
    input.semanticIntentContractRef,
    input.digitalTwinChangeContractRef,
    createdAt,
  ].filter(Boolean).join(":");
  return {
    schemaVersion: "palantir-mini/ontology-workflow-trace/v1",
    traceId: `ontology-workflow-trace:${stableSegment(traceSeed)}`,
    createdAt,
    mode: input.mode,
    refs: {
      universalOntologyEntryRef: input.universalOntologyEntryRef,
      ontologyContextQueryRef: input.ontologyContextQueryRef,
      capabilityRefs: input.capabilityRefs ?? [],
      knownIssueRefs: input.knownIssueRefs ?? [],
      validationPackRefs: input.validationPackRefs ?? [],
      semanticIntentContractRef: input.semanticIntentContractRef,
      digitalTwinChangeContractRef: input.digitalTwinChangeContractRef,
      implementationRefs: input.implementationRefs ?? [],
      ratchetRefs: input.ratchetRefs ?? [],
    },
  };
}
