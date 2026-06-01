import * as fs from "node:fs";
import * as path from "node:path";
import { buildOntologyRetrievedPrompt } from "./retrieved-prompt";
import { forecastOntologyImpact } from "./impact-forecast";
import { forecastKnownIssues } from "../issues/issue-forecast";
import { loadKnownIssues } from "../issues/issue-store";
import { loadProjectScope } from "../project-scope/loader";
import { projectScopePolicyForFiles } from "../lead-intent/project-scope-policy";
import {
  loadProjectOntologyIndex,
  type ProjectOntologyIndex,
} from "../capability/project-ontology-index";
import {
  skillContractToCapabilityContract,
  type CapabilityContract,
} from "../capability/capability-contract";
import { routeCapabilityOntology } from "../capability/capability-router";
import type { KnownIssue } from "../issues/known-issue";
import type { UniversalOntologyEntry } from "../ontology-entry/universal-entry";
import {
  buildLLMControlFacingState,
  type SemanticConversationState,
} from "../chatbot-studio/semantic-conversation-state";
import type { OntologyContextSeed } from "../context-engineering/ontology-activation";
import {
  normalizeSkillOntologyContract,
  type SkillOntologyContract,
} from "../skills/skill-ontology-contract";
import { routeSkillOntology } from "../skills/skill-ontology-router";
import {
  retrieveDocumentContext,
  type DocumentContextResult,
} from "./document-context";

export interface OntologyContextQueryInput {
  readonly entry: UniversalOntologyEntry;
  readonly projectRoot: string;
  readonly includeSkillCapabilities?: boolean;
  readonly includeGenericCapabilities?: boolean;
  readonly includeImpactForecast?: boolean;
  readonly includeKnownIssues?: boolean;
  readonly includeValidationPacks?: boolean;
  readonly includeDocumentContext?: boolean;
  readonly availableSkills?: readonly SkillOntologyContract[];
  readonly availableCapabilities?: readonly CapabilityContract[];
  readonly knownIssues?: readonly KnownIssue[];
  readonly projectOntologyIndex?: ProjectOntologyIndex;
}

export interface OntologyContextQueryResult {
  readonly queryId: string;
  readonly entryId: string;
  readonly contextSeed: OntologyContextSeed;

  readonly ontologyContext: {
    readonly objectRefs: readonly string[];
    readonly actionRefs: readonly string[];
    readonly functionRefs: readonly string[];
    readonly laneRefs: readonly string[];
  };

  readonly skillContext: {
    readonly candidateSkillIds: readonly string[];
    readonly selectedSkillIds: readonly string[];
    readonly rejectedSkillIds: readonly string[];
  };

  readonly capabilityContext: {
    readonly candidateCapabilityIds: readonly string[];
    readonly selectedCapabilityIds: readonly string[];
    readonly rejectedCapabilityIds: readonly string[];
    readonly requiredDtc: boolean;
  };

  readonly impactContext: {
    readonly directSurfaceRefs: readonly string[];
    readonly downstreamSurfaceRefs: readonly string[];
    readonly confidence: "low" | "medium" | "high";
  };

  readonly issueContext: {
    readonly knownIssueIds: readonly string[];
    readonly warnings: readonly string[];
  };

  readonly validationContext: {
    readonly requiredValidationPacks: readonly string[];
    readonly suggestedCommands: readonly string[];
  };

  readonly retrievedPrompt: string;

  readonly diagnostics: {
    readonly projectOntologyIndexLoaded: boolean;
    readonly projectOntologyIndexWarnings: readonly string[];
  };

  /** Optional document context (opt-in via includeDocumentContext:true). */
  readonly documentContext?: DocumentContextResult;
}

function unique(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.trim().length > 0
  )));
}

/**
 * Returns true when the ProjectOntologyIndex contains at least one fragment-derived
 * entry (capability, surface, known-issue, or validation-pack). An index loaded from
 * an empty or absent `.palantir-mini/ontology-index/` directory will only carry
 * skill-registry and project-scope defaults — those do not count as "loaded" for
 * diagnostic purposes. A pre-supplied input.projectOntologyIndex is always "loaded".
 */
function isProjectOntologyIndexLoaded(
  index: ProjectOntologyIndex,
  wasPreSupplied: boolean,
): boolean {
  if (wasPreSupplied) return true;
  // Fragment-derived signals: sourceRefs that point into the ontology-index dir,
  // or a non-empty warnings array (warnings only appear when fragments were parsed).
  const hasIndexSourceRefs = index.sourceRefs.some((ref) =>
    ref.includes(".palantir-mini/ontology-index/")
  );
  return hasIndexSourceRefs;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, " ").trim();
}

function tokenOverlap(left: readonly string[], right: readonly string[]): boolean {
  const rightTokens = new Set(
    right.flatMap((value) => normalize(value).split(/\s+/)).filter((token) => token.length >= 3),
  );
  return left
    .flatMap((value) => normalize(value).split(/\s+/))
    .some((token) => token.length >= 3 && rightTokens.has(token));
}

function isSkillOntologyContract(value: unknown): value is SkillOntologyContract {
  if (typeof value !== "object" || value === null) return false;
  const contract = value as Partial<SkillOntologyContract>;
  return (
    typeof contract.skillId === "string" &&
    typeof contract.skillPath === "string" &&
    typeof contract.displayName === "string" &&
    typeof contract.category === "string" &&
    typeof contract.userFacingPurpose === "string" &&
    typeof contract.leadFacingPurpose === "string" &&
    typeof contract.inputOntology === "object" &&
    typeof contract.outputOntology === "object" &&
    typeof contract.actionBoundary === "object" &&
    Array.isArray(contract.nonGoals) &&
    Array.isArray(contract.failureModes)
  );
}

function normalizeSkillContract(contract: SkillOntologyContract): SkillOntologyContract {
  return normalizeSkillOntologyContract(contract);
}

function loadSkillRegistry(projectRoot: string): readonly SkillOntologyContract[] {
  const registryPath = path.join(projectRoot, ".palantir-mini", "skill-ontology", "skill-registry.json");
  if (!fs.existsSync(registryPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8")) as unknown;
  const contracts = typeof parsed === "object" && parsed !== null &&
    Array.isArray((parsed as { contracts?: unknown }).contracts)
    ? (parsed as { contracts: unknown[] }).contracts
    : [];
  return contracts.filter(isSkillOntologyContract).map(normalizeSkillContract);
}

function laneRefsForEntry(entry: UniversalOntologyEntry, projectRoot: string): string[] {
  const scope = loadProjectScope(projectRoot);
  const searchTerms = [
    entry.prompt.excerpt,
    ...entry.ontologySeed.nouns,
    ...entry.ontologySeed.verbs,
    ...entry.ontologySeed.surfaceHints,
    ...entry.ontologySeed.capabilityHints,
  ];
  const surfacePolicy = projectScopePolicyForFiles(entry.ontologySeed.surfaceHints, projectRoot);
  const surfaceLaneRefs = surfacePolicy.matches.map((match) => match.laneId);
  const textLaneRefs = scope.seqDataLaneInventory
    .filter((lane) => tokenOverlap(searchTerms, [
      lane.id,
      lane.axis,
      ...lane.fields,
      ...lane.writerSurfaces,
      ...lane.readerSurfaces,
      ...lane.currentAuthority,
      ...lane.descenders,
    ]))
    .map((lane) => lane.id);
  return unique([...surfaceLaneRefs, ...textLaneRefs]);
}

function contextSeedFromEntry(
  entry: UniversalOntologyEntry,
  laneRefs: readonly string[],
): OntologyContextSeed {
  return {
    approvalState: "unapproved-context-seed",
    sourceEntryId: entry.entryId,
    nouns: entry.ontologySeed.nouns,
    verbs: entry.ontologySeed.verbs,
    surfaceHints: entry.ontologySeed.surfaceHints,
    capabilityHints: entry.ontologySeed.capabilityHints,
    laneRefs,
    ontologyRefs: unique([...entry.ontologySeed.nouns, ...laneRefs]),
    actionRefs: entry.ontologySeed.verbs,
    evaluationDirection: "directional-only",
    toolBoundaryDirection: "directional-only",
  };
}

function conversationFromEntry(
  entry: UniversalOntologyEntry,
  laneRefs: readonly string[],
): SemanticConversationState {
  const stateId = `semantic-conversation:${entry.entryId}`;
  return {
    stateId,
    schemaVersion: "palantir-mini/semantic-conversation-state/v1",
    prompt: {
      promptId: entry.prompt.promptId,
      promptHash: entry.prompt.promptHash,
      sessionId: entry.prompt.sessionId,
      runtime: entry.prompt.runtime,
    },
    userFacing: {
      preferredLanguage: /[가-힣]/.test(entry.prompt.excerpt) ? "ko" : "en",
      userExpertise: "developer",
      plainRequestSummary: entry.prompt.excerpt,
      confirmedNonGoals: [],
      unresolvedQuestions: [],
    },
    ontologyFacing: {
      activatedObjectRefs: entry.ontologySeed.nouns,
      activatedActionRefs: entry.ontologySeed.verbs,
      activatedSurfaceRefs: entry.ontologySeed.surfaceHints,
      activatedLaneRefs: laneRefs,
      forbiddenSurfaceRefs: [],
    },
    skillFacing: {
      candidateSkillRefs: [],
      selectedSkillRefs: [],
      skillRoutingReason: "UniversalOntologyEntry seeded deterministic skill routing.",
    },
    capabilityFacing: {
      candidateCapabilityRefs: [],
      selectedCapabilityRefs: [],
      capabilityRoutingReason: "UniversalOntologyEntry seeded deterministic capability routing.",
    },
    llmControlFacing: buildLLMControlFacingState(stateId),
    contractFacing: {
      dtcReady: false,
    },
    projectFacing: {
      projectRoot: entry.project.projectRoot,
      projectScopeLaneIds: laneRefs,
      requiredValidationPacks: [],
    },
    lifecycle: entry.status === "routed" ? "routed" : "captured",
  };
}

function validationCommand(pack: string): string {
  const normalized = normalize(pack);
  if (normalized.includes("problem15") || normalized.includes("learningtrace")) {
    return "bun test tests/learningTraceProblem15.test.ts tests/problem15SemanticConversationPilot.test.ts";
  }
  if (normalized.includes("skill") || normalized.includes("ontology")) {
    return "bun test tests/lib/skills/skill-ontology-contract.test.ts";
  }
  if (normalized.includes("workbench") || normalized.includes("chatbot")) {
    return "bun test tests/lib/chatbot-studio/semantic-conversation-state.test.ts tests/lib/chatbot-studio/semantic-workbench-state.test.ts";
  }
  return `validation-pack:${pack}`;
}

export function queryOntologyContext(
  input: OntologyContextQueryInput,
): OntologyContextQueryResult {
  const includeSkillCapabilities = input.includeSkillCapabilities ?? true;
  const includeGenericCapabilities = input.includeGenericCapabilities ?? true;
  const includeImpactForecast = input.includeImpactForecast ?? true;
  const includeKnownIssues = input.includeKnownIssues ?? true;
  const includeValidationPacks = input.includeValidationPacks ?? true;
  const wasPreSupplied = input.projectOntologyIndex !== undefined;
  const projectIndex = input.projectOntologyIndex ?? loadProjectOntologyIndex(input.projectRoot);
  const projectOntologyIndexLoaded = isProjectOntologyIndexLoaded(projectIndex, wasPreSupplied);
  const projectOntologyIndexWarnings: readonly string[] = projectIndex.warnings ?? [];
  const laneRefs = laneRefsForEntry(input.entry, input.projectRoot);
  const availableSkills = includeSkillCapabilities
    ? [...(input.availableSkills ?? loadSkillRegistry(input.projectRoot))].map(normalizeSkillContract)
    : [];
  const skillCapabilities = availableSkills.map(skillContractToCapabilityContract);
  const availableCapabilities = includeGenericCapabilities
    ? [
        ...(input.availableCapabilities ?? projectIndex.capabilities),
        ...skillCapabilities,
      ].filter((capability, index, all) =>
        all.findIndex((item) => item.capabilityId === capability.capabilityId) === index
      )
    : [];
  const contextSeed = contextSeedFromEntry(input.entry, laneRefs);
  const conversation = conversationFromEntry(input.entry, laneRefs);
  const routing = routeSkillOntology({
    projectRoot: input.projectRoot,
    semanticConversationState: conversation,
    ontologyContext: contextSeed,
    availableSkills,
  });
  const capabilityRouting = routeCapabilityOntology({
    projectRoot: input.projectRoot,
    semanticConversationState: conversation,
    ontologyContext: contextSeed,
    availableCapabilities,
  });
  const impact = includeImpactForecast
    ? forecastOntologyImpact({
        entry: input.entry,
        projectRoot: input.projectRoot,
        selectedSkills: routing.selectedSkills,
        selectedCapabilities: capabilityRouting.selectedCapabilities,
      })
    : { directSurfaceRefs: [], downstreamSurfaceRefs: [], confidence: "low" as const };
  const issues = includeKnownIssues
    ? forecastKnownIssues({
        entry: input.entry,
        directSurfaceRefs: impact.directSurfaceRefs,
        selectedCapabilityRefs: unique([
          ...routing.selectedSkills.map((skill) => skill.skillId),
          ...capabilityRouting.selectedCapabilities.map((capability) => capability.capabilityId),
        ]),
        knownIssues: input.knownIssues ?? loadKnownIssues(input.projectRoot),
      })
    : [];
  const validationPacks = includeValidationPacks
    ? unique([
        ...projectScopePolicyForFiles(impact.directSurfaceRefs, input.projectRoot).validationPacks,
        ...routing.selectedSkills.flatMap((skill) => skill.outputOntology.validationPacks),
        ...capabilityRouting.selectedCapabilities.flatMap((capability) =>
          capability.outputOntology.validationPacks
        ),
        ...issues.flatMap((issue) => issue.validationPackRefs),
        ...projectIndex.validationPacks
          .filter((pack) => pack.required)
          .map((pack) => pack.validationPackId),
      ])
    : [];

  const baseResult: Omit<OntologyContextQueryResult, "retrievedPrompt" | "documentContext"> = {
    diagnostics: {
      projectOntologyIndexLoaded,
      projectOntologyIndexWarnings,
    },
    queryId: `ontology-context-query:${input.entry.entryId}`,
    entryId: input.entry.entryId,
    contextSeed,
    ontologyContext: {
      objectRefs: input.entry.ontologySeed.nouns,
      actionRefs: input.entry.ontologySeed.verbs,
      functionRefs: input.entry.ontologySeed.capabilityHints,
      laneRefs,
    },
    skillContext: {
      candidateSkillIds: unique(routing.decisions
        .filter((decision) => decision.decision !== "rejected")
        .map((decision) => decision.skillId)),
      selectedSkillIds: routing.selectedSkills.map((skill) => skill.skillId),
      rejectedSkillIds: routing.decisions
        .filter((decision) => decision.decision === "rejected")
        .map((decision) => decision.skillId),
    },
    capabilityContext: {
      candidateCapabilityIds: unique(capabilityRouting.decisions
        .filter((decision) => decision.decision !== "rejected")
        .map((decision) => decision.capabilityId)),
      selectedCapabilityIds: capabilityRouting.selectedCapabilities
        .map((capability) => capability.capabilityId),
      rejectedCapabilityIds: capabilityRouting.decisions
        .filter((decision) => decision.decision === "rejected")
        .map((decision) => decision.capabilityId),
      requiredDtc: capabilityRouting.requiredDtc,
    },
    impactContext: impact,
    issueContext: {
      knownIssueIds: issues.map((issue) => issue.issueId),
      warnings: issues.map((issue) =>
        `${issue.severity}: ${issue.title} - ${issue.recommendedAction}`
      ),
    },
    validationContext: {
      requiredValidationPacks: validationPacks,
      suggestedCommands: unique(validationPacks.map(validationCommand)),
    },
  };

  const documentContext: DocumentContextResult | undefined =
    input.includeDocumentContext === true
      ? retrieveDocumentContext({
          projectRoot: input.projectRoot,
          promptTokens: [
            ...input.entry.ontologySeed.nouns,
            ...input.entry.ontologySeed.verbs,
            ...input.entry.ontologySeed.surfaceHints,
          ],
        })
      : undefined;

  return {
    ...baseResult,
    retrievedPrompt: buildOntologyRetrievedPrompt(baseResult),
    ...(documentContext !== undefined ? { documentContext } : {}),
  };
}
