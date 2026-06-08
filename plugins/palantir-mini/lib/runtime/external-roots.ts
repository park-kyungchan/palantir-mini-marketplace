// palantir-mini — neutral external-root resolver (W3c-3)
//
// The understand / retrieval / rule / memory surfaces must not hardcode one
// runtime's external overlay layout (~/.claude/...) or a single operator's home.
// resolveExternalRoots centralizes the host's external overlay roots behind one
// resolver modeled on lib/config/root.ts env-precedence: HOME resolves the operator
// home; the overlay base defaults to <home>/.claude and is overridable via
// PALANTIR_MINI_EXTERNAL_OVERLAY_DIR so a non-Claude host (Codex/Gemini) can repoint
// the whole overlay without editing the neutral core. The plugin-resident snapshots
// (runtime-overlay/*) stay the PRIMARY source in the consumers; these external roots
// are the dev/host overlay fallback those consumers read FROM.
//
// Authority: W3 redesign survey — context-memory-research family neutral_gap
// (adapter-supplied external roots); rule 27 (host self-supplies its surface);
// rule 02 §Authority across runtimes.

import * as os from "node:os";
import * as path from "node:path";

export interface ExternalRoots {
  /** Resolved operator home directory. */
  readonly homeDir: string;
  /** Host external overlay base (default <home>/.claude). */
  readonly overlayDir: string;
  /** External behavioral-rules overlay dir (<overlayDir>/rules). */
  readonly rulesDir: string;
  /** External Palantir-official research root (<overlayDir>/research/palantir-official). */
  readonly researchOfficialDir: string;
  /** External schema-primitives dir (<overlayDir>/schemas/ontology/primitives). */
  readonly schemasPrimitivesDir: string;
  /** External per-project memory-mount base (<overlayDir>/projects). */
  readonly projectsDir: string;
}

/**
 * Resolve the host's external overlay roots. Pure + never throws; values are
 * byte-identical to the previous hardcoded `~/.claude/*` paths when HOME is set
 * and no override is supplied. Pass a custom `env` for testing.
 */
export function resolveExternalRoots(
  env: Record<string, string | undefined> = process.env,
): ExternalRoots {
  const homeDir = env.HOME?.trim() || os.homedir();
  const overlayDir =
    env.PALANTIR_MINI_EXTERNAL_OVERLAY_DIR?.trim() || path.join(homeDir, ".claude");
  return {
    homeDir,
    overlayDir,
    rulesDir: path.join(overlayDir, "rules"),
    researchOfficialDir: path.join(overlayDir, "research", "palantir-official"),
    schemasPrimitivesDir: path.join(overlayDir, "schemas", "ontology", "primitives"),
    projectsDir: path.join(overlayDir, "projects"),
  };
}
