// palantir-mini — typed Ontology Engineering ref resolver.
//
// This resolver is intentionally conservative: exact/ref-backed matches become
// typed refs; ambiguous contract words are returned as unresolved terms instead
// of being silently inferred.

import { TOOLS } from "../../bridge/mcp-server";
import {
  loadProjectScope,
  type ProjectScopeLane,
  type ProjectScopeDefinition,
} from "../project-scope/loader";
import type {
  ActionTypeRef,
  FileSurfaceRef,
  FunctionRef,
  InterfaceRef,
  LinkTypeRef,
  MCPToolRef,
  MutationSurfaceRef,
  ObjectTypeRef,
  OntologyEngineeringRef,
  ProjectLaneRef,
  ProjectSurfaceRef,
  ValidationPackRef,
} from "#schemas/ontology/primitives/ontology-engineering-ref";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "./contracts";

export type OntologyRefTermSource =
  | "approvedNouns"
  | "approvedVerbs"
  | "affectedSurfaces"
  | "scopePaths";

export interface UnresolvedOntologyRefTerm {
  term: string;
  source: OntologyRefTermSource;
  reason: string;
}

export interface OntologyRefResolutionResult {
  approvedObjectTypeRefs: ObjectTypeRef[];
  approvedActionTypeRefs: ActionTypeRef[];
  approvedFunctionRefs: FunctionRef[];
  approvedLinkTypeRefs: LinkTypeRef[];
  approvedInterfaceRefs: InterfaceRef[];
  approvedSurfaceRefs: ProjectSurfaceRef[];
  approvedLaneRefs: ProjectLaneRef[];
  approvedMcpToolRefs: MCPToolRef[];
  touchedOntologyRefs: OntologyEngineeringRef[];
  permittedMutationSurfaces: MutationSurfaceRef[];
  requiredEvaluationRefs: ValidationPackRef[];
  unresolvedTerms: UnresolvedOntologyRefTerm[];
}

export interface ResolveOntologyRefsInput {
  semanticIntentContract?: SemanticIntentContract;
  digitalTwinChangeContract?: DigitalTwinChangeContract;
  scopePaths?: readonly string[];
  projectRoot?: string;
}

const SCHEMA_PRIMITIVE_SOURCE = ".claude/schemas/ontology/primitives";

function normalizeTerm(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function refKey(ref: OntologyEngineeringRef): string {
  return `${ref.kind}:${ref.rid}`;
}

function pushUniqueRef<T extends OntologyEngineeringRef>(refs: T[], ref: T): void {
  if (refs.some((existing) => refKey(existing) === refKey(ref))) return;
  refs.push(ref);
}

function pushUniqueMutation(refs: MutationSurfaceRef[], ref: MutationSurfaceRef): void {
  const key = `${ref.surfaceRef.kind}:${ref.surfaceRef.rid}:${ref.mutationKind}`;
  if (refs.some((existing) => {
    const existingKey =
      `${existing.surfaceRef.kind}:${existing.surfaceRef.rid}:${existing.mutationKind}`;
    return existingKey === key;
  })) return;
  refs.push(ref);
}

function pushUniqueValidation(refs: ValidationPackRef[], ref: ValidationPackRef): void {
  if (refs.some((existing) => existing.rid === ref.rid)) return;
  refs.push(ref);
}

function interfaceRef(displayName: string, sourcePath: string): InterfaceRef {
  return {
    kind: "Interface",
    rid: `schema://prompt-dtc/${displayName}`,
    displayName,
    sourcePath,
    confidence: "exact",
  };
}

const SCHEMA_INTERFACE_REFS = [
  interfaceRef("PromptEnvelope", `${SCHEMA_PRIMITIVE_SOURCE}/prompt-envelope.ts`),
  interfaceRef("PromptContractRecord", `${SCHEMA_PRIMITIVE_SOURCE}/prompt-contract-record.ts`),
  interfaceRef("SemanticIntentContract", `${SCHEMA_PRIMITIVE_SOURCE}/semantic-intent-contract.ts`),
  interfaceRef("DigitalTwinChangeContract", `${SCHEMA_PRIMITIVE_SOURCE}/digital-twin-change-contract.ts`),
  interfaceRef("ApprovalRef", `${SCHEMA_PRIMITIVE_SOURCE}/approval-ref.ts`),
  interfaceRef("OntologyEngineeringRef", `${SCHEMA_PRIMITIVE_SOURCE}/ontology-engineering-ref.ts`),
] as const;

const SCHEMA_INTERFACE_BY_TERM = new Map(
  SCHEMA_INTERFACE_REFS.flatMap((ref) => [
    [normalizeTerm(ref.displayName ?? ref.rid), ref],
    [normalizeTerm(ref.rid), ref],
  ]),
);

function mcpToolRef(toolName: string): MCPToolRef {
  return {
    kind: "MCPTool",
    rid: `mcp://palantir-mini/${toolName}`,
    displayName: toolName,
    toolName,
    sourcePath: "palantir-mini/bridge/mcp-server.ts",
    confidence: "exact",
  };
}

const MCP_TOOL_BY_TERM = new Map(
  TOOLS.flatMap((tool) => {
    const ref = mcpToolRef(tool.name);
    return [
      [normalizeTerm(tool.name), ref],
      [normalizeTerm(ref.rid), ref],
    ];
  }),
);

interface ProjectRefIndex {
  readonly scope: ProjectScopeDefinition;
  readonly projectId: string;
  readonly sourcePath: string;
  readonly surfaceByTerm: Map<string, ProjectSurfaceRef>;
  readonly laneByTerm: Map<string, ProjectLaneRef>;
  readonly validationPackByTerm: Map<string, ValidationPackRef>;
}

function projectSurfaceRef(
  surface: string,
  index: Pick<ProjectRefIndex, "projectId" | "sourcePath">,
): ProjectSurfaceRef {
  return {
    kind: "ProjectSurface",
    rid: `project://${index.projectId}/surface/${surface}`,
    displayName: surface,
    project: index.projectId,
    sourcePath: index.sourcePath,
    confidence: "exact",
    surfaceId: surface,
  };
}

function projectLaneRef(
  lane: ProjectScopeLane,
  index: Pick<ProjectRefIndex, "projectId" | "sourcePath">,
): ProjectLaneRef {
  return {
    kind: "ProjectLane",
    rid: `project://${index.projectId}/lane/${lane.id}`,
    displayName: lane.id,
    project: index.projectId,
    sourcePath: index.sourcePath,
    confidence: "exact",
    laneId: lane.id,
    axisId: lane.axis,
    writerSurfaces: [...lane.writerSurfaces],
    readerSurfaces: [...lane.readerSurfaces],
  };
}

function validationPackRef(
  pack: string,
  index: Pick<ProjectRefIndex, "projectId" | "sourcePath">,
): ValidationPackRef {
  return {
    kind: "ValidationPack",
    rid: `project://${index.projectId}/validation-pack/${pack}`,
    displayName: pack,
    project: index.projectId,
    sourcePath: index.sourcePath,
    confidence: "exact",
  };
}

function buildProjectRefIndex(projectRoot?: string): ProjectRefIndex {
  const scope = loadProjectScope(projectRoot);
  const indexBase = {
    projectId: scope.projectId,
    sourcePath: scope.sourcePath,
  };
  const surfaceByTerm = new Map<string, ProjectSurfaceRef>();
  const laneByTerm = new Map<string, ProjectLaneRef>();
  const validationPackByTerm = new Map<string, ValidationPackRef>();

  for (const boundary of scope.surfaceMutationBoundaries) {
    const ref = projectSurfaceRef(boundary.surface, indexBase);
    surfaceByTerm.set(normalizeTerm(boundary.surface), ref);
    surfaceByTerm.set(normalizeTerm(ref.rid), ref);
  }

  for (const lane of scope.seqDataLaneInventory) {
    const ref = projectLaneRef(lane, indexBase);
    const aliases = [
      lane.id,
      lane.axis,
      ref.rid,
      ...lane.fields,
      ...lane.currentAuthority,
      ...lane.descenders,
    ];
    for (const alias of aliases) laneByTerm.set(normalizeTerm(alias), ref);
    for (const pack of lane.validationPacks) {
      const packRef = validationPackRef(pack, indexBase);
      validationPackByTerm.set(normalizeTerm(pack), packRef);
      validationPackByTerm.set(normalizeTerm(packRef.rid), packRef);
    }
  }

  for (const axis of scope.projectOntologyAxes) {
    const laneRefs = axis.laneRefs ?? [];
    for (const laneId of laneRefs) {
      const lane = laneByTerm.get(normalizeTerm(laneId));
      if (lane) laneByTerm.set(normalizeTerm(axis.id), lane);
    }
  }

  return {
    scope,
    ...indexBase,
    surfaceByTerm,
    laneByTerm,
    validationPackByTerm,
  };
}

function looksLikeFileSurface(term: string): boolean {
  return (
    term.includes("/") ||
    term.includes("*") ||
    /\.(ts|tsx|js|jsx|json|md|yml|yaml|toml)$/.test(term)
  );
}

function fileSurfaceRef(term: string, confidence: FileSurfaceRef["confidence"]): FileSurfaceRef {
  return {
    kind: "FileSurface",
    rid: `file:${term}`,
    displayName: term,
    sourcePath: term,
    confidence,
    pathGlob: term,
  };
}

function resolveTerm(
  term: string,
  source: OntologyRefTermSource,
  result: OntologyRefResolutionResult,
  projectRefs: ProjectRefIndex,
): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  const normalized = normalizeTerm(trimmed);

  const interfaceMatch = SCHEMA_INTERFACE_BY_TERM.get(normalized);
  if (interfaceMatch) {
    pushUniqueRef(result.approvedInterfaceRefs, interfaceMatch);
    pushUniqueRef(result.touchedOntologyRefs, interfaceMatch);
    return;
  }

  const toolMatch = MCP_TOOL_BY_TERM.get(normalized);
  if (toolMatch) {
    pushUniqueRef(result.approvedMcpToolRefs, toolMatch);
    pushUniqueRef(result.touchedOntologyRefs, toolMatch);
    pushUniqueMutation(result.permittedMutationSurfaces, {
      surfaceRef: toolMatch,
      mutationKind: toolMatch.toolName === "commit_edits" ? "commit" : "write",
    });
    return;
  }

  const laneMatch = projectRefs.laneByTerm.get(normalized);
  if (laneMatch) {
    pushUniqueRef(result.approvedLaneRefs, laneMatch);
    pushUniqueRef(result.touchedOntologyRefs, laneMatch);
    for (const surface of laneMatch.writerSurfaces) {
      const surfaceRef = projectRefs.surfaceByTerm.get(normalizeTerm(surface));
      if (!surfaceRef) continue;
      pushUniqueRef(result.approvedSurfaceRefs, surfaceRef);
      pushUniqueMutation(result.permittedMutationSurfaces, {
        surfaceRef,
        mutationKind: "write",
      });
    }
    const lane = projectRefs.scope.seqDataLaneInventory.find((candidate) => candidate.id === laneMatch.laneId);
    for (const pack of lane?.validationPacks ?? []) {
      pushUniqueValidation(result.requiredEvaluationRefs, validationPackRef(pack, projectRefs));
    }
    return;
  }

  const surfaceMatch = projectRefs.surfaceByTerm.get(normalized);
  if (surfaceMatch) {
    pushUniqueRef(result.approvedSurfaceRefs, surfaceMatch);
    pushUniqueRef(result.touchedOntologyRefs, surfaceMatch);
    pushUniqueMutation(result.permittedMutationSurfaces, {
      surfaceRef: surfaceMatch,
      mutationKind: "write",
    });
    return;
  }

  const validationPackMatch = projectRefs.validationPackByTerm.get(normalized);
  if (validationPackMatch) {
    pushUniqueValidation(result.requiredEvaluationRefs, validationPackMatch);
    pushUniqueRef(result.touchedOntologyRefs, validationPackMatch);
    return;
  }

  if (source === "affectedSurfaces" || source === "scopePaths") {
    if (looksLikeFileSurface(trimmed)) {
      const ref = fileSurfaceRef(trimmed, "exact");
      pushUniqueRef(result.touchedOntologyRefs, ref);
      pushUniqueMutation(result.permittedMutationSurfaces, {
        surfaceRef: ref,
        mutationKind: "write",
      });
      return;
    }
  }

  result.unresolvedTerms.push({
    term: trimmed,
    source,
    reason: "No exact schema primitive, MCP tool, project surface, lane, validation pack, or file-surface match.",
  });
}

// ---------------------------------------------------------------------------
// DTC tool-surface resolver
// ---------------------------------------------------------------------------

export interface ResolvedDTCToolSurface {
  /** Tool names found in the project MCP registry. */
  resolvedTools: string[];
  /** Terms from the DTC that did not match any registered MCP tool. */
  unresolvedToolSurfaceTerms: string[];
}

/**
 * Resolves `dtc.permittedMutationSurfaces` (MCPTool-kind entries) and the
 * `dtc.toolSurfaceReadiness` prose string against the project MCP tool
 * registry (MCP_TOOL_BY_TERM, seeded from TOOLS in mcp-server.ts).
 *
 * Returns resolved tool names and unresolved terms so callers can surface
 * gaps before Wave 4 validator enforcement fires.
 */
export function resolveDTCToolSurfaceTerms(
  dtc: DigitalTwinChangeContract,
): ResolvedDTCToolSurface {
  const resolved = new Set<string>();
  const unresolved = new Set<string>();

  // 1. Typed permittedMutationSurfaces with kind=MCPTool.
  const typedCandidates: string[] = (dtc.permittedMutationSurfaces ?? [])
    .filter((ms) => ms.surfaceRef.kind === "MCPTool")
    .map((ms) => {
      const ref = ms.surfaceRef as MCPToolRef;
      return ref.toolName ?? ref.displayName ?? ref.rid;
    });

  // 2. Prose token extraction from toolSurfaceReadiness string.
  const proseTokens: string[] =
    typeof dtc.toolSurfaceReadiness === "string" && dtc.toolSurfaceReadiness.length > 0
      ? dtc.toolSurfaceReadiness
          .split(/[\s,;|/\\()\[\]{}"'`]+/)
          .filter((t) => /^[a-z_][a-z0-9_]*$/i.test(t) && t.length >= 3)
      : [];

  const allCandidates = [...typedCandidates, ...proseTokens];

  for (const candidate of allCandidates) {
    const key = normalizeTerm(candidate);
    const match = MCP_TOOL_BY_TERM.get(key);
    if (match) {
      resolved.add(match.toolName ?? match.displayName ?? candidate);
    } else {
      unresolved.add(candidate);
    }
  }

  // Remove any unresolved entry whose normalized form matched a resolved one.
  for (const resolvedName of resolved) {
    unresolved.delete(resolvedName);
    unresolved.delete(normalizeTerm(resolvedName));
  }

  return {
    resolvedTools: [...resolved],
    unresolvedToolSurfaceTerms: [...unresolved],
  };
}

export function resolveOntologyRefs(
  input: ResolveOntologyRefsInput,
): OntologyRefResolutionResult {
  const projectRefs = buildProjectRefIndex(input.projectRoot);
  const result: OntologyRefResolutionResult = {
    approvedObjectTypeRefs: [],
    approvedActionTypeRefs: [],
    approvedFunctionRefs: [],
    approvedLinkTypeRefs: [],
    approvedInterfaceRefs: [],
    approvedSurfaceRefs: [],
    approvedLaneRefs: [],
    approvedMcpToolRefs: [],
    touchedOntologyRefs: [],
    permittedMutationSurfaces: [],
    requiredEvaluationRefs: [],
    unresolvedTerms: [],
  };

  for (const term of input.semanticIntentContract?.approvedNouns ?? []) {
    resolveTerm(term, "approvedNouns", result, projectRefs);
  }
  for (const term of input.semanticIntentContract?.approvedVerbs ?? []) {
    resolveTerm(term, "approvedVerbs", result, projectRefs);
  }
  for (const term of input.semanticIntentContract?.affectedSurfaces ?? []) {
    resolveTerm(term, "affectedSurfaces", result, projectRefs);
  }
  for (const term of input.digitalTwinChangeContract?.affectedSurfaces ?? []) {
    resolveTerm(term, "affectedSurfaces", result, projectRefs);
  }
  for (const term of input.scopePaths ?? []) {
    resolveTerm(term, "scopePaths", result, projectRefs);
  }

  return result;
}
