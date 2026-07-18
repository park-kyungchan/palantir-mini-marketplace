// Public barrel for src/control-plane/ (ledger row P450, docs/architecture.md
// ADR-003). No product-primitive type or function is ever re-exported from
// here — `src/altitude1/staged-construction.ts`'s `PrimitiveKind` stays
// exclusively an Altitude-1 concern; this barrel only ever exposes
// lifecycle-control metadata.

export {
  CONTROL_PLANE_NODE_KINDS,
  isControlPlaneNodeKind,
  isWellFormedControlPlaneNode,
} from "./types";
export type {
  ControlPlaneNode,
  ControlPlaneNodeKind,
  ControlPlaneNodeStatus,
  ProvenancePointer,
  RuntimeScope,
} from "./types";
export {
  CONTROL_PLANE_CATALOG,
  findByKind,
  findDuplicateNodeIds,
  findDuplicateSourcePaths,
} from "./registry";
export {
  scanControlPlaneKindCollisions,
  scanControlPlaneCompleteness,
  scanForObjectTypeShapedFiles,
} from "./boundary-validator";
export type { CompletenessGap, KindCollisionViolation } from "./boundary-validator";
