// palantir-mini v3.7.0 — lib/semantic-graph/semantic-query/types.ts
// Public input type for runSemanticQuery extracted during A.2 decomposition.

import type { SemanticRid } from "../types";

/**
 * Input for runSemanticQuery.
 *
 * @field projectRoot  Absolute path to the project being analysed.
 * @field targetRids   SemanticRids whose 1-hop neighbourhood to compute.
 *                     Empty array → affectedSemanticRids will be [].
 * @field writeManifest  When false, skips writing semantic-manifest.json.
 *                       Defaults to true.
 */
export interface SemanticQueryInput {
  readonly projectRoot: string;
  readonly targetRids?: ReadonlyArray<SemanticRid>;
  readonly writeManifest?: boolean;
}
