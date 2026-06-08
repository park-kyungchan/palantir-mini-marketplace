export const CAPABILITY_CONTRACT_SCHEMA_VERSION =
  "palantir-mini/capability-contract/v1";

export type CapabilitySourceKind =
  | "skill"
  | "mcp-tool"
  | "agent"
  | "project-scope"
  | "validation-pack"
  | "known-issue"
  | "ontology-index";

/**
 * Runtime-neutral free-form domain tag (W3e-2). Replaces the closed
 * CapabilityCategory union that hardcoded the palantir-math education taxonomy
 * (problem-authoring/sequencer-compile/visual-scenario/concept-authoring/
 * debug-triage/presenter-readiness). The neutral core carries no project-specific
 * meaning; a domain tag is a free-form/registered string supplied per source.
 */
export type CapabilityDomainTag = string;

/** @deprecated W3e-2 — use {@link CapabilityDomainTag}. Transitional alias removed in e2c. */
export type CapabilityCategory = CapabilityDomainTag;

export interface CapabilityArtifactLifecycle {
  readonly prerequisites: readonly string[];
  readonly optionalInputs: readonly string[];
  readonly creates: readonly string[];
  readonly mutates: readonly string[];
}

export interface CapabilityIntentMatcher {
  readonly matcherId: string;
  readonly naturalLanguageExamples: readonly string[];
  readonly nouns: readonly string[];
  readonly verbs: readonly string[];
  readonly projectScopeLanes: readonly string[];
  readonly prerequisites?: readonly string[];
  readonly optionalExistingArtifacts?: readonly string[];
  readonly createsArtifacts?: readonly string[];
  readonly consumesArtifacts?: readonly string[];
  readonly requiredArtifacts?: readonly string[];
  readonly negativeExamples?: readonly string[];
}

export interface CapabilityContract {
  readonly schemaVersion: typeof CAPABILITY_CONTRACT_SCHEMA_VERSION;
  readonly capabilityId: string;
  readonly sourceKind: CapabilitySourceKind;
  readonly sourceRef: string;
  readonly displayName: string;
  readonly category: CapabilityDomainTag;

  readonly userFacingPurpose: string;
  readonly leadFacingPurpose: string;

  readonly inputOntology: {
    readonly objectRefs: readonly string[];
    readonly requiredArtifacts: readonly string[];
    readonly artifactLifecycle: CapabilityArtifactLifecycle;
    readonly allowedRawInputs: readonly string[];
  };

  readonly outputOntology: {
    readonly objectRefs: readonly string[];
    readonly artifactRefs: readonly string[];
    readonly validationPacks: readonly string[];
  };

  readonly actionBoundary: {
    readonly mayMutateProjectFiles: boolean;
    readonly mutationSurfaces: readonly string[];
    readonly requiresDtcApproval: boolean;
    readonly requiresTeacherApproval?: boolean;
  };

  readonly nonGoals: readonly string[];
  readonly failureModes: readonly string[];
  readonly intentMatchers: readonly CapabilityIntentMatcher[];
  readonly readSurfaces: readonly string[];
  readonly writeSurfaces: readonly string[];
  readonly knownIssueRefs: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

// ─── Skill ontology projection types (folded from lib/skills, W3e-2 Step 4) ──
// SkillOntologyContract is the parsed-SKILL.md projection the Claude capability
// source produces before skillContractToCapabilityContract() converts it to the
// neutral CapabilityContract. Folded here so lib/capability no longer imports
// lib/skills; the skill category is now a free-form CapabilityDomainTag (the
// closed education enum was removed in W3e-2).

export interface SkillArtifactLifecycle {
  readonly prerequisites: readonly string[];
  readonly optionalInputs: readonly string[];
  readonly creates: readonly string[];
  readonly mutates: readonly string[];
}

export interface SkillIntentMatcher {
  readonly matcherId: string;
  readonly naturalLanguageExamples: readonly string[];
  readonly nouns: readonly string[];
  readonly verbs: readonly string[];
  readonly projectScopeLanes: readonly string[];
  readonly prerequisites?: readonly string[];
  readonly optionalExistingArtifacts?: readonly string[];
  readonly createsArtifacts?: readonly string[];
  readonly consumesArtifacts?: readonly string[];
  readonly requiredArtifacts?: readonly string[];
  readonly negativeExamples?: readonly string[];
}

export interface SkillOntologyContract {
  readonly skillId: string;
  readonly skillPath: string;
  readonly displayName: string;
  readonly category: CapabilityDomainTag;

  readonly userFacingPurpose: string;
  readonly leadFacingPurpose: string;

  readonly inputOntology: {
    readonly objectRefs: readonly string[];
    readonly requiredArtifacts: readonly string[];
    readonly artifactLifecycle: SkillArtifactLifecycle;
    readonly allowedRawInputs: readonly string[];
  };

  readonly outputOntology: {
    readonly objectRefs: readonly string[];
    readonly artifactRefs: readonly string[];
    readonly validationPacks: readonly string[];
  };

  readonly actionBoundary: {
    readonly mayMutateProjectFiles: boolean;
    readonly mutationSurfaces: readonly string[];
    readonly requiresDtcApproval: boolean;
    readonly requiresTeacherApproval: boolean;
  };

  readonly nonGoals: readonly string[];
  readonly failureModes: readonly string[];
  readonly intentMatchers: readonly SkillIntentMatcher[];
  readonly readSurfaces?: readonly string[];
  readonly writeSurfaces?: readonly string[];
  readonly knownIssueRefs?: readonly string[];
}

export interface CapabilityContractValidationIssue {
  readonly issueId: string;
  readonly field: string;
  readonly message: string;
  readonly severity: "fail" | "warn";
}

export interface CapabilityContractValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CapabilityContractValidationIssue[];
}

function unique(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.trim().length > 0
  ).map((value) => value.trim())));
}

function normalizeLifecycle(
  lifecycle?: Partial<CapabilityArtifactLifecycle>,
  requiredArtifacts: readonly string[] = [],
  outputArtifacts: readonly string[] = [],
  mutationSurfaces: readonly string[] = [],
): CapabilityArtifactLifecycle {
  return {
    prerequisites: unique(lifecycle?.prerequisites ?? requiredArtifacts),
    optionalInputs: unique(lifecycle?.optionalInputs ?? []),
    creates: unique(lifecycle?.creates ?? outputArtifacts),
    mutates: unique(lifecycle?.mutates ?? mutationSurfaces),
  };
}

function normalizeMatcher(matcher: CapabilityIntentMatcher): CapabilityIntentMatcher {
  const prerequisites = unique(matcher.prerequisites ?? matcher.requiredArtifacts ?? []);
  return {
    ...matcher,
    naturalLanguageExamples: unique(matcher.naturalLanguageExamples),
    nouns: unique(matcher.nouns),
    verbs: unique(matcher.verbs),
    projectScopeLanes: unique(matcher.projectScopeLanes),
    prerequisites,
    optionalExistingArtifacts: unique(matcher.optionalExistingArtifacts ?? []),
    createsArtifacts: unique(matcher.createsArtifacts ?? []),
    consumesArtifacts: unique(matcher.consumesArtifacts ?? prerequisites),
    requiredArtifacts: prerequisites,
    negativeExamples: unique(matcher.negativeExamples ?? []),
  };
}

export function normalizeCapabilityContract(contract: CapabilityContract): CapabilityContract {
  const artifactLifecycle = normalizeLifecycle(
    contract.inputOntology.artifactLifecycle,
    contract.inputOntology.requiredArtifacts,
    contract.outputOntology.artifactRefs,
    contract.actionBoundary.mutationSurfaces,
  );
  return {
    ...contract,
    inputOntology: {
      ...contract.inputOntology,
      objectRefs: unique(contract.inputOntology.objectRefs),
      requiredArtifacts: artifactLifecycle.prerequisites,
      artifactLifecycle,
      allowedRawInputs: unique(contract.inputOntology.allowedRawInputs),
    },
    outputOntology: {
      objectRefs: unique(contract.outputOntology.objectRefs),
      artifactRefs: unique(contract.outputOntology.artifactRefs),
      validationPacks: unique(contract.outputOntology.validationPacks),
    },
    actionBoundary: {
      ...contract.actionBoundary,
      mutationSurfaces: unique(contract.actionBoundary.mutationSurfaces),
    },
    nonGoals: unique(contract.nonGoals),
    failureModes: unique(contract.failureModes),
    intentMatchers: contract.intentMatchers.map(normalizeMatcher),
    readSurfaces: unique(contract.readSurfaces),
    writeSurfaces: unique(contract.writeSurfaces),
    knownIssueRefs: unique(contract.knownIssueRefs),
  };
}

export function skillContractToCapabilityContract(
  skill: SkillOntologyContract,
): CapabilityContract {
  return normalizeCapabilityContract({
    schemaVersion: CAPABILITY_CONTRACT_SCHEMA_VERSION,
    capabilityId: skill.skillId,
    sourceKind: "skill",
    sourceRef: skill.skillPath,
    displayName: skill.displayName,
    category: skill.category,
    userFacingPurpose: skill.userFacingPurpose,
    leadFacingPurpose: skill.leadFacingPurpose,
    inputOntology: {
      objectRefs: skill.inputOntology.objectRefs,
      requiredArtifacts: skill.inputOntology.requiredArtifacts,
      artifactLifecycle: skill.inputOntology.artifactLifecycle,
      allowedRawInputs: skill.inputOntology.allowedRawInputs,
    },
    outputOntology: skill.outputOntology,
    actionBoundary: skill.actionBoundary,
    nonGoals: skill.nonGoals,
    failureModes: skill.failureModes,
    intentMatchers: skill.intentMatchers.map((matcher: SkillIntentMatcher) => ({
      ...matcher,
      prerequisites: matcher.prerequisites,
      optionalExistingArtifacts: matcher.optionalExistingArtifacts,
      createsArtifacts: matcher.createsArtifacts,
      consumesArtifacts: matcher.consumesArtifacts,
      requiredArtifacts: matcher.requiredArtifacts,
      negativeExamples: matcher.negativeExamples,
    })),
    readSurfaces: skill.readSurfaces ?? [],
    writeSurfaces: skill.writeSurfaces ?? [],
    knownIssueRefs: skill.knownIssueRefs ?? [],
    metadata: {
      compatibilityProjection: "SkillOntologyContract",
      sourceContractSchemaVersion: "palantir-mini/skill-ontology/v1",
    },
  });
}

export interface ToolSpecLike {
  readonly name: string;
  readonly description: string;
  readonly category?: string;
  readonly audience?: string;
  readonly lifecycle?: string;
  readonly ownerModule?: string;
}

export function mcpToolSpecToCapabilityContract(tool: ToolSpecLike): CapabilityContract {
  const lifecycle = tool.lifecycle ?? "public";
  const ownerModule = tool.ownerModule ?? `bridge/handlers/${tool.name}.ts`;
  return normalizeCapabilityContract({
    schemaVersion: CAPABILITY_CONTRACT_SCHEMA_VERSION,
    capabilityId: `mcp:${tool.name}`,
    sourceKind: "mcp-tool",
    sourceRef: ownerModule,
    displayName: tool.name,
    category: "mcp-tool",
    userFacingPurpose: tool.description,
    leadFacingPurpose: `${tool.name} MCP tool (${tool.audience ?? "unknown"}; ${lifecycle}).`,
    inputOntology: {
      objectRefs: [],
      requiredArtifacts: [],
      artifactLifecycle: {
        prerequisites: [],
        optionalInputs: [],
        creates: [],
        mutates: lifecycle === "public" ? [] : [ownerModule],
      },
      allowedRawInputs: [],
    },
    outputOntology: {
      objectRefs: [],
      artifactRefs: [],
      validationPacks: [`mcp:${tool.name}:schema`],
    },
    actionBoundary: {
      mayMutateProjectFiles: false,
      mutationSurfaces: [],
      requiresDtcApproval: false,
    },
    nonGoals: ["Do not infer project mutation authority from MCP tool availability."],
    failureModes: [`${tool.name} unavailable or hidden from public tools/list.`],
    intentMatchers: [
      {
        matcherId: `mcp:${tool.name}:default`,
        naturalLanguageExamples: [tool.name.replace(/_/g, " ")],
        nouns: [tool.name, ownerModule],
        verbs: [tool.category ?? "tool"],
        projectScopeLanes: [],
      },
    ],
    readSurfaces: [ownerModule],
    writeSurfaces: [],
    knownIssueRefs: [],
    metadata: { toolCategory: tool.category, audience: tool.audience, lifecycle },
  });
}

export function validateCapabilityContract(
  contract: CapabilityContract,
): CapabilityContractValidationResult {
  const issues: CapabilityContractValidationIssue[] = [];
  if (!contract.capabilityId.trim()) {
    issues.push({
      issueId: "capability.missing-id",
      field: "capabilityId",
      severity: "fail",
      message: "CapabilityContract must declare a stable capabilityId.",
    });
  }
  if (!contract.sourceRef.trim()) {
    issues.push({
      issueId: "capability.missing-source-ref",
      field: "sourceRef",
      severity: "fail",
      message: "CapabilityContract must retain its source evidence reference.",
    });
  }
  if (contract.actionBoundary.mayMutateProjectFiles && !contract.actionBoundary.requiresDtcApproval) {
    issues.push({
      issueId: "capability.mutation-without-dtc",
      field: "actionBoundary.requiresDtcApproval",
      severity: "fail",
      message: "Mutation-capable capabilities must require DTC approval.",
    });
  }
  if (contract.nonGoals.length === 0) {
    issues.push({
      issueId: "capability.missing-non-goals",
      field: "nonGoals",
      severity: "warn",
      message: "Capability contracts should state what they must not do.",
    });
  }
  return { valid: issues.every((issue) => issue.severity !== "fail"), issues };
}
