/**
 * Ontology Types — ACTION Domain Export Shapes
 *
 * Split from legacy types.ts v1.13.1 (D4, 2026-04-19). Mutation, Webhook,
 * Automation, and OntologyAction barrel shape.
 *
 * Consumers MUST import from the parent barrel: `from "../types"`.
  * @owner palantirkc-ontology
 * @purpose ACTION Domain Export Shapes
 */

import type { StructuralRule, BilingualDesc, MutationType, WebhookKind, AutomationKind, AutomationConditionType, AutomationEffectType, AutonomyLevel } from "./types-core";
import type { Parameter } from "./types-logic";

// =========================================================================
// ACTION Domain Export Shapes
// =========================================================================

export interface MutationEdit {
  readonly type: "create" | "modify" | "delete" | "addLink" | "removeLink";
  readonly target: string;
  readonly properties?: readonly string[];
}

export interface MutationSideEffect {
  readonly kind: "webhook" | "notification" | "log" | "external";
  readonly target: string;
}

export interface OntologyMutation {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly mutationType: MutationType;
  readonly entityApiName: string;
  readonly parameters: readonly Parameter[];
  /**
   * Optional guidance shown to external agents when this action is exposed via
   * Ontology MCP. Mirrors Palantir's "Agent tool description" field.
   */
  readonly agentToolDescription?: BilingualDesc;
  readonly validationFns?: readonly string[];
  readonly edits: readonly MutationEdit[];
  readonly sideEffects?: readonly MutationSideEffect[];
  /** AI action review tier — gates AI-proposed actions through human review. Source: ontology-ultimate-vision.md §6 */
  readonly reviewLevel?: AutonomyLevel;
}

export interface Webhook {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly kind: WebhookKind;
  readonly transactional: boolean;
  readonly triggeredBy: readonly string[];
  readonly endpoint: string;
  readonly payload?: readonly string[];
}

export interface Automation {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly kind: AutomationKind;
  readonly schedule?: string;
  readonly triggerEvent?: string;
  readonly targetMutation: string;
  readonly idempotent: boolean;
  /** Progressive autonomy tier for this automation. Source: ontology-ultimate-vision.md §6 */
  readonly autonomyLevel?: AutonomyLevel;
  /** Which of the 6 Automate condition types triggers this automation. Source: action/automation.md */
  readonly conditionType?: AutomationConditionType;
  /** Which effect type fires when the condition is met. Source: action/automation.md */
  readonly effectType?: AutomationEffectType;
}

export interface OntologyAction {
  readonly mutations: readonly OntologyMutation[];
  readonly webhooks: readonly Webhook[];
  readonly automations: readonly Automation[];
}

