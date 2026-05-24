// palantir-mini — AIP #3 Context Engineering intent bridge.
// Turns raw user intent into a Lead-owned clarification state before ontology activation.

import { createHash } from "node:crypto";
import {
  createSemanticClarificationQuestions,
  isOntologyAffectingIntent,
} from "../lead-intent/contracts";
import type {
  LeadIntentGateInput,
  SemanticClarificationQuestion,
} from "../lead-intent/contracts";

export type AIPArchitectureAxis =
  | "aip-3-context-engineering"
  | "aip-4-ontology"
  | "aip-5-vector-compute-tool-services"
  | "aip-7-agent-lifecycle";

export interface ContextEngineeringEvidenceRef {
  axis: AIPArchitectureAxis;
  sourceKind: "official-palantir" | "plugin-research" | "schema" | "runtime";
  ref: string;
}

export interface Layer0IntentBridgeInput {
  rawIntent: string;
  projectRoot: string;
  scopePaths?: readonly string[];
  sessionId?: string;
  promptId?: string;
  promptHash?: string;
  priorEventRefs?: readonly string[];
  currentScopeRefs?: readonly string[];
}

export interface Layer0IntentBridge {
  bridgeId: string;
  promptHash: string;
  projectRoot: string;
  requiredAxes: readonly ["aip-3-context-engineering", "aip-4-ontology"];
  directionalAxes: readonly ["aip-5-vector-compute-tool-services", "aip-7-agent-lifecycle"];
  evidenceRefs: readonly ContextEngineeringEvidenceRef[];
  materialAmbiguities: readonly SemanticClarificationQuestion[];
  ontologyAffecting: boolean;
  readyForOntologyActivation: boolean;
}

function hashPrompt(rawIntent: string): string {
  return createHash("sha256").update(rawIntent).digest("hex").slice(0, 16);
}

function evidenceRefs(): ContextEngineeringEvidenceRef[] {
  return [
    {
      axis: "aip-3-context-engineering",
      sourceKind: "official-palantir",
      ref: "https://www.palantir.com/docs/foundry/architecture-center/aip-architecture/",
    },
    {
      axis: "aip-3-context-engineering",
      sourceKind: "plugin-research",
      ref: "runtime-overlay/research-library/palantir-foundry/architecture/architecture-center-aip-architecture.md",
    },
    {
      axis: "aip-4-ontology",
      sourceKind: "official-palantir",
      ref: "https://www.palantir.com/docs/foundry/architecture-center/ontology-system/",
    },
    {
      axis: "aip-4-ontology",
      sourceKind: "schema",
      ref: "runtime-overlay/schemas-snapshot/ontology/primitives/semantic-intent-contract.ts",
    },
    {
      axis: "aip-4-ontology",
      sourceKind: "schema",
      ref: "runtime-overlay/schemas-snapshot/ontology/primitives/digital-twin-change-contract.ts",
    },
    {
      axis: "aip-5-vector-compute-tool-services",
      sourceKind: "runtime",
      ref: "bridge/handlers/impact-query.ts",
    },
    {
      axis: "aip-7-agent-lifecycle",
      sourceKind: "runtime",
      ref: "bridge/handlers/pm-recap.ts",
    },
  ];
}

export function buildLayer0IntentBridge(input: Layer0IntentBridgeInput): Layer0IntentBridge {
  const promptHash = input.promptHash ?? hashPrompt(input.rawIntent);
  const gateInput: LeadIntentGateInput = {
    intent: input.rawIntent,
    scopePaths: [...(input.scopePaths ?? [])],
  };
  const ontologyAffecting = isOntologyAffectingIntent(gateInput);
  const materialAmbiguities = createSemanticClarificationQuestions(gateInput).filter(
    (question) => question.materiality !== "non-blocking" && question.status === "open",
  );

  return {
    bridgeId: `layer0:${promptHash}`,
    promptHash,
    projectRoot: input.projectRoot,
    requiredAxes: ["aip-3-context-engineering", "aip-4-ontology"],
    directionalAxes: ["aip-5-vector-compute-tool-services", "aip-7-agent-lifecycle"],
    evidenceRefs: evidenceRefs(),
    materialAmbiguities,
    ontologyAffecting,
    readyForOntologyActivation: ontologyAffecting && materialAmbiguities.length === 0,
  };
}
