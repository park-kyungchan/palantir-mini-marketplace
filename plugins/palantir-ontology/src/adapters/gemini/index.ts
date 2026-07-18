// Public barrel for src/adapters/gemini/ (ledger row A640,
// docs/architecture.md ADR-007). The one import path downstream consumers
// (A650 parity fixtures, A660 verification) use to read the generated
// Gemini binding and its supporting validators — never a direct import of
// `binding.generated.ts` alone.

export { GEMINI_BINDING } from "./binding.generated";
export { HEADER, NATIVE_PACKAGING_STATUS, generateGeminiBinding, generateGeminiBindingSource } from "./generator";
export { checkGeminiBindingArtifact } from "./drift-check";
export type { GeminiGeneratedCheckResult } from "./drift-check";
export { FORBIDDEN_SCHEMA_COMBINATOR_KEYS, findSchemaCombinatorViolations, isFlatMcpInputSchema } from "./flat-schema";
export type { ForbiddenSchemaCombinatorKey } from "./flat-schema";
export { GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND, classifyGeminiMechanism } from "./mechanism-classification";
export type {
  GeminiBinding,
  GeminiCapabilityAreaSummary,
  GeminiManifestSkeleton,
  GeminiMcpToolSkeleton,
  GeminiNativePackagingStatus,
  McpFlatInputSchema,
  McpFlatSchemaProperty,
} from "./types";
