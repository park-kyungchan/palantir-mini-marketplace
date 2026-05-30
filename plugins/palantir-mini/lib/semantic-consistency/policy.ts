import type { SemanticConsistencyResolverOutput } from "./types";

export type SemanticConsistencyGateMode = "off" | "advisory" | "blocking";

export function semanticConsistencyGateMode(): SemanticConsistencyGateMode {
  const value = process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE;
  if (value === "off" || value === "advisory" || value === "blocking") return value;
  return "advisory";
}

export function hasUnresolvedBlockingSemanticConflict(
  result: SemanticConsistencyResolverOutput | undefined,
): boolean {
  return (result?.unresolvedBlockingConflictRefs.length ?? 0) > 0;
}
