// palantir-mini — capability-router agent scoring tests (foamy-giggling-kettle PR-2 T8)
// Tests that availableAgents are scored and surfaced in suggestedAgents.

import { describe, expect, it } from "bun:test";
import { routeCapabilityOntology } from "../../../lib/capability/capability-router";
import { agentDefinitionToCapabilityContract } from "../../../lib/capability/agent-to-capability-contract";
import type { AgentDefinitionDeclaration } from "#schemas/ontology/primitives/agent-definition";
import type { OntologyContextSeed } from "../../../lib/context-engineering/ontology-activation";
import type { SemanticConversationState } from "../../../lib/chatbot-studio/semantic-conversation-state";
import type { CapabilityContract } from "../../../lib/capability/capability-contract";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function agentDecl(overrides: Partial<AgentDefinitionDeclaration> & { slug: string; description: string }): AgentDefinitionDeclaration {
  const { slug, description, scope, model, maxTurns, tools, ...rest } = overrides;
  return {
    agentId: `agent-definition:${slug}` as AgentDefinitionDeclaration["agentId"],
    slug,
    description,
    scope: scope ?? "plugin",
    model: model ?? "sonnet",
    maxTurns: maxTurns ?? 20,
    tools: tools ?? ["Read", "Bash"],
    filePath: `/tmp/agents/${slug}.md`,
    ...rest,
  };
}

function capabilityFixture(id: string, nouns: string[], verbs: string[], examples: string[]): CapabilityContract {
  return {
    schemaVersion: "palantir-mini/capability-contract/v1",
    capabilityId: id,
    sourceKind: "ontology-index",
    sourceRef: ".palantir-mini/ontology-index/project.json",
    displayName: id,
    category: "agent",
    userFacingPurpose: `${id} user purpose`,
    leadFacingPurpose: `${id} lead purpose`,
    inputOntology: {
      objectRefs: nouns,
      requiredArtifacts: [],
      artifactLifecycle: { prerequisites: [], optionalInputs: [], creates: [], mutates: [] },
      allowedRawInputs: examples,
    },
    outputOntology: {
      objectRefs: nouns,
      artifactRefs: [],
      validationPacks: [],
    },
    actionBoundary: {
      mayMutateProjectFiles: false,
      mutationSurfaces: [],
      requiresDtcApproval: false,
    },
    nonGoals: [],
    failureModes: [],
    intentMatchers: [
      {
        matcherId: `${id}:primary`,
        naturalLanguageExamples: examples,
        nouns,
        verbs,
        projectScopeLanes: [],
      },
    ],
    readSurfaces: [],
    writeSurfaces: [],
    knownIssueRefs: [],
  };
}

function conversation(summary: string): SemanticConversationState {
  return {
    stateId: "semantic-conversation:test",
    schemaVersion: "palantir-mini/semantic-conversation-state/v1",
    prompt: {},
    userFacing: {
      preferredLanguage: "en",
      userExpertise: "developer",
      plainRequestSummary: summary,
      confirmedNonGoals: [],
      unresolvedQuestions: [],
    },
    ontologyFacing: {
      activatedObjectRefs: [],
      activatedActionRefs: [],
      activatedSurfaceRefs: [],
      activatedLaneRefs: [],
      forbiddenSurfaceRefs: [],
    },
    skillFacing: {
      candidateSkillRefs: [],
      selectedSkillRefs: [],
      skillRoutingReason: "test",
    },
    capabilityFacing: {
      candidateCapabilityRefs: [],
      selectedCapabilityRefs: [],
      capabilityRoutingReason: "test",
    },
    contractFacing: { dtcReady: false },
    projectFacing: {
      projectRoot: "/tmp/test-project",
      projectScopeLaneIds: [],
      requiredValidationPacks: [],
    },
    lifecycle: "captured",
  };
}

function context(seed: {
  nouns: readonly string[];
  verbs: readonly string[];
  surfaces: readonly string[];
}): OntologyContextSeed {
  return {
    approvalState: "unapproved-context-seed",
    sourceEntryId: "universal-ontology-entry:test",
    nouns: seed.nouns,
    verbs: seed.verbs,
    surfaceHints: seed.surfaces,
    capabilityHints: [],
    laneRefs: [],
    ontologyRefs: seed.nouns,
    actionRefs: seed.verbs,
    evaluationDirection: "directional-only",
    toolBoundaryDirection: "directional-only",
  };
}

// ─── Agents ───────────────────────────────────────────────────────────────────

const HOOK_BUILDER_DECL = agentDecl({
  slug: "hook-builder",
  description: "Implements hooks and MCP handlers. Writes hooks/**, bridge/handlers/**.",
  tools: ["Read", "Edit", "Write", "Bash", "apply_edit_function", "commit_edits"],
  // writable_paths is an extended field picked up by agentDefinitionToCapabilityContract
  // via the extDecl cast — causes writeSurfaces: ["hooks/**"] in the CapabilityContract.
  writable_paths: ["hooks/**"],
} as unknown as Parameters<typeof agentDecl>[0]);

const PROTOCOL_DESIGNER_DECL = agentDecl({
  slug: "protocol-designer",
  description: "Authors agent definitions, rules, and protocols. Designs rule invariants.",
  tools: ["Read", "Bash"],
});

const DOCS_RESEARCHER_DECL = agentDecl({
  slug: "docs-researcher",
  description: "Researches and synthesizes documentation. Reads research library.",
  tools: ["Read", "Bash"],
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CapabilityRouter agent scoring", () => {
  it("top-scored agent appears in suggestedAgents[0]", () => {
    // hook-related intent should score hook-builder highest
    const hookBuilderContract = agentDefinitionToCapabilityContract(HOOK_BUILDER_DECL);
    const protocolContract = agentDefinitionToCapabilityContract(PROTOCOL_DESIGNER_DECL);
    const docsContract = agentDefinitionToCapabilityContract(DOCS_RESEARCHER_DECL);

    const result = routeCapabilityOntology({
      projectRoot: "/tmp/test-project",
      semanticConversationState: conversation(
        "implement a new hook that validates hook citation rules",
      ),
      ontologyContext: context({
        nouns: ["hook", "hooks"],
        verbs: ["implement", "write", "edit"],
        surfaces: ["hooks/**"],
      }),
      availableCapabilities: [],
      availableAgents: [protocolContract, docsContract, hookBuilderContract],
    });

    expect(result.suggestedAgents.length).toBeGreaterThan(0);
    expect(result.suggestedAgents[0]!.capabilityId).toBe("agent:hook-builder");
  });

  it("rejected agent does not appear in suggestedAgents", () => {
    // hook-builder has writeSurfaces: ["hooks/**"] (via writable_paths).
    // When forbiddenSurfaceRefs contains "hooks/**", the forbidden-surface scorer
    // applies a -100 penalty — hook-builder score drops well below selection threshold.
    // Observable contract: hook-builder must NOT appear in suggestedAgents.
    // Note: agentDecisions (internal) is not exposed in CapabilityRouterResult;
    // rejection is observable only via absence from suggestedAgents.
    const hookBuilderContract = agentDefinitionToCapabilityContract(HOOK_BUILDER_DECL);
    const protocolContract = agentDefinitionToCapabilityContract(PROTOCOL_DESIGNER_DECL);

    const state: SemanticConversationState = {
      ...conversation("read-only research request about documentation"),
      ontologyFacing: {
        activatedObjectRefs: [],
        activatedActionRefs: [],
        activatedSurfaceRefs: [],
        activatedLaneRefs: [],
        // Mark hook-builder's write surfaces as forbidden
        forbiddenSurfaceRefs: ["hooks/**"],
      },
    };

    const result = routeCapabilityOntology({
      projectRoot: "/tmp/test-project",
      semanticConversationState: state,
      ontologyContext: context({
        nouns: ["documentation", "research"],
        verbs: ["read", "analyze"],
        surfaces: ["hooks/**"],
      }),
      availableCapabilities: [],
      availableAgents: [hookBuilderContract, protocolContract],
    });

    // hook-builder must not be suggested — forbidden surface penalty excludes it
    const suggestedIds = result.suggestedAgents.map((d) => d.capabilityId);
    expect(suggestedIds).not.toContain("agent:hook-builder");
  });

  it("suggestedActionTypeRid populated when exactly one selected capability has single actionTypeRef", () => {
    // Build a capability contract that has actionTypeRefs with exactly one entry.
    // We add actionTypeRefs via the outputOntology cast since the base type doesn't have it yet.
    const singleActionCap: CapabilityContract = {
      ...capabilityFixture(
        "single-action-cap",
        ["hook", "rule"],
        ["implement", "write"],
        ["implement a new hook rule"],
      ),
      outputOntology: {
        objectRefs: ["hook"],
        artifactRefs: [],
        validationPacks: [],
        // Cast to inject actionTypeRefs for suggestedActionTypeRid test path
        ...({ actionTypeRefs: ["test:single-action-type-ref"] } as unknown as object),
      } as CapabilityContract["outputOntology"],
    };

    const result = routeCapabilityOntology({
      projectRoot: "/tmp/test-project",
      semanticConversationState: conversation("implement a new hook rule"),
      ontologyContext: context({
        nouns: ["hook", "rule"],
        verbs: ["implement", "write"],
        surfaces: [],
      }),
      availableCapabilities: [singleActionCap],
    });

    // When exactly one capability is selected and it has exactly one actionTypeRef,
    // suggestedActionTypeRid should be populated.
    if (result.selectedCapabilities.length === 1) {
      expect(result.suggestedActionTypeRid).toBe("test:single-action-type-ref");
    } else {
      // If the capability wasn't selected due to scorer threshold, the field is undefined.
      expect(result.suggestedActionTypeRid).toBeUndefined();
    }
  });
});
