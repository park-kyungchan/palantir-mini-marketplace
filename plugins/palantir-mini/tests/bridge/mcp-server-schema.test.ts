import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import { handleRequest, TOOLS } from "../../bridge/mcp-server";
import {
  DEFAULT_MCP_TOOL_SURFACE_PROFILE,
  INTERNAL_TELEMETRY_MCP_TOOL_NAMES,
  MCP_TOOL_SURFACE_PROFILE_ENV,
  PROTECTED_ACTION_MCP_TOOL_NAMES,
  STUDIO_CORE_MCP_TOOL_NAMES,
} from "../../lib/capability-registry/mcp-tool-capability";
import { PROMPT_RUNTIMES } from "../../lib/prompt-front-door";
import type { IntentRouterInput } from "../../bridge/handlers/pm-intent-router";
import type { OntologyContextQueryInput } from "../../bridge/handlers/ontology-context-query";
import type { OntologyEngineeringWorkflowHandlerInput } from "../../bridge/handlers/pm-ontology-engineering-workflow";
import type { SemanticIntentGateInput } from "../../bridge/handlers/pm-semantic-intent-gate";
import type { EventsLogRotateArgs } from "../../bridge/handlers/events-log-rotate";

type JsonSchemaObject = {
  additionalProperties?: boolean;
  anyOf?: Array<{ required?: string[] }>;
  properties?: Record<string, JsonSchemaObject & { type?: string; enum?: readonly string[]; description?: string; items?: JsonSchemaObject & { type?: string } }>;
  required?: string[];
};

const SEMANTIC_INTENT_GATE_PUBLIC_FIELDS = [
  "project",
  "rawIntent",
  "scopePaths",
  "complexityHint",
  "semanticIntentContractRef",
  "digitalTwinChangeContractRef",
  "semanticIntentContract",
  "digitalTwinChangeContract",
  "promptId",
  "promptHash",
  "sessionId",
  "runtime",
  "fdeOntologyEngineeringSessionRef",
  "includeDrafts",
  "draftMode",
  "interactionMode",
  "userExpertise",
  "preferredLanguage",
  "turn",
  "turnUserInput",
  "fillPolicy",
  "semanticConsistencyResolverInput",
] as const satisfies readonly (keyof SemanticIntentGateInput)[];

const INTENT_ROUTER_PUBLIC_FIELDS = [
  "project",
  "intent",
  "scopePaths",
  "complexityHint",
  "harnessSpeciesPreference",
  "semanticIntentContractRef",
  "digitalTwinChangeContractRef",
  "semanticIntentContract",
  "digitalTwinChangeContract",
  "promptId",
  "promptHash",
  "sessionId",
  "runtime",
  "fdeOntologyEngineeringSessionRef",
  "acceptApprovalAutoCreate",
] as const satisfies readonly (keyof IntentRouterInput)[];

const ONTOLOGY_CONTEXT_QUERY_PUBLIC_FIELDS = [
  "project",
  "promptId",
  "promptHash",
  "scopePaths",
  "requestedAxes",
  "includeImpact",
  "includeLineage",
  "includeCapabilities",
  "includeRisks",
  "includeEvals",
  "includeEvalRuns",
  "evalRunsProjectSlug",
  "evalRunsLimit",
  "projectsRoot",
  "includeDTCContext",
  "fdeOntologyEngineeringSession",
  "fdeOntologyEngineeringSessionRef",
] as const satisfies readonly (keyof OntologyContextQueryInput)[];

const ONTOLOGY_ENGINEERING_WORKFLOW_PUBLIC_FIELDS = [
  "action",
  "project",
  "projectRoot",
  "universalOntologyEntryRef",
  "universalOntologyEntryId",
  "sessionId",
  "fdeSessionRef",
  "ontologyContextQueryRef",
  "workflowTraceRef",
  "semanticIntentContractRef",
  "semanticIntentContractStatus",
  "digitalTwinChangeContractRef",
  "digitalTwinChangeContractStatus",
  "workContractRef",
  "affectedSurfaces",
  "recordedDecisionNote",
  "rawUserMessage",
  "sanitizedTurnSummary",
  "userMessageHash",
  "turnId",
  "acceptedHypothesisIds",
  "rejectedHypothesisIds",
  "deferredHypothesisIds",
  "choiceApplications",
  "signal",
  "createdAt",
  "emittedAt",
] as const satisfies readonly (keyof OntologyEngineeringWorkflowHandlerInput)[];

const EVENTS_LOG_ROTATE_PUBLIC_FIELDS = [
  "project",
  "thresholdBytes",
  "thresholdLines",
  "sessionId",
  "agentName",
] as const satisfies readonly (keyof EventsLogRotateArgs)[];

type MissingSemanticIntentGatePublicField = Exclude<
  keyof SemanticIntentGateInput,
  typeof SEMANTIC_INTENT_GATE_PUBLIC_FIELDS[number]
>;
type MissingIntentRouterPublicField = Exclude<
  keyof IntentRouterInput,
  typeof INTENT_ROUTER_PUBLIC_FIELDS[number]
>;
type MissingOntologyContextQueryPublicField = Exclude<
  keyof OntologyContextQueryInput,
  typeof ONTOLOGY_CONTEXT_QUERY_PUBLIC_FIELDS[number]
>;
type MissingOntologyEngineeringWorkflowPublicField = Exclude<
  keyof OntologyEngineeringWorkflowHandlerInput,
  typeof ONTOLOGY_ENGINEERING_WORKFLOW_PUBLIC_FIELDS[number]
>;
type MissingEventsLogRotatePublicField = Exclude<
  keyof EventsLogRotateArgs,
  typeof EVENTS_LOG_ROTATE_PUBLIC_FIELDS[number]
>;

const semanticIntentGateInputFieldsAreCovered: Record<MissingSemanticIntentGatePublicField, never> = {};
const intentRouterInputFieldsAreCovered: Record<MissingIntentRouterPublicField, never> = {};
const ontologyContextQueryInputFieldsAreCovered: Record<MissingOntologyContextQueryPublicField, never> = {};
const ontologyEngineeringWorkflowInputFieldsAreCovered: Record<MissingOntologyEngineeringWorkflowPublicField, never> = {};
const eventsLogRotateInputFieldsAreCovered: Record<MissingEventsLogRotatePublicField, never> = {};

afterEach(() => {
  delete process.env[MCP_TOOL_SURFACE_PROFILE_ENV];
});

function toolSchema(name: string): JsonSchemaObject {
  const tool = TOOLS.find((entry) => entry.name === name);
  expect(tool).toBeDefined();
  return tool!.inputSchema as JsonSchemaObject;
}

function toolSpec(name: string) {
  const tool = TOOLS.find((entry) => entry.name === name);
  expect(tool).toBeDefined();
  return tool!;
}

function expectSchemaPropertiesExactly(
  toolName: string,
  expectedFields: readonly string[],
): Record<string, { type?: string; enum?: readonly string[]; items?: { type?: string } }> {
  const schema = toolSchema(toolName);
  const props = schema.properties ?? {};

  expect(schema.additionalProperties).toBe(false);
  expect(Object.keys(props).sort()).toEqual([...expectedFields].sort());
  return props;
}

function expectProjectScopeAnyOf(schema: JsonSchemaObject): void {
  expect(schema.required).toContain("toolName");
  expect(schema.anyOf).toBeUndefined();
  expect(schema.properties?.project).toBeDefined();
  expect(schema.properties?.projectRoot).toBeDefined();
}

function collectCompositionKeywords(value: unknown, pathParts: string[] = []): string[] {
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectCompositionKeywords(item, [...pathParts, String(index)]),
    );
  }

  const object = value as Record<string, unknown>;
  const findings: string[] = [];
  for (const keyword of ["anyOf", "oneOf", "allOf", "not"] as const) {
    if (keyword in object) findings.push([...pathParts, keyword].join("."));
  }
  for (const [key, nested] of Object.entries(object)) {
    findings.push(...collectCompositionKeywords(nested, [...pathParts, key]));
  }
  return findings;
}

describe("mcp-server prompt identity schemas", () => {
  test.each(["pm_semantic_intent_gate", "pm_intent_router"])(
    "%s exposes prompt-front-door identity fields",
    (toolName) => {
      const schema = toolSchema(toolName);
      const props = schema.properties ?? {};

      expect(props.promptId?.type).toBe("string");
      expect(props.promptHash?.type).toBe("string");
      expect(props.sessionId?.type).toBe("string");
      expect(props.runtime?.type).toBe("string");
      expect(props.runtime?.enum).toEqual(PROMPT_RUNTIMES);
    },
  );

  test("pm_semantic_intent_gate exposes human-collaborative authoring fields", () => {
    const schema = toolSchema("pm_semantic_intent_gate");
    const props = schema.properties ?? {};

    expect(props.interactionMode?.type).toBe("string");
    expect(props.interactionMode?.enum).toEqual(["machine", "human_collaborative"]);
    expect(props.userExpertise?.type).toBe("string");
    expect(props.userExpertise?.enum).toEqual(["non_programmer", "technical", "developer"]);
    expect(props.preferredLanguage?.type).toBe("string");
    expect(props.preferredLanguage?.enum).toEqual(["ko", "en"]);
  });

  test("pm_semantic_intent_gate public schema matches handler input fields", () => {
    expect(semanticIntentGateInputFieldsAreCovered).toEqual({});

    const props = expectSchemaPropertiesExactly(
      "pm_semantic_intent_gate",
      SEMANTIC_INTENT_GATE_PUBLIC_FIELDS,
    );

    expect(props.project?.type).toBe("string");
    expect(props.rawIntent?.type).toBe("string");
    expect(props.scopePaths?.type).toBe("array");
    expect(props.scopePaths?.items?.type).toBe("string");
    expect(props.semanticIntentContractRef?.type).toBe("string");
    expect(props.digitalTwinChangeContractRef?.type).toBe("string");
    expect(props.semanticIntentContract?.type).toBe("object");
    expect(props.digitalTwinChangeContract?.type).toBe("object");
    expect(props.semanticConsistencyResolverInput?.type).toBe("object");
    expect(props.fillPolicy?.enum).toEqual([
      "default-8-turn",
      "fde-ontology-build",
      "dtc-turn-fill",
      "context-engineering-to-sic",
      "ontology-dtc-build",
    ]);
  });

  test("pm_intent_router public schema matches handler input fields", () => {
    expect(intentRouterInputFieldsAreCovered).toEqual({});

    const props = expectSchemaPropertiesExactly(
      "pm_intent_router",
      INTENT_ROUTER_PUBLIC_FIELDS,
    );

    expect(props.project?.type).toBe("string");
    expect(props.intent?.type).toBe("string");
    expect(props.scopePaths?.type).toBe("array");
    expect(props.scopePaths?.items?.type).toBe("string");
    expect(props.semanticIntentContractRef?.type).toBe("string");
    expect(props.digitalTwinChangeContractRef?.type).toBe("string");
    expect(props.semanticIntentContract?.type).toBe("object");
    expect(props.digitalTwinChangeContract?.type).toBe("object");
  });

  test("ontology_context_query public schema matches handler input fields", () => {
    expect(ontologyContextQueryInputFieldsAreCovered).toEqual({});

    const props = expectSchemaPropertiesExactly(
      "ontology_context_query",
      ONTOLOGY_CONTEXT_QUERY_PUBLIC_FIELDS,
    );

    expect(props.project?.type).toBe("string");
    expect(props.scopePaths?.type).toBe("array");
    expect(props.scopePaths?.items?.type).toBe("string");
    expect(props.requestedAxes?.type).toBe("array");
    expect(props.requestedAxes?.items?.type).toBe("string");
    expect(props.includeEvalRuns?.type).toBe("boolean");
    expect(props.evalRunsProjectSlug?.type).toBe("string");
    expect(props.evalRunsLimit?.type).toBe("number");
    expect(props.includeDTCContext?.type).toBe("boolean");
    expect(props.fdeOntologyEngineeringSession?.type).toBe("object");
    expect(props.fdeOntologyEngineeringSessionRef?.type).toBe("string");
  });

  test("Context Engineering MCP descriptions do not claim Ontology primitive authority", () => {
    const ontologyContext = toolSpec("ontology_context_query");
    const impactQuery = toolSpec("impact_query");
    const requestedAxes = toolSchema("ontology_context_query").properties?.requestedAxes;

    expect(ontologyContext.description).toContain("Context Engineering axes");
    expect(ontologyContext.description).toContain("not Ontology primitive declarations");
    expect(impactQuery.description).toContain("context selectors");
    expect(impactQuery.description).toContain("do not prove ObjectType/LinkType/ActionType/Function mutation authority");
    expect(requestedAxes?.description).toContain("not ObjectType/LinkType/ActionType/Function declarations");
  });

  test("pm_ontology_engineering_workflow public schema matches handler input fields", () => {
    expect(ontologyEngineeringWorkflowInputFieldsAreCovered).toEqual({});

    const props = expectSchemaPropertiesExactly(
      "pm_ontology_engineering_workflow",
      ONTOLOGY_ENGINEERING_WORKFLOW_PUBLIC_FIELDS,
    );

    expect(props.action?.type).toBe("string");
    expect(props.action?.enum).toEqual(["start", "turn", "draft_sic", "status"]);
    expect(props.project?.type).toBe("string");
    expect(props.projectRoot?.type).toBe("string");
    expect(props.fdeSessionRef?.type).toBe("string");
    expect(props.semanticIntentContractStatus?.enum).toEqual(["draft", "approved", "superseded"]);
    expect(props.digitalTwinChangeContractStatus?.enum).toEqual(["draft", "approved", "superseded"]);
    expect(props.choiceApplications?.type).toBe("array");
    expect(props.signal?.type).toBe("object");
  });
});

describe("mcp-server ToolSpec metadata", () => {
  test("public MCP input schemas avoid Codex-unsupported composition keywords", () => {
    const findings = TOOLS.flatMap((tool) =>
      collectCompositionKeywords(tool.inputSchema, [tool.name, "inputSchema"]),
    );

    expect(findings).toEqual([]);
  });

  test("all public tools carry internal metadata and tools/list exposes additive surface metadata", async () => {
    for (const tool of TOOLS) {
      expect(tool.audience).toBe("public");
      expect(tool.lifecycle).toBeTruthy();
      expect(["public", "deprecated-candidate", "deprecated", "merged"]).toContain(tool.lifecycle as string);
      expect(tool.category).toBeTruthy();
      expect(tool.ownerModule).toContain("bridge/handlers/");
      expect(tool.stableSince).toMatch(/^v\d+\.\d+\.\d+$/);
      expect(tool.surface).toBeDefined();
      expect(tool.surface?.profiles).toContain("dev-full");
      if (tool.lifecycle !== "public") {
        expect(tool.replacedBy).toBeTruthy();
      }
    }

    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response && "result" in response
      ? response.result as { tools: Array<Record<string, unknown>> }
      : null;
    expect(result).not.toBe(null);
    expect(result!.tools.length).toBe(STUDIO_CORE_MCP_TOOL_NAMES.length);
    expect(Object.keys(result!.tools[0]!).sort()).toEqual([
      "description",
      "inputSchema",
      "metadata",
      "name",
    ]);

    const metadata = result!.tools[0]!.metadata as {
      "palantir-mini"?: {
        activeProfile?: string;
        defaultProfile?: string;
        surface?: { status?: string; profiles?: string[] };
      };
    };
    expect(metadata["palantir-mini"]?.activeProfile).toBe(DEFAULT_MCP_TOOL_SURFACE_PROFILE);
    expect(metadata["palantir-mini"]?.defaultProfile).toBe(DEFAULT_MCP_TOOL_SURFACE_PROFILE);
    expect(metadata["palantir-mini"]?.surface?.profiles).toContain("dev-full");
  });

  test("default MCP profile is studio-core", async () => {
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response && "result" in response
      ? response.result as { defaultProfile: string; profile: string; tools: Array<{ name: string }> }
      : null;

    expect(result).not.toBe(null);
    expect(result!.defaultProfile).toBe("studio-core");
    expect(result!.profile).toBe("studio-core");
    expect(result!.tools.map((tool) => tool.name).sort()).toEqual(
      [...STUDIO_CORE_MCP_TOOL_NAMES].sort(),
    );
  });

  test("unknown MCP profile values fall back deterministically to studio-core", async () => {
    process.env[MCP_TOOL_SURFACE_PROFILE_ENV] = "surprise-profile";
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response && "result" in response
      ? response.result as { profile: string; tools: Array<{ name: string }> }
      : null;

    expect(result).not.toBe(null);
    expect(result!.profile).toBe("studio-core");
    expect(result!.tools.map((tool) => tool.name).sort()).toEqual(
      [...STUDIO_CORE_MCP_TOOL_NAMES].sort(),
    );
  });

  test("studio-core tools/list hides protected and dev-only tools", async () => {
    process.env[MCP_TOOL_SURFACE_PROFILE_ENV] = "studio-core";
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response && "result" in response
      ? response.result as { profile: string; tools: Array<{ name: string }> }
      : null;
    const names = result!.tools.map((tool) => tool.name).sort();

    expect(result?.profile).toBe("studio-core");
    expect(names).toEqual([...STUDIO_CORE_MCP_TOOL_NAMES].sort());
    expect(names).not.toContain("apply_edit_function");
    expect(names).not.toContain("commit_edits");
    expect(names).not.toContain("emit_event");
    expect(names).not.toContain("pm_plugin_self_check");
  });

  test("tools/call rejects hidden protected tools under studio-core", async () => {
    process.env[MCP_TOOL_SURFACE_PROFILE_ENV] = "studio-core";
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "commit_edits",
        arguments: {},
      },
    });

    expect(response).not.toBe(null);
    expect("error" in response!).toBe(true);
    if (response && "error" in response) {
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain("not visible in MCP profile `studio-core`");
      expect(response.error.data).toMatchObject({
        profile: "studio-core",
        defaultProfile: "studio-core",
        toolName: "commit_edits",
      });
    }
  });

  test("protected-actions profile includes protected mutation tools and studio-core", async () => {
    process.env[MCP_TOOL_SURFACE_PROFILE_ENV] = "protected-actions";
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response && "result" in response
      ? response.result as { profile: string; tools: Array<{ name: string }> }
      : null;
    const names = new Set(result!.tools.map((tool) => tool.name));

    expect(result?.profile).toBe("protected-actions");
    expect(result!.tools.length).toBe(
      STUDIO_CORE_MCP_TOOL_NAMES.length + PROTECTED_ACTION_MCP_TOOL_NAMES.length,
    );
    for (const toolName of STUDIO_CORE_MCP_TOOL_NAMES) {
      expect(names.has(toolName)).toBe(true);
    }
    for (const toolName of PROTECTED_ACTION_MCP_TOOL_NAMES) {
      expect(names.has(toolName)).toBe(true);
    }
    expect(names.has("pm_plugin_self_check")).toBe(false);
    expect(names.has("emit_event")).toBe(false);
  });

  test("internal-telemetry profile includes telemetry tools and studio-core", async () => {
    process.env[MCP_TOOL_SURFACE_PROFILE_ENV] = "internal-telemetry";
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response && "result" in response
      ? response.result as { profile: string; tools: Array<{ name: string }> }
      : null;
    const names = new Set(result!.tools.map((tool) => tool.name));

    expect(result?.profile).toBe("internal-telemetry");
    expect(result!.tools.length).toBe(
      STUDIO_CORE_MCP_TOOL_NAMES.length + INTERNAL_TELEMETRY_MCP_TOOL_NAMES.length,
    );
    for (const toolName of STUDIO_CORE_MCP_TOOL_NAMES) {
      expect(names.has(toolName)).toBe(true);
    }
    for (const toolName of INTERNAL_TELEMETRY_MCP_TOOL_NAMES) {
      expect(names.has(toolName)).toBe(true);
    }
    expect(names.has("pm_plugin_self_check")).toBe(false);
    expect(names.has("commit_edits")).toBe(false);
  });

  test("pm_plugin_self_check schema exposes mode discriminator", () => {
    const props = toolSchema("pm_plugin_self_check").properties ?? {};
    expect(props.mode?.type).toBe("string");
    expect(props.mode?.enum).toEqual([
      "public-mcp",
      "handler-inventory",
      "hooks",
      "skills",
      "project-skill-ontology",
      "agents",
      "managed-settings",
      "surface-contracts",
      "release",
    ]);
  });

  test("pm_rule_query schema describes flat discriminator preflight", () => {
    const tool = toolSpec("pm_rule_query");
    const props = toolSchema("pm_rule_query").properties ?? {};

    expect(tool.description).toContain("Preflight");
    expect(tool.description).toContain("exactly one discriminator");
    expect(tool.description).toContain("omit all three for list mode");
    expect(props.byId?.description).toContain("Set only byId");
    expect(props.bySlug?.description).toContain("Set only bySlug");
    expect(props.byQuery?.description).toContain("non-empty byQuery");
    expect(props.compact?.description).toContain("Omit byId, bySlug, and byQuery");
    expect(toolSchema("pm_rule_query").required).toBeUndefined();
  });

  test("pm_surface_contract_audit schema exposes advisory rollout controls", () => {
    const props = toolSchema("pm_surface_contract_audit").properties ?? {};

    expect(props.projectRoot?.type).toBe("string");
    expect(props.mode?.type).toBe("string");
    expect(props.mode?.enum).toEqual([
      "agents",
      "skills",
      "mcp-tools",
      "hooks",
      "evals",
      "runtime-adapters",
      "all",
    ]);
    expect(props.failClosed?.type).toBe("boolean");
  });

  test("local AIP/FDE validator tools expose object contracts", () => {
    const sourceAuthority = toolSchema("pm_aip_source_authority_validate");
    const sourceProps = sourceAuthority.properties ?? {};
    expect(sourceAuthority.required).toEqual(["surfaceContract"]);
    expect(sourceProps.surfaceContract?.type).toBe("object");

    const parity = toolSchema("pm_runtime_decision_parity");
    const parityProps = parity.properties ?? {};
    expect(parity.required).toEqual(["neutral", "claude", "codex"]);
    expect(parityProps.neutral?.type).toBe("object");
    expect(parityProps.claude?.type).toBe("object");
    expect(parityProps.codex?.type).toBe("object");
  });

  test("research_context_select schema exposes authority mode discriminator", () => {
    const props = toolSchema("research_context_select").properties ?? {};

    expect(props.authorityMode?.type).toBe("string");
    expect(props.authorityMode?.enum).toEqual([
      "plugin-portable",
      "external-preferred",
      "external-required",
    ]);
  });

  test("pm_workflow_response_validate schema exposes required text field", () => {
    const schema = toolSchema("pm_workflow_response_validate");
    const props = schema.properties ?? {};

    expect(schema.required).toEqual(["text"]);
    expect(props.text?.type).toBe("string");
    expect(props.promptText?.type).toBe("string");
    expect(props.runtime?.type).toBe("string");
    expect(props.enforcementSurface?.type).toBe("string");
    expect(props.forceRequired?.type).toBe("boolean");
  });

  test("events_log_rotate schema matches handler input fields", () => {
    expect(eventsLogRotateInputFieldsAreCovered).toEqual({});

    const props = expectSchemaPropertiesExactly(
      "events_log_rotate",
      EVENTS_LOG_ROTATE_PUBLIC_FIELDS,
    );

    expect(toolSchema("events_log_rotate").required).toEqual(["project"]);
    expect(props.project?.type).toBe("string");
    expect(props.thresholdBytes?.type).toBe("number");
    expect(props.thresholdLines?.type).toBe("number");
    expect(props.sessionId?.type).toBe("string");
    expect(props.agentName?.type).toBe("string");
  });

  test("pm_pre_mutation_governance schemas require project scope", () => {
    const inlineSchema = toolSchema("pm_pre_mutation_governance");
    expectProjectScopeAnyOf(inlineSchema);

    const fileSchema = JSON.parse(
      fs.readFileSync("schemas/pm-pre-mutation-governance.input.schema.json", "utf8"),
    ) as JsonSchemaObject;
    expectProjectScopeAnyOf(fileSchema);
  });
});
