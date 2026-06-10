// palantir-mini — lib/capability/agent-to-capability-contract.ts
// Converts AgentDefinitionDeclaration → CapabilityContract
// Mirrors skillContractToCapabilityContract + mcpToolSpecToCapabilityContract
// agents are first-class routable capabilities

import type { AgentDefinitionDeclaration } from "#schemas/ontology/primitives/agent-definition";
import {
  CAPABILITY_CONTRACT_SCHEMA_VERSION,
  normalizeCapabilityContract,
} from "./capability-contract";
import type { CapabilityContract } from "./capability-contract";

/** Tools that imply the agent can mutate project files. */
const MUTATION_TOOLS = new Set([
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "apply_edit_function",
  "commit_edits",
  "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function",
  "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
]);

function canMutate(decl: AgentDefinitionDeclaration): boolean {
  if ((decl as unknown as { requiresDtcForMutation?: boolean }).requiresDtcForMutation === true) {
    return true;
  }
  return decl.tools.some((t) => MUTATION_TOOLS.has(t));
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?\n]+[.!?]?/);
  return m ? m[0].trim() : text.slice(0, 120).trim();
}

/**
 * Extract meaningful noun tokens from the agent description for use as
 * intent-matcher nouns. Supplements with memory layer names when present.
 */
function extractNouns(decl: AgentDefinitionDeclaration): string[] {
  const nouns: string[] = [decl.slug];
  const memLayers = (decl as unknown as { memoryLayers?: string[] }).memoryLayers ?? [];
  nouns.push(...memLayers.map((l) => String(l)));
  // Split description by whitespace and punctuation; keep words ≥4 chars
  const words = decl.description
    .split(/[\s,;:\-\/]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9가-힣]/g, "").toLowerCase())
    .filter((w) => w.length >= 4);
  // Deduplicate and take up to 12
  const seen = new Set<string>();
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w);
      nouns.push(w);
    }
    if (nouns.length >= 14) break;
  }
  return nouns;
}

/**
 * Convert an AgentDefinitionDeclaration to a CapabilityContract so agents
 * can participate in CapabilityRouter scoring alongside skills and MCP tools.
 *
 * sourceRef is the agent .md path relative to the plugin root (agents/<slug>.md).
 * The caller (pm-intent-router handler) supplies the full REGISTRY and converts
 * each entry before passing as availableAgents to routeCapabilityOntology().
 */
export function agentDefinitionToCapabilityContract(
  decl: AgentDefinitionDeclaration,
): CapabilityContract {
  const extDecl = decl as unknown as {
    requiresDtcForMutation?: boolean;
    writable_paths?: string[];
    read_paths?: string[];
    ontologyAgent?: {
      version: string;
      contextRequired?: boolean;
      acceptsUniversalOntologyEntryRef?: boolean;
      acceptsOntologyContextQueryRef?: boolean;
      contextSeedMutationAuthority?: boolean;
    };
  };

  const mayMutate = canMutate(decl);
  const writeSurfaces = extDecl.writable_paths ?? [];
  const readSurfaces = extDecl.read_paths ?? [];
  const sourceRef = `agents/${decl.slug}.md`;

  const isDeprecated = (decl as unknown as { deprecated?: boolean }).deprecated === true;
  const supersededBy = (decl as unknown as { supersededBy?: string }).supersededBy;
  const nonGoals: string[] = isDeprecated && supersededBy
    ? [`This agent is deprecated; routing should prefer ${supersededBy}`]
    : [];

  const ontologyObjectRefs: string[] = extDecl.ontologyAgent
    ? [extDecl.ontologyAgent.version]
    : [];

  const nouns = extractNouns(decl);
  const verbs = mayMutate
    ? ["implement", "edit", "write", "modify", "refactor"]
    : ["review", "grade", "research", "evaluate", "analyze"];

  return normalizeCapabilityContract({
    schemaVersion: CAPABILITY_CONTRACT_SCHEMA_VERSION,
    capabilityId: `agent:${decl.slug}`,
    sourceKind: "agent",
    sourceRef,
    displayName: decl.slug,
    category: "agent",
    userFacingPurpose: firstSentence(decl.description),
    leadFacingPurpose: decl.description,
    inputOntology: {
      objectRefs: ontologyObjectRefs,
      requiredArtifacts: [],
      artifactLifecycle: {
        prerequisites: [],
        optionalInputs: [],
        creates: [],
        mutates: writeSurfaces,
      },
      allowedRawInputs: ["task assignment from Lead", "briefing prompt"],
    },
    outputOntology: {
      objectRefs: ontologyObjectRefs,
      artifactRefs: [],
      validationPacks: [],
    },
    actionBoundary: {
      mayMutateProjectFiles: mayMutate,
      mutationSurfaces: writeSurfaces,
      requiresDtcApproval: extDecl.requiresDtcForMutation === true,
    },
    nonGoals,
    failureModes: [],
    intentMatchers: [
      {
        matcherId: `agent:${decl.slug}:keywords`,
        naturalLanguageExamples: [
          firstSentence(decl.description),
          ...decl.description
            .split(/[.!?]/)
            .slice(1, 3)
            .map((s) => s.trim())
            .filter((s) => s.length > 10),
        ],
        nouns,
        verbs,
        projectScopeLanes: [],
      },
    ],
    readSurfaces,
    writeSurfaces,
    knownIssueRefs: [],
    metadata: {
      model: decl.model,
      tools: decl.tools,
      maxTurns: decl.maxTurns,
      deprecated: isDeprecated,
      supersededBy: isDeprecated ? supersededBy : undefined,
    },
  });
}
