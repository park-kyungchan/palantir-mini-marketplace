/**
 * palantir-mini SELF-ONTOLOGY — self verb layer ActionTypes (M-SELF verb/logic layer).
 *
 * The 21-verb ActionType catalog (catalog §4) registered into ACTION_TYPE_REGISTRY,
 * mirroring `executor.actiontype.ts` (the FIRST self ActionType; not one of the 21 — it
 * models the Hands-layer Executor). Each verb is a typed Palantir ActionType:
 *
 *   Tier-2 (19): function-backed. Wraps a registered EditFunction by NAME through
 *     `editFunctionName` (a STRING contract — NO lib import uphill; the snapshot stays the
 *     authority, the runtime registers the matching EditFunction via `registerEditFunction`).
 *     The action computes an OntologyEdit[] then commits it atomically through commitEdits
 *     with submission-criteria pre-flight; a failed criterion ⇒ REJECTED ⇒ worktree diff
 *     DISCARDED (cattle, not pets).
 *
 *   Tier-1 (2): pure-CRUD declarative (objectType + field + operation; NO editFunctionName).
 *     `registerTier1DeclarativeAction` (the one genuine CRUD-rule verb) and
 *     `promoteValueGrade` (the append-only T1→T4 grade ratchet, rule 26).
 *
 * Every verb REFERENCES the ObjectTypes it edits — never LinkTypes (catalog §4 invariant:
 * endpoints/refs are ObjectTypes + Functions, NEVER LinkTypes). Each referenced ObjectType
 * surfaces as a typed `parameters` entry whose `type` is that ObjectType's apiName (the
 * Executor precedent: `"OntologyEdit[]"`, `'"codex" | "claude"'`). Tier-2 verbs that wrap
 * a Function additionally name that Function via `editFunctionName`.
 *
 * Authority chain (rule 01): research/palantir → primitives/action-type.ts (the type) →
 *   THIS file (the 21 registered instances) → dogfood (propagation_audit_forward over the
 *   self-model with pm AS subject).
 *
 * @owner palantirkc-ontology
 * @purpose Self-Ontology verb layer ActionTypes (M-SELF), the 21-verb catalog
 */

import {
  type Tier1DeclarativeAction,
  type Tier2FunctionBackedAction,
  ACTION_TYPE_REGISTRY,
  actionTypeRid,
} from "../primitives/action-type";

/** RID slug helper — keeps every self ActionType RID under one stable namespace. */
const rid = (slug: string) => actionTypeRid(`pm.self.ontology/action-type/${slug}`);

// ───────────────────────────────────────────────────────────────────────────────
// 1. registerObjectType (Tier-2) — POC verb; edits the ProjectOntologyIndex.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology registerObjectType ActionType. */
export const REGISTER_OBJECT_TYPE_ACTION_TYPE_RID = rid("register-object-type");

/**
 * registerObjectType modeled as a Tier-2 Function-Backed ActionType.
 *
 * `editFunctionName` names the registered EditFunction this action wraps — the
 * deterministic commit path. The action computes an OntologyEdit[] that upserts a
 * ProjectOntologyIndex entry and commits it atomically with submission-criteria pre-flight.
 * The `objectType` parameter names the ObjectType this action edits (ProjectOntologyIndex) —
 * the apiName of the registered self ObjectType.
 */
export const REGISTER_OBJECT_TYPE_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: REGISTER_OBJECT_TYPE_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "RegisterObjectType",
  name: "RegisterObjectType",
  description:
    "palantir-mini self verb: registers (upserts) an ObjectType entry into the " +
    "ProjectOntologyIndex. Tier-2 (function-backed): wraps the applyRegisterObjectType " +
    "EditFunction; the OntologyEdit[] is persisted ONLY via commitEdits with " +
    "submission-criteria pre-flight; failed criteria ⇒ REJECTED ⇒ worktree discarded.",
  editFunctionName: "pm.actions.ontology.applyRegisterObjectType",
  parameters: [
    {
      name: "objectType",
      type: "ProjectOntologyIndex",
      required: true,
      description:
        "The ObjectType this action edits (the ProjectOntologyIndex entry being upserted).",
    },
    {
      name: "mcpTool",
      type: "McpTool",
      required: false,
      description: "The McpTool surface, if any, this ObjectType registration is bound to.",
    },
    {
      name: "semanticIntentContract",
      type: "SemanticIntentContract",
      required: false,
      description: "The approved SIC whose boundary authorizes this registration.",
    },
    {
      name: "proposedEdits",
      type: "OntologyEdit[]",
      required: false,
      description: "OntologyEdit[] the action proposes; persisted ONLY via commitEdits.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 2. registerLinkType (Tier-2) — populates the link graph; edits LinkType + ObjectType.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology registerLinkType ActionType. */
export const REGISTER_LINK_TYPE_ACTION_TYPE_RID = rid("register-link-type");

/** registerLinkType — the verb that populates the 0-instance link graph (Tier-2). */
export const REGISTER_LINK_TYPE_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: REGISTER_LINK_TYPE_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "RegisterLinkType",
  name: "RegisterLinkType",
  description:
    "palantir-mini self verb: registers a LinkType edge (the verb that populates the " +
    "link graph). Tier-2: wraps applyRegisterLinkType; OntologyEdit[] persisted via " +
    "commitEdits with submission-criteria pre-flight.",
  editFunctionName: "pm.actions.ontology.applyRegisterLinkType",
  parameters: [
    {
      name: "linkType",
      type: "LinkType",
      required: true,
      description: "The LinkType edge this action edits (registers into the link registry).",
    },
    {
      name: "objectType",
      type: "ObjectType",
      required: true,
      description: "The endpoint ObjectType(s) the LinkType connects (both endpoints).",
    },
    {
      name: "proposedEdits",
      type: "OntologyEdit[]",
      required: false,
      description: "OntologyEdit[] the action proposes; persisted ONLY via commitEdits.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 3. registerActionType (Tier-2) — edits ActionType + Function (executor IS its effect).
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology registerActionType ActionType. */
export const REGISTER_ACTION_TYPE_ACTION_TYPE_RID = rid("register-action-type");

/** registerActionType — registers an ActionType verb; executor.actiontype.ts IS its effect. */
export const REGISTER_ACTION_TYPE_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: REGISTER_ACTION_TYPE_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "RegisterActionType",
  name: "RegisterActionType",
  description:
    "palantir-mini self verb: registers an ActionType verb into the action registry " +
    "(executor.actiontype.ts is its canonical effect). Tier-2: wraps " +
    "applyRegisterActionType; OntologyEdit[] persisted via commitEdits.",
  editFunctionName: "pm.actions.ontology.applyRegisterActionType",
  parameters: [
    {
      name: "actionType",
      type: "ActionType",
      required: true,
      description: "The ActionType verb this action edits (registers into the registry).",
    },
    {
      name: "function",
      type: "Function",
      required: false,
      description: "The Function the registered ActionType wraps (Tier-2 editFunction).",
    },
    {
      name: "proposedEdits",
      type: "OntologyEdit[]",
      required: false,
      description: "OntologyEdit[] the action proposes; persisted ONLY via commitEdits.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 4. registerFunction (Tier-2) — registers a Function/EditFunction; edits Function + ActionType.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology registerFunction ActionType. */
export const REGISTER_FUNCTION_ACTION_TYPE_RID = rid("register-function");

/** registerFunction — registers a Function/EditFunction into the Tier-2 registry (Tier-2). */
export const REGISTER_FUNCTION_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: REGISTER_FUNCTION_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "RegisterFunction",
  name: "RegisterFunction",
  description:
    "palantir-mini self verb: registers a Function/EditFunction into the Tier-2 registry. " +
    "Tier-2: wraps applyRegisterFunction; OntologyEdit[] persisted via commitEdits with " +
    "submission-criteria pre-flight.",
  editFunctionName: "pm.actions.ontology.applyRegisterFunction",
  parameters: [
    {
      name: "function",
      type: "Function",
      required: true,
      description: "The Function/EditFunction this action edits (registers into the registry).",
    },
    {
      name: "actionType",
      type: "ActionType",
      required: false,
      description: "The ActionType that will wrap the registered Function, if any.",
    },
    {
      name: "proposedEdits",
      type: "OntologyEdit[]",
      required: false,
      description: "OntologyEdit[] the action proposes; persisted ONLY via commitEdits.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 5. registerTier1DeclarativeAction (TIER-1) — the ONE genuine Tier-1 CRUD-rule verb.
//    Tier-1 shape: objectType + field + operation; NO editFunctionName.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology registerTier1DeclarativeAction ActionType. */
export const REGISTER_TIER1_DECLARATIVE_ACTION_ACTION_TYPE_RID = rid(
  "register-tier1-declarative-action",
);

/**
 * registerTier1DeclarativeAction — the ONE genuine Tier-1 CRUD-rule verb. Pure declarative
 * (objectType + field + operation), compiled into the commit_edits fast path; NO
 * editFunctionName. It edits the ActionType registry by upserting a Tier-1 declarative rule.
 */
export const REGISTER_TIER1_DECLARATIVE_ACTION_ACTION_TYPE: Tier1DeclarativeAction = {
  rid: REGISTER_TIER1_DECLARATIVE_ACTION_ACTION_TYPE_RID,
  tier: "tier-1",
  apiName: "RegisterTier1DeclarativeAction",
  name: "RegisterTier1DeclarativeAction",
  description:
    "palantir-mini self verb: registers a Tier-1 declarative (pure-CRUD) action rule. The " +
    "ONE genuine Tier-1 verb — no editFunctionName; compiled into the commit_edits fast " +
    "path. Edits the ActionType registry (upserts a declarative rule over an ObjectType).",
  objectType: "ActionType",
  field: "tier1Rules",
  operation: "create",
  parameters: [
    {
      name: "actionType",
      type: "ActionType",
      required: true,
      description: "The ActionType registry entry this declarative rule edits.",
    },
    {
      name: "objectType",
      type: "ObjectType",
      required: true,
      description: "The ObjectType the declarative CRUD rule applies to.",
    },
  ],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
};

// ───────────────────────────────────────────────────────────────────────────────
// 6. commitEdits (Tier-2) — atomic 9-class-gated commit; every verb routes through it.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology commitEdits ActionType. */
export const COMMIT_EDITS_ACTION_TYPE_RID = rid("commit-edits");

/** commitEdits — atomic 9-class-gated commit; the ONE place OntologyEdit[] is persisted. */
export const COMMIT_EDITS_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: COMMIT_EDITS_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "CommitEdits",
  name: "CommitEdits",
  description:
    "palantir-mini self verb: atomically commits an OntologyEdit[] through the 9-class " +
    "submission gate (the ONE place edits persist; every other verb routes through it). " +
    "Tier-2: wraps the commitEdits EditFunction.",
  editFunctionName: "pm.actions.commitEdits",
  parameters: [
    {
      name: "objectType",
      type: "ObjectType",
      required: false,
      description: "An ObjectType the commit edits.",
    },
    {
      name: "linkType",
      type: "LinkType",
      required: false,
      description: "A LinkType the commit edits.",
    },
    {
      name: "actionType",
      type: "ActionType",
      required: false,
      description: "An ActionType the commit edits.",
    },
    {
      name: "function",
      type: "Function",
      required: false,
      description: "A Function the commit edits.",
    },
    {
      name: "proposedEdits",
      type: "OntologyEdit[]",
      required: true,
      description: "The OntologyEdit[] to commit atomically with submission-criteria pre-flight.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 7. applyEditFunction (Tier-2) — compute edits, emit edit_proposed, NO commit.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology applyEditFunction ActionType. */
export const APPLY_EDIT_FUNCTION_ACTION_TYPE_RID = rid("apply-edit-function");

/** applyEditFunction — computes OntologyEdit[] and emits edit_proposed, but does NOT commit. */
export const APPLY_EDIT_FUNCTION_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: APPLY_EDIT_FUNCTION_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "ApplyEditFunction",
  name: "ApplyEditFunction",
  description:
    "palantir-mini self verb: runs a registered EditFunction to compute an OntologyEdit[] " +
    "and emits edit_proposed — but does NOT commit (commit happens only via commitEdits). " +
    "Tier-2: wraps the sandbox applyEditSteps EditFunction.",
  editFunctionName: "pm.sandbox.executor.applyEditSteps",
  parameters: [
    {
      name: "function",
      type: "Function",
      required: true,
      description: "The EditFunction (Function noun) this action runs to compute edits.",
    },
    {
      name: "objectType",
      type: "ObjectType",
      required: false,
      description: "The ObjectType the computed edits target.",
    },
    {
      name: "proposedEdits",
      type: "OntologyEdit[]",
      required: false,
      description: "The computed OntologyEdit[] surfaced as edit_proposed (NOT committed here).",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 8. emitEvent (Tier-2) — atomic 5-dim append under mkdir-mutex (rule 10/27).
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology emitEvent ActionType. */
export const EMIT_EVENT_ACTION_TYPE_RID = rid("emit-event");

/** emitEvent — atomic 5-dim EventEnvelope append under mkdir-mutex (rule 10/27). */
export const EMIT_EVENT_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: EMIT_EVENT_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "EmitEvent",
  name: "EmitEvent",
  description:
    "palantir-mini self verb: atomically appends a 5-dim EventEnvelope to events.jsonl " +
    "under the mkdir-mutex lock (rule 10/27). Tier-2: wraps the eventLog appendEnvelope " +
    "EditFunction; the value-grade gate (rule 26) runs pre-append.",
  editFunctionName: "pm.eventLog.appendEnvelope",
  parameters: [
    {
      name: "eventEnvelope",
      type: "EventEnvelope",
      required: true,
      description: "The 5-dim EventEnvelope this action appends (the ObjectType it edits).",
    },
    {
      name: "valueGrade",
      type: "ValueGrade",
      required: false,
      description: "The value-grade assigned to the envelope (rule 26 T0-rejected/T1+ retained).",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "none",
  branchPolicy: "live-only",
  validateOnlySupported: false,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 9. rotateEvents (Tier-2) — rotate via atomic rename, never rewrite.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology rotateEvents ActionType. */
export const ROTATE_EVENTS_ACTION_TYPE_RID = rid("rotate-events");

/** rotateEvents — rotates events.jsonl via atomic rename, never a rewrite (append-only). */
export const ROTATE_EVENTS_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: ROTATE_EVENTS_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "RotateEvents",
  name: "RotateEvents",
  description:
    "palantir-mini self verb: rotates events.jsonl via an atomic rename (never a rewrite — " +
    "the append-only invariant holds). Tier-2: wraps the eventLog rotate EditFunction.",
  editFunctionName: "pm.eventLog.rotate",
  parameters: [
    {
      name: "eventEnvelope",
      type: "EventEnvelope",
      required: false,
      description: "The EventEnvelope stream this rotation acts over (the rotated log).",
    },
    {
      name: "retentionManifest",
      type: "RetentionManifest",
      required: false,
      description: "The retention manifest governing which archives are kept after rotation.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "none",
  branchPolicy: "live-only",
  validateOnlySupported: false,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 10. promoteValueGrade (TIER-1) — append-only T1→T4 ratchet (rule 26).
//     Tier-1 shape: objectType + field + operation; NO editFunctionName.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology promoteValueGrade ActionType. */
export const PROMOTE_VALUE_GRADE_ACTION_TYPE_RID = rid("promote-value-grade");

/**
 * promoteValueGrade — the append-only T1→T4 grade ratchet (rule 26). Tier-1 declarative
 * (no editFunctionName): a monotone update of an EventEnvelope's valueGrade field.
 */
export const PROMOTE_VALUE_GRADE_ACTION_TYPE: Tier1DeclarativeAction = {
  rid: PROMOTE_VALUE_GRADE_ACTION_TYPE_RID,
  tier: "tier-1",
  apiName: "PromoteValueGrade",
  name: "PromoteValueGrade",
  description:
    "palantir-mini self verb: ratchets an EventEnvelope's value-grade forward (append-only " +
    "T1→T4, rule 26). Tier-1 declarative — a monotone field update, no editFunctionName.",
  objectType: "EventEnvelope",
  field: "valueGrade",
  operation: "update",
  parameters: [
    {
      name: "eventEnvelope",
      type: "EventEnvelope",
      required: true,
      description: "The EventEnvelope whose valueGrade this action ratchets forward.",
    },
    {
      name: "valueGrade",
      type: "ValueGrade",
      required: true,
      description: "The target value-grade (monotone forward; T0→T4, never downgraded).",
    },
  ],
  approvalPolicy: "none",
  branchPolicy: "live-only",
  validateOnlySupported: false,
};

// ───────────────────────────────────────────────────────────────────────────────
// 11. draftSemanticIntentContract (Tier-2) — record approved 9-axis boundary.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology draftSemanticIntentContract ActionType. */
export const DRAFT_SEMANTIC_INTENT_CONTRACT_ACTION_TYPE_RID = rid(
  "draft-semantic-intent-contract",
);

/** draftSemanticIntentContract — records the approved 9-axis SIC boundary (Tier-2). */
export const DRAFT_SEMANTIC_INTENT_CONTRACT_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: DRAFT_SEMANTIC_INTENT_CONTRACT_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "DraftSemanticIntentContract",
  name: "DraftSemanticIntentContract",
  description:
    "palantir-mini self verb: records the approved 9-axis meaning boundary as a " +
    "SemanticIntentContract (understand-phase front door). Tier-2: wraps the leadIntent " +
    "fillSemanticIntentContract EditFunction; user-confirmation gated.",
  editFunctionName: "pm.leadIntent.fillSemanticIntentContract",
  parameters: [
    {
      name: "semanticIntentContract",
      type: "SemanticIntentContract",
      required: true,
      description: "The SemanticIntentContract this action edits (records the 9-axis boundary).",
    },
    {
      name: "sicAxis",
      type: "SicAxis",
      required: false,
      description: "The 9 SicAxis values populating the contract boundary.",
    },
    {
      name: "promptEnvelope",
      type: "PromptEnvelope",
      required: false,
      description: "The prompt-front-door envelope whose intent this SIC confirms.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "user-confirmation",
  branchPolicy: "branch-optional",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 12. approveDigitalTwinChangeContract (Tier-2) — derive+approve DTC from approved SIC.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology approveDigitalTwinChangeContract ActionType. */
export const APPROVE_DIGITAL_TWIN_CHANGE_CONTRACT_ACTION_TYPE_RID = rid(
  "approve-digital-twin-change-contract",
);

/** approveDigitalTwinChangeContract — derives+approves a DTC from the approved SIC (Tier-2). */
export const APPROVE_DIGITAL_TWIN_CHANGE_CONTRACT_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: APPROVE_DIGITAL_TWIN_CHANGE_CONTRACT_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "ApproveDigitalTwinChangeContract",
  name: "ApproveDigitalTwinChangeContract",
  description:
    "palantir-mini self verb: derives and approves a DigitalTwinChangeContract from an " +
    "approved SemanticIntentContract (the sole evidence source). Tier-2: wraps the " +
    "leadIntent deriveDigitalTwinChangeContract EditFunction; policy-approval gated.",
  editFunctionName: "pm.leadIntent.deriveDigitalTwinChangeContract",
  parameters: [
    {
      name: "digitalTwinChangeContract",
      type: "DigitalTwinChangeContract",
      required: true,
      description: "The DigitalTwinChangeContract this action edits (derives + approves).",
    },
    {
      name: "semanticIntentContract",
      type: "SemanticIntentContract",
      required: true,
      description: "The approved SIC that is the sole evidence source for the derived DTC.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 13. advanceOntologyEngineeringWorkflow (Tier-2) — public OE state machine.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology advanceOntologyEngineeringWorkflow ActionType. */
export const ADVANCE_ONTOLOGY_ENGINEERING_WORKFLOW_ACTION_TYPE_RID = rid(
  "advance-ontology-engineering-workflow",
);

/** advanceOntologyEngineeringWorkflow — transitions the public OE state machine (Tier-2). */
export const ADVANCE_ONTOLOGY_ENGINEERING_WORKFLOW_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: ADVANCE_ONTOLOGY_ENGINEERING_WORKFLOW_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "AdvanceOntologyEngineeringWorkflow",
  name: "AdvanceOntologyEngineeringWorkflow",
  description:
    "palantir-mini self verb: transitions the public Ontology-Engineering state machine " +
    "(start/turn/draft_sic/status). Tier-2: wraps the oeWorkflow transition EditFunction.",
  editFunctionName: "pm.oeWorkflow.transition",
  parameters: [
    {
      name: "workflowTrace",
      type: "WorkflowTrace",
      required: true,
      description: "The WorkflowTrace this action edits (records the OE state transition).",
    },
    {
      name: "fdeOntologyBuildSession",
      type: "FDEOntologyBuildSession",
      required: false,
      description: "The FDE OE session backing this workflow transition.",
    },
    {
      name: "semanticIntentContract",
      type: "SemanticIntentContract",
      required: false,
      description: "The SIC drafted/advanced by a draft_sic transition.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "none",
  branchPolicy: "branch-optional",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 14. advanceFdeOntologyBuildTurn (Tier-2) — one turn of FDE build (9 level builders).
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology advanceFdeOntologyBuildTurn ActionType. */
export const ADVANCE_FDE_ONTOLOGY_BUILD_TURN_ACTION_TYPE_RID = rid(
  "advance-fde-ontology-build-turn",
);

/** advanceFdeOntologyBuildTurn — advances one turn of the FDE build (9 level builders). */
export const ADVANCE_FDE_ONTOLOGY_BUILD_TURN_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: ADVANCE_FDE_ONTOLOGY_BUILD_TURN_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "AdvanceFdeOntologyBuildTurn",
  name: "AdvanceFdeOntologyBuildTurn",
  description:
    "palantir-mini self verb: advances one turn of the FDE Ontology Build session (the 9 " +
    "level builders + grader). Tier-2: wraps the fdeBuild advanceTurn EditFunction.",
  editFunctionName: "pm.fdeBuild.advanceTurn",
  parameters: [
    {
      name: "fdeOntologyBuildSession",
      type: "FDEOntologyBuildSession",
      required: true,
      description: "The FDEOntologyBuildSession this action edits (advances one build turn).",
    },
    {
      name: "semanticIntentContract",
      type: "SemanticIntentContract",
      required: false,
      description: "The SIC the build turn surfaces/refines.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "none",
  branchPolicy: "branch-optional",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 15. recordPreMutationGovernanceDecision (Tier-2) — deterministic pre-mutation gate.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology recordPreMutationGovernanceDecision ActionType. */
export const RECORD_PRE_MUTATION_GOVERNANCE_DECISION_ACTION_TYPE_RID = rid(
  "record-pre-mutation-governance-decision",
);

/** recordPreMutationGovernanceDecision — deterministic pre-mutation governance gate (Tier-2). */
export const RECORD_PRE_MUTATION_GOVERNANCE_DECISION_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: RECORD_PRE_MUTATION_GOVERNANCE_DECISION_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "RecordPreMutationGovernanceDecision",
  name: "RecordPreMutationGovernanceDecision",
  description:
    "palantir-mini self verb: records a deterministic GovernanceDecisionV2 from the " +
    "pre-mutation gate (compute-only; commits nothing itself). Tier-2: wraps the " +
    "governance computeDecisionV2 EditFunction; policy-approval gated.",
  editFunctionName: "pm.governance.computeDecisionV2",
  parameters: [
    {
      name: "governanceDecisionV2",
      type: "RuntimeDecision",
      required: true,
      description: "The GovernanceDecisionV2 (RuntimeDecision) this action records.",
    },
    {
      name: "digitalTwinChangeContract",
      type: "DigitalTwinChangeContract",
      required: false,
      description: "The DTC boundary the decision is evaluated against.",
    },
    {
      name: "semanticIntentContract",
      type: "SemanticIntentContract",
      required: false,
      description: "The approved SIC feeding the governance evaluation.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-optional",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 16. routeIntentDispatch (Tier-2) — full intent-router; enforces the SIC→DTC gate.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology routeIntentDispatch ActionType. */
export const ROUTE_INTENT_DISPATCH_ACTION_TYPE_RID = rid("route-intent-dispatch");

/** routeIntentDispatch — full intent-router; enforces the SIC→DTC gate before dispatch. */
export const ROUTE_INTENT_DISPATCH_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: ROUTE_INTENT_DISPATCH_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "RouteIntentDispatch",
  name: "RouteIntentDispatch",
  description:
    "palantir-mini self verb: builds the dispatch recipe for the full intent-router, " +
    "enforcing the SIC→DTC contract gate before ontology-affecting dispatch. Tier-2: " +
    "wraps the intentRouter buildDispatchRecipe EditFunction.",
  editFunctionName: "pm.intentRouter.buildDispatchRecipe",
  parameters: [
    {
      name: "runtimeDecision",
      type: "RuntimeDecision",
      required: true,
      description: "The dispatch verdict (DispatchContract) this action edits/records.",
    },
    {
      name: "digitalTwinChangeContract",
      type: "DigitalTwinChangeContract",
      required: false,
      description: "The approved DTC the SIC→DTC gate requires before dispatch.",
    },
    {
      name: "ontologyContextApproval",
      type: "OntologyContextApproval",
      required: false,
      description: "The OntologyContextApproval cached for low-risk intents.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-optional",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 17. mintPromptEnvelope (Tier-2) — mint promptId/Hash at UserPromptSubmit.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology mintPromptEnvelope ActionType. */
export const MINT_PROMPT_ENVELOPE_ACTION_TYPE_RID = rid("mint-prompt-envelope");

/** mintPromptEnvelope — mints the promptId/promptHash envelope at UserPromptSubmit (Tier-2). */
export const MINT_PROMPT_ENVELOPE_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: MINT_PROMPT_ENVELOPE_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "MintPromptEnvelope",
  name: "MintPromptEnvelope",
  description:
    "palantir-mini self verb: mints a PromptEnvelope (promptId/promptHash) at " +
    "UserPromptSubmit (the prompt front door). Tier-2: wraps the promptFrontDoor " +
    "mintEnvelope EditFunction.",
  editFunctionName: "pm.promptFrontDoor.mintEnvelope",
  parameters: [
    {
      name: "promptEnvelope",
      type: "PromptEnvelope",
      required: true,
      description: "The PromptEnvelope this action edits (mints promptId/promptHash).",
    },
    {
      name: "approvalRef",
      type: "ApprovalRef",
      required: false,
      description: "The approval reference cached on the minted envelope.",
    },
    {
      name: "promptContractRecord",
      type: "PromptContractRecord",
      required: false,
      description: "The prompt-contract record bound to the envelope.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "none",
  branchPolicy: "live-only",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 18. promoteEvidence (Tier-2) — NC0→NC1 evidence promotion (project rule 04).
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology promoteEvidence ActionType. */
export const PROMOTE_EVIDENCE_ACTION_TYPE_RID = rid("promote-evidence");

/** promoteEvidence — NC0→NC1 evidence promotion after adversarial review (project rule 04). */
export const PROMOTE_EVIDENCE_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: PROMOTE_EVIDENCE_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "PromoteEvidence",
  name: "PromoteEvidence",
  description:
    "palantir-mini self verb: promotes an evidence record NC0→NC1 (model-reasoned draft → " +
    "human-reviewed source, project rule 04). Tier-2: wraps the evidence promoteRecord " +
    "EditFunction; policy-approval gated.",
  editFunctionName: "pm.evidence.promoteRecord",
  parameters: [
    {
      name: "evidencePromotionRecord",
      type: "Learning",
      required: true,
      description: "The EvidencePromotionRecord (Learning) this action edits (promotes NC0→NC1).",
    },
    {
      name: "researchDocument",
      type: "ResearchDocument",
      required: false,
      description: "The research document the promoted evidence cites.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-optional",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 19. registerCapabilityToken (Tier-2) — grant scoped L2/L3 token (closest to Role gap).
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology registerCapabilityToken ActionType. */
export const REGISTER_CAPABILITY_TOKEN_ACTION_TYPE_RID = rid("register-capability-token");

/** registerCapabilityToken — grants a scoped L2/L3 RBAC CapabilityToken (Tier-2). */
export const REGISTER_CAPABILITY_TOKEN_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: REGISTER_CAPABILITY_TOKEN_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "RegisterCapabilityToken",
  name: "RegisterCapabilityToken",
  description:
    "palantir-mini self verb: grants a scoped L2/L3 RBAC CapabilityToken (the closest verb " +
    "to the Role gap). Tier-2: wraps the rbac grantCapabilityToken EditFunction.",
  editFunctionName: "pm.rbac.grantCapabilityToken",
  parameters: [
    {
      name: "capabilityToken",
      type: "CapabilityToken",
      required: true,
      description: "The CapabilityToken this action edits (grants the scoped L2/L3 token).",
    },
    {
      name: "managedSettingsFragment",
      type: "ManagedSettingsFragment",
      required: false,
      description: "The managed-settings fragment whose grant the token realizes.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 20. evaluateReleaseGate (Tier-2) — validate a family ReleaseGate before ship.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology evaluateReleaseGate ActionType. */
export const EVALUATE_RELEASE_GATE_ACTION_TYPE_RID = rid("evaluate-release-gate");

/** evaluateReleaseGate — validates a family ReleaseGate before ship (release-blocking, Tier-2). */
export const EVALUATE_RELEASE_GATE_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: EVALUATE_RELEASE_GATE_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "EvaluateReleaseGate",
  name: "EvaluateReleaseGate",
  description:
    "palantir-mini self verb: validates a family ReleaseGate before ship (release-blocking). " +
    "Tier-2: wraps the release evaluateGate EditFunction.",
  editFunctionName: "pm.release.evaluateGate",
  parameters: [
    {
      name: "releaseGate",
      type: "EvalSuite",
      required: true,
      description: "The ReleaseGate (EvalSuite) this action edits (records the gate verdict).",
    },
    {
      name: "workflowTrace",
      type: "WorkflowTrace",
      required: false,
      description: "The WorkflowState/WorkflowTrace the release gate is evaluated against.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-optional",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// 21. structuredOutput (Tier-2) — validate a model candidate or fall back (O-1 / SI-1).
//   The structural form of the rule-05 anti-stall clause: validate-or-bounded-fallback
//   with a termination guarantee that is a property of the engine's finite path, NOT
//   caller discipline. Surfaced as the `structured_output` MCP tool; the runtime impl
//   is lib/structured-output/index.ts (downstream — ontology-first, rule 01). The
//   `editFunctionName` forward-names the registered thin EditFunction so the ActionType↔
//   editFunctionName parity holds like the four O-2 register verbs.
// ───────────────────────────────────────────────────────────────────────────────

/** Stable RID for the self-Ontology structuredOutput ActionType. */
export const STRUCTURED_OUTPUT_ACTION_TYPE_RID = rid("structured-output");

/** structuredOutput — validate a model-produced candidate or collapse to a bounded fallback (Tier-2). */
export const STRUCTURED_OUTPUT_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: STRUCTURED_OUTPUT_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "StructuredOutput",
  name: "StructuredOutput",
  description:
    "palantir-mini self verb: validates a model-produced candidate against a small bounded " +
    "JSON Schema, returning EITHER a structured value OR a bounded fallback text. Termination " +
    "is a property of the machinery (lib/structured-output: pre-size gate → bounded validate-retry " +
    "→ guaranteed fallback) — the structural form of the rule-05 anti-stall clause; it CANNOT loop. " +
    "Tier-2: wraps the structuredOutput fillOrFallback EditFunction.",
  editFunctionName: "pm.structuredOutput.fillOrFallback",
  parameters: [
    {
      name: "function",
      type: "Function",
      required: true,
      description: "The structuredOutputFillOrFallback Function this action wraps (the engine).",
    },
    {
      name: "mcpTool",
      type: "McpTool",
      required: false,
      description: "The structured_output McpTool surface this ActionType is bound to.",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "none",
  branchPolicy: "branch-optional",
  validateOnlySupported: true,
  sideEffects: [],
};

// ───────────────────────────────────────────────────────────────────────────────
// Register all 21 self-Ontology verbs into ACTION_TYPE_REGISTRY (side-effect on import).
// (20 catalog §4 verbs + structuredOutput, O-1.) Combined with executor.actiontype.ts
// (Executor), self/ register-grep = 23 ActionTypes.
// ───────────────────────────────────────────────────────────────────────────────

export const SELF_ACTION_TYPES = [
  REGISTER_OBJECT_TYPE_ACTION_TYPE,
  REGISTER_LINK_TYPE_ACTION_TYPE,
  REGISTER_ACTION_TYPE_ACTION_TYPE,
  REGISTER_FUNCTION_ACTION_TYPE,
  REGISTER_TIER1_DECLARATIVE_ACTION_ACTION_TYPE,
  COMMIT_EDITS_ACTION_TYPE,
  APPLY_EDIT_FUNCTION_ACTION_TYPE,
  EMIT_EVENT_ACTION_TYPE,
  ROTATE_EVENTS_ACTION_TYPE,
  PROMOTE_VALUE_GRADE_ACTION_TYPE,
  DRAFT_SEMANTIC_INTENT_CONTRACT_ACTION_TYPE,
  APPROVE_DIGITAL_TWIN_CHANGE_CONTRACT_ACTION_TYPE,
  ADVANCE_ONTOLOGY_ENGINEERING_WORKFLOW_ACTION_TYPE,
  ADVANCE_FDE_ONTOLOGY_BUILD_TURN_ACTION_TYPE,
  RECORD_PRE_MUTATION_GOVERNANCE_DECISION_ACTION_TYPE,
  ROUTE_INTENT_DISPATCH_ACTION_TYPE,
  MINT_PROMPT_ENVELOPE_ACTION_TYPE,
  PROMOTE_EVIDENCE_ACTION_TYPE,
  REGISTER_CAPABILITY_TOKEN_ACTION_TYPE,
  EVALUATE_RELEASE_GATE_ACTION_TYPE,
  STRUCTURED_OUTPUT_ACTION_TYPE,
] as const;

for (const action of SELF_ACTION_TYPES) {
  ACTION_TYPE_REGISTRY.register(action);
}
