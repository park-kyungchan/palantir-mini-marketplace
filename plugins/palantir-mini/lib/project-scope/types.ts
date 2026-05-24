export interface ProjectOntologyAxis {
  readonly id: string;
  readonly owns: readonly string[];
  readonly currentAuthority: readonly string[];
  readonly descenders: readonly string[];
  readonly migrationTarget: string;
  readonly bottleneck: string;
  readonly laneRefs?: readonly string[];
}

export interface SurfaceMutationBoundary {
  readonly surface: string;
  readonly owns: readonly string[];
  readonly mustNotOwn: readonly string[];
  readonly durableWriteBoundary: string;
}

export interface ProjectScopeLane {
  readonly id: string;
  readonly axis: string;
  readonly fields: readonly string[];
  readonly writerSurfaces: readonly string[];
  readonly readerSurfaces: readonly string[];
  readonly durableBoundary: string;
  readonly currentAuthority: readonly string[];
  readonly descenders: readonly string[];
  readonly validationPacks: readonly string[];
  readonly changeContractId: string;
}

export interface ProjectScopeRedesign {
  readonly id: string;
  readonly status: string;
  readonly purpose: string;
  readonly validationLadder: readonly string[];
  readonly nonGoals?: readonly string[];
}

export interface ProjectScopeDefinition {
  readonly projectId: string;
  readonly sourcePath: string;
  readonly writableRoot: string;
  readonly forbiddenPatterns: readonly string[];
  readonly domainAgents: readonly string[];
  readonly pathMarkers: readonly string[];
  readonly projectOntologyAxes: readonly ProjectOntologyAxis[];
  readonly surfaceMutationBoundaries: readonly SurfaceMutationBoundary[];
  readonly seqDataLaneInventory: readonly ProjectScopeLane[];
  readonly projectOntologyScopeRedesign: ProjectScopeRedesign;
}
