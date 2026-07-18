// Public barrel for src/adapters/codex/ (ledger row A620,
// docs/architecture.md ADR-007). The one import path downstream consumers
// (A650 parity fixtures, A660 verification) use to read the generated
// Codex binding and its supporting validators — never a direct import of
// `binding.generated.ts` alone.

export { CODEX_BINDING } from "./binding.generated";
export { HEADER, generateCodexBinding, generateCodexBindingSource } from "./generator";
export { checkCodexBindingArtifact } from "./drift-check";
export type { CodexGeneratedCheckResult } from "./drift-check";
export { FORBIDDEN_SCHEMA_COMBINATOR_KEYS, findSchemaCombinatorViolations, isFlatMcpInputSchema } from "./flat-schema";
export type { ForbiddenSchemaCombinatorKey } from "./flat-schema";
export { CODEX_MECHANISM_TO_CONTROL_PLANE_KIND, classifyCodexMechanism } from "./mechanism-classification";
export type {
  CodexBinding,
  CodexCapabilityAreaSummary,
  CodexManifestSkeleton,
  CodexMcpToolSkeleton,
  McpFlatInputSchema,
  McpFlatSchemaProperty,
} from "./types";
