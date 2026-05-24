/**
 * Ontology Types — LEARN Infrastructure + Project Scope
 *
 * Split from legacy types.ts v1.13.1 (D4, 2026-04-19). Hook event schemas,
 * LearnInfrastructure, BackendOntology, FrontendOntology (views, agent
 * surfaces, scenario flows), RuntimeOntology (source bindings, write
 * targets, review/transaction/audit/support/view bindings),
 * ProjectOntologyScope, and OntologyExports composition shape.
 *
 * Consumers MUST import from the parent barrel: `from "../types"`.
  * @owner palantirkc-ontology
 * @purpose LEARN Infrastructure + Project Scope
 */

import type { StructuralRule, BilingualDesc, AutonomyLevel, ImplementationStatus } from "./types-core";
import type { InteractionExports } from "../../interaction/types";
import type { RenderingExports } from "../../rendering/types";
import type { OntologyData } from "./types-data";
import type { OntologyLogic } from "./types-logic";
import type { OntologyAction } from "./types-action";
import type { OntologySecurity } from "./types-security";

// =========================================================================
// LEARN Infrastructure Export Shapes
// =========================================================================

/**
 * Schema for hookEvents table — captures 5D Decision Lineage for every mutation.
 * Source: research/palantir/cross-cutting/decision-lineage.md [§DL-02]
 */
export interface HookEventSchema {
  /** 5D Decision Lineage fields */
  readonly timestamp: true;         // WHEN
  readonly atopCommit?: true;       // ATOP WHICH (git SHA)
  readonly sessionId: true;         // THROUGH WHICH
  readonly toolName: true;          // THROUGH WHICH (action name)
  readonly byIdentity: true;        // BY WHOM
  readonly withReasoning?: true;    // WITH WHAT
  /** Metadata */
  readonly eventType: true;
  readonly targetTable?: true;
  readonly targetId?: true;
  readonly provider?: true;         // LLM provider (if AI-driven)
  readonly model?: true;            // LLM model (if AI-driven)
}

/**
 * LEARN infrastructure declaration — enables typed (not inferential) audit validation.
 * Projects declare their LEARN capabilities here; semantic-audit.ts validates against them.
 * Source: research/palantir/philosophy/digital-twin.md [§PHIL.DT-01..10]
 */
export interface LearnInfrastructure {
  /** hookEvents table captures Decision Lineage 5D for every mutation */
  readonly hookEventsTable?: HookEventSchema;
  /** User or operator feedback entity for LEARN-02. */
  readonly feedbackEntityRef?: string;
  /** Mutations that persist end-user / operator feedback into ontology state. */
  readonly feedbackMutationRefs?: readonly string[];
  /** Explicit evaluation/rubric entity for evaluator output. */
  readonly evaluationEntityRef?: string;
  /** Mutations that persist evaluator / rubric results. */
  readonly evaluationMutationRefs?: readonly string[];
  /** Functions that score, judge, or grade decisions before write-back. */
  readonly evaluationFunctionRefs?: readonly string[];
  /** evaluatorResults stores scoring of decisions/outputs */
  readonly hasEvaluatorResults?: boolean;
  /** Canonical outcome-tracking entity for LEARN-03 / REF-01. */
  readonly outcomeEntityRef?: string;
  /** Mutations that persist predicted-vs-actual outcome records. */
  readonly outcomeMutationRefs?: readonly string[];
  /** outcomeRecords tracks predicted vs actual outcomes */
  readonly hasOutcomeRecords?: boolean;
  /** Accuracy or calibration entity feeding REF-02 / REF-03. */
  readonly accuracyEntityRef?: string;
  /** Refinement/drift signal entity feeding DH updates. */
  readonly refinementSignalEntityRef?: string;
  /** Actions that graduate PA levels or commit refinement updates. */
  readonly graduationMutationRefs?: readonly string[];
  /** Workflow lineage / trace entities that record execution history. */
  readonly workflowLineageEntityRefs?: readonly string[];
  /** Provider-neutral: no direct provider SDK imports in ontology/ */
  readonly providerNeutral?: boolean;
}

// =========================================================================
// Project Scope Ontology
// =========================================================================

/**
 * Backend ontology contract.
 * This is the semantic core AI agents should produce before they attempt
 * frontend scaffolding: what exists, how it is reasoned about, how it changes,
 * how it is secured, and how it learns.
 */
export interface BackendOntology {
  readonly data: OntologyData;
  readonly logic: OntologyLogic;
  readonly action: OntologyAction;
  readonly security: OntologySecurity;
  /** Optional LEARN infrastructure — enables typed (not inferential) audit validation */
  readonly learn?: LearnInfrastructure;
}

/**
 * Frontend surface kinds grounded in DevCon 5 builder surfaces.
 * Source: research/palantir/platform/devcon.md §DC5-* and platform/ai-fde.md §FDE-*
 */
export type FrontendSurfaceKind =
  | "workshop"
  | "osdkApp"
  | "embeddedOntologyApp"
  | "dashboard"
  | "voiceAgent"
  | "agentPanel"
  | "workflowInbox"
  | "scenarioPlanner"
  | "mobile"
  | "3dScene";

/**
 * Route-level frontend declaration.
 * Keeps frontend scope explicitly tied back to ontology entities, queries, and actions
 * so AI agents can scaffold full-stack flows without inventing view/data contracts.
 */
export interface FrontendView {
  readonly apiName: string;
  readonly route: string;
  readonly description: BilingualDesc;
  readonly surface: FrontendSurfaceKind;
  readonly entityApiName?: string;
  readonly primaryQueryRef?: string;
  readonly secondaryQueryRefs?: readonly string[];
  readonly mutationActionRefs?: readonly string[];
  readonly functionRefs?: readonly string[];
  /** Whether this surface is expected to keep working against locally synced ontology data. */
  readonly supportsOffline?: boolean;
  /** Explicit entity sync set for embedded ontology / local-first views. */
  readonly syncEntityApiNames?: readonly string[];
}

/**
 * Agent-facing frontend surface.
 * Covers voice agents, inbox reviewers, assistant panels, and scenario planners.
 */
export interface FrontendAgentSurface {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly surface: FrontendSurfaceKind;
  readonly entityApiName?: string;
  readonly queryRefs?: readonly string[];
  readonly functionRefs?: readonly string[];
  readonly actionRefs?: readonly string[];
  readonly automationRefs?: readonly string[];
  readonly reviewLevel?: AutonomyLevel;
}

/**
 * Scenario / sandbox flow declaration.
 * Encodes the ontology-foundation pattern shown at DevCon 5:
 * sandbox changes, compare options, then submit/merge into production.
 */
export interface FrontendScenarioFlow {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly scenarioEntityApiName: string;
  readonly comparisonFunctionRefs?: readonly string[];
  readonly submitActionRef: string;
  readonly commitActionRef?: string;
}

/**
 * Frontend ontology contract.
 * This is the minimum project-scope declaration needed for AI agents to connect
 * backend ontology semantics to user-facing applications with reduced HITL.
 */
export interface FrontendOntology {
  readonly views: readonly FrontendView[];
  readonly agentSurfaces?: readonly FrontendAgentSurface[];
  readonly scenarioFlows?: readonly FrontendScenarioFlow[];
  readonly interaction?: InteractionExports;
  readonly rendering?: RenderingExports;
}

export type RuntimeSourceKind = "artifact" | "query" | "computed";

export type RuntimeWriteTargetKind = "artifact" | "mutation" | "download";

export type RuntimeAtomicityKind = "singleMutation" | "multiStepTransaction" | "stagedCommit";

export type RuntimeSupportKind = "table" | "query" | "mutation" | "artifactStore" | "auth" | "embeddedOntology";

/**
 * Runtime data source binding.
 * Bridges project-scope ontology semantics into actual route loaders and view hydration.
 * `semanticRef` points back to ontology-level contracts when one exists.
 * `adapterRef` points at the concrete runtime helper, query export, or artifact key.
 */
export interface RuntimeSourceBinding {
  readonly apiName: string;
  readonly kind: RuntimeSourceKind;
  readonly entityApiName?: string;
  readonly semanticRef?: string;
  readonly adapterRef?: string;
  readonly required?: boolean;
  readonly precedence?: number;
}

/**
 * Runtime write target binding.
 * Captures where an interactive surface persists state: ontology mutation, artifact snapshot,
 * non-blocking download, or other adapter-specific target.
 */
export interface RuntimeWriteTarget {
  readonly apiName: string;
  readonly kind: RuntimeWriteTargetKind;
  readonly entityApiName?: string;
  readonly semanticRef?: string;
  readonly adapterRef?: string;
  readonly blocking?: boolean;
}

/**
 * Runtime review / approval binding.
 * Encodes how a runtime surface participates in scenario review, sandbox compare,
 * staged approval, and commit flows.
 */
export interface RuntimeReviewBinding {
  readonly apiName: string;
  readonly scenarioFlowRef: string;
  readonly actorSurfaceRef?: string;
  readonly reviewLevel?: AutonomyLevel;
  readonly submitActionRef?: string;
  readonly commitActionRef?: string;
}

/**
 * Runtime transaction binding.
 * Captures the atomicity boundary for a runtime workflow: whether a single mutation,
 * an explicit multi-step transaction, or a staged sandbox commit is the contract.
 */
export interface RuntimeTransactionBinding {
  readonly apiName: string;
  readonly atomicity: RuntimeAtomicityKind;
  readonly mutationRefs: readonly string[];
  readonly scenarioFlowRef?: string;
  readonly description: BilingualDesc;
}

/**
 * Runtime audit / evaluation binding.
 * Declares which ontology-backed lineage and LEARN actions close the loop for a view or workflow.
 */
export interface RuntimeAuditBinding {
  readonly apiName: string;
  readonly hookEventActionRef?: string;
  readonly auditLogActionRef?: string;
  readonly evaluationActionRefs?: readonly string[];
  readonly outcomeActionRefs?: readonly string[];
  readonly accuracyActionRefs?: readonly string[];
}

/**
 * Runtime support binding.
 * Captures runtime support surfaces that are necessary for execution but are not
 * themselves the primary semantic source: support tables, compatibility adapters,
 * artifact stores, and bridge queries/mutations.
 */
export interface RuntimeSupportBinding {
  readonly apiName: string;
  readonly kind: RuntimeSupportKind;
  readonly description: BilingualDesc;
  readonly entityApiName?: string;
  readonly semanticRef?: string;
  readonly adapterRef: string;
  readonly status?: ImplementationStatus;
}

/**
 * Runtime route/view binding.
 * Declares how a frontend surface is materialized in the actual application runtime:
 * route, component, mode, data sources, and persistence targets.
 */
export interface RuntimeViewBinding {
  readonly apiName: string;
  readonly route: string;
  readonly description: BilingualDesc;
  readonly componentRef: string;
  readonly frontendViewRef?: string;
  readonly mode?: string;
  readonly legacyRoutes?: readonly string[];
  readonly sourceBindings?: readonly RuntimeSourceBinding[];
  readonly writeTargets?: readonly RuntimeWriteTarget[];
  readonly reviewBindingRef?: string;
  readonly transactionBindingRef?: string;
  readonly auditBindingRef?: string;
}

/**
 * Runtime ontology contract.
 * Keeps route loaders, persistence targets, and adapter bindings typed and inspectable
 * instead of leaving them implicit inside React/Convex runtime code.
 */
export interface RuntimeOntology {
  readonly viewBindings: readonly RuntimeViewBinding[];
  readonly reviewBindings?: readonly RuntimeReviewBinding[];
  readonly transactionBindings?: readonly RuntimeTransactionBinding[];
  readonly auditBindings?: readonly RuntimeAuditBinding[];
  readonly supportBindings?: readonly RuntimeSupportBinding[];
}

/**
 * Full project scope: backend semantic core plus optional frontend scope.
 * Projects may export either:
 *   1. OntologyExports      (flat, backward-compatible)
 *   2. ProjectOntologyScope ({ backend, frontend, runtime? })
 */
export interface ProjectOntologyScope {
  readonly backend: BackendOntology;
  readonly frontend?: FrontendOntology;
  readonly runtime?: RuntimeOntology;
}

/**
 * Backward-compatible project export shape.
 * Existing projects exporting { data, logic, action, security, learn? } still work.
 * New projects may additionally declare `frontend` and `runtime` for project-scope
 * route/agent/view scope and runtime materialization.
 */
export interface OntologyExports extends BackendOntology {
  readonly frontend?: FrontendOntology;
  readonly runtime?: RuntimeOntology;
}

