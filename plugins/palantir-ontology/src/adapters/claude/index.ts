// Public barrel for src/adapters/claude/ (ledger row A630,
// docs/architecture.md ADR-007). The one import path downstream consumers
// (A650 parity fixtures, A660 verification) use to read the generated
// Claude binding and its supporting validators — never a direct import of
// `binding.generated.ts` alone.

export { CLAUDE_BINDING } from "./binding.generated";
export { HEADER, generateClaudeBinding, generateClaudeBindingSource } from "./generator";
export { checkClaudeBindingArtifact } from "./drift-check";
export type { ClaudeGeneratedCheckResult } from "./drift-check";
export { FORBIDDEN_SCHEMA_COMBINATOR_KEYS, findSchemaCombinatorViolations, isFlatMcpInputSchema } from "./flat-schema";
export type { ForbiddenSchemaCombinatorKey } from "./flat-schema";
export { CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND, classifyClaudeMechanism } from "./mechanism-classification";
export type {
  ClaudeBinding,
  ClaudeCapabilityAreaSummary,
  ClaudeManifestSkeleton,
  ClaudeMcpToolSkeleton,
  McpFlatInputSchema,
  McpFlatSchemaProperty,
} from "./types";
