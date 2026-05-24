/**
 * ACTION Domain Schema — Ontology Schema Redesign §4.1
 *
 * Self-sufficient schema for the ACTION domain. Every LLM session reading this
 * file alone can correctly generate the ACTION domain skeleton without SKILL.md.
 * Upstream truth still comes from the split research stack plus the schema-local
 * crosswalk in `../research-source-map.ts`.
 *
 * ACTION is the execution layer — it commits state changes described by LOGIC,
 * triggers external side effects, and orchestrates automated workflows.
 * It owns 3 concept types: Mutation, Webhook, Automation.
 *
 * Authority:
 *   - builder/fact boundary: .claude/research/palantir-developers/build-with-aip.md
 *     -> .claude/research/palantir-foundry/ontology/BROWSE.md
 *   - exact pre-split ACTION semantics: resolve legacy citations through
 *     ../research-source-map.ts to the archive bridge under
 *     .claude/research/_archive/2026-04-20-palantir-consolidation/action/
 * Dependency: ../semantics.ts (ACTION_SEMANTICS + SemanticHeuristic type)
 * Upstream: data/schema.ts (reads DATA types), logic/schema.ts (reads LOGIC types)
 * Downstream: none (ACTION is the terminal domain)
 *
 * Sections:
 *   1. Semantic Identity — re-export ACTION_SEMANTICS
 *   2. Type Definitions — re-exports + enhanced ACTION types + new enums
 *   3. Enumeration Constants — 20 constant arrays
 *   4. Decision Heuristics — 16 implementation-choice heuristics (DH-ACTION-01..16)
 *   5. Mapping Tables — ruleType→constraints, webhookMode→semantics, etc.
 *   6. Structural Rules — naming patterns, output file
 *   7. Validation Thresholds — numeric limits
 *   8. Hard Constraints — HC-ACTION-06..37 (extends semantics HC-ACTION-01..05)
 */

// =========================================================================
// Section 1: Semantic Identity
// =========================================================================

import {
  ACTION_SEMANTICS,
  type SemanticHeuristic,
  type HardConstraint,
} from "../semantics";
import type {
  BilingualDesc,
  TestSeverity,
  MutationType,
  WebhookKind,
  AutomationKind,
  AutonomyLevel,
  Parameter,
  MutationEdit,
  MutationSideEffect,
  OntologyMutation,
  Webhook,
  Automation,
  OntologyAction,
  StructuralRule,
} from "../types";

/** Schema version for ACTION domain. */
export const SCHEMA_VERSION = "1.4.0" as const;

export { ACTION_SEMANTICS };
export type { SemanticHeuristic, HardConstraint };
export type {
  BilingualDesc,
  TestSeverity,
  MutationType,
  WebhookKind,
  AutomationKind,
  Parameter,
  MutationEdit,
  MutationSideEffect,
  OntologyMutation,
  Webhook,
  Automation,
  OntologyAction,
};

// =========================================================================
// Section 2: Type Definitions
// =========================================================================

// --- 10 new enum types ---

/** 8 ontology rule types for action configuration. Source: mutations.md §2 */
export type ActionRuleType =
  | "createObject"
  | "modifyObject"
  | "createOrModify"
  | "deleteObject"
  | "createLink"
  | "deleteLink"
  | "functionRule"
  | "interfaceRule";

/** 4 value source types for rule property mappings. Source: mutations.md §2 */
export type ValueSource =
  | "fromParameter"
  | "objectParameterProperty"
  | "staticValue"
  | "contextual";

/** 2 submission condition types. Source: mutations.md §8 */
export type SubmissionConditionType = "currentUser" | "parameter";

/** 9 submission constraint types (Validate Action API). Source: mutations.md §8 */
export type SubmissionConstraintType =
  | "range"
  | "arraySize"
  | "stringLength"
  | "stringRegexMatch"
  | "oneOf"
  | "objectQueryResult"
  | "objectPropertyValue"
  | "groupMember"
  | "unevaluable";

/** 2 webhook execution modes. Source: webhooks.md §2 */
export type WebhookMode = "writeback" | "sideEffect";

/** 4 webhook input parameter sources. Source: webhooks.md §3 */
export type WebhookInputSource =
  | "actionParameters"
  | "staticValues"
  | "objectPropertyValues"
  | "customFunctions";

/** 3 side effect types available on actions. Source: webhooks.md §6 */
export type SideEffectType = "webhook" | "notification" | "mediaUpload";

/** 7 automation condition types (1 time-based + 6 object set). Source: automation.md §ACTION.AU-02..03 */
export type AutomationConditionType =
  | "timeBased"
  | "objectsAddedToSet"
  | "objectsRemovedFromSet"
  | "objectsModifiedInSet"
  | "runOnAllObjects"
  | "metricChanged"
  | "thresholdCrossed";

/** 4 automation effect types. Source: automation.md §4 */
export type AutomationEffectType = "action" | "notification" | "function" | "aipLogic";

/** 2 AIP Automate execution modes. Source: automation.md §5 */
export type AipAutomateMode = "humanReviewedStaging" | "autoApply";

/**
 * Listener source system categories for inbound webhook event ingestion.
 * Listeners provision URL endpoints with system-specific message signing verification.
 * Source: action/listeners.md, Data Connection — Listeners (Jan 2026 Beta)
 */
export type ListenerSourceCategory =
  | "devOps"
  | "communication"
  | "cloudEvents"
  | "commerce"
  | "crm"
  | "custom";

// --- 6 enhanced ACTION-domain types ---

/** Enhanced mutation definition with rule-level detail. */
export interface ActionMutation {
  readonly ruleTier: "simple" | "functionBacked";
  readonly ruleType: ActionRuleType;
  readonly valueSources: readonly ValueSource[];
  readonly submissionCriteria: readonly SubmissionCriterionDefinition[];
  readonly sideEffects: readonly ActionSideEffectDefinition[];
  readonly atomicity: true;
  readonly actionLogEnabled: boolean;
}

/** Enhanced webhook definition with mode semantics. */
export interface ActionWebhook {
  readonly mode: WebhookMode;
  readonly inputSources: readonly WebhookInputSource[];
  readonly outputParameters: boolean;
  readonly firingOrder: "beforeRules" | "afterRules";
  readonly failureBlocking: boolean;
}

/** Enhanced automation definition with condition/effect detail. */
export interface ActionAutomation {
  readonly monitoredObjectSet: string;
  readonly conditionType: AutomationConditionType;
  readonly effectType: AutomationEffectType;
  readonly aipMode?: AipAutomateMode;
  readonly changeDetectionLatencyMinutes: number;
}

/** Individual rule definition within an action. */
export interface ActionRuleDefinition {
  readonly ruleType: ActionRuleType;
  readonly targetEntity: string;
  readonly pkRequired: boolean;
  readonly valueSources: readonly ValueSource[];
  readonly constraints: readonly string[];
}

/** Individual submission criterion definition. */
export interface SubmissionCriterionDefinition {
  readonly conditionType: SubmissionConditionType;
  readonly constraintType: SubmissionConstraintType;
  readonly operators: readonly string[];
  readonly failureMessage: string;
}

/** Notification configuration definition. */
export interface NotificationDefinition {
  readonly recipientSource: "objectProperty" | "hardcoded";
  readonly channels: readonly ("inPlatformPush" | "email")[];
  readonly messageTemplate: string;
}

/** Side effect definition within an action. */
export interface ActionSideEffectDefinition {
  readonly kind: SideEffectType;
  readonly mode: WebhookMode | "sideEffectOnly";
  readonly blocking: boolean;
}

// --- StructuralRule imported from shared types ---

// =========================================================================
// Section 3: Enumeration Constants
// =========================================================================

/** All 8 ontology rule types (8). Source: mutations.md §2 */
export const ACTION_RULE_TYPES: readonly ActionRuleType[] = [
  "createObject",
  "modifyObject",
  "createOrModify",
  "deleteObject",
  "createLink",
  "deleteLink",
  "functionRule",
  "interfaceRule",
] as const;

/** Simple rule types — excludes functionRule (7). Source: mutations.md §2 */
export const SIMPLE_RULE_TYPES: readonly ActionRuleType[] = [
  "createObject",
  "modifyObject",
  "createOrModify",
  "deleteObject",
  "createLink",
  "deleteLink",
  "interfaceRule",
] as const;

/** Value sources for rule property mappings (4). Source: mutations.md §2 */
export const VALUE_SOURCES: readonly ValueSource[] = [
  "fromParameter",
  "objectParameterProperty",
  "staticValue",
  "contextual",
] as const;

/** Submission condition types (2). Source: mutations.md §8 */
export const SUBMISSION_CONDITION_TYPES: readonly SubmissionConditionType[] = [
  "currentUser",
  "parameter",
] as const;

/** Submission constraint types for Validate Action API (9). Source: mutations.md §8 */
export const SUBMISSION_CONSTRAINT_TYPES: readonly SubmissionConstraintType[] = [
  "range",
  "arraySize",
  "stringLength",
  "stringRegexMatch",
  "oneOf",
  "objectQueryResult",
  "objectPropertyValue",
  "groupMember",
  "unevaluable",
] as const;

/** Operators for single value parameters (5). Source: mutations.md §8 */
export const SINGLE_VALUE_OPERATORS: readonly string[] = [
  "is",
  "isNot",
  "matches",
  "isLessThan",
  "isGreaterThanOrEquals",
] as const;

/** Operators for multiple value parameters (5). Source: mutations.md §8 */
export const MULTI_VALUE_OPERATORS: readonly string[] = [
  "includes",
  "includesAny",
  "isIncludedIn",
  "eachIs",
  "eachIsNot",
] as const;

/** Webhook execution modes (2). Source: webhooks.md §2 */
export const WEBHOOK_MODES: readonly WebhookMode[] = [
  "writeback",
  "sideEffect",
] as const;

/** Webhook input parameter sources (4). Source: webhooks.md §3 */
export const WEBHOOK_INPUT_SOURCES: readonly WebhookInputSource[] = [
  "actionParameters",
  "staticValues",
  "objectPropertyValues",
  "customFunctions",
] as const;

/** Side effect types available on actions (3). Source: webhooks.md §6 */
export const SIDE_EFFECT_TYPES: readonly SideEffectType[] = [
  "webhook",
  "notification",
  "mediaUpload",
] as const;

/** Notification delivery channels (2). Source: webhooks.md §4 */
export const NOTIFICATION_CHANNELS: readonly string[] = [
  "inPlatformPush",
  "email",
] as const;

/** Notification recipient sources (2). Source: webhooks.md §4 */
export const NOTIFICATION_RECIPIENT_SOURCES: readonly string[] = [
  "objectProperty",
  "hardcoded",
] as const;

/** Automation condition types (7: 1 time-based + 6 object set). Source: automation.md §ACTION.AU-02..03 */
export const AUTOMATION_CONDITION_TYPES: readonly AutomationConditionType[] = [
  "timeBased",
  "objectsAddedToSet",
  "objectsRemovedFromSet",
  "objectsModifiedInSet",
  "runOnAllObjects",
  "metricChanged",
  "thresholdCrossed",
] as const;

/** Automation effect types (4). Source: automation.md §4 */
export const AUTOMATION_EFFECT_TYPES: readonly AutomationEffectType[] = [
  "action",
  "notification",
  "function",
  "aipLogic",
] as const;

/** AIP Automate execution modes (2). Source: automation.md §5 */
export const AIP_AUTOMATE_MODES: readonly AipAutomateMode[] = [
  "humanReviewedStaging",
  "autoApply",
] as const;

/** Progressive autonomy levels (5). Source: ontology-ultimate-vision.md §6, digital-twin.md */
export const AUTONOMY_LEVELS: readonly AutonomyLevel[] = [
  "monitor",
  "recommend",
  "approve-then-act",
  "act-then-inform",
  "full-autonomy",
] as const;

/** Funnel batch pipeline stages (4). Source: data-flow.md §2 */
export const FUNNEL_PIPELINE_STAGES: readonly string[] = [
  "changelog",
  "mergeChanges",
  "indexing",
  "hydration",
] as const;

/** Conflict resolution strategies for concurrent edits (2). Source: data-flow.md §2 */
export const CONFLICT_RESOLUTION_STRATEGIES: readonly string[] = [
  "applyUserEdits",
  "applyMostRecentValue",
] as const;

/** Edit visibility methods by data source (5). Source: data-flow.md §5 */
export const EDIT_VISIBILITY_METHODS: readonly string[] = [
  "osv2UserEdits",
  "osv1UserEdits",
  "datasourceBatch",
  "datasourceStreaming",
  "writebackDataset",
] as const;

/** Action log captured data fields (7). Source: mutations.md §8 */
export const ACTION_LOG_FIELDS: readonly string[] = [
  "actionRid",
  "actionTypeRidVersion",
  "utcTimestamp",
  "userId",
  "primaryKeys",
  "summary",
  "parameterValues",
] as const;

/** Object set persistence types (4). Source: data-flow.md §5 */
export const OBJECT_SET_PERSISTENCE_TYPES: readonly string[] = [
  "static",
  "dynamic",
  "temporary",
  "permanent",
] as const;

/**
 * Supported property types in action parameters and edits.
 * Source: scale-property-limits (2026), scrapling confirmation.
 *
 * Keys: property type name.
 * Values: { singleParam, arrayParam, actionEdit } — true if supported.
 *
 * Notable asymmetries:
 * - MandatoryControl: NOT supported as parameter — only as action edit (array only)
 * - MediaReference: NOT supported as array parameter
 * - GeoTimeSeriesReference: OSv2-only, supported everywhere
 * - Byte, Decimal, Float, Short: NOT supported as array parameters
 */
export const ACTION_SUPPORTED_PROPERTY_TYPES = {
  Boolean:                { singleParam: true,  arrayParam: true,  actionEdit: true },
  Byte:                   { singleParam: true,  arrayParam: false, actionEdit: true },
  Date:                   { singleParam: true,  arrayParam: true,  actionEdit: true },
  Decimal:                { singleParam: true,  arrayParam: false, actionEdit: true },
  Double:                 { singleParam: true,  arrayParam: true,  actionEdit: true },
  Float:                  { singleParam: true,  arrayParam: false, actionEdit: true },
  GeoPoint:               { singleParam: true,  arrayParam: true,  actionEdit: true },
  GeoShape:               { singleParam: true,  arrayParam: true,  actionEdit: true },
  Integer:                { singleParam: true,  arrayParam: true,  actionEdit: true },
  Long:                   { singleParam: true,  arrayParam: true,  actionEdit: true },
  Short:                  { singleParam: true,  arrayParam: false, actionEdit: true },
  String:                 { singleParam: true,  arrayParam: true,  actionEdit: true },
  Timestamp:              { singleParam: true,  arrayParam: true,  actionEdit: true },
  Attachment:             { singleParam: true,  arrayParam: true,  actionEdit: true },
  Marking:                { singleParam: true,  arrayParam: true,  actionEdit: true },
  MediaReference:         { singleParam: true,  arrayParam: false, actionEdit: true },
  Struct:                 { singleParam: true,  arrayParam: true,  actionEdit: true },
  MandatoryControl:       { singleParam: false, arrayParam: false, actionEdit: true },
  GeoTimeSeriesReference: { singleParam: true,  arrayParam: true,  actionEdit: true },
} as const;

/**
 * Listener source system categories (6) for inbound webhook event ingestion.
 * Listeners provision URL endpoints with system-specific message signing verification.
 * Source: action/listeners.md, Palantir Data Connection — Listeners (Jan 2026 Beta)
 */
export const LISTENER_SOURCE_CATEGORIES: readonly ListenerSourceCategory[] = [
  "devOps",
  "communication",
  "cloudEvents",
  "commerce",
  "crm",
  "custom",
] as const;

/**
 * Listener source category → representative systems mapping.
 * Source: action/listeners.md §Supported Source Systems
 */
export const LISTENER_CATEGORY_TO_SYSTEMS: Readonly<Record<ListenerSourceCategory, string>> = {
  devOps: "GitHub, Jira, Azure DevOps — commit hooks, issue updates, pipeline events",
  communication: "Slack (including AI-powered bot), Microsoft Teams — messages, reactions, channel events",
  cloudEvents: "Google Pub/Sub — cloud-native event streaming",
  commerce: "Stripe, PayPal, Shopify — payment events, order updates, refunds",
  crm: "Salesforce, HubSpot — lead updates, deal changes, contact modifications",
  custom: "Generic webhook endpoint — any HTTP POST source with custom or no signing scheme",
};

// =========================================================================
// Section 4: Decision Heuristics
// =========================================================================

/**
 * ACTION domain implementation-choice heuristics (DH-ACTION-*).
 * Each absorbs prose heuristics from one or more research files.
 * Uses SemanticHeuristic type from semantics.ts for structural consistency.
 *
 * Every realWorldExample follows Freudenthal's paradigmatic example principle:
 * (1) Concrete scenario, (2) WHY this choice is correct, (3) COUNTER-EXAMPLE:
 * what breaks with the alternative, (4) Second COUNTER-EXAMPLE showing opposite.
 * Minimum 800 characters with quantified failure modes.
 */
export const ACTION_HEURISTICS: readonly SemanticHeuristic[] = [
  {
    id: "DH-ACTION-01",
    question: "Simple rules vs Function-backed rules for this action?",
    options: [
      {
        condition: "Straightforward single-object CRUD or direct M:N link management — no multi-hop traversal, no conditional branching",
        choice: "Simple rules (Tier 1)",
        reasoning: "Declarative rules configured in the Ontology Manager UI. Each rule specifies target object type, operation, and property mappings. Rules compile to single edits per object. Best for direct property modifications and basic link operations.",
      },
      {
        condition: "Multi-object editing across link chains, conditional branching, complex aggregation, or custom error handling required",
        choice: "Function-backed rule (Tier 2)",
        reasoning: "Imperative code with full control over edit logic. Function takes exclusive responsibility — no other rules allowed when function rule is present (HC-ACTION-03). Essential for patterns like 'close incident and all linked alerts' where traversal is needed.",
      },
    ],
    source: ".claude/research/palantir/action/mutations.md — Two-Tier Action Architecture",
    realWorldExample:
      "A manufacturing plant needs a 'Create Work Order' action that sets technician, machine, and priority on a single WorkOrder object. "
      + "Simple rules handle this perfectly: one Create Object rule with property mappings from 3 parameters. No link traversal, no conditional "
      + "logic, no cascade. The action creates exactly one object with fixed property mappings — declarative configuration covers it completely. "
      + "COUNTER-EXAMPLE: Using a function-backed rule here adds unnecessary code complexity — you'd write TypeScript to do what the UI configures "
      + "in 3 clicks. Function maintenance cost increases for zero benefit. Worse, the function must declare @Edits(WorkOrder) and handle "
      + "UserFacingError patterns that simple rules get for free. "
      + "COUNTER-EXAMPLE: Consider 'Close Incident' which must traverse Incident→Alerts (potentially 50+ alerts), set each Alert.status='Resolved', "
      + "compute totalResolutionTimeMinutes across all alerts, and throw UserFacingError if any alert has pendingEscalation=true. Simple rules "
      + "cannot traverse links, cannot conditionally abort, and cannot compute aggregates. Attempting this with simple rules would require 50+ "
      + "individual Modify Object rules (one per alert) — impossible since the alert count is dynamic. The function-backed rule handles this "
      + "in 8 lines of code with incident.alerts.all() traversal.",
  },
  {
    id: "DH-ACTION-02",
    question: "Which simple rule type for a given edit operation?",
    options: [
      {
        condition: "Creating a brand-new entity instance with a known primary key",
        choice: "createObject",
        reasoning: "Creates a new object with PK and property values. PK is required. Cannot modify objects created in the same action with subsequent rules.",
      },
      {
        condition: "Updating properties on an existing entity referenced by parameter",
        choice: "modifyObject",
        reasoning: "Updates existing objects via parameter-supplied values. Cannot modify objects created in the same action. Used for FK link modification (setting/clearing FK property).",
      },
      {
        condition: "Upsert pattern — create if not exists, modify if already present",
        choice: "createOrModify",
        reasoning: "Auto-generates IDs when needed. Useful for idempotent operations where the caller may not know if the entity exists.",
      },
      {
        condition: "Removing an entity permanently by primary key reference",
        choice: "deleteObject",
        reasoning: "Removes objects by PK reference. Cannot delete before add/modify in the same action. Deletion is permanent — no soft-delete built in.",
      },
      {
        condition: "Establishing an M:N relationship between two existing entities",
        choice: "createLink",
        reasoning: "Creates M:N link entries in the join table. Only for M:N links — FK-based links (1:1, M:1, 1:M) use modifyObject to set the FK property instead.",
      },
      {
        condition: "Removing an M:N relationship between two entities",
        choice: "deleteLink",
        reasoning: "Removes M:N link entries from the join table. Only for M:N links — FK-based links use modifyObject to clear the FK property.",
      },
      {
        condition: "Operating on entities via their interface contract rather than concrete type",
        choice: "interfaceRule",
        reasoning: "Interface-level operations (create/modify/delete/link) that work across all implementing types. Enables polymorphic action definitions.",
      },
    ],
    source: ".claude/research/palantir/action/mutations.md — 8 Ontology Rule Types",
    realWorldExample:
      "A hospital system manages Patient→Doctor assignments. Adding a new patient: createObject with PK patientId, properties name, dateOfBirth, "
      + "bloodType. Assigning the patient to a doctor: since Patient→Doctor is M:1 (FK doctorId on Patient), use modifyObject to set doctorId — NOT "
      + "createLink. The FK property IS the relationship. Enrolling a patient in multiple Treatment Programs (M:N): use createLink to add entries to "
      + "the Patient↔TreatmentProgram join table. COUNTER-EXAMPLE: Using createLink for Patient→Doctor (M:1) fails because FK-based relationships "
      + "have no join table — the platform returns 'Link type does not support create link rule' error. You'd be blocked at configuration time. "
      + "COUNTER-EXAMPLE: Using modifyObject for Patient↔TreatmentProgram (M:N) requires knowing which FK property to set — but M:N links have no "
      + "FK property on either side. There's no 'treatmentProgramId' column on Patient. The join table is the ONLY storage mechanism for M:N links, "
      + "so createLink/deleteLink are the ONLY valid rule types. Confusing these two patterns causes schema compilation errors: the platform validates "
      + "that link rules match the backing mechanism.",
  },
  {
    id: "DH-ACTION-03",
    question: "FK link modification (Modify rule) vs M:N link creation/deletion (Link rules)?",
    options: [
      {
        condition: "The relationship has cardinality 1:1, M:1, or 1:M — one side holds a foreign key property",
        choice: "Modify Object rule to set/clear FK property",
        reasoning: "FK-based links are properties, not join table entries. Setting employeeDepartmentId='DEPT-42' on an Employee IS the link operation. No dedicated link rule exists for FK relationships.",
      },
      {
        condition: "The relationship has cardinality M:N — both sides can have many, backed by join table or object-backed entity",
        choice: "Create Link / Delete Link rules",
        reasoning: "M:N links are stored in a separate join table datasource. Dedicated Create/Delete Link rules manage entries in this table. There is no FK property to modify.",
      },
    ],
    source: ".claude/research/palantir/action/mutations.md — Link Management via Rules",
    realWorldExample:
      "An ERP system tracks Employee→Department (M:1, FK departmentId on Employee) and Employee↔Project (M:N, join table). Transferring an "
      + "employee to a new department: Modify Object rule sets employee.departmentId to the new department's PK. This is a property update, not a "
      + "link operation. Assigning an employee to a project: Create Link rule adds (employeeId, projectId) to the EmployeeProject join table. "
      + "Removing from project: Delete Link rule removes the join table entry. COUNTER-EXAMPLE: Attempting Create Link for Employee→Department "
      + "fails at configuration time — the platform detects that the link is FK-backed and rejects the rule type. The error message states 'FK "
      + "links use Modify rule, not Create/Delete Link'. This costs 15-30 minutes of debugging for developers unfamiliar with the distinction. "
      + "COUNTER-EXAMPLE: Attempting Modify Object to 'set projectId' on Employee for the M:N relationship fails because no projectId property "
      + "exists on Employee. The M:N backing mechanism stores relationships externally in the join table, so there is no scalar FK column to modify. "
      + "The platform would return 'Property not found: projectId' at validation time.",
  },
  {
    id: "DH-ACTION-04",
    question: "Writeback webhook vs Side Effect webhook for external system integration?",
    options: [
      {
        condition: "External system success MUST gate local changes — if external call fails, Foundry changes must NOT apply (two-phase commit)",
        choice: "Writeback webhook",
        reasoning: "Fires BEFORE all other rules. External system failure causes full rollback — zero Foundry changes. Max 1 per action. Captures output parameters usable in subsequent rules. Provides transactional consistency between Foundry and external system.",
      },
      {
        condition: "External notification is best-effort — Foundry changes should persist regardless of external call outcome",
        choice: "Side Effect webhook",
        reasoning: "Fires AFTER all rules execute and changes are committed. Failure is non-blocking — ontology changes persist. Multiple allowed per action, execute in parallel. User sees success immediately after commit.",
      },
    ],
    source: ".claude/research/palantir/action/webhooks.md — Two Webhook Modes",
    realWorldExample:
      "An enterprise creates purchase orders that must be reflected in both Foundry and SAP ERP. The SAP order ID must be captured as a property "
      + "on the Foundry PurchaseOrder object. This requires writeback: (1) action submitted, (2) writeback webhook POSTs to SAP, (3) SAP returns "
      + "orderId 'SAP-PO-78432', (4) orderId is mapped to PurchaseOrder.externalOrderId via output parameter, (5) ontology rules execute creating "
      + "the PurchaseOrder with externalOrderId='SAP-PO-78432'. If SAP rejects (duplicate, invalid GL code), NOTHING is created in Foundry. This "
      + "prevents orphaned Foundry records with no SAP counterpart — a data integrity guarantee worth the max-1 constraint. "
      + "COUNTER-EXAMPLE: Using side effect webhook here means Foundry creates the PurchaseOrder FIRST, then calls SAP. If SAP rejects, Foundry "
      + "has a PurchaseOrder with no SAP counterpart. Worse, there's no output parameter mechanism — the SAP orderId can't flow back to set "
      + "externalOrderId. You'd need a separate reconciliation process, adding 2-6 hours of data inconsistency. "
      + "COUNTER-EXAMPLE: A 'send Slack notification' webhook should be side effect. If Slack is down for 5 minutes, you don't want to block all "
      + "incident resolutions. Writeback here means a Slack outage prevents operators from closing incidents — operational risk far exceeds "
      + "notification value. The non-blocking semantics of side effect mode are correct for notifications.",
  },
  {
    id: "DH-ACTION-05",
    question: "Webhook vs Notification vs Media Upload for post-action side effects?",
    options: [
      {
        condition: "Need to call an external HTTP endpoint (REST API, SOAP service, third-party SaaS)",
        choice: "Webhook",
        reasoning: "Custom HTTP request to any endpoint. Supports both writeback (blocking) and side effect (non-blocking) modes. Parameterizable from action inputs, static values, object properties, or custom functions. TypeScript v1/v2 only (no Python).",
      },
      {
        condition: "Need to notify Foundry users within the platform (push + email)",
        choice: "Notification",
        reasoning: "Delivers to Foundry user IDs via in-platform push and email simultaneously. Side effect mode only (non-blocking). Configured via UI templates with dynamic value references. Code-free — no function required.",
      },
      {
        condition: "Need to attach files or media during action submission as a non-blocking operation",
        choice: "Media Upload",
        reasoning: "Fire-and-forget file attachment to Foundry storage. Failure does not rollback the action. For transactional file upload (must succeed), use attachment parameters instead.",
      },
    ],
    source: ".claude/research/palantir/action/webhooks.md — Webhook vs Notification vs Media Upload",
    realWorldExample:
      "A logistics company dispatches shipments. After dispatch: (1) Webhook to carrier API with shipment details, tracking number, pickup window "
      + "— external HTTP call to FedEx/UPS API requiring structured JSON payload with authentication. (2) Notification to dispatch supervisor — "
      + "Foundry user ID gets push notification + email saying 'Shipment SHP-4521 dispatched to Customer ABC, ETA 2 days'. (3) Media upload of "
      + "the generated shipping label PDF — attached to the Shipment object for reference. These three side effects fire in parallel after the "
      + "dispatch mutation commits. COUNTER-EXAMPLE: Using notification to reach the carrier API fails — notifications only target Foundry user "
      + "IDs, not external HTTP endpoints. The carrier has no Foundry account. You'd need to set up an intermediary webhook that receives the "
      + "notification and forwards to the carrier API, adding latency and a failure point for no benefit. "
      + "COUNTER-EXAMPLE: Using webhook for internal user notification is over-engineered. You'd need to set up an HTTP endpoint that receives "
      + "the webhook payload and translates it into Foundry push notifications — reimplementing what the notification side effect does natively "
      + "with zero code. The UI template system handles dynamic values (recipient name, shipment ID) automatically.",
  },
  {
    id: "DH-ACTION-06",
    question: "Which automation condition type for monitoring ontology changes?",
    options: [
      {
        condition: "New entities matching filter criteria appear (via pipeline, action, or API)",
        choice: "objectsAddedToSet",
        reasoning: "Triggers when objects enter the monitored set. Covers creation AND property changes that cause an existing object to match filter criteria for the first time.",
      },
      {
        condition: "Entities stop matching filter criteria (NOT deletion — they still exist but left the set)",
        choice: "objectsRemovedFromSet",
        reasoning: "Triggers on set membership change, not object deletion. Example: status changes from 'Open' to 'Closed' removes the object from the 'Open Incidents' set.",
      },
      {
        condition: "Property changes on entities that remain in the monitored set",
        choice: "objectsModifiedInSet",
        reasoning: "Triggers when properties change but the object stays in the set. Example: priority escalation on an open incident (it's still open, but priority changed).",
      },
      {
        condition: "Periodic batch processing across all current members of a set",
        choice: "runOnAllObjects",
        reasoning: "Periodic, NOT event-driven. Runs on a schedule across all current set members. Best for batch reconciliation, periodic audits, or scheduled maintenance checks.",
      },
      {
        condition: "Aggregate metric (count, avg, sum, min, max) on the set increases or decreases",
        choice: "metricChanged",
        reasoning: "Monitors aggregate values, not individual objects. Example: if average response time across all open incidents exceeds 4 hours. Requires aggregate computation on each evaluation cycle.",
      },
      {
        condition: "Custom boolean condition evaluated by a function or interface-backed logic",
        choice: "thresholdCrossed",
        reasoning: "Most flexible — arbitrary condition evaluation via custom functions. Covers cases where the 5 other condition types are insufficient. Example: complex multi-property threshold combining weighted factors.",
      },
    ],
    source: ".claude/research/palantir/action/automation.md — 6 Object Set Condition Types",
    realWorldExample:
      "A customer support platform monitors SLA compliance. New ticket created with priority='Critical': objectsAddedToSet triggers on the "
      + "'Critical Tickets' filtered set, auto-assigning to the on-call engineer via action effect. Ticket priority downgraded from Critical to "
      + "Low: objectsRemovedFromSet fires (ticket leaves Critical set), triggering a notification to the manager. Ticket notes updated while "
      + "still Critical: objectsModifiedInSet fires, checking if the update includes customer response. Weekly SLA report: runOnAllObjects "
      + "iterates all open tickets computing resolution statistics. Average resolution time crosses 4-hour SLA: metricChanged fires an "
      + "escalation to VP of Support. COUNTER-EXAMPLE: Using objectsModifiedInSet for the weekly report means it only fires when individual "
      + "tickets change — if no tickets changed this week, no report is generated. runOnAllObjects guarantees periodic execution regardless "
      + "of changes. COUNTER-EXAMPLE: Using runOnAllObjects for new-ticket assignment means EVERY ticket (potentially 10,000+) gets processed "
      + "on each cycle, not just new ones. objectsAddedToSet fires only for net-new entries, processing 5-10 tickets per cycle instead of "
      + "10,000 — a 1000x efficiency difference that matters for change detection latency.",
  },
  {
    id: "DH-ACTION-07",
    question: "Which automation effect type when a condition fires?",
    options: [
      {
        condition: "The response is a well-defined mutation with known parameters (create, modify, delete)",
        choice: "Action effect",
        reasoning: "Triggers a configured Action Type with parameters from the condition. Standard user-configured flow. The action inherits all submission criteria and side effects defined on the action type.",
      },
      {
        condition: "The response is informing Foundry users (push + email) about the condition",
        choice: "Notification effect",
        reasoning: "Sends notification to specified Foundry users. Standard user-configured. No code required — message templates with dynamic values.",
      },
      {
        condition: "The response requires custom computation before determining the action (validation, complex routing)",
        choice: "Function effect",
        reasoning: "Executes a Logic function directly. Standard user-configured. Useful when the response depends on computed conditions not expressible as simple action parameter mappings.",
      },
      {
        condition: "The response requires autonomous LLM-driven decision making with optional human review",
        choice: "AIP Logic effect",
        reasoning: "Autonomous execution with progressive trust. Starts with human-reviewed staging (24-hour proposal window), graduates to auto-apply. The Logic output must return an Ontology edit and the input must receive an object.",
      },
    ],
    source: ".claude/research/palantir/action/automation.md — Effect Types",
    realWorldExample:
      "A warehouse management system detects inventory below reorder point. Action effect: trigger 'Create Purchase Order' mutation with "
      + "supplier, quantity, and itemId parameters auto-populated from the triggered object. This is deterministic — same input always produces "
      + "the same purchase order. Notification effect: alert the warehouse manager via push + email that Item X is below threshold — informational, "
      + "no state change needed. Function effect: compute optimal reorder quantity based on historical demand patterns, seasonal factors, and "
      + "supplier lead times before creating the purchase order — the function determines WHAT to order, not just that an order is needed. "
      + "AIP Logic effect: analyze the supply chain disruption context, evaluate alternative suppliers, draft a procurement recommendation, "
      + "and stage it for manager review before execution. COUNTER-EXAMPLE: Using AIP Logic for simple threshold-based reorder adds LLM "
      + "latency (5-15 seconds per evaluation) and review overhead for a deterministic decision. If item.quantity < reorderPoint, the action "
      + "is always the same — no AI reasoning needed. At 500 items hitting thresholds daily, that's 500 staged proposals requiring human review "
      + "versus 500 instant auto-orders. COUNTER-EXAMPLE: Using action effect for the supply chain disruption analysis misses the nuanced "
      + "reasoning — alternative supplier evaluation, cost-benefit analysis, and risk assessment require the LLM's contextual understanding. "
      + "A static action type cannot reason about which of 3 backup suppliers has best current availability.",
  },
  {
    id: "DH-ACTION-08",
    question: "Staged human review vs auto-apply for AIP Automate?",
    options: [
      {
        condition: "New or sensitive automation, low confidence in LLM accuracy, high-value or irreversible edits",
        choice: "Human-reviewed staging",
        reasoning: "Proposals appear in the Proposals tab with 24-hour visibility. Reviewers inspect edits and the Agent decision log. Accept → action executes; Reject → expires with no edits. This is the starting point for progressive trust.",
      },
      {
        condition: "High acceptance rate (>95%), reversible edits, high-volume low-risk operations, proven accuracy track record",
        choice: "Auto-apply",
        reasoning: "Edits applied automatically without review. Reserved for graduated workflows where confidence is established through staged review. Consider: accuracy rate, risk profile, volume, and reversibility before graduating.",
      },
    ],
    source: ".claude/research/palantir/action/automation.md — AIP Automate Execution Modes",
    realWorldExample:
      "A financial services firm uses AIP Automate for trade compliance checking. Initial deployment: human-reviewed staging. The LLM evaluates "
      + "each trade against 47 regulatory rules and proposes 'flag for review' or 'auto-approve' decisions. Over 3 months, reviewers accept 98.2% "
      + "of proposals without modification (1,847 out of 1,881). The 1.8% rejection rate involves edge cases around cross-border derivatives — "
      + "a known gap. After review, the team graduates the simple domestic equity compliance checks to auto-apply (95% of volume) while keeping "
      + "cross-border derivatives on staged review. COUNTER-EXAMPLE: Auto-applying on day 1 risks executing incorrect compliance decisions. "
      + "If the LLM misclassifies 5% of trades (93 out of 1,881), each misclassification could trigger a regulatory investigation costing "
      + "$50K-$500K in legal fees. The 24-hour review window catches these errors before they become regulatory events. "
      + "COUNTER-EXAMPLE: Keeping staged review indefinitely for the domestic equity checks (1,780 trades/month with 99.7% acceptance) forces "
      + "compliance officers to review ~1,780 proposals monthly that they almost always accept. At 2 minutes per review, that's 59 hours/month "
      + "of low-value review work. Auto-apply recovers this time while maintaining staged review for the genuinely uncertain cross-border cases.",
  },
  {
    id: "DH-ACTION-09",
    question: "How to monitor link changes in automations (indirect pattern)?",
    options: [
      {
        condition: "Need to detect when a linked object's state change affects the primary object's set membership",
        choice: "Indirect via set membership — filter the monitored set using link-based conditions",
        reasoning: "No direct 'linked object changed' trigger exists (HC-ACTION-21). Instead, define the object set with link-aware filters. When linked objects change, the primary object may enter/leave the set, triggering add/remove conditions.",
      },
      {
        condition: "Need to detect changes on the linked objects themselves (not the primary object's membership)",
        choice: "Monitor the linked object type's set directly",
        reasoning: "Create a separate automation monitoring the linked object type. When a linked object changes, its own set membership triggers the automation. The effect can then operate on the primary object via parameter passing.",
      },
    ],
    source: ".claude/research/palantir/action/automation.md — Link-Aware Behavior",
    realWorldExample:
      "An incident management system needs to auto-close incidents when all linked alerts are resolved. Pattern 1 (indirect): Monitor the set "
      + "'Incidents with at least one unresolved Alert' filtered by alerts.any(status != 'Resolved'). When the last Alert on Incident INC-42 is "
      + "resolved, INC-42 leaves the set. objectsRemovedFromSet fires, triggering 'Close Incident' action with INC-42 as parameter. The filter "
      + "evaluation happens on each change detection cycle (within minutes). Pattern 2 (direct): Monitor the 'Alerts' set for objectsModifiedInSet "
      + "where status changed to 'Resolved'. The automation's function effect checks if ALL alerts on the parent Incident are now resolved, and "
      + "if so, closes the Incident. COUNTER-EXAMPLE: Attempting a direct 'linked Alert changed' condition fails — the platform does not support "
      + "this trigger type. Developers spend 30-60 minutes searching documentation before discovering the indirect pattern. The design choice is "
      + "intentional: explicit set membership monitoring prevents implicit cascading through complex link chains, which could trigger exponential "
      + "condition evaluations. With 1,000 incidents averaging 5 alerts each, direct link monitoring would require evaluating 5,000 link edges "
      + "per cycle versus 1,000 set membership checks — a 5x overhead that compounds with link chain depth.",
  },
  {
    id: "DH-ACTION-10",
    question: "Inline edit vs full action submission for property modifications?",
    options: [
      {
        condition: "Quick single-object property edits in Object Explorer or Workshop — no side effects, no cross-object validation, no link changes",
        choice: "Inline edit",
        reasoning: "Simplified pattern: single object, single type, all params optional (default to existing values). No join table links, no webhooks, no notifications. Submission criteria cannot reference shared/linked objects. Batch-validated and submitted.",
      },
      {
        condition: "Multi-object operations, side effects needed, cross-object validation, link management, or complex submission criteria",
        choice: "Full action submission",
        reasoning: "Full Action Type with parameters, rules, submission criteria, and side effects. Supports all rule types, webhooks, notifications, and cross-object validation. Required for any operation beyond single-object property edits.",
      },
    ],
    source: ".claude/research/palantir/action/mutations.md — Inline Edits",
    realWorldExample:
      "An operator in Object Explorer wants to update a ticket's priority from 'Medium' to 'High'. Inline edit: click the priority cell, select "
      + "'High', save. One object, one property, no side effects. The edit is batch-validated against the ticket's submission criteria (which can "
      + "only check the ticket itself, not linked objects). Response time: under 500ms. COUNTER-EXAMPLE: Using full action submission for this "
      + "single-field update requires navigating to the action form, selecting the ticket, filling in the priority parameter, and submitting. "
      + "This adds 3-5 clicks and 5-10 seconds of navigation for a 1-property change that operators perform 50+ times per shift. Over 250 "
      + "working days, that's 62,500+ unnecessary form submissions. COUNTER-EXAMPLE: Using inline edit for 'Escalate Ticket' which must update "
      + "priority, reassign to senior engineer (link change), notify the shift supervisor (notification side effect), and validate that the "
      + "ticket has no pending customer response (cross-object check). Inline edit fails silently on the link change (no join table support), "
      + "skips the notification entirely, and cannot validate the customer response check. The operator sees 'success' but the escalation is "
      + "incomplete — a partial state that inline edit's constraints prevent from being detected.",
  },
  {
    id: "DH-ACTION-11",
    question: "Batch vs streaming data flow for edit visibility?",
    options: [
      {
        condition: "Standard operational workflows where minutes-level latency is acceptable (most use cases)",
        choice: "Batch pipeline (Funnel 4-stage)",
        reasoning: "Datasource updates flow through changelog → merge → indexing → hydration. Minutes-level latency. Incremental by default in OSv2. Full reindex triggers at ~80% row change. Live pipelines run every 6 hours if user edits detected.",
      },
      {
        condition: "Latency-critical operational workflows requiring sub-minute edit visibility (real-time dashboards, alert systems)",
        choice: "Streaming datasources",
        reasoning: "Bypass batch changelog stage, flow directly to merge. Indexing occurs in seconds to minutes. Designed for latency-sensitive scenarios. OSv2 user edits are immediately visible regardless of pipeline mode.",
      },
    ],
    source: ".claude/research/palantir/action/data-flow.md — Streaming Support + Batch Pipeline",
    realWorldExample:
      "A power grid monitoring system tracks generation unit output. Batch pipeline: hourly dataset updates flow through the 4-stage Funnel. "
      + "Generation output changes are visible in 3-8 minutes after the dataset transaction commits. Acceptable for shift planning and capacity "
      + "reporting. Streaming pipeline: real-time SCADA telemetry flows through streaming datasources. Turbine output changes are visible in "
      + "10-45 seconds. Required for the grid frequency monitoring dashboard where a 5-minute lag could miss a frequency deviation event. "
      + "The streaming path costs 3-5x more compute resources than batch for the same data volume. COUNTER-EXAMPLE: Using streaming for the "
      + "weekly capacity report wastes 3-5x compute resources for data that's analyzed once per week. The report doesn't benefit from sub-minute "
      + "visibility — it aggregates 168 hours of data regardless. At $0.15/GB for streaming vs $0.03/GB for batch, a 10GB/day pipeline costs "
      + "$45/month streaming vs $9/month batch — $432/year saved with no functional difference. "
      + "COUNTER-EXAMPLE: Using batch for the frequency monitoring dashboard introduces a 3-8 minute blind spot. If grid frequency drops from "
      + "60.0Hz to 59.3Hz (triggering under-frequency load shedding), operators need to see this within 30 seconds to dispatch reserve generation. "
      + "A 5-minute batch delay means load shedding executes before operators even see the deviation — potentially affecting 50,000+ customers.",
  },
  {
    id: "DH-ACTION-12",
    question: "Which webhook input parameter source for constructing the payload?",
    options: [
      {
        condition: "Webhook payload directly maps to values the user provided in the action form",
        choice: "Action parameters",
        reasoning: "Direct mapping from action input parameters to webhook payload fields. Simplest approach. No computation needed. Example: user-entered orderId, quantity, supplierId map directly to the ERP API payload.",
      },
      {
        condition: "Webhook payload includes fixed configuration values (API keys, environment URLs, constants)",
        choice: "Static values",
        reasoning: "Fixed values defined in webhook configuration. Not dependent on user input or object state. Example: API endpoint base URL, authentication token, fixed department code.",
      },
      {
        condition: "Webhook payload needs property values from objects referenced in the action parameters",
        choice: "Object property values",
        reasoning: "Extracts properties from object reference parameters. Example: the action receives a Company object parameter, and the webhook needs company.name, company.industry from that object.",
      },
      {
        condition: "Webhook payload requires computed, aggregated, or transformed data not directly available from parameters or objects",
        choice: "Custom functions",
        reasoning: "TypeScript functions compute webhook parameters based on arbitrary ontology queries and logic. Most flexible but requires code. Can return arrays for multi-invocation patterns. Example: computing weighted risk scores from linked entities.",
      },
    ],
    source: ".claude/research/palantir/action/webhooks.md — Input Parameter Sources",
    realWorldExample:
      "A CRM integration sends customer data to Salesforce when a deal is closed. Action parameters: dealId, closeDate, revenue are user inputs "
      + "from the action form — map directly to Salesforce DealClosed payload. Static values: Salesforce API base URL 'https://company.my.salesforce.com', "
      + "OAuth client ID 'sf-foundry-integration' — fixed configuration, never changes per submission. Object property values: the action takes a "
      + "Customer object parameter, and the webhook needs customer.accountName, customer.industry, customer.annualRevenue — properties extracted from "
      + "the referenced object. Custom function: compute customerLifetimeValue by traversing Customer→Deals (all historical deals), summing revenue, "
      + "applying a discount rate, and returning the computed CLV for the Salesforce payload. COUNTER-EXAMPLE: Using action parameters for the CLV "
      + "computation would require the user to manually calculate and enter the value — error-prone and defeats the purpose of automation. The CLV "
      + "depends on 50+ historical deals that the user cannot reasonably aggregate mentally. COUNTER-EXAMPLE: Using static values for customer.industry "
      + "would hard-code one industry for ALL webhook calls — 'Technology' for every customer regardless of actual industry. Object property values "
      + "correctly extract the per-customer industry from the referenced Customer object. The distinction: static values are constant across ALL "
      + "invocations; object properties vary per invocation based on the referenced entity.",
  },
  {
    id: "DH-ACTION-13",
    question: "What autonomy level should this action/automation have for AI-driven execution?",
    options: [
      {
        condition: "High-risk, irreversible, or novel action type — financial transactions, kinetic operations, patient care changes, or any action without established track record",
        choice: "approve-then-act (human reviews AI proposal before execution)",
        reasoning: "Pattern 3 (Human-in-the-Loop Action Review): AI proposes the action with full context (what data informed the decision, which logic was applied, predicted impact). Human reviewer approves/rejects/modifies. This is the DEFAULT for new AI-proposed action patterns — start here and promote to higher autonomy as confidence builds.",
      },
      {
        condition: "Established pattern with proven track record and quantifiable impact — the AI has successfully proposed 100+ similar actions with >95% approval rate",
        choice: "act-then-inform (AI executes, human is notified)",
        reasoning: "When an action pattern has a strong approval track record, the human review step becomes overhead. The AI executes and the human receives a notification with full decision lineage for audit. The human can still reverse if needed.",
      },
      {
        condition: "Low-risk, fully deterministic, high-volume operation — routine maintenance scheduling, reference data updates, or automated reconciliation where human review adds no value",
        choice: "full-autonomy (AI operates independently within guardrails)",
        reasoning: "When the action's logic is deterministic, its impact is bounded (e.g., cannot exceed $X), and human review would create bottleneck (e.g., 10,000 reconciliation entries/night), full autonomy is appropriate. Requires strict submission criteria and monitoring.",
      },
    ],
    source: ".claude/research/palantir/action/automation.md §5 — AIP Automate + philosophy/digital-twin.md — Progressive Autonomy",
    realWorldExample:
      "A logistics company implements AI-driven inventory rebalancing. (1) Phase 1 — approve-then-act: AI analyzes demand forecasts, "
      + "proposes moving 500 units from Warehouse A to Warehouse B, shows reasoning (demand spike predicted in Region B, 3-day transit, "
      + "$2,400 shipping cost, projected revenue lift $18K). Logistics manager reviews and approves. After 200 successful proposals with "
      + "97% approval rate, the team promotes to (2) Phase 2 — act-then-inform: AI executes rebalancing for transfers under $5,000 and "
      + "notifies the manager via dashboard. Manager reviews daily digest and can reverse within 2 hours. After 6 months with zero reversals, "
      + "the team promotes to (3) Phase 3 — full-autonomy for transfers under $1,000: AI schedules nightly rebalancing without notification, "
      + "with hard guardrails (max 2,000 units/day, no cross-region transfers, submission criteria enforce inventory floor). "
      + "COUNTER-EXAMPLE: Starting a brand-new AI capability at full-autonomy — a pharmaceutical company lets AI auto-adjust drug manufacturing "
      + "quantities without human review. The AI misinterprets a demand signal and produces 10x the normal batch of an expensive compound. "
      + "$2M in raw materials wasted. The approve-then-act phase would have caught this: the human reviewer would see '10x normal batch' and "
      + "flag it as anomalous. Progressive autonomy exists precisely to build calibrated trust before removing human oversight.",
  },
  // --- v1.3.0 addition (research deep dive 2026-03-15) ---
  {
    id: "DH-ACTION-14",
    question: "Should this undo use action revert or a compensating mutation?",
    options: [
      {
        condition: "Simple undo — the original action's edits can be reversed without additional business logic",
        choice: "Action revert (platform-native undo)",
        reasoning: "Action reverts are built-in (HC-ACTION-29..31). They preserve the full audit trail of original + revert, require OSv2, and only work if no subsequent edits have occurred on affected objects. Use when the undo is a pure rollback.",
      },
      {
        condition: "Business logic required for reversal — the undo involves new calculations, external system notifications, or conditional rollback",
        choice: "Compensating mutation (custom reverse action)",
        reasoning: "When reversal needs its own business logic (recalculate balances, notify external systems, conditionally skip some edits), a compensating mutation is required. This is a separate action type with its own submission criteria and side effects, not a platform revert.",
      },
    ],
    source: ".claude/research/palantir/action/mutations.md §Action Reverts — distinguishing simple undo from business-logic reversal",
    realWorldExample:
      "An e-commerce system processes an order (ACTION: createOrder). Simple undo: customer cancels within 5 minutes, no fulfillment started — action revert "
      + "rolls back the order creation cleanly, preserving the full audit trail of both original submission and revert. The revert succeeds because no "
      + "subsequent edits have occurred on the Order object (HC-ACTION-30 satisfied). "
      + "Compensating mutation: customer cancels after shipping started — a compensating action (ACTION: cancelOrderPostShipment) must notify warehouse "
      + "(webhook side effect to WMS), generate return label (external API call), update inventory forecast (LOGIC function recalculation), issue refund "
      + "(transactional webhook to payment processor), and mark order as 'cancelled-post-shipment' (modify rule). Each step requires its own validation "
      + "and submission criteria. Revert cannot handle this because it only undoes the original Ontology edits without triggering downstream business logic. "
      + "COUNTER-EXAMPLE: Using action revert for the post-shipment cancellation — the revert deletes the Order object from the Ontology, but the warehouse "
      + "has already picked and packed the items, the shipping label is printed, and the payment processor has captured the charge. The physical world is now "
      + "out of sync with the digital twin. A compensating mutation properly orchestrates the reversal across all affected systems.",
  },
  // --- v1.3.0 addition (DevCon5/AIPCon9 gap closure — Scenarios/COA) ---
  {
    id: "DH-ACTION-15",
    question: "Should this decision use Scenarios/COA comparison or direct action execution?",
    options: [
      {
        condition: "Decision has multiple valid courses of action with quantifiably different trade-offs (time, cost, risk) — stakeholders need to compare alternatives before committing",
        choice: "Scenarios/COA framework (generate N alternatives, quantify trade-offs, human selects)",
        reasoning: "The Scenarios framework (SCN-01..04 in semantics.ts) generates multiple hypothetical edit sets, each with quantified impact dimensions. ShipOS demonstrates this: Act now (minimal delay, higher cost) / Defer (schedule risk, lower cost) / Reject and escalate (full assessment). The reviewer sees trade-offs side-by-side with the agent's reasoning visible in the decision log.",
      },
      {
        condition: "Decision is deterministic — one correct action given the current state, no meaningful alternatives to compare",
        choice: "Direct action execution (single mutation, standard PA review level)",
        reasoning: "When there's only one valid response to a condition (e.g., stock below reorder point → create purchase order), generating scenarios adds LLM latency and review overhead for a decision that has no alternatives. Direct execution via standard PA-03 approval or PA-04/05 autonomy is more efficient.",
      },
    ],
    source: ".claude/research/palantir/action/automation.md §5 — AIP Automate + philosophy/ontology-ultimate-vision.md §4.5 — Scenarios Framework",
    realWorldExample:
      "A naval supply chain detects that an engineering change notice affects 3 suppliers across 12 work orders. ShipOS generates 3 COAs: "
      + "(1) Act now — accelerate alternate supplier qualification, +$340K cost, 0 days schedule slip; "
      + "(2) Defer — accept 14-day delay, +$85K carrying cost, risk of cascading delays to 3 downstream milestones; "
      + "(3) Reject and escalate — full impact assessment required, 5-day analysis period, all affected work orders paused. "
      + "Each COA carries a hypothetical edit set: COA-1 creates 3 supplier qualification work orders + modifies 12 existing WOs; "
      + "COA-2 modifies timeline on 12 WOs + creates 1 risk mitigation plan; COA-3 pauses 12 WOs + creates 1 assessment task. "
      + "The program manager reviews all 3 side-by-side with quantified days/dollars/risk, selects COA-1, and the edit set commits atomically. "
      + "COUNTER-EXAMPLE: Using direct action for this multi-alternative decision forces the AI to pick one option without presenting trade-offs. "
      + "The program manager only sees 'recommended: accelerate qualification' without knowing the cost delta vs deferral ($340K vs $85K). "
      + "If the budget is constrained, they'd want COA-2 — but never see it was an option. Scenarios make implicit trade-offs explicit. "
      + "COUNTER-EXAMPLE: Using Scenarios for a simple threshold-based reorder (stock < minimum → create PO) generates 3 alternatives for a "
      + "deterministic decision. The 'alternatives' would be meaningless variations (order from same supplier with same quantity). The 5-15 second "
      + "LLM evaluation latency per scenario × 500 daily reorder events = 41 minutes of wasted compute and 500 staged proposals requiring review.",
  },
  {
    id: "DH-ACTION-16",
    question: "Listener vs outbound webhook vs Automate for external event integration?",
    options: [
      {
        condition: "An external system needs to push events INTO the platform — real-time notifications, status updates, or data feeds from GitHub, Slack, Stripe, etc.",
        choice: "Listener (inbound webhook endpoint)",
        reasoning: "Listeners provision URL endpoints with system-specific message signing verification. The external system POSTs events to the Listener endpoint; the platform ingests them into a stream for downstream processing. Use when the data flow direction is INBOUND (external → platform).",
      },
      {
        condition: "A platform action needs to notify an external system — send a Slack message, update a Jira ticket, trigger an external workflow after an ontology mutation",
        choice: "Outbound Webhook (side effect on action)",
        reasoning: "Outbound webhooks fire as side effects after mutations commit. They send data FROM the platform to external systems. Use when the data flow direction is OUTBOUND (platform → external).",
      },
      {
        condition: "An internal ontology event (object added/modified/deleted) needs to trigger an internal action — no external system involved",
        choice: "Automate (event-driven automation)",
        reasoning: "Automate monitors Object Sets for condition changes and fires effects (actions, notifications, functions, AIP Logic) within the platform. No external system communication needed. Use for purely internal event-driven workflows.",
      },
    ],
    source: ".claude/research/palantir/action/listeners.md, webhooks.md, automation.md",
    realWorldExample: "A GitHub repository pushes commit and PR events to the platform for code review tracking → Listener, because GitHub initiates the push (inbound). The Listener endpoint validates GitHub's HMAC-SHA256 signature and writes events to a stream. A deployment action in the ontology needs to notify the #releases Slack channel after a successful deploy → Outbound Webhook, because the platform initiates the notification (outbound) as a side effect on the Deploy mutation. An inventory level drops below reorder threshold, automatically creating a purchase order → Automate, because both the trigger (inventory object modification) and effect (create PO action) are internal to the platform. COUNTER-EXAMPLE: Using an outbound webhook to 'listen' for GitHub events by polling the GitHub API on a schedule — this wastes API quota, adds latency (polling interval vs real-time push), and doesn't scale. Use a Listener instead and let GitHub push events in real-time.",
  },
] as const;

// =========================================================================
// Section 5: Mapping Tables
// =========================================================================

/** Rule type to constraint mapping. Source: mutations.md §2 */
export const RULE_TYPE_TO_CONSTRAINTS: Readonly<Record<ActionRuleType, {
  readonly pkRequired: boolean;
  readonly coexistsWithFunction: boolean;
  readonly objectCreationScope: string;
}>> = {
  createObject: { pkRequired: true, coexistsWithFunction: false, objectCreationScope: "single" },
  modifyObject: { pkRequired: false, coexistsWithFunction: false, objectCreationScope: "none" },
  createOrModify: { pkRequired: false, coexistsWithFunction: false, objectCreationScope: "upsert" },
  deleteObject: { pkRequired: false, coexistsWithFunction: false, objectCreationScope: "none" },
  createLink: { pkRequired: false, coexistsWithFunction: false, objectCreationScope: "none" },
  deleteLink: { pkRequired: false, coexistsWithFunction: false, objectCreationScope: "none" },
  functionRule: { pkRequired: false, coexistsWithFunction: false, objectCreationScope: "arbitrary" },
  interfaceRule: { pkRequired: false, coexistsWithFunction: false, objectCreationScope: "interface" },
};

/** Webhook mode to semantic properties mapping. Source: webhooks.md §2 */
export const WEBHOOK_MODE_TO_SEMANTICS: Readonly<Record<WebhookMode, {
  readonly timing: string;
  readonly failureBehavior: string;
  readonly maxPerAction: number | "unlimited";
  readonly capturesOutput: boolean;
}>> = {
  writeback: { timing: "beforeRules", failureBehavior: "fullRollback", maxPerAction: 1, capturesOutput: true },
  sideEffect: { timing: "afterRules", failureBehavior: "nonBlocking", maxPerAction: "unlimited", capturesOutput: false },
};

/** Automation condition type to trigger model mapping. Source: automation.md §ACTION.AU-02..03 */
export const CONDITION_TYPE_TO_TRIGGER_MODEL: Readonly<Record<AutomationConditionType, {
  readonly eventDriven: boolean;
  readonly requiresFilter: boolean;
  readonly requiresAggregate: boolean;
}>> = {
  timeBased: { eventDriven: false, requiresFilter: false, requiresAggregate: false },
  objectsAddedToSet: { eventDriven: true, requiresFilter: true, requiresAggregate: false },
  objectsRemovedFromSet: { eventDriven: true, requiresFilter: true, requiresAggregate: false },
  objectsModifiedInSet: { eventDriven: true, requiresFilter: true, requiresAggregate: false },
  runOnAllObjects: { eventDriven: false, requiresFilter: false, requiresAggregate: false },
  metricChanged: { eventDriven: true, requiresFilter: true, requiresAggregate: true },
  thresholdCrossed: { eventDriven: true, requiresFilter: true, requiresAggregate: false },
};

/** Automation effect type to requirements mapping. Source: automation.md §4 */
export const EFFECT_TYPE_TO_REQUIREMENTS: Readonly<Record<AutomationEffectType, {
  readonly needsActionType: boolean;
  readonly needsFunction: boolean;
  readonly needsAipConfig: boolean;
}>> = {
  action: { needsActionType: true, needsFunction: false, needsAipConfig: false },
  notification: { needsActionType: false, needsFunction: false, needsAipConfig: false },
  function: { needsActionType: false, needsFunction: true, needsAipConfig: false },
  aipLogic: { needsActionType: false, needsFunction: true, needsAipConfig: true },
};

/** Edit visibility timing by data source. Source: data-flow.md §5 */
export const EDIT_VISIBILITY_BY_SOURCE: Readonly<Record<string, {
  readonly osv2Timing: string;
  readonly osv1Timing: string;
}>> = {
  osv2UserEdits: { osv2Timing: "immediate", osv1Timing: "eventual" },
  osv1UserEdits: { osv2Timing: "notApplicable", osv1Timing: "eventual" },
  datasourceBatch: { osv2Timing: "minutesAfterPipeline", osv1Timing: "minutesAfterPipeline" },
  datasourceStreaming: { osv2Timing: "secondsToMinutes", osv1Timing: "notSupported" },
  writebackDataset: { osv2Timing: "onNextBuild", osv1Timing: "onNextBuild" },
};

/** Side effect type to supported modes mapping. Source: webhooks.md §6 */
export const SIDE_EFFECT_TYPE_TO_MODES: Readonly<Record<SideEffectType, {
  readonly writebackSupported: boolean;
  readonly sideEffectSupported: boolean;
}>> = {
  webhook: { writebackSupported: true, sideEffectSupported: true },
  notification: { writebackSupported: false, sideEffectSupported: true },
  mediaUpload: { writebackSupported: false, sideEffectSupported: true },
};

/**
 * Simple Rule Composition Rules — how declarative rules interact within a single Action.
 * Source: mutations.md §Rule Composition
 *
 * Freudenthal's paradigmatic example:
 *   Action "Create and Link Order" has 3 rules:
 *     Rule 1: createObject(Order, { orderId, customerId, total })
 *     Rule 2: modifyObject(Customer, { lastOrderDate: now() })
 *     Rule 3: createLink(Order, Customer)    // M:N case
 *   Rules compile into single edits per object — Rule 1 produces 1 Order edit,
 *   Rule 2 produces 1 Customer edit, Rule 3 produces 1 link edit. All 3 commit atomically.
 *
 *   Counter-example: Adding Rule 4: modifyObject(Order, { status: 'Confirmed' }) FAILS
 *   because you cannot modify an object created in the same action — the Order from
 *   Rule 1 doesn't exist in the Object Store yet when Rule 4 tries to reference it.
 *   Fix: include status: 'Confirmed' in Rule 1's createObject properties instead.
 */
export const SIMPLE_RULE_COMPOSITION = {
  /** Multiple rules affecting the same object compile into a single edit. */
  RULES_COLLAPSE_PER_OBJECT: true,
  /** Rule execution order determines the final property values when rules conflict. */
  RULE_ORDER_MATTERS: true,
  /** Cannot modify objects created in the same action (createObject then modifyObject on same entity). */
  CANNOT_MODIFY_NEWLY_CREATED: true,
  /** Cannot delete objects before they are added or modified in the same action. */
  CANNOT_DELETE_BEFORE_CREATE: true,
  /** Cannot create the same object twice in one form submission (duplicate PK). */
  CANNOT_DUPLICATE_CREATE: true,
  /** FK links (1:1, M:1, 1:M) use modifyObject to set/clear the FK property — NOT createLink/deleteLink. */
  FK_LINKS_USE_MODIFY_RULE: true,
  /** M:N links use createLink/deleteLink rules — NOT modifyObject (no FK property exists on either side). */
  MN_LINKS_USE_LINK_RULES: true,
  /** Function rule is exclusive — no other rules allowed when function rule is present (HC-ACTION-03). */
  FUNCTION_RULE_EXCLUSIVE: true,
} as const;

/**
 * Writeback webhook output parameter flow — the architectural pattern for capturing
 * external system responses and feeding them into subsequent ontology rules.
 * Source: webhooks.md §Output Parameters
 *
 * Freudenthal's paradigmatic example:
 *   1. User submits "Create Purchase Order" action
 *   2. Writeback webhook POSTs to SAP ERP: { item, quantity, glCode }
 *   3. SAP responds: { orderId: "SAP-PO-78432", status: "Created" }
 *   4. Response fields become "Writeback response" value sources in subsequent rules
 *   5. Ontology rule sets PurchaseOrder.externalOrderId = "SAP-PO-78432"
 *
 *   Without this pattern: Foundry creates PurchaseOrder with no SAP ID.
 *   A separate reconciliation job runs hours later to match Foundry→SAP records.
 *   During the gap, the PurchaseOrder exists in Foundry but is unverifiable in SAP.
 *
 *   Counter-example: Side effect webhooks CANNOT provide output parameters —
 *   they fire AFTER rules execute and commit, so there's no subsequent rule to receive
 *   the response. The response is lost. This is why writeback mode is required for
 *   any integration where the external system's response data must flow back into Foundry.
 */
export const WRITEBACK_OUTPUT_FLOW = {
  /** Only writeback mode supports output parameters (side effect mode cannot). */
  REQUIRES_WRITEBACK_MODE: true,
  /** Output parameters are available as "Writeback response" value sources in subsequent rules. */
  AVAILABLE_AS_VALUE_SOURCE: true,
  /** Maximum 1 writeback webhook per action (platform constraint). */
  MAX_WRITEBACK_PER_ACTION: 1,
  /** If the external system rejects, NO ontology changes occur (full rollback). */
  FAILURE_CAUSES_FULL_ROLLBACK: true,
  /** Output parameters are typed — the webhook configuration defines the response schema. */
  OUTPUT_PARAMETERS_TYPED: true,
} as const;

/**
 * Inline Edit Constraints — the simplified action pattern for quick property modifications.
 * Source: mutations.md §Inline Edits — Constrained Single-Object Pattern
 *
 * Inline edits are the "spreadsheet cell edit" of the Ontology — click a value, change it, save.
 * They are NOT full Action Type submissions. These constraints prevent misuse.
 */
export const INLINE_EDIT_CONSTRAINTS = {
  /** Only single object, single object type per inline edit session. */
  SINGLE_OBJECT_ONLY: true,
  /** All parameters default to existing values — user changes only what they touch. */
  ALL_PARAMS_OPTIONAL_WITH_DEFAULTS: true,
  /** Cannot manage join table links (M:N) — only FK property modifications. */
  NO_JOIN_TABLE_LINKS: true,
  /** No webhook side effects — inline edits are local-only. */
  NO_WEBHOOKS: true,
  /** No notification side effects. */
  NO_NOTIFICATIONS: true,
  /** Submission criteria can only reference the edited object — not shared/linked objects. */
  SUBMISSION_CRITERIA_SELF_ONLY: true,
  /** Edits are batch-validated and submitted together. */
  BATCH_VALIDATED: true,
} as const;

// =========================================================================
// Section 6: Structural Rules
// =========================================================================

/** Naming and structural rules for ACTION domain artifacts. */
export const STRUCTURAL_RULES: readonly StructuralRule[] = [
  {
    target: "Action Type API name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/action/mutations.md §API Naming",
  },
  {
    target: "Parameter name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/action/mutations.md §Parameters",
  },
  {
    target: "Webhook API name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/action/webhooks.md §Naming",
  },
  {
    target: "Automation name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/action/automation.md §Naming",
  },
  {
    target: "Submission criterion description",
    casing: "imperative",
    pattern: "^[A-Z].*$",
    minLength: 1,
    source: ".claude/research/palantir/action/mutations.md §Submission Criteria",
  },
] as const;

/** Output file for ACTION domain generation. Source: SKILL.md pattern */
export const OUTPUT_FILE = "ontology/action.ts" as const;

// =========================================================================
// Section 7: Validation Thresholds
// =========================================================================

/** Numeric thresholds for ACTION domain validation. */
export const VALIDATION_THRESHOLDS = {
  /** Maximum objects editable per single Action (OSv2). Source: mutations.md Canonical Constraints */
  MAX_OBJECTS_PER_ACTION: 10_000,
  /** Maximum writeback webhooks per action. Source: webhooks.md Canonical Constraints */
  MAX_WRITEBACK_WEBHOOKS_PER_ACTION: 1,
  /** AIP proposal visibility window in hours. Source: automation.md §5 */
  AIP_PROPOSAL_VISIBILITY_HOURS: 24,
  /** Live pipeline user edit cycle in hours. Source: data-flow.md §5 */
  LIVE_PIPELINE_EDIT_CYCLE_HOURS: 6,
  /** Full reindex threshold percentage. Source: data-flow.md §4 */
  FULL_REINDEX_THRESHOLD_PERCENT: 80,
  /** Changelog max rows per PK per transaction. Source: data-flow.md §2 */
  CHANGELOG_MAX_ROWS_PER_PK: 1,
  /** Change detection latency in minutes. Source: automation.md Canonical Constraints */
  CHANGE_DETECTION_LATENCY_MINUTES: 5,
  /** Streaming indexing latency in seconds. Source: data-flow.md §3 */
  STREAMING_INDEXING_LATENCY_SECONDS: 60,
  /** OSv2 maximum objects per type. Source: data-flow.md Canonical Constraints */
  OSV2_MAX_OBJECTS_PER_TYPE: 10_000_000_000,
  /** Maximum API name length. Source: mutations.md */
  API_NAME_MAX_LENGTH: 100,
} as const;

// =========================================================================
// Section 8: Hard Constraints
// =========================================================================

/**
 * HC-ACTION-01..05 are defined in ACTION_SEMANTICS.hardConstraints (semantics.ts).
 * HC-ACTION-06..37 extend with domain-specific constraints from research files.
 * All are severity="error" and domain="action".
 */
export const ACTION_HARD_CONSTRAINTS: readonly HardConstraint[] = [
  // --- Inherited from semantics.ts (re-exported for single-file access) ---
  ...ACTION_SEMANTICS.hardConstraints,

  // --- Mutation rule ordering constraints ---
  {
    id: "HC-ACTION-06",
    domain: "action",
    rule: "Cannot modify objects created in the same action — Create Object and Modify Object rules on the same entity within one action are incompatible",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Rule Composition",
    rationale: "Rules compile into single edits per object. A Create and subsequent Modify on the same entity would require two separate edit instructions for the same PK, which the atomic transaction model does not support. Use Create or Modify (upsert) rule instead.",
  },
  {
    id: "HC-ACTION-07",
    domain: "action",
    rule: "Cannot delete objects before they are added or modified in the same action — Delete Object must not precede Create/Modify for the same entity",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Rule Composition",
    rationale: "Rule ordering determines final edit state. Deleting an entity before creating it is logically impossible (the entity doesn't exist yet). The platform rejects this rule ordering at configuration time.",
  },
  {
    id: "HC-ACTION-08",
    domain: "action",
    rule: "Cannot create the same object type twice per form submission — max 1 Create Object rule per object type per action",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Rule Composition",
    rationale: "Each Create Object rule targets exactly one object type. Creating two objects of the same type would require two PKs and two parameter sets in a single form submission, which the action form UI does not support.",
  },

  // --- Link rule type constraints ---
  {
    id: "HC-ACTION-09",
    domain: "action",
    rule: "FK links (1:1, M:1, 1:M) use Modify Object rule to set/clear the FK property — Create/Delete Link rules are invalid for FK-backed relationships",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Link Management via Rules",
    rationale: "FK-based relationships are stored as properties on the 'many' side entity. There is no join table to insert/delete from. The platform validates that Link rules target only M:N link types.",
  },
  {
    id: "HC-ACTION-10",
    domain: "action",
    rule: "M:N links use Create Link / Delete Link rules — Modify Object cannot manage M:N relationships because no FK property exists on either side",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Link Management via Rules",
    rationale: "M:N relationships are stored in a separate join table datasource. Neither endpoint entity has a FK column for the relationship. The only way to manage M:N associations is through the dedicated Link rules.",
  },

  // --- Inline edit constraints ---
  {
    id: "HC-ACTION-11",
    domain: "action",
    rule: "Inline edits are constrained to single object, single object type only — no multi-object or cross-type operations",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Inline Edits",
    rationale: "Inline edits are optimized for quick property modifications in Object Explorer/Workshop. Multi-object or cross-type operations require full action submission for parameter handling, validation, and atomicity guarantees.",
  },
  {
    id: "HC-ACTION-12",
    domain: "action",
    rule: "Inline edits cannot add or delete join table links — no M:N link management in inline mode",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Inline Edits",
    rationale: "Join table link operations require separate Link rules with source and target parameters. Inline edit's simplified parameter model (all optional, defaulting to existing values) cannot express the two-entity reference needed for link operations.",
  },
  {
    id: "HC-ACTION-13",
    domain: "action",
    rule: "Inline edits cannot trigger webhook or notification side effects — side effects are disabled in inline mode",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Inline Edits",
    rationale: "Inline edits are high-frequency, low-overhead operations (50+ per shift). Triggering webhooks/notifications on each would cause external system overload and notification fatigue. Full action submission is required for side effect workflows.",
  },
  {
    id: "HC-ACTION-14",
    domain: "action",
    rule: "Inline edit submission criteria cannot reference shared or linked objects — validation scope is limited to the edited object itself",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Inline Edits",
    rationale: "Cross-object validation requires loading linked entities, which adds latency incompatible with inline edit's sub-second response expectation. The simplified validation scope ensures inline edits remain performant.",
  },

  // --- Webhook constraints ---
  {
    id: "HC-ACTION-15",
    domain: "action",
    rule: "Maximum 1 writeback webhook per action type — only one external system can gate local changes",
    severity: "error",
    source: ".claude/research/palantir/action/webhooks.md — Writeback Webhook",
    rationale: "Writeback provides two-phase commit semantics. Multiple writeback webhooks would require multi-party consensus (what if system A succeeds but system B fails?) — an unsupported distributed transaction pattern.",
  },
  {
    id: "HC-ACTION-16",
    domain: "action",
    rule: "Writeback webhook fires BEFORE all other ontology rules — external system call is the first execution step",
    severity: "error",
    source: ".claude/research/palantir/action/webhooks.md — Writeback Webhook Execution Flow",
    rationale: "The writeback must complete before any local changes are attempted. This ensures that if the external system rejects, no ontology state is modified. The ordering is enforced by the platform, not configurable.",
  },
  {
    id: "HC-ACTION-17",
    domain: "action",
    rule: "Side effect webhook fires AFTER all rules execute and changes are committed — post-commit only",
    severity: "error",
    source: ".claude/research/palantir/action/webhooks.md — Side Effect Webhook Execution Flow",
    rationale: "Side effects are notifications about completed state changes. Firing before commit would mean notifying about changes that might still fail. The platform enforces post-commit ordering.",
  },
  {
    id: "HC-ACTION-18",
    domain: "action",
    rule: "Side effect webhook failure is non-blocking — ontology changes persist regardless of webhook outcome",
    severity: "error",
    source: ".claude/research/palantir/action/webhooks.md — Side Effect Webhook",
    rationale: "Side effects are best-effort. Rolling back committed ontology changes because a Slack notification failed would violate the atomicity guarantee of the action itself. The platform decouples side effect success from transaction success.",
  },
  {
    id: "HC-ACTION-19",
    domain: "action",
    rule: "Notification recipients must be Foundry user IDs — string email addresses will NOT trigger notifications",
    severity: "error",
    source: ".claude/research/palantir/action/webhooks.md — Notification Rules",
    rationale: "The notification system resolves recipients via Foundry's identity service, which uses user IDs (not email). Passing email strings silently fails — no error, no notification. This is a common misconfiguration.",
  },
  {
    id: "HC-ACTION-20",
    domain: "action",
    rule: "Notification side effects are side-effect mode only — no writeback equivalent exists for notifications",
    severity: "error",
    source: ".claude/research/palantir/action/webhooks.md — Notification Rules Key Properties",
    rationale: "Notifications are informational — they do not produce output parameters or gate local changes. A 'writeback notification' (blocking changes on notification delivery failure) would prevent operations when email is slow, which is unacceptable for operational workflows.",
  },

  // --- Automation constraints ---
  {
    id: "HC-ACTION-21",
    domain: "action",
    rule: "No direct 'linked object changed' trigger in automations — link awareness is achieved indirectly through set membership changes",
    severity: "error",
    source: ".claude/research/palantir/action/automation.md — Link-Aware Behavior",
    rationale: "Direct link-change triggers would require evaluating all link edges on every change, causing exponential condition evaluations for densely connected graphs. Indirect set membership monitoring is O(n) where n is set size, not O(edges).",
  },
  {
    id: "HC-ACTION-22",
    domain: "action",
    rule: "Run-on-all-objects automation condition is periodic, not event-driven — it runs on a schedule across all current set members",
    severity: "error",
    source: ".claude/research/palantir/action/automation.md — 6 Object Set Condition Types",
    rationale: "runOnAllObjects processes every member regardless of changes. Making it event-driven would be equivalent to objectsModifiedInSet (which already exists). The periodic nature enables batch operations like nightly reconciliation.",
  },
  {
    id: "HC-ACTION-23",
    domain: "action",
    rule: "AIP Logic output must return an Ontology edit — the automation effect requires a concrete edit proposal",
    severity: "error",
    source: ".claude/research/palantir/action/automation.md — AIP Logic Integration",
    rationale: "AIP Automate's staged review system displays proposed edits for human approval. Without an Ontology edit return, there is nothing to review. The Proposals tab shows the diff of proposed changes.",
  },
  {
    id: "HC-ACTION-24",
    domain: "action",
    rule: "AIP Logic input must receive an object — the automation summary page requires object context",
    severity: "error",
    source: ".claude/research/palantir/action/automation.md — AIP Logic Integration",
    rationale: "The automation condition triggers on specific objects (added/removed/modified). The AIP Logic function must receive the triggered object as input to generate context-aware edit proposals. Without object input, the summary page shows no condition block.",
  },

  // --- OSv2 and data flow constraints ---
  {
    id: "HC-ACTION-25",
    domain: "action",
    rule: "OSv2 version checks apply only to objects directly generating edits — not all loaded objects during function execution",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Version Checks and StaleObject",
    rationale: "OSv2 narrows version check scope to edited objects only, reducing StaleObject conflicts vs OSv1 (which checks ALL loaded objects). This makes OSv2 significantly more permissive for concurrent editing scenarios.",
  },
  {
    id: "HC-ACTION-26",
    domain: "action",
    rule: "Changelog max 1 row per primary key per transaction for incremental datasets",
    severity: "error",
    source: ".claude/research/palantir/action/data-flow.md — Stage 1: Changelog",
    rationale: "Incremental datasets use APPEND transactions. Multiple rows per PK in a single transaction creates ambiguous merge ordering — which row is authoritative? The platform enforces 1 row per PK per transaction for deterministic merge results.",
  },
  {
    id: "HC-ACTION-27",
    domain: "action",
    rule: "All-or-nothing atomicity — if any rule within an action fails, ALL edits across all rules are reverted, no partial state",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — Atomicity",
    rationale: "Actions are atomic transactions. An action that creates an Order and 5 LineItems must succeed or fail as a unit. Partial state (Order exists with 3 of 5 LineItems) violates referential integrity and business invariants.",
  },
  {
    id: "HC-ACTION-28",
    domain: "action",
    rule: "Apply endpoint does NOT support parameter default values — all required parameters must be explicitly provided in every API call",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md — OSDK 2.0 Action APIs",
    rationale: "The Apply Action API does not read default values configured in the Ontology Manager. Callers must provide all required parameters explicitly. Omitting a required parameter causes a validation error, even if a default is configured in the UI.",
  },

  // --- Action Reverts (OSv2, May 2024+) ---
  {
    id: "HC-ACTION-29",
    domain: "action",
    rule: "Action reverts (undo) are only available for Object Storage V2 — OSv1 actions cannot be reverted",
    severity: "error",
    source: "Palantir docs — action-reverts (2024+)",
    rationale: "The revert mechanism relies on OSv2's edit tracking infrastructure. OSv1 (Phonograph) does not support the version comparison needed for safe revert. Organizations on OSv1 must migrate before using action reverts.",
  },
  {
    id: "HC-ACTION-30",
    domain: "action",
    rule: "An action can only be reverted if it is the most recent edit to every affected object — any subsequent edit to any object blocks the revert",
    severity: "error",
    source: "Palantir docs — action-reverts (2024+) — Caveats",
    rationale: "Revert requires the object's current state to match the post-action state exactly. If another edit has occurred since, reverting would create inconsistent state by rolling back to a version that is no longer the previous version.",
  },
  {
    id: "HC-ACTION-31",
    domain: "action",
    rule: "Action reverts do NOT revert side effects (notifications, webhooks) — only Ontology edits are undone",
    severity: "error",
    source: "Palantir docs — action-reverts (2024+) — Caveats",
    rationale: "Notifications and webhook calls are fire-and-forget side effects. Once dispatched, they cannot be recalled. Reverting an action only rolls back the Ontology edit state, not external system integrations or user notifications.",
  },

  // --- Batched execution constraints ---
  {
    id: "HC-ACTION-32",
    domain: "action",
    rule: "Batched execution requires the function to accept a single list-of-structs parameter — no other parameter shape is supported for batching",
    severity: "error",
    source: "Palantir docs — function-actions-batched-execution (2026)",
    rationale: "The platform batches multiple action calls into a single function invocation by concatenating entries in the list parameter. Non-list function signatures cannot be batched — they fall back to sequential execution (max 20 calls per batch).",
  },

  // --- Notification limit ---
  {
    id: "HC-ACTION-33",
    domain: "action",
    rule: "Maximum 500 notification recipients per action (50 when notification content is rendered from a function)",
    severity: "error",
    source: "Palantir docs — scale-property-limits (2026) — Notification recipients",
    rationale: "Platform limit on notification dispatch volume. Function-rendered notifications have higher per-recipient compute cost, reducing the limit to 50. Exceeding the limit causes partial delivery or rejection.",
  },
  // --- v1.3.0 additions (research deep dive 2026-03-15) ---
  {
    id: "HC-ACTION-34",
    domain: "action",
    rule: "Struct action parameters replace the entire struct value — no partial field-level updates via action rules",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md §Actions on Structs + data/structs.md §Struct Action Parameters",
    rationale: "Action rules that modify struct properties always replace the entire struct. The caller must provide the complete struct value including unchanged fields. Client-side merge logic is needed for single-field changes.",
  },
  {
    id: "HC-ACTION-35",
    domain: "action",
    rule: "Action metrics (execution frequency, success/failure rates, latency, parameter distributions) are built-in and cannot be disabled",
    severity: "error",
    source: ".claude/research/palantir/action/mutations.md §Action Metrics",
    rationale: "Action metrics provide visibility into how actions are used: frequency, success/failure, latency, and parameter distributions. This feeds LEARN-03 (decision outcome tracking) and enables LGC-01 (accuracy rate measurement for graduation).",
  },
  // --- v1.3.0 addition (DevCon5/AIPCon9 gap closure — Scenarios atomicity) ---
  {
    id: "HC-ACTION-36",
    domain: "action",
    rule: "Scenario edit sets must be committed atomically — partial scenario application (some edits from COA-1 + some from COA-2) is not supported",
    severity: "error",
    source: "research/palantir/philosophy/ontology-ultimate-vision.md §4.5 — Scenarios Framework + action/mutations.md §Atomicity",
    rationale: "Each scenario/COA is a complete, internally-consistent edit set. Mixing edits from multiple scenarios violates the trade-off quantification (the cost/time/risk numbers only hold for the complete set). HC-ACTION-27 (all-or-nothing atomicity) applies per-scenario.",
  },
  {
    id: "HC-ACTION-37",
    domain: "action",
    rule: "Listeners ingest events independently of the Action layer — they produce data streams, not execute mutations directly",
    severity: "error",
    source: ".claude/research/palantir/action/listeners.md §Domain Classification",
    rationale: "Listeners are event INGESTION endpoints that write incoming external events to Foundry streams. They do not execute ontology mutations directly. Downstream consumers (streaming pipelines, Automate, batch jobs) process the stream and may THEN trigger Actions. Treating Listeners as mutation executors violates the ingestion→processing→action pipeline and bypasses validation, atomicity, and governance checks that Actions provide.",
  },
] as const;

/** Total hard constraint count (semantics + domain-specific). */
export const HARD_CONSTRAINT_COUNT = ACTION_HARD_CONSTRAINTS.length;

// =========================================================================
// Section 9: Scenarios / COA Framework (v1.3.0)
// =========================================================================
//
// Concrete ACTION-domain implementation of SCENARIOS_FRAMEWORK (semantics.ts §21).
// Defines the typed properties of a scenario edit set and the approval state machine.
//
// Source: philosophy/ontology-ultimate-vision.md §4.5 — Scenarios
//         platform/aipcon.md §APC9-03 — ShipOS, CDAO demos
//         action/automation.md §5 — AIP Automate staged review

/**
 * Properties carried by each scenario/COA edit set.
 * When AI generates N alternatives, each carries these typed attributes.
 */
export interface ScenarioEditSetProperty {
  readonly id: string;
  readonly property: string;
  readonly type: string;
  readonly description: string;
}

export const SCENARIO_EDIT_SET_PROPERTIES: readonly ScenarioEditSetProperty[] = [
  {
    id: "SEP-01",
    property: "editSet",
    type: "OntologyEdit[]",
    description: "The complete list of hypothetical edits this scenario would apply if selected — typed mutations on specific objects/properties/links",
  },
  {
    id: "SEP-02",
    property: "tradeOffDimensions",
    type: "Record<string, { value: number; unit: string; direction: 'minimize' | 'maximize' }>",
    description: "Quantified impact dimensions — ShipOS uses days (schedule), dollars (cost), risk score. Each dimension has a value, unit, and optimization direction.",
  },
  {
    id: "SEP-03",
    property: "reasoningChain",
    type: "string",
    description: "The agent's decision log explaining why this scenario was generated — which data informed it, which logic was applied, what assumptions were made",
  },
  {
    id: "SEP-04",
    property: "affectedEntities",
    type: "{ objectType: string; count: number }[]",
    description: "Summary of entities affected by this scenario — enables reviewers to assess blast radius without inspecting individual edits",
  },
  {
    id: "SEP-05",
    property: "decisionLineageContext",
    type: "{ dataVersion: string; logicFunctions: string[]; agentId: string }",
    description: "DECISION_LINEAGE dimensions captured at scenario generation time — ATOP_WHICH_DATA, WITH_WHAT_REASONING, BY_WHOM",
  },
] as const;

// =========================================================================
// Section 10: Approval Workflow State Machine (v1.3.0)
// =========================================================================
//
// Formalizes the PA-03 (Approve-then-act) lifecycle from proposal creation
// through review to final disposition. This is the concrete state machine
// that AIP Automate's staged review implements.
//
// Source: action/automation.md §5 — Staged Review Mechanics
//         architecture/adapter-gap-analysis.md — pendingDecisions table pattern

/** State in the approval workflow lifecycle. */
export interface ApprovalWorkflowState {
  readonly id: string;
  readonly state: string;
  readonly description: string;
  readonly transitions: readonly string[];
  readonly timeout?: string;
}

export const APPROVAL_WORKFLOW_STATES: readonly ApprovalWorkflowState[] = [
  {
    id: "AWS-01",
    state: "pending",
    description: "Scenario/proposal generated by AI agent, awaiting human review assignment",
    transitions: ["reviewing", "expired"],
    timeout: "Auto-expires if not picked up within AIP_PROPOSAL_VISIBILITY_HOURS (24h)",
  },
  {
    id: "AWS-02",
    state: "reviewing",
    description: "Human reviewer has opened the proposal, inspecting edit set and reasoning chain",
    transitions: ["approved", "rejected", "modified", "expired"],
  },
  {
    id: "AWS-03",
    state: "approved",
    description: "Reviewer accepted the scenario — edit set commits atomically (HC-ACTION-36)",
    transitions: [],
  },
  {
    id: "AWS-04",
    state: "rejected",
    description: "Reviewer rejected the scenario — no edits applied, rejection reason captured for LEARN-02",
    transitions: [],
  },
  {
    id: "AWS-05",
    state: "modified",
    description: "Reviewer modified the edit set before approving — modified version commits, delta captured for LEARN-02",
    transitions: ["approved"],
  },
  {
    id: "AWS-06",
    state: "expired",
    description: "Proposal exceeded the 24-hour visibility window without action — captured as implicit rejection for LEARN-02",
    transitions: [],
  },
] as const;

// =========================================================================
// Section 11: LEARN Refinement Linkage (v1.3.0)
// =========================================================================
//
// Explicit mapping from ACTION-domain observables to the DH_REFINEMENT_PROTOCOL
// steps (REF-01..05) in semantics.ts. This closes the backpropagation chain
// from "action metrics recorded" to "heuristics refined."
//
// Source: semantics.ts §22 — DH_REFINEMENT_PROTOCOL
//         HC-ACTION-35 — action metrics feed LEARN-03

export interface LearnRefinementLink {
  readonly id: string;
  readonly actionObservable: string;
  readonly refinementStep: string;
  readonly feedbackSignal: string;
}

export const LEARN_REFINEMENT_LINKAGE: readonly LearnRefinementLink[] = [
  {
    id: "LRL-01",
    actionObservable: "ACTION_LOG_FIELDS (7 captured fields per execution)",
    refinementStep: "REF-01 (Outcome Collection)",
    feedbackSignal: "Action execution results + decision lineage context → predicted vs actual outcome delta",
  },
  {
    id: "LRL-02",
    actionObservable: "HC-ACTION-35 (built-in action metrics: frequency, success/failure, latency)",
    refinementStep: "REF-02 (Accuracy Measurement)",
    feedbackSignal: "Success/failure rate per action type → per-DH accuracy score (grouped by DH that informed the decision)",
  },
  {
    id: "LRL-03",
    actionObservable: "APPROVAL_WORKFLOW_STATES (approved/rejected/modified/expired disposition)",
    refinementStep: "REF-02 + REF-03 (Accuracy Measurement + Drift Detection)",
    feedbackSignal: "Approval rate per automation pattern → LGC-01 accuracy metric. Rejection spike → REF-03 drift signal.",
  },
  {
    id: "LRL-04",
    actionObservable: "SCENARIO_EDIT_SET_PROPERTIES.reasoningChain (agent decision log)",
    refinementStep: "REF-04 (Heuristic Update)",
    feedbackSignal: "When a scenario is rejected, the reasoning chain reveals which DH produced the incorrect recommendation → targeted refinement input",
  },
  {
    id: "LRL-05",
    actionObservable: "AUTONOMY_LEVELS (current PA level per action/automation)",
    refinementStep: "REF-05 (Autonomy Graduation)",
    feedbackSignal: "LGC-01..04 criteria satisfied → PA level promoted. Accuracy degraded → PA level demoted. Bidirectional.",
  },
] as const;
