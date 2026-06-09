/**
 * @stable — OntologyEngineeringRef primitive (prim-learn-23, v1.51.0)
 *
 * Stable, typed reference graph for Prompt-to-DTC ontology engineering. Legacy
 * user-facing strings remain useful for conversation, but routing and gates
 * should converge on these refs.
 *
 * @owner palantirkc-ontology
 * @purpose Ref-backed Prompt-to-DTC control-plane graph
 */

export type OntologyEngineeringRefKind =
  | "ObjectType"
  | "LinkType"
  | "ActionType"
  | "Function"
  | "Interface"
  | "Property"
  | "ProjectSurface"
  | "ProjectLane"
  | "ValidationPack"
  | "MCPTool"
  | "FileSurface";

export type OntologyEngineeringRefConfidence =
  | "exact"
  | "resolved"
  | "inferred"
  | "unresolved";

export interface OntologyEngineeringRefBase {
  readonly kind: OntologyEngineeringRefKind;
  readonly rid: string;
  readonly displayName?: string;
  readonly project?: string;
  readonly sourcePath?: string;
  readonly confidence: OntologyEngineeringRefConfidence;
}

export interface ObjectTypeRef extends OntologyEngineeringRefBase {
  readonly kind: "ObjectType";
}

export interface LinkTypeRef extends OntologyEngineeringRefBase {
  readonly kind: "LinkType";
}

export interface ActionTypeRef extends OntologyEngineeringRefBase {
  readonly kind: "ActionType";
  readonly requiresSubmissionCriteria?: boolean;
}

export interface FunctionRef extends OntologyEngineeringRefBase {
  readonly kind: "Function";
}

export interface InterfaceRef extends OntologyEngineeringRefBase {
  readonly kind: "Interface";
}

export interface PropertyRef extends OntologyEngineeringRefBase {
  readonly kind: "Property";
}

export interface ProjectSurfaceRef extends OntologyEngineeringRefBase {
  readonly kind: "ProjectSurface";
  readonly surfaceId?: string;
}

export interface ProjectLaneRef extends OntologyEngineeringRefBase {
  readonly kind: "ProjectLane";
  readonly laneId: string;
  readonly axisId: string;
  readonly writerSurfaces: readonly string[];
  readonly readerSurfaces: readonly string[];
}

export interface ValidationPackRef extends OntologyEngineeringRefBase {
  readonly kind: "ValidationPack";
}

export interface MCPToolRef extends OntologyEngineeringRefBase {
  readonly kind: "MCPTool";
  readonly toolName?: string;
}

export interface FileSurfaceRef extends OntologyEngineeringRefBase {
  readonly kind: "FileSurface";
  readonly pathGlob?: string;
}

export type OntologyEngineeringRef =
  | ObjectTypeRef
  | LinkTypeRef
  | ActionTypeRef
  | FunctionRef
  | InterfaceRef
  | PropertyRef
  | ProjectSurfaceRef
  | ProjectLaneRef
  | ValidationPackRef
  | MCPToolRef
  | FileSurfaceRef;

export interface MutationSurfaceRef {
  readonly surfaceRef: MCPToolRef | FileSurfaceRef | ActionTypeRef | ProjectSurfaceRef;
  readonly mutationKind: "read-only" | "propose" | "write" | "commit" | "deploy";
}

export interface BranchPolicyRef {
  readonly rid: string;
  readonly displayName: string;
}

export interface PermissionPolicyRef {
  readonly rid: string;
  readonly displayName: string;
}

export function isOntologyEngineeringRef(x: unknown): x is OntologyEngineeringRef {
  if (typeof x !== "object" || x === null) return false;
  const ref = x as OntologyEngineeringRef;
  return (
    typeof ref.kind === "string" &&
    typeof ref.rid === "string" &&
    ref.rid.length > 0 &&
    (ref.confidence === "exact" ||
      ref.confidence === "resolved" ||
      ref.confidence === "inferred" ||
      ref.confidence === "unresolved")
  );
}
