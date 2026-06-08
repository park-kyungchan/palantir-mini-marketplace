import * as fs from "node:fs";
import * as path from "node:path";
import {
  PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION,
  type ProjectOntologyIndex as ProjectOntologyIndexBase,
  type ProjectOntologyIndexFragment as ProjectOntologyIndexFragmentBase,
  type ProjectOntologySurface,
  type ValidationPackContract,
} from "#schemas/ontology/primitives/project-ontology-index";
import { loadKnownIssues } from "../issues/issue-store";
import type { KnownIssue } from "../issues/known-issue";
import { loadProjectScope, type ProjectScopeDefinition } from "../project-scope/loader";
import { normalizeSkillOntologyContract } from "../skills/skill-ontology-contract";
import {
  CAPABILITY_CONTRACT_SCHEMA_VERSION,
  normalizeCapabilityContract,
  skillContractToCapabilityContract,
  type CapabilityContract,
  type SkillOntologyContract,
} from "./capability-contract";

// Re-export the schemas-promoted shape members for backwards compat.
// Consumers that previously imported these names from this file keep working.
export {
  PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION,
  type ProjectOntologySurface,
  type ValidationPackContract,
};

/**
 * Plugin specialization of the generic ProjectOntologyIndex shape declared in
 * `#schemas/ontology/primitives/project-ontology-index`.
 * Specialized over the plugin's concrete CapabilityContract / KnownIssue /
 * ProjectScopeDefinition types (those primitives are not promoted in this PR).
 */
export type ProjectOntologyIndex = ProjectOntologyIndexBase<
  CapabilityContract,
  KnownIssue,
  ProjectScopeDefinition
>;

type ProjectOntologyIndexFragment = ProjectOntologyIndexFragmentBase<CapabilityContract>;

interface LoadedSkillRegistry {
  readonly registryPath: string;
  readonly contracts: readonly SkillOntologyContract[];
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function unique(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.trim().length > 0
  ).map((value) => value.trim()))).sort((left, right) => left.localeCompare(right));
}

function projectIdFromRoot(projectRoot: string): string {
  const packageJson = readJson<{ name?: string }>(path.join(projectRoot, "package.json"));
  return (packageJson?.name ?? path.basename(projectRoot))
    .replace(/^@[^/]+\//, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-");
}

function ontologyIndexDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "ontology-index");
}

function loadFragments(projectRoot: string): Array<{ filePath: string; fragment: ProjectOntologyIndexFragment }> {
  const dir = ontologyIndexDir(projectRoot);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right))
    .flatMap((entry) => {
      const filePath = path.join(dir, entry);
      const fragment = readJson<ProjectOntologyIndexFragment>(filePath);
      return fragment ? [{ filePath, fragment }] : [];
    });
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

function loadSkillRegistry(projectRoot: string): LoadedSkillRegistry {
  const registryPath = path.join(projectRoot, ".palantir-mini", "skill-ontology", "skill-registry.json");
  const parsed = readJson<{ contracts?: unknown[] }>(registryPath);
  const contracts = (parsed?.contracts ?? [])
    .filter(isSkillOntologyContract)
    .map((contract) => normalizeSkillOntologyContract(contract));
  return { registryPath, contracts };
}

function projectScopeSurfaces(projectScope: ProjectScopeDefinition): ProjectOntologySurface[] {
  const laneSurfaces = projectScope.seqDataLaneInventory.flatMap((lane) => [
    ...lane.writerSurfaces.map((surface) => ({
      surfaceId: `lane:${lane.id}:writer:${surface}`,
      kind: "write" as const,
      path: surface,
      sourceRef: projectScope.sourcePath,
      laneRefs: [lane.id],
    })),
    ...lane.readerSurfaces.map((surface) => ({
      surfaceId: `lane:${lane.id}:reader:${surface}`,
      kind: "read" as const,
      path: surface,
      sourceRef: projectScope.sourcePath,
      laneRefs: [lane.id],
    })),
    ...lane.currentAuthority.map((surface) => ({
      surfaceId: `lane:${lane.id}:authority:${surface}`,
      kind: "authority" as const,
      path: surface,
      sourceRef: projectScope.sourcePath,
      laneRefs: [lane.id],
    })),
  ]);
  const boundarySurfaces = projectScope.surfaceMutationBoundaries.map((boundary) => ({
    surfaceId: `boundary:${boundary.surface}`,
    kind: "mutation" as const,
    path: boundary.surface,
    sourceRef: projectScope.sourcePath,
    laneRefs: [],
  }));
  return [...laneSurfaces, ...boundarySurfaces];
}

function projectScopeValidationPacks(projectScope: ProjectScopeDefinition): ValidationPackContract[] {
  return projectScope.seqDataLaneInventory.flatMap((lane) =>
    lane.validationPacks.map((pack) => ({
      validationPackId: pack,
      sourceRef: projectScope.sourcePath,
      required: true,
    }))
  );
}

function knownIssueCapabilities(issues: readonly KnownIssue[]): CapabilityContract[] {
  return issues.map((issue) => normalizeCapabilityContract({
    schemaVersion: CAPABILITY_CONTRACT_SCHEMA_VERSION,
    capabilityId: `known-issue:${issue.issueId}`,
    sourceKind: "known-issue",
    sourceRef: issue.source,
    displayName: issue.title,
    category: "issue-forecast",
    userFacingPurpose: issue.recommendedAction,
    leadFacingPurpose: `Forecasts known issue ${issue.issueId} (${issue.severity}).`,
    inputOntology: {
      objectRefs: issue.affectedCapabilityRefs,
      requiredArtifacts: [],
      artifactLifecycle: {
        prerequisites: [],
        optionalInputs: [],
        creates: [],
        mutates: [],
      },
      allowedRawInputs: issue.triggerPatterns,
    },
    outputOntology: {
      objectRefs: issue.affectedCapabilityRefs,
      artifactRefs: issue.affectedSurfaceRefs,
      validationPacks: issue.validationPackRefs,
    },
    actionBoundary: {
      mayMutateProjectFiles: false,
      mutationSurfaces: [],
      requiresDtcApproval: false,
    },
    nonGoals: ["Known issues warn and score context only; they do not authorize mutation."],
    failureModes: [`Known issue status ${issue.status} may require manual review.`],
    intentMatchers: [
      {
        matcherId: `known-issue:${issue.issueId}:triggers`,
        naturalLanguageExamples: issue.triggerPatterns,
        nouns: [issue.title, ...issue.affectedCapabilityRefs],
        verbs: ["forecast", "warn", "validate"],
        projectScopeLanes: [],
      },
    ],
    readSurfaces: issue.affectedSurfaceRefs,
    writeSurfaces: [],
    knownIssueRefs: [issue.issueId],
    metadata: {
      severity: issue.severity,
      status: issue.status,
      sourceRefs: issue.sourceRefs,
    },
  }));
}

function dedupeCapabilities(capabilities: readonly CapabilityContract[]): CapabilityContract[] {
  const byId = new Map<string, CapabilityContract>();
  for (const capability of capabilities) {
    const normalized = normalizeCapabilityContract(capability);
    const existing = byId.get(normalized.capabilityId);
    if (!existing || existing.sourceKind !== "skill") byId.set(normalized.capabilityId, normalized);
  }
  return [...byId.values()].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
}

function dedupeSurfaces(surfaces: readonly ProjectOntologySurface[]): ProjectOntologySurface[] {
  const byId = new Map<string, ProjectOntologySurface>();
  for (const surface of surfaces) byId.set(surface.surfaceId, surface);
  return [...byId.values()].sort((left, right) => left.surfaceId.localeCompare(right.surfaceId));
}

function dedupeValidationPacks(packs: readonly ValidationPackContract[]): ValidationPackContract[] {
  const byId = new Map<string, ValidationPackContract>();
  for (const pack of packs) byId.set(pack.validationPackId, pack);
  return [...byId.values()].sort((left, right) =>
    left.validationPackId.localeCompare(right.validationPackId)
  );
}

export function loadProjectOntologyIndex(
  projectRoot: string,
  loadedAt = new Date().toISOString(),
): ProjectOntologyIndex {
  const projectScope = loadProjectScope(projectRoot);
  const registry = loadSkillRegistry(projectRoot);
  const issues = loadKnownIssues(projectRoot);
  const fragments = loadFragments(projectRoot);
  const projectId = fragments.find((item) => item.fragment.projectId)?.fragment.projectId ??
    projectScope.projectId ??
    projectIdFromRoot(projectRoot);

  const capabilities = dedupeCapabilities([
    ...fragments.flatMap((item) => item.fragment.capabilities ?? []),
    ...registry.contracts.map(skillContractToCapabilityContract),
    ...knownIssueCapabilities(issues),
  ]);
  const surfaces = dedupeSurfaces([
    ...fragments.flatMap((item) => item.fragment.surfaces ?? []),
    ...projectScopeSurfaces(projectScope),
  ]);
  const validationPacks = dedupeValidationPacks([
    ...fragments.flatMap((item) => item.fragment.validationPacks ?? []),
    ...projectScopeValidationPacks(projectScope),
    ...issues.flatMap((issue) => issue.validationPackRefs.map((pack) => ({
      validationPackId: pack,
      sourceRef: issue.source,
      required: true,
    }))),
    ...capabilities.flatMap((capability) => capability.outputOntology.validationPacks.map((pack) => ({
      validationPackId: pack,
      sourceRef: capability.sourceRef,
      required: true,
    }))),
  ]);

  return {
    schemaVersion: PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION,
    projectId,
    projectRoot,
    loadedAt,
    sourceRefs: unique([
      ...fragments.map((item) => item.filePath),
      registry.contracts.length > 0 ? registry.registryPath : undefined,
      projectScope.sourcePath,
      issues.length > 0 ? path.join(projectRoot, ".palantir-mini", "issues", "known-issues.json") : undefined,
    ]),
    capabilities,
    surfaces,
    validationPacks,
    knownIssues: [...issues].sort((left, right) => left.issueId.localeCompare(right.issueId)),
    projectScope,
    warnings: unique(fragments.flatMap((item) => item.fragment.warnings ?? [])),
  };
}
