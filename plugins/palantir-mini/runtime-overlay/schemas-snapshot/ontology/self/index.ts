/**
 * palantir-mini SELF-ONTOLOGY barrel (M-SELF home).
 *
 * pm's OWN control surface registered as typed Palantir primitive instances —
 * the deliverable that un-latents the self-Ontology (register-grep was 0 across
 * the snapshot; see `pm-self-ontology-milestone`). Importing this barrel executes
 * each instance module, which self-registers into the primitive registries.
 *
 * M-SELF counter (effort README §M-SELF): instances accrue one per neutralized
 * wave (W3d/e/f). Today: 2 ObjectType (SemanticIntentContract, McpTool) + 1
 * ActionType (Executor) + 1 embedded Struct (SicAxis). W3e-3a added the Executor
 * ActionType + the McpTool ObjectType (29 tool instances). W3f wires `self/links.ts`
 * (LinkTypes) and runs the dogfood (ONTOLOGY_DTC_BUILD_SEQUENCE ready-for-dtc +
 * propagation_audit_forward with pm as subject).
 *
 * @owner palantirkc-ontology
 */

export {
  SIC_AXIS_STRUCT,
  SIC_AXIS_STRUCT_RID,
} from "./sic-axis.struct";
export {
  SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE,
  SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID,
} from "./semantic-intent-contract.objecttype";
export {
  EXECUTOR_ACTION_TYPE,
  EXECUTOR_ACTION_TYPE_RID,
} from "./executor.actiontype";
export {
  MCP_TOOL_OBJECT_TYPE,
  MCP_TOOL_OBJECT_TYPE_RID,
  MCP_TOOL_INSTANCES,
  type McpToolInstance,
} from "./mcp-tool.objecttype";
export {
  SKILL_OBJECT_TYPE,
  SKILL_OBJECT_TYPE_RID,
  SKILL_INSTANCES,
  type SkillInstance,
} from "./skill.objecttype";
export {
  AGENT_OBJECT_TYPE,
  AGENT_OBJECT_TYPE_RID,
  AGENT_INSTANCES,
  type AgentInstance,
} from "./agent.objecttype";
export {
  HOOK_OBJECT_TYPE,
  HOOK_OBJECT_TYPE_RID,
  HOOK_INSTANCES,
  type HookInstance,
} from "./hook.objecttype";
export {
  MCP_HANDLER_OBJECT_TYPE,
  MCP_HANDLER_OBJECT_TYPE_RID,
  MCP_HANDLER_INSTANCES,
  type McpHandlerInstance,
} from "./mcp-handler.objecttype";
export {
  EVENT_ENVELOPE_OBJECT_TYPE,
  EVENT_ENVELOPE_OBJECT_TYPE_RID,
  EVENT_ENVELOPE_INSTANCES,
  type EventEnvelopeInstance,
} from "./event-envelope.objecttype";
export {
  CAPABILITY_CONTRACT_OBJECT_TYPE,
  CAPABILITY_CONTRACT_OBJECT_TYPE_RID,
  CAPABILITY_CONTRACT_INSTANCES,
  type CapabilityContractInstance,
} from "./capability-contract.objecttype";
export {
  CAPABILITY_TOKEN_OBJECT_TYPE,
  CAPABILITY_TOKEN_OBJECT_TYPE_RID,
  CAPABILITY_TOKEN_INSTANCES,
  type CapabilityTokenInstance,
} from "./capability-token.objecttype";
export {
  CONTEXT_CAPSULE_OBJECT_TYPE,
  CONTEXT_CAPSULE_OBJECT_TYPE_RID,
  CONTEXT_CAPSULE_INSTANCES,
  type ContextCapsuleInstance,
} from "./context-capsule.objecttype";
export {
  DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE,
  DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID,
  DIGITAL_TWIN_CHANGE_CONTRACT_INSTANCES,
  type DigitalTwinChangeContractInstance,
} from "./digital-twin-change-contract.objecttype";
export {
  EDIT_FUNCTION_OBJECT_TYPE,
  EDIT_FUNCTION_OBJECT_TYPE_RID,
  EDIT_FUNCTION_INSTANCES,
  type EditFunctionInstance,
} from "./edit-function.objecttype";
export {
  EVAL_SUITE_OBJECT_TYPE,
  EVAL_SUITE_OBJECT_TYPE_RID,
  EVAL_SUITE_INSTANCES,
  type EvalSuiteInstance,
} from "./eval-suite.objecttype";
export {
  FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE,
  FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE_RID,
  FDE_ONTOLOGY_BUILD_SESSION_INSTANCES,
  type FdeOntologyBuildSessionInstance,
} from "./fde-ontology-build-session.objecttype";
export {
  GRADING_RUBRIC_OBJECT_TYPE,
  GRADING_RUBRIC_OBJECT_TYPE_RID,
  GRADING_RUBRIC_INSTANCES,
  type GradingRubricInstance,
} from "./grading-rubric.objecttype";
export {
  IMPACT_EDGE_OBJECT_TYPE,
  IMPACT_EDGE_OBJECT_TYPE_RID,
  IMPACT_EDGE_INSTANCES,
  type ImpactEdgeInstance,
} from "./impact-edge.objecttype";
export {
  LEARNING_OBJECT_TYPE,
  LEARNING_OBJECT_TYPE_RID,
  LEARNING_INSTANCES,
  type LearningInstance,
} from "./learning.objecttype";
export {
  MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE,
  MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE_RID,
  MANAGED_SETTINGS_FRAGMENT_INSTANCES,
  type ManagedSettingsFragmentInstance,
} from "./managed-settings-fragment.objecttype";
export {
  MONITOR_OBJECT_TYPE,
  MONITOR_OBJECT_TYPE_RID,
  MONITOR_INSTANCES,
  type MonitorInstance,
} from "./monitor.objecttype";
export {
  PLUGIN_MANIFEST_OBJECT_TYPE,
  PLUGIN_MANIFEST_OBJECT_TYPE_RID,
  PLUGIN_MANIFEST_INSTANCES,
  type PluginManifestInstance,
} from "./plugin-manifest.objecttype";
export {
  PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE,
  PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE_RID,
  PROJECT_ONTOLOGY_INDEX_INSTANCES,
  type ProjectOntologyIndexInstance,
} from "./project-ontology-index.objecttype";
export {
  PROMPT_ENVELOPE_OBJECT_TYPE,
  PROMPT_ENVELOPE_OBJECT_TYPE_RID,
  PROMPT_ENVELOPE_INSTANCES,
  type PromptEnvelopeInstance,
} from "./prompt-envelope.objecttype";
export {
  RULE_OBJECT_TYPE,
  RULE_OBJECT_TYPE_RID,
  RULE_INSTANCES,
  type RuleInstance,
} from "./rule.objecttype";
export {
  RUNTIME_ADAPTER_OBJECT_TYPE,
  RUNTIME_ADAPTER_OBJECT_TYPE_RID,
  RUNTIME_ADAPTER_INSTANCES,
  type RuntimeAdapterInstance,
} from "./runtime-adapter.objecttype";
export {
  RUNTIME_DECISION_OBJECT_TYPE,
  RUNTIME_DECISION_OBJECT_TYPE_RID,
  RUNTIME_DECISION_INSTANCES,
  type RuntimeDecisionInstance,
} from "./runtime-decision.objecttype";
export {
  SCENARIO_SANDBOX_OBJECT_TYPE,
  SCENARIO_SANDBOX_OBJECT_TYPE_RID,
  SCENARIO_SANDBOX_INSTANCES,
  type ScenarioSandboxInstance,
} from "./scenario-sandbox.objecttype";
export {
  SUBMISSION_CRITERION_OBJECT_TYPE,
  SUBMISSION_CRITERION_OBJECT_TYPE_RID,
  SUBMISSION_CRITERION_INSTANCES,
  type SubmissionCriterionInstance,
} from "./submission-criterion.objecttype";
export {
  UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE,
  UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE_RID,
  UNIVERSAL_ONTOLOGY_ENTRY_INSTANCES,
  type UniversalOntologyEntryInstance,
} from "./universal-ontology-entry.objecttype";
export {
  WORKFLOW_TRACE_OBJECT_TYPE,
  WORKFLOW_TRACE_OBJECT_TYPE_RID,
  WORKFLOW_TRACE_INSTANCES,
  type WorkflowTraceInstance,
} from "./workflow-trace.objecttype";
