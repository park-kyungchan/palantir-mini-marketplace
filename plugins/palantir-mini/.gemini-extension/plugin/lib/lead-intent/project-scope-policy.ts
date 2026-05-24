// palantir-mini — projectScope conformance helpers.
//
// projectScope.ts is a TypeScript-owned policy source. This module reads it
// directly and exposes lane/axis/validation metadata to impact, router, and
// Prompt-DTC gate surfaces without changing gate defaults.

import * as path from "node:path";
import {
  loadProjectScope,
  stripProjectScopePathMarker,
  type ProjectScopeLane,
} from "../project-scope/loader";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "./contracts";

export interface ProjectScopeLaneMatch {
  readonly file: string;
  readonly laneId: string;
  readonly axisId: string;
  readonly writerSurfaces: readonly string[];
  readonly readerSurfaces: readonly string[];
  readonly durableBoundary: string;
  readonly requiredValidationPacks: readonly string[];
  readonly changeContractId: string;
  readonly currentAuthority: readonly string[];
  readonly descenders: readonly string[];
  readonly matchedBy: "currentAuthority" | "descender" | "field" | "laneId";
}

export interface ProjectScopePolicyProjection {
  readonly matches: ProjectScopeLaneMatch[];
  readonly validationPacks: readonly string[];
  readonly validationLadder: readonly string[];
}

export interface ProjectScopeConformanceIssue {
  readonly kind:
    | "unauthorized-project-lane"
    | "missing-validation-pack";
  readonly laneId: string;
  readonly axisId: string;
  readonly file: string;
  readonly message: string;
  readonly missingValidationPacks?: readonly string[];
}

export interface ProjectScopeConformanceResult extends ProjectScopePolicyProjection {
  readonly conformant: boolean;
  readonly evaluationPlanInvalid: boolean;
  readonly issues: readonly ProjectScopeConformanceIssue[];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function normalizeProjectPath(
  filePath: string,
  projectRoot: string | undefined,
  scope = loadProjectScope(projectRoot),
): string {
  const slashPath = filePath.replace(/\\/g, "/").replace(/^file:/, "");
  if (path.isAbsolute(slashPath) && projectRoot) {
    const rel = path.relative(projectRoot, slashPath).replace(/\\/g, "/");
    if (!rel.startsWith("..")) return rel;
  }
  return stripProjectScopePathMarker(slashPath, scope);
}

function pathMatches(candidate: string, filePath: string): boolean {
  const normalizedCandidate = candidate.replace(/\\/g, "/").replace(/\/$/, "");
  const normalizedFile = filePath.replace(/\\/g, "/").replace(/\/$/, "");
  return (
    normalizedFile === normalizedCandidate ||
    normalizedFile.startsWith(`${normalizedCandidate}/`) ||
    normalizedCandidate.startsWith(`${normalizedFile}/`)
  );
}

function toMatch(
  file: string,
  lane: ProjectScopeLane,
  matchedBy: ProjectScopeLaneMatch["matchedBy"],
): ProjectScopeLaneMatch {
  return {
    file,
    laneId: lane.id,
    axisId: lane.axis,
    writerSurfaces: lane.writerSurfaces,
    readerSurfaces: lane.readerSurfaces,
    durableBoundary: lane.durableBoundary,
    requiredValidationPacks: lane.validationPacks,
    changeContractId: lane.changeContractId,
    currentAuthority: lane.currentAuthority,
    descenders: lane.descenders,
    matchedBy,
  };
}

export function findProjectScopeMatchesForFile(
  filePath: string,
  projectRoot?: string,
): ProjectScopeLaneMatch[] {
  const scope = loadProjectScope(projectRoot);
  const normalizedFile = normalizeProjectPath(filePath, projectRoot, scope);
  const matches: ProjectScopeLaneMatch[] = [];
  for (const lane of scope.seqDataLaneInventory) {
    if (normalize(normalizedFile) === normalize(lane.id)) {
      matches.push(toMatch(normalizedFile, lane, "laneId"));
      continue;
    }
    if (lane.fields.some((field) => normalize(field) === normalize(normalizedFile))) {
      matches.push(toMatch(normalizedFile, lane, "field"));
      continue;
    }
    if (lane.currentAuthority.some((authority) => pathMatches(authority, normalizedFile))) {
      matches.push(toMatch(normalizedFile, lane, "currentAuthority"));
      continue;
    }
    if (lane.descenders.some((descender) => pathMatches(descender, normalizedFile))) {
      matches.push(toMatch(normalizedFile, lane, "descender"));
    }
  }
  return matches;
}

export function projectScopePolicyForFiles(
  files: readonly string[],
  projectRoot?: string,
): ProjectScopePolicyProjection {
  const scope = loadProjectScope(projectRoot);
  const matches = files.flatMap((file) => findProjectScopeMatchesForFile(file, projectRoot));
  const validationPacks = unique(matches.flatMap((match) => [...match.requiredValidationPacks]));
  return {
    matches,
    validationPacks,
    validationLadder:
      validationPacks.length > 0 ? [...scope.projectOntologyScopeRedesign.validationLadder] : [],
  };
}

export function projectScopePolicyForLaneIds(
  laneIds: readonly string[],
  projectRoot?: string,
): ProjectScopePolicyProjection {
  const scope = loadProjectScope(projectRoot);
  const matches = laneIds.flatMap((laneId) => {
    const lane = scope.seqDataLaneInventory.find((candidate) => candidate.id === laneId);
    return lane ? [toMatch(laneId, lane, "laneId")] : [];
  });
  const validationPacks = unique(matches.flatMap((match) => [...match.requiredValidationPacks]));
  return {
    matches,
    validationPacks,
    validationLadder:
      validationPacks.length > 0 ? [...scope.projectOntologyScopeRedesign.validationLadder] : [],
  };
}

function contractText(
  semantic: SemanticIntentContract,
  digitalTwin: DigitalTwinChangeContract,
): string {
  return [
    ...semantic.affectedSurfaces,
    ...semantic.downstreamAllowed,
    ...semantic.downstreamForbidden,
    ...semantic.nonGoals,
    ...digitalTwin.affectedSurfaces,
    digitalTwin.changeBoundary,
    digitalTwin.permissionBoundary,
    digitalTwin.branchProposalPolicy,
    digitalTwin.evaluationPlan,
  ].join("\n");
}

function contractAuthorizesLane(
  match: ProjectScopeLaneMatch,
  semantic: SemanticIntentContract,
  digitalTwin: DigitalTwinChangeContract,
): boolean {
  const typedLane = semantic.approvedLaneRefs?.some((ref) => ref.laneId === match.laneId);
  const touchedLane = digitalTwin.touchedOntologyRefs?.some(
    (ref) => ref.kind === "ProjectLane" && "laneId" in ref && ref.laneId === match.laneId,
  );
  const legacyText = normalize(contractText(semantic, digitalTwin));
  const legacyTerms = [
    match.file,
    match.laneId,
    match.axisId,
    match.changeContractId,
    ...match.writerSurfaces,
  ].map(normalize);
  return Boolean(typedLane || touchedLane || legacyTerms.some((term) => legacyText.includes(term)));
}

function validationPackCovered(
  pack: string,
  digitalTwin: DigitalTwinChangeContract,
): boolean {
  const typedPack = digitalTwin.requiredEvaluationRefs?.some(
    (ref) => normalize(ref.displayName ?? ref.rid) === normalize(pack),
  );
  return Boolean(typedPack || normalize(digitalTwin.evaluationPlan).includes(normalize(pack)));
}

// ---------------------------------------------------------------------------
// DTC-scoped project-scope conformance evaluator
// ---------------------------------------------------------------------------

export interface DTCProjectScopeConformanceResult {
  /** True when all touchedSurfaces are within writableRoot and none match forbiddenPatterns. */
  readonly conformant: boolean;
  /** Paths from dtc.changeBoundary + affectedSurfaces that fall outside writableRoot. */
  readonly outOfScopePaths: string[];
  /** Ratio of in-scope surfaces to total surfaces (0.0 – 1.0). 1.0 when no surfaces declared. */
  readonly coverageRatio: number;
}

/** Minimatch-style glob check using string prefix matching (avoids glob dep). */
function matchesForbiddenPattern(filePath: string, pattern: string): boolean {
  // Support simple globs: "prefix/**"
  const slashPath = filePath.replace(/\\/g, "/");
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return slashPath === prefix || slashPath.startsWith(`${prefix}/`);
  }
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    const relative = slashPath.startsWith(`${prefix}/`) ? slashPath.slice(prefix.length + 1) : null;
    return relative !== null && !relative.includes("/");
  }
  return slashPath === pattern || slashPath.endsWith(`/${pattern}`);
}

function isWithinWritableRoot(filePath: string, writableRoot: string): boolean {
  if (writableRoot === ".") return true; // project root — all paths allowed
  const slashFile = filePath.replace(/\\/g, "/");
  const slashRoot = writableRoot.replace(/\\/g, "/").replace(/\/$/, "");
  return slashFile === slashRoot || slashFile.startsWith(`${slashRoot}/`);
}

/**
 * Evaluates whether the surfaces declared in a DigitalTwinChangeContract
 * (from `affectedSurfaces` and file-like tokens in `changeBoundary`) are
 * within the project's declared `writableRoot` from `project-scope.json`.
 *
 * Does NOT require a SemanticIntentContract — it operates on the DTC alone.
 */
export function evaluateProjectScopeConformanceForDTC(
  dtc: DigitalTwinChangeContract,
  projectRoot?: string,
  options?: { strictForbiddenPatterns?: boolean },
): DTCProjectScopeConformanceResult {
  const scope = loadProjectScope(projectRoot);
  const { writableRoot, forbiddenPatterns } = scope;
  const strictForbidden = options?.strictForbiddenPatterns ?? true;

  // Collect candidate surface paths.
  const surfaces: string[] = [...dtc.affectedSurfaces];

  // Extract file-like tokens from changeBoundary prose.
  if (typeof dtc.changeBoundary === "string") {
    const tokens = dtc.changeBoundary
      .split(/[\s"'`()\[\]{},;]+/)
      .filter((t) => t.includes("/") || t.includes("*") || /\.(ts|tsx|js|json|md|yml|yaml)$/.test(t));
    surfaces.push(...tokens);
  }

  // Also pull file paths from structuredBoundary if present.
  if (dtc.structuredBoundary) {
    const sbValue = dtc.structuredBoundary.changeBoundary?.value;
    if (typeof sbValue === "string") {
      const tokens = sbValue
        .split(/[\s"'`()\[\]{},;]+/)
        .filter((t) => t.includes("/") || /\.(ts|tsx|js|json|md)$/.test(t));
      surfaces.push(...tokens);
    }
  }

  // Deduplicate.
  const uniqueSurfaces = [...new Set(surfaces.map((s) => s.trim()).filter(Boolean))];

  if (uniqueSurfaces.length === 0) {
    return { conformant: true, outOfScopePaths: [], coverageRatio: 1.0 };
  }

  const outOfScopePaths: string[] = [];

  for (const surface of uniqueSurfaces) {
    const withinRoot = isWithinWritableRoot(surface, writableRoot);
    if (!withinRoot) {
      outOfScopePaths.push(surface);
      continue;
    }
    if (strictForbidden) {
      const forbidden = forbiddenPatterns.some((pattern) => matchesForbiddenPattern(surface, pattern));
      if (forbidden) outOfScopePaths.push(surface);
    }
  }

  const inScopeCount = uniqueSurfaces.length - outOfScopePaths.length;
  const coverageRatio = inScopeCount / uniqueSurfaces.length;

  return {
    conformant: outOfScopePaths.length === 0,
    outOfScopePaths,
    coverageRatio,
  };
}

export function evaluateProjectScopeConformance(input: {
  readonly proposedFiles: readonly string[];
  readonly projectRoot?: string;
  readonly semanticIntentContract: SemanticIntentContract;
  readonly digitalTwinChangeContract: DigitalTwinChangeContract;
}): ProjectScopeConformanceResult {
  const policy = projectScopePolicyForFiles(input.proposedFiles, input.projectRoot);
  const issues: ProjectScopeConformanceIssue[] = [];

  for (const match of policy.matches) {
    if (
      !contractAuthorizesLane(
        match,
        input.semanticIntentContract,
        input.digitalTwinChangeContract,
      )
    ) {
      issues.push({
        kind: "unauthorized-project-lane",
        laneId: match.laneId,
        axisId: match.axisId,
        file: match.file,
        message: `contract does not authorize project lane/surface ${match.laneId} (${match.axisId}) for ${match.file}`,
      });
    }
    const missingValidationPacks = match.requiredValidationPacks.filter(
      (pack) => !validationPackCovered(pack, input.digitalTwinChangeContract),
    );
    if (missingValidationPacks.length > 0) {
      issues.push({
        kind: "missing-validation-pack",
        laneId: match.laneId,
        axisId: match.axisId,
        file: match.file,
        missingValidationPacks,
        message:
          `evaluationPlan omits projectScope validation pack(s) for ${match.laneId}: ` +
          missingValidationPacks.join(", "),
      });
    }
  }

  return {
    ...policy,
    conformant: issues.length === 0,
    evaluationPlanInvalid: issues.some((issue) => issue.kind === "missing-validation-pack"),
    issues,
  };
}
