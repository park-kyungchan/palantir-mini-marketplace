/**
 * palantir-mini SELF-ONTOLOGY — LinkTypes (W3f, the #1 DoD gap closer).
 *
 * pm's OWN relationships modeled AS Palantir LinkType instances. Every endpoint
 * is a self/ ObjectType RID (imported, never re-derived); zero endpoints are
 * ActionTypes. M:N = srcCardinality "many" + dstCardinality "many"; a self-link
 * is simply src === dst (no special flag). All edges are PLAIN LinkTypes except
 * ManagedSettingsFragmentGrantsMcpTool, which is OBJECT-BACKED (carries an
 * allow/deny `mode` property on the link itself).
 *
 * Catalog: harness-upstream .../context/06-pm-self-ontology-catalog.md §3.
 * The §3 header/notes enumerate 33 distinct edges; the SSoT table lists the 31
 * core/second-tier core edges plus 2 front-door/runtime-neutrality completers
 * (RuntimeAdapterProjectsRuntimeDecision, PromptEnvelopeDerivesSemanticIntentContract).
 * All 5 named self-links are present: RuleCrossRefs, SIC-supersedes,
 * WorkflowTrace-refines, Sandbox-resumes, RuntimeDecision-projected. This module
 * registers all 33.
 *
 * @owner palantirkc-ontology
 * @purpose Self-Ontology LinkType instances (prim-logic-03 instances)
 */

import {
  type LinkTypeDeclaration,
  LINK_TYPE_REGISTRY,
  linkTypeRid,
} from "../primitives/link-type";
import { MCP_TOOL_OBJECT_TYPE_RID } from "./mcp-tool.objecttype";
import { MCP_HANDLER_OBJECT_TYPE_RID } from "./mcp-handler.objecttype";
import { SKILL_OBJECT_TYPE_RID } from "./skill.objecttype";
import { AGENT_OBJECT_TYPE_RID } from "./agent.objecttype";
import { HOOK_OBJECT_TYPE_RID } from "./hook.objecttype";
import { RULE_OBJECT_TYPE_RID } from "./rule.objecttype";
import { SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID } from "./semantic-intent-contract.objecttype";
import { DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID } from "./digital-twin-change-contract.objecttype";
import { PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE_RID } from "./project-ontology-index.objecttype";
import { RUNTIME_DECISION_OBJECT_TYPE_RID } from "./runtime-decision.objecttype";
import { EVENT_ENVELOPE_OBJECT_TYPE_RID } from "./event-envelope.objecttype";
import { WORKFLOW_TRACE_OBJECT_TYPE_RID } from "./workflow-trace.objecttype";
import { LEARNING_OBJECT_TYPE_RID } from "./learning.objecttype";
import { EVAL_SUITE_OBJECT_TYPE_RID } from "./eval-suite.objecttype";
import { GRADING_RUBRIC_OBJECT_TYPE_RID } from "./grading-rubric.objecttype";
import { CAPABILITY_CONTRACT_OBJECT_TYPE_RID } from "./capability-contract.objecttype";
import { PLUGIN_MANIFEST_OBJECT_TYPE_RID } from "./plugin-manifest.objecttype";
import { MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE_RID } from "./managed-settings-fragment.objecttype";
import { SUBMISSION_CRITERION_OBJECT_TYPE_RID } from "./submission-criterion.objecttype";
import { EDIT_FUNCTION_OBJECT_TYPE_RID } from "./edit-function.objecttype";
import { SCENARIO_SANDBOX_OBJECT_TYPE_RID } from "./scenario-sandbox.objecttype";
import { RUNTIME_ADAPTER_OBJECT_TYPE_RID } from "./runtime-adapter.objecttype";
import { PROMPT_ENVELOPE_OBJECT_TYPE_RID } from "./prompt-envelope.objecttype";

/** McpTool -> McpHandler (M:N): each tool is backed by >=1 handler module. */
export const MCP_TOOL_BACKED_BY_MCP_HANDLER: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/mcp-tool-backed-by-mcp-handler"),
  name: "McpToolBackedByMcpHandler",
  description:
    "Each MCP tool (callable surface) is backed by one or more bridge handler " +
    "modules; mode-dispatcher tools fan out to many handlers (M:N).",
  src: MCP_TOOL_OBJECT_TYPE_RID,
  dst: MCP_HANDLER_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** Skill -> McpTool (M:N): a skill invokes >=1 MCP tool; tools are reused across skills. */
export const SKILL_INVOKES_MCP_TOOL: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/skill-invokes-mcp-tool"),
  name: "SkillInvokesMcpTool",
  description:
    "A skill invokes one or more MCP tools during its workflow; a single tool is " +
    "invoked by many skills (M:N).",
  src: SKILL_OBJECT_TYPE_RID,
  dst: MCP_TOOL_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** Agent -> Skill (M:N): a subagent uses skills (Agent<->Task idiom). */
export const AGENT_USES_SKILL: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/agent-uses-skill"),
  name: "AgentUsesSkill",
  description:
    "A governed subagent uses one or more skills (Agent<->Task idiom); the " +
    "lead-orchestrator drives review skills. Skills are reused across agents (M:N).",
  src: AGENT_OBJECT_TYPE_RID,
  dst: SKILL_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** Hook -> Rule (M:N): a hook cites/enforces a rule. Governance backbone. */
export const HOOK_ENFORCES_RULE: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/hook-enforces-rule"),
  name: "HookEnforcesRule",
  description:
    "A lifecycle hook cites and enforces a behavioral rule (value-grade-assigner " +
    "-> rule 26, events-5d-gate -> rule 10); a rule is enforced by many hooks (M:N).",
  src: HOOK_OBJECT_TYPE_RID,
  dst: RULE_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** Rule -> Rule (self-link, M:N): a rule crossRefs other rules (frontmatter crossRefs). */
export const RULE_CROSS_REFS_RULE: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/rule-cross-refs-rule"),
  name: "RuleCrossRefsRule",
  description:
    "A rule cross-references other rules via its frontmatter crossRefs array; a " +
    "self-link (src === dst === Rule) that is M:N. pm_rule_audit staleCrossRefs " +
    "traverses this edge.",
  src: RULE_OBJECT_TYPE_RID,
  dst: RULE_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** SemanticIntentContract -> DigitalTwinChangeContract (1:1): approved SIC is sole DTC evidence. */
export const SEMANTIC_INTENT_CONTRACT_DERIVES_DIGITAL_TWIN_CHANGE_CONTRACT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid(
    "pm.self.ontology/link-type/semantic-intent-contract-derives-digital-twin-change-contract",
  ),
  name: "SemanticIntentContractDerivesDigitalTwinChangeContract",
  description:
    "An approved SemanticIntentContract is the sole evidence source for its " +
    "derived DigitalTwinChangeContract. The #1 front-door coupling (1:1).",
  src: SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID,
  dst: DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "one",
};

/** SemanticIntentContract -> SemanticIntentContract (self, 1:1): re-confirmed intent supersedes prior. */
export const SEMANTIC_INTENT_CONTRACT_SUPERSEDES_PRIOR_CONTRACT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid(
    "pm.self.ontology/link-type/semantic-intent-contract-supersedes-prior-contract",
  ),
  name: "SemanticIntentContractSupersedesPriorContract",
  description:
    "A re-confirmed SemanticIntentContract supersedes the prior contract it " +
    "replaces (Run<->priorRun idiom); a self-link (src === dst === SIC), 1:1.",
  src: SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID,
  dst: SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "one",
};

/** DigitalTwinChangeContract -> ProjectOntologyIndex (M:N): DTC boundary scopes the ontology surface. */
export const DIGITAL_TWIN_CHANGE_CONTRACT_TOUCHES_PROJECT_ONTOLOGY_INDEX: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid(
    "pm.self.ontology/link-type/digital-twin-change-contract-touches-project-ontology-index",
  ),
  name: "DigitalTwinChangeContractTouchesProjectOntologyIndex",
  description:
    "A DigitalTwinChangeContract's mutation boundary scopes the ProjectOntologyIndex " +
    "surface it is authorized to touch (M:N).",
  src: DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID,
  dst: PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** RuntimeDecision -> DigitalTwinChangeContract (M:1): dispatch verdict gated by approved DTC. */
export const RUNTIME_DECISION_GATED_BY_DIGITAL_TWIN_CHANGE_CONTRACT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid(
    "pm.self.ontology/link-type/runtime-decision-gated-by-digital-twin-change-contract",
  ),
  name: "RuntimeDecisionGatedByDigitalTwinChangeContract",
  description:
    "A RuntimeDecision dispatch verdict is gated by an approved DigitalTwinChangeContract " +
    "before the router dispatches; many decisions per DTC (M:1).",
  src: RUNTIME_DECISION_OBJECT_TYPE_RID,
  dst: DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "one",
};

/** RuntimeDecision -> EventEnvelope (1:N): executed decision emits append-only lineage rows. */
export const RUNTIME_DECISION_EMITS_EVENT_ENVELOPE: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/runtime-decision-emits-event-envelope"),
  name: "RuntimeDecisionEmitsEventEnvelope",
  description:
    "An executed RuntimeDecision emits one or more append-only EventEnvelope lineage " +
    "rows (Decision -> Outcome); one decision, many envelopes (1:N).",
  src: RUNTIME_DECISION_OBJECT_TYPE_RID,
  dst: EVENT_ENVELOPE_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/** EventEnvelope -> WorkflowTrace (M:1): envelope belongs to a run/trace (atopWhich). */
export const EVENT_ENVELOPE_BELONGS_TO_WORKFLOW_TRACE: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/event-envelope-belongs-to-workflow-trace"),
  name: "EventEnvelopeBelongsToWorkflowTrace",
  description:
    "An EventEnvelope belongs to a run/WorkflowTrace (atopWhich; EventRow -> Run); " +
    "many envelopes per trace (M:1). pm-trace traverses this edge.",
  src: EVENT_ENVELOPE_OBJECT_TYPE_RID,
  dst: WORKFLOW_TRACE_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "one",
};

/** WorkflowTrace -> WorkflowTrace (self, 1:1): trace references prior trace it resumes. */
export const WORKFLOW_TRACE_REFINES_PRIOR_TRACE: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/workflow-trace-refines-prior-trace"),
  name: "WorkflowTraceRefinesPriorTrace",
  description:
    "A WorkflowTrace references the prior trace it resumes (session_resume; " +
    "Run<->priorRun); a self-link (src === dst === WorkflowTrace), 1:1.",
  src: WORKFLOW_TRACE_OBJECT_TYPE_RID,
  dst: WORKFLOW_TRACE_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "one",
};

/** Learning -> RuntimeDecision (M:N): BackwardProp — a learning refines future decisions. */
export const LEARNING_REFINES_RUNTIME_DECISION: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/learning-refines-runtime-decision"),
  name: "LearningRefinesRuntimeDecision",
  description:
    "BackwardProp: a cross-session Learning refines future RuntimeDecisions " +
    "(feedback-loop close); many learnings refine many decisions (M:N).",
  src: LEARNING_OBJECT_TYPE_RID,
  dst: RUNTIME_DECISION_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** EvalSuite -> GradingRubric (M:N): suite scored by a rubric (grade_outcome_with_rubric). */
export const EVAL_SUITE_SCORED_BY_GRADING_RUBRIC: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/eval-suite-scored-by-grading-rubric"),
  name: "EvalSuiteScoredByGradingRubric",
  description:
    "An EvalSuite is scored by a GradingRubric (grade_outcome_with_rubric, FDE-17); " +
    "rubrics are reused across suites (M:N).",
  src: EVAL_SUITE_OBJECT_TYPE_RID,
  dst: GRADING_RUBRIC_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** EvalSuite -> Agent (M:N): agent-lifecycle Evals — a suite targets an Agent. */
export const EVAL_SUITE_EVALUATES_AGENT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/eval-suite-evaluates-agent"),
  name: "EvalSuiteEvaluatesAgent",
  description:
    "Agent-lifecycle Evals: an EvalSuite targets an Agent; an agent is evaluated " +
    "by many suites (M:N).",
  src: EVAL_SUITE_OBJECT_TYPE_RID,
  dst: AGENT_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** CapabilityContract -> Skill (1:N): registry unifies skills under one contract. */
export const CAPABILITY_CONTRACT_UNIFIES_SKILL: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/capability-contract-unifies-skill"),
  name: "CapabilityContractUnifiesSkill",
  description:
    "A CapabilityContract registry unifies skills under one contract; one contract, " +
    "many skills (1:N). First of the 3 runtime-neutral routing arms.",
  src: CAPABILITY_CONTRACT_OBJECT_TYPE_RID,
  dst: SKILL_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/** CapabilityContract -> Agent (1:N): second arm — contract unifies agents. */
export const CAPABILITY_CONTRACT_UNIFIES_AGENT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/capability-contract-unifies-agent"),
  name: "CapabilityContractUnifiesAgent",
  description:
    "Second arm: a CapabilityContract unifies agents under one contract; one " +
    "contract, many agents (1:N).",
  src: CAPABILITY_CONTRACT_OBJECT_TYPE_RID,
  dst: AGENT_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/** CapabilityContract -> McpTool (1:N): third arm — contract unifies tools. */
export const CAPABILITY_CONTRACT_UNIFIES_MCP_TOOL: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/capability-contract-unifies-mcp-tool"),
  name: "CapabilityContractUnifiesMcpTool",
  description:
    "Third arm: a CapabilityContract unifies MCP tools under one contract; one " +
    "contract, many tools (1:N). The 3 arms = runtime-neutral routing.",
  src: CAPABILITY_CONTRACT_OBJECT_TYPE_RID,
  dst: MCP_TOOL_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/** PluginManifest -> McpTool (1:N): manifest is registration SSoT for all tools. */
export const PLUGIN_MANIFEST_REGISTERS_MCP_TOOL: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/plugin-manifest-registers-mcp-tool"),
  name: "PluginManifestRegistersMcpTool",
  description:
    "The PluginManifest is the registration SSoT for all MCP tools; one manifest, " +
    "many tools (1:N).",
  src: PLUGIN_MANIFEST_OBJECT_TYPE_RID,
  dst: MCP_TOOL_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/** PluginManifest -> Hook (1:N): manifest registers hooks; surfaces orphans as unregistered. */
export const PLUGIN_MANIFEST_REGISTERS_HOOK: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/plugin-manifest-registers-hook"),
  name: "PluginManifestRegistersHook",
  description:
    "The PluginManifest registers hooks; hooks absent from the manifest surface as " +
    "orphans. One manifest, many hooks (1:N).",
  src: PLUGIN_MANIFEST_OBJECT_TYPE_RID,
  dst: HOOK_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/** PluginManifest -> Skill (1:N): manifest registers skills. */
export const PLUGIN_MANIFEST_REGISTERS_SKILL: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/plugin-manifest-registers-skill"),
  name: "PluginManifestRegistersSkill",
  description:
    "The PluginManifest registers skills; one manifest, many skills (1:N).",
  src: PLUGIN_MANIFEST_OBJECT_TYPE_RID,
  dst: SKILL_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/** PluginManifest -> Agent (1:N): manifest registers agents; completes the fan-out. */
export const PLUGIN_MANIFEST_REGISTERS_AGENT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/plugin-manifest-registers-agent"),
  name: "PluginManifestRegistersAgent",
  description:
    "The PluginManifest registers agents; one manifest, many agents (1:N). " +
    "Completes the registration fan-out.",
  src: PLUGIN_MANIFEST_OBJECT_TYPE_RID,
  dst: AGENT_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/**
 * ManagedSettingsFragment -> McpTool (M:N, OBJECT-BACKED): per-project RBAC fragment
 * grants/denies tools. The link carries its own `mode` field (allow | deny) — the
 * one object-backed edge in the self-graph. Fills the Role gap.
 */
export const MANAGED_SETTINGS_FRAGMENT_GRANTS_MCP_TOOL: LinkTypeDeclaration = {
  kind: "object-backed",
  rid: linkTypeRid("pm.self.ontology/link-type/managed-settings-fragment-grants-mcp-tool"),
  name: "ManagedSettingsFragmentGrantsMcpTool",
  description:
    "A per-project ManagedSettingsFragment grants or denies MCP tools (RBAC). " +
    "Object-backed: the link carries an allow/deny `mode` property. Fills the Role gap (M:N).",
  src: MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE_RID,
  dst: MCP_TOOL_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
  properties: [{ name: "mode", type: "string", optional: false }],
};

/** ManagedSettingsFragment -> PluginManifest (M:1): fragment grants scoped to the manifest surface. */
export const MANAGED_SETTINGS_FRAGMENT_SCOPED_TO_PLUGIN_MANIFEST: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid(
    "pm.self.ontology/link-type/managed-settings-fragment-scoped-to-plugin-manifest",
  ),
  name: "ManagedSettingsFragmentScopedToPluginManifest",
  description:
    "A ManagedSettingsFragment's grants are scoped to the PluginManifest's tool " +
    "surface; many fragments per manifest (M:1).",
  src: MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE_RID,
  dst: PLUGIN_MANIFEST_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "one",
};

/** Hook -> SubmissionCriterion (M:N): blocking hook enforces a commit-gate criterion (9-class). */
export const HOOK_GUARDS_ACTION_VIA_SUBMISSION_CRITERION: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/hook-guards-action-via-submission-criterion"),
  name: "HookGuardsActionViaSubmissionCriterion",
  description:
    "A blocking Hook enforces a commit-gate SubmissionCriterion (the 9-class gate); " +
    "a criterion is guarded by many hooks (M:N).",
  src: HOOK_OBJECT_TYPE_RID,
  dst: SUBMISSION_CRITERION_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "many",
};

/** EditFunction -> DigitalTwinChangeContract (M:1): Tier-2 edits authorized by governing DTC. */
export const EDIT_FUNCTION_PROPOSES_DIGITAL_TWIN_CHANGE_CONTRACT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid(
    "pm.self.ontology/link-type/edit-function-proposes-digital-twin-change-contract",
  ),
  name: "EditFunctionProposesDigitalTwinChangeContract",
  description:
    "A Tier-2 EditFunction's proposed edits are authorized by the governing " +
    "DigitalTwinChangeContract boundary; many edit functions per DTC (M:1).",
  src: EDIT_FUNCTION_OBJECT_TYPE_RID,
  dst: DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "one",
};

/** ScenarioSandbox -> EditFunction (1:N): Hands sandbox executes registered edit functions. */
export const SANDBOX_SESSION_EXECUTES_EDIT_FUNCTION: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/sandbox-session-executes-edit-function"),
  name: "SandboxSessionExecutesEditFunction",
  description:
    "A Hands-layer ScenarioSandbox executes its registered EditFunctions; one " +
    "sandbox, many edit functions (1:N).",
  src: SCENARIO_SANDBOX_OBJECT_TYPE_RID,
  dst: EDIT_FUNCTION_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/** ScenarioSandbox -> ScenarioSandbox (self, 1:1): sandbox resumes prior session (Run<->priorRun). */
export const SANDBOX_SESSION_RESUMES_PRIOR_SESSION: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/sandbox-session-resumes-prior-session"),
  name: "SandboxSessionResumesPriorSession",
  description:
    "A ScenarioSandbox resumes the prior session it continues (Run<->priorRun); a " +
    "self-link (src === dst === ScenarioSandbox), 1:1.",
  src: SCENARIO_SANDBOX_OBJECT_TYPE_RID,
  dst: SCENARIO_SANDBOX_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "one",
};

/** Agent -> CapabilityContract (M:1): agent surface declared within a family's contract. */
export const AGENT_OWNS_CAPABILITY_CONTRACT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/agent-owns-capability-contract"),
  name: "AgentOwnsCapabilityContract",
  description:
    "An Agent surface is declared within a family's CapabilityContract; many agents " +
    "per contract (M:1).",
  src: AGENT_OBJECT_TYPE_RID,
  dst: CAPABILITY_CONTRACT_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "one",
};

/** GradingRubric -> SemanticIntentContract (1:N): 7-criterion SIC grader scores SICs. */
export const GRADING_RUBRIC_GRADES_SEMANTIC_INTENT_CONTRACT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid(
    "pm.self.ontology/link-type/grading-rubric-grades-semantic-intent-contract",
  ),
  name: "GradingRubricGradesSemanticIntentContract",
  description:
    "The 7-criterion SIC GradingRubric scores SemanticIntentContracts (sic_graded); " +
    "one rubric, many SICs (1:N).",
  src: GRADING_RUBRIC_OBJECT_TYPE_RID,
  dst: SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/**
 * RuntimeDecision -> RuntimeDecision (self, M:1): per-runtime projections derive from
 * ONE neutral decision (parity-checked). The runtime-neutrality keystone.
 */
export const RUNTIME_DECISION_PROJECTED_FROM_NEUTRAL_DECISION: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid(
    "pm.self.ontology/link-type/runtime-decision-projected-from-neutral-decision",
  ),
  name: "RuntimeDecisionProjectedFromNeutralDecision",
  description:
    "Per-runtime RuntimeDecision projections derive from ONE neutral decision " +
    "(parity-checked); a self-link (src === dst === RuntimeDecision), M:1. " +
    "The runtime-neutrality keystone.",
  src: RUNTIME_DECISION_OBJECT_TYPE_RID,
  dst: RUNTIME_DECISION_OBJECT_TYPE_RID,
  srcCardinality: "many",
  dstCardinality: "one",
};

/** RuntimeAdapter -> RuntimeDecision (1:N): adapter projects the neutral decision per-runtime. */
export const RUNTIME_ADAPTER_PROJECTS_RUNTIME_DECISION: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid("pm.self.ontology/link-type/runtime-adapter-projects-runtime-decision"),
  name: "RuntimeAdapterProjectsRuntimeDecision",
  description:
    "A RuntimeAdapter (claude/codex/gemini Hands) projects the ONE neutral " +
    "RuntimeDecision into its per-runtime form; one adapter, many decisions (1:N). " +
    "Pairs with the runtime-neutrality keystone self-link.",
  src: RUNTIME_ADAPTER_OBJECT_TYPE_RID,
  dst: RUNTIME_DECISION_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

/** PromptEnvelope -> SemanticIntentContract (1:N): raw front-door input a SIC is derived from. */
export const PROMPT_ENVELOPE_DERIVES_SEMANTIC_INTENT_CONTRACT: LinkTypeDeclaration = {
  kind: "plain",
  rid: linkTypeRid(
    "pm.self.ontology/link-type/prompt-envelope-derives-semantic-intent-contract",
  ),
  name: "PromptEnvelopeDerivesSemanticIntentContract",
  description:
    "A raw PromptEnvelope (prompt-front-door input) is the source a " +
    "SemanticIntentContract is derived from; one envelope, many SICs across fill " +
    "turns (1:N). Completes the front-door chain feeding the SIC -> DTC coupling.",
  src: PROMPT_ENVELOPE_OBJECT_TYPE_RID,
  dst: SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID,
  srcCardinality: "one",
  dstCardinality: "many",
};

// Register all 33 LinkTypes (the relationships). Importing this module self-
// registers them into LINK_TYPE_REGISTRY.
LINK_TYPE_REGISTRY.register(MCP_TOOL_BACKED_BY_MCP_HANDLER);
LINK_TYPE_REGISTRY.register(SKILL_INVOKES_MCP_TOOL);
LINK_TYPE_REGISTRY.register(AGENT_USES_SKILL);
LINK_TYPE_REGISTRY.register(HOOK_ENFORCES_RULE);
LINK_TYPE_REGISTRY.register(RULE_CROSS_REFS_RULE);
LINK_TYPE_REGISTRY.register(SEMANTIC_INTENT_CONTRACT_DERIVES_DIGITAL_TWIN_CHANGE_CONTRACT);
LINK_TYPE_REGISTRY.register(SEMANTIC_INTENT_CONTRACT_SUPERSEDES_PRIOR_CONTRACT);
LINK_TYPE_REGISTRY.register(DIGITAL_TWIN_CHANGE_CONTRACT_TOUCHES_PROJECT_ONTOLOGY_INDEX);
LINK_TYPE_REGISTRY.register(RUNTIME_DECISION_GATED_BY_DIGITAL_TWIN_CHANGE_CONTRACT);
LINK_TYPE_REGISTRY.register(RUNTIME_DECISION_EMITS_EVENT_ENVELOPE);
LINK_TYPE_REGISTRY.register(EVENT_ENVELOPE_BELONGS_TO_WORKFLOW_TRACE);
LINK_TYPE_REGISTRY.register(WORKFLOW_TRACE_REFINES_PRIOR_TRACE);
LINK_TYPE_REGISTRY.register(LEARNING_REFINES_RUNTIME_DECISION);
LINK_TYPE_REGISTRY.register(EVAL_SUITE_SCORED_BY_GRADING_RUBRIC);
LINK_TYPE_REGISTRY.register(EVAL_SUITE_EVALUATES_AGENT);
LINK_TYPE_REGISTRY.register(CAPABILITY_CONTRACT_UNIFIES_SKILL);
LINK_TYPE_REGISTRY.register(CAPABILITY_CONTRACT_UNIFIES_AGENT);
LINK_TYPE_REGISTRY.register(CAPABILITY_CONTRACT_UNIFIES_MCP_TOOL);
LINK_TYPE_REGISTRY.register(PLUGIN_MANIFEST_REGISTERS_MCP_TOOL);
LINK_TYPE_REGISTRY.register(PLUGIN_MANIFEST_REGISTERS_HOOK);
LINK_TYPE_REGISTRY.register(PLUGIN_MANIFEST_REGISTERS_SKILL);
LINK_TYPE_REGISTRY.register(PLUGIN_MANIFEST_REGISTERS_AGENT);
LINK_TYPE_REGISTRY.register(MANAGED_SETTINGS_FRAGMENT_GRANTS_MCP_TOOL);
LINK_TYPE_REGISTRY.register(MANAGED_SETTINGS_FRAGMENT_SCOPED_TO_PLUGIN_MANIFEST);
LINK_TYPE_REGISTRY.register(HOOK_GUARDS_ACTION_VIA_SUBMISSION_CRITERION);
LINK_TYPE_REGISTRY.register(EDIT_FUNCTION_PROPOSES_DIGITAL_TWIN_CHANGE_CONTRACT);
LINK_TYPE_REGISTRY.register(SANDBOX_SESSION_EXECUTES_EDIT_FUNCTION);
LINK_TYPE_REGISTRY.register(SANDBOX_SESSION_RESUMES_PRIOR_SESSION);
LINK_TYPE_REGISTRY.register(AGENT_OWNS_CAPABILITY_CONTRACT);
LINK_TYPE_REGISTRY.register(GRADING_RUBRIC_GRADES_SEMANTIC_INTENT_CONTRACT);
LINK_TYPE_REGISTRY.register(RUNTIME_DECISION_PROJECTED_FROM_NEUTRAL_DECISION);
LINK_TYPE_REGISTRY.register(RUNTIME_ADAPTER_PROJECTS_RUNTIME_DECISION);
LINK_TYPE_REGISTRY.register(PROMPT_ENVELOPE_DERIVES_SEMANTIC_INTENT_CONTRACT);
