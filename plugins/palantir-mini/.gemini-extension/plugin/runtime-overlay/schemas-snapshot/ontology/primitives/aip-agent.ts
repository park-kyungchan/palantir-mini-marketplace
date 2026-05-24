/**
 * @stable — AIPAgent primitive (prim-ops-24, v1.37.0)
 *
 * Typed mirror of Palantir AIP Chatbot Studio / AI FDE-style agent surfaces.
 * Distinct from AgentDefinition: AgentDefinition models runtime subagents;
 * AIPAgentDeclaration models governed ontology-connected product agents.
 *
 * D/L/A domain: OPS + ACTION. The agent is an operational surface that exposes
 * scoped ontology reads, tools, actions, evals, and deployment state.
 *
 * @owner palantirkc-ontology
 * @purpose Governed AIP/Foundry agent declaration for ontology-connected agents
 */

import type { ActionTypeRid } from "./action-type";
import type { AIPEvaluationSuiteRid } from "./aip-evaluation";
import type { AIPLogicFunctionRid } from "./aip-logic-function";
import type { ObjectTypeRid } from "./object-type";
import type { ObjectViewRid } from "./object-view";

export type AIPAgentRid = string & { readonly __brand: "AIPAgentRid" };

export const aipAgentRid = (s: string): AIPAgentRid => s as AIPAgentRid;

export type AIPAgentSurface =
  | "aip-chatbot-studio"
  | "ai-fde"
  | "aip-assist"
  | "custom-osdk-application"
  | "mcp-client";

export type AIPToolBindingMode = "native-tool" | "prompted-tool";

export interface AIPToolBinding {
  readonly bindingId: string;
  readonly kind:
    | "ontology-query"
    | "ontology-action"
    | "aip-logic-function"
    | "object-view"
    | "mcp-tool"
    | "external-api";
  readonly actionRid?: ActionTypeRid;
  readonly logicFunctionRid?: AIPLogicFunctionRid;
  readonly objectViewRid?: ObjectViewRid;
  readonly toolName?: string;
  readonly mode: AIPToolBindingMode;
  readonly mutability: "read" | "write" | "deploy";
  readonly requiresApproval: boolean;
  readonly delegatedUserPermissions?: boolean;
}

export interface AIPAgentDeclaration {
  readonly agentId: AIPAgentRid;
  readonly apiName: string;
  readonly displayName: string;
  readonly surface: AIPAgentSurface;
  /** Preserve naming drift: AIP Agent Studio / AIP Agents became Chatbot Studio / Chatbots. */
  readonly legacyNames?: readonly string[];
  readonly modelRefs: readonly string[];
  readonly systemPromptRef: string;
  readonly ontologyScope: {
    readonly objectTypeRids?: readonly ObjectTypeRid[];
    readonly objectViewRids?: readonly ObjectViewRid[];
    readonly allowObjectSetSearch?: boolean;
    readonly allowMutatingActions?: boolean;
  };
  readonly toolBindings: readonly AIPToolBinding[];
  readonly evaluationSuiteIds?: readonly AIPEvaluationSuiteRid[];
  readonly deploymentStage: "draft" | "dev" | "staging" | "production" | "retired";
  readonly observability?: {
    readonly captureSessionTrace: boolean;
    readonly captureToolCalls: boolean;
    readonly lineageRefsRequired?: boolean;
  };
}

export class AIPAgentRegistry {
  private readonly agents = new Map<AIPAgentRid, AIPAgentDeclaration>();

  register(decl: AIPAgentDeclaration): void {
    this.agents.set(decl.agentId, decl);
  }

  get(rid: AIPAgentRid): AIPAgentDeclaration | undefined {
    return this.agents.get(rid);
  }

  findByApiName(apiName: string): AIPAgentDeclaration | undefined {
    for (const agent of this.agents.values()) {
      if (agent.apiName === apiName) return agent;
    }
    return undefined;
  }

  list(): AIPAgentDeclaration[] {
    return [...this.agents.values()];
  }
}

export const AIP_AGENT_REGISTRY = new AIPAgentRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "AIPAgent (Chatbot Studio / AI FDE)",
};
export { categoryFoundryEquivalent as aipAgentFoundryEquivalent };
