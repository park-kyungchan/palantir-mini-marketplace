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
