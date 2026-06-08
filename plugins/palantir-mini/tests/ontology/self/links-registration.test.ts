// Tests: Wave-2 self-Ontology LinkType GRAPH — pm's OWN relationships registered AS
// Palantir LinkType instances (catalog §3). The §3 header/notes enumerate 33 distinct
// edges: the 31 core/second-tier core edges plus 2 front-door/runtime-neutrality
// completers (RuntimeAdapterProjectsRuntimeDecision, PromptEnvelopeDerivesSemanticIntentContract).
// This test pins the full set: every edge resolves by RID, no duplicate RIDs, and every endpoint
// (src/dst) is itself a REGISTERED self ObjectType (the invariant that turns a bag of
// objects into an Ontology). Importing self/index fires all ObjectType registrations
// plus the links.ts side-effect.

import { test, expect } from "bun:test";
import type {
  LinkTypeDeclaration,
  LinkTypeRid,
  ObjectBackedLinkTypeDeclaration,
} from "#schemas/ontology/primitives/link-type";
import { LINK_TYPE_REGISTRY } from "#schemas/ontology/primitives/link-type";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import type { ObjectTypeRid } from "#schemas/ontology/primitives/object-type";
// Importing the self barrel executes every self ObjectType module (endpoint
// registration) AND links.ts (LinkType registration) via side effect.
import "#schemas/ontology/self/index";
import {
  MCP_TOOL_BACKED_BY_MCP_HANDLER,
  SKILL_INVOKES_MCP_TOOL,
  AGENT_USES_SKILL,
  HOOK_ENFORCES_RULE,
  RULE_CROSS_REFS_RULE,
  SEMANTIC_INTENT_CONTRACT_DERIVES_DIGITAL_TWIN_CHANGE_CONTRACT,
  SEMANTIC_INTENT_CONTRACT_SUPERSEDES_PRIOR_CONTRACT,
  DIGITAL_TWIN_CHANGE_CONTRACT_TOUCHES_PROJECT_ONTOLOGY_INDEX,
  RUNTIME_DECISION_GATED_BY_DIGITAL_TWIN_CHANGE_CONTRACT,
  RUNTIME_DECISION_EMITS_EVENT_ENVELOPE,
  EVENT_ENVELOPE_BELONGS_TO_WORKFLOW_TRACE,
  WORKFLOW_TRACE_REFINES_PRIOR_TRACE,
  LEARNING_REFINES_RUNTIME_DECISION,
  EVAL_SUITE_SCORED_BY_GRADING_RUBRIC,
  EVAL_SUITE_EVALUATES_AGENT,
  CAPABILITY_CONTRACT_UNIFIES_SKILL,
  CAPABILITY_CONTRACT_UNIFIES_AGENT,
  CAPABILITY_CONTRACT_UNIFIES_MCP_TOOL,
  PLUGIN_MANIFEST_REGISTERS_MCP_TOOL,
  PLUGIN_MANIFEST_REGISTERS_HOOK,
  PLUGIN_MANIFEST_REGISTERS_SKILL,
  PLUGIN_MANIFEST_REGISTERS_AGENT,
  MANAGED_SETTINGS_FRAGMENT_GRANTS_MCP_TOOL,
  MANAGED_SETTINGS_FRAGMENT_SCOPED_TO_PLUGIN_MANIFEST,
  HOOK_GUARDS_ACTION_VIA_SUBMISSION_CRITERION,
  EDIT_FUNCTION_PROPOSES_DIGITAL_TWIN_CHANGE_CONTRACT,
  SANDBOX_SESSION_EXECUTES_EDIT_FUNCTION,
  SANDBOX_SESSION_RESUMES_PRIOR_SESSION,
  AGENT_OWNS_CAPABILITY_CONTRACT,
  GRADING_RUBRIC_GRADES_SEMANTIC_INTENT_CONTRACT,
  RUNTIME_DECISION_PROJECTED_FROM_NEUTRAL_DECISION,
  RUNTIME_ADAPTER_PROJECTS_RUNTIME_DECISION,
  PROMPT_ENVELOPE_DERIVES_SEMANTIC_INTENT_CONTRACT,
} from "#schemas/ontology/self/links";

// The complete catalog §3 edge set (33 distinct LinkTypes).
const ALL_LINKS: ReadonlyArray<LinkTypeDeclaration> = [
  MCP_TOOL_BACKED_BY_MCP_HANDLER,
  SKILL_INVOKES_MCP_TOOL,
  AGENT_USES_SKILL,
  HOOK_ENFORCES_RULE,
  RULE_CROSS_REFS_RULE,
  SEMANTIC_INTENT_CONTRACT_DERIVES_DIGITAL_TWIN_CHANGE_CONTRACT,
  SEMANTIC_INTENT_CONTRACT_SUPERSEDES_PRIOR_CONTRACT,
  DIGITAL_TWIN_CHANGE_CONTRACT_TOUCHES_PROJECT_ONTOLOGY_INDEX,
  RUNTIME_DECISION_GATED_BY_DIGITAL_TWIN_CHANGE_CONTRACT,
  RUNTIME_DECISION_EMITS_EVENT_ENVELOPE,
  EVENT_ENVELOPE_BELONGS_TO_WORKFLOW_TRACE,
  WORKFLOW_TRACE_REFINES_PRIOR_TRACE,
  LEARNING_REFINES_RUNTIME_DECISION,
  EVAL_SUITE_SCORED_BY_GRADING_RUBRIC,
  EVAL_SUITE_EVALUATES_AGENT,
  CAPABILITY_CONTRACT_UNIFIES_SKILL,
  CAPABILITY_CONTRACT_UNIFIES_AGENT,
  CAPABILITY_CONTRACT_UNIFIES_MCP_TOOL,
  PLUGIN_MANIFEST_REGISTERS_MCP_TOOL,
  PLUGIN_MANIFEST_REGISTERS_HOOK,
  PLUGIN_MANIFEST_REGISTERS_SKILL,
  PLUGIN_MANIFEST_REGISTERS_AGENT,
  MANAGED_SETTINGS_FRAGMENT_GRANTS_MCP_TOOL,
  MANAGED_SETTINGS_FRAGMENT_SCOPED_TO_PLUGIN_MANIFEST,
  HOOK_GUARDS_ACTION_VIA_SUBMISSION_CRITERION,
  EDIT_FUNCTION_PROPOSES_DIGITAL_TWIN_CHANGE_CONTRACT,
  SANDBOX_SESSION_EXECUTES_EDIT_FUNCTION,
  SANDBOX_SESSION_RESUMES_PRIOR_SESSION,
  AGENT_OWNS_CAPABILITY_CONTRACT,
  GRADING_RUBRIC_GRADES_SEMANTIC_INTENT_CONTRACT,
  RUNTIME_DECISION_PROJECTED_FROM_NEUTRAL_DECISION,
  RUNTIME_ADAPTER_PROJECTS_RUNTIME_DECISION,
  PROMPT_ENVELOPE_DERIVES_SEMANTIC_INTENT_CONTRACT,
];

const EXPECTED_LINK_COUNT = 33;

// The 5 catalog-named self-links (src === dst).
const SELF_LINK_NAMES: ReadonlySet<string> = new Set([
  "RuleCrossRefsRule",
  "SemanticIntentContractSupersedesPriorContract",
  "WorkflowTraceRefinesPriorTrace",
  "SandboxSessionResumesPriorSession",
  "RuntimeDecisionProjectedFromNeutralDecision",
]);

test("every self LinkType resolves from LINK_TYPE_REGISTRY by its RID", () => {
  for (const link of ALL_LINKS) {
    const got: LinkTypeDeclaration | undefined = LINK_TYPE_REGISTRY.get(link.rid);
    expect(got).toBeDefined();
    expect(got).toBe(link);
  }
});

test("LINK_TYPE_REGISTRY holds exactly the 33 catalog edges (no more, no fewer)", () => {
  expect(ALL_LINKS.length).toBe(EXPECTED_LINK_COUNT);
  const registered: ReadonlyArray<LinkTypeDeclaration> = LINK_TYPE_REGISTRY.list();
  expect(registered.length).toBe(EXPECTED_LINK_COUNT);
  // Every registered link is one of the exported decls (no stray registrations).
  const exportedRids: ReadonlySet<LinkTypeRid> = new Set(
    ALL_LINKS.map((link: LinkTypeDeclaration): LinkTypeRid => link.rid),
  );
  for (const link of registered) {
    expect(exportedRids.has(link.rid)).toBe(true);
  }
});

test("LinkType RIDs are unique (no duplicate registrations)", () => {
  const rids: ReadonlyArray<LinkTypeRid> = ALL_LINKS.map(
    (link: LinkTypeDeclaration): LinkTypeRid => link.rid,
  );
  const unique: ReadonlySet<LinkTypeRid> = new Set(rids);
  expect(unique.size).toBe(rids.length);
});

test("LinkType names are unique", () => {
  const names: ReadonlyArray<string> = ALL_LINKS.map(
    (link: LinkTypeDeclaration): string => link.name,
  );
  expect(new Set(names).size).toBe(names.length);
});

test("every endpoint RID (src + dst) resolves to a registered self ObjectType", () => {
  for (const link of ALL_LINKS) {
    const endpoints: ReadonlyArray<ObjectTypeRid> = [link.src, link.dst];
    for (const endpoint of endpoints) {
      const objectType = OBJECT_TYPE_REGISTRY.get(endpoint);
      expect(objectType).toBeDefined();
      expect(objectType!.rid).toBe(endpoint);
    }
  }
});

test("the 5 catalog self-links have src === dst; all other edges do not", () => {
  for (const link of ALL_LINKS) {
    const isSelf: boolean = link.src === link.dst;
    expect(isSelf).toBe(SELF_LINK_NAMES.has(link.name));
  }
});

test("ManagedSettingsFragmentGrantsMcpTool is the sole object-backed edge, carrying a mode property", () => {
  const objectBacked: ReadonlyArray<LinkTypeDeclaration> = ALL_LINKS.filter(
    (link: LinkTypeDeclaration): boolean => link.kind === "object-backed",
  );
  expect(objectBacked.length).toBe(1);
  const edge = objectBacked[0] as ObjectBackedLinkTypeDeclaration;
  expect(edge.name).toBe("ManagedSettingsFragmentGrantsMcpTool");
  expect(edge.properties.some((p: { name: string }): boolean => p.name === "mode")).toBe(true);
});

test("every edge carries valid cardinalities on both ends", () => {
  for (const link of ALL_LINKS) {
    expect(["one", "many"]).toContain(link.srcCardinality);
    expect(["one", "many"]).toContain(link.dstCardinality);
  }
});
