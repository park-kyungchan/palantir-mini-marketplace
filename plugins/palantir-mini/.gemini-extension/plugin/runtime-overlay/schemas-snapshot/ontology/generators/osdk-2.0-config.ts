/**
 * palantir-mini — OSDK 2.0 codegen configuration primitive
 *
 * Configuration shape consumed by palantir-mini/lib/codegen/descender-gen.ts.
 * Projects can provide a local config to customize output paths, naming
 * conventions, and code templates.
 *
 * The default configuration matches the palantir-math + mathcrew + kosmos
 * convention: src/generated/ as the generated root, src/ as the client root.
 */

export interface Osdk2ConfigNamingConventions {
  /** Suffix appended to branded RID types: "Rid" → "FooRid" */
  readonly ridSuffix?: string;
  /** Suffix for link types: "Link" → "FooLink" */
  readonly linkSuffix?: string;
  /** Suffix for action types: "Action" → "FooAction" */
  readonly actionSuffix?: string;
}

export interface Osdk2Config {
  readonly version: "2.0";
  /** Name printed in the generated header */
  readonly projectName: string;
  /** Relative (to projectRoot) paths */
  readonly clientRoot:    string;
  readonly generatedRoot: string;
  /** Optional naming overrides */
  readonly naming?: Osdk2ConfigNamingConventions;
  /** Whether to enforce the client/generated split check on write */
  readonly enforceSplit: boolean;
}

export const DEFAULT_OSDK2_CONFIG: Osdk2Config = Object.freeze({
  version: "2.0",
  projectName: "palantir-mini",
  clientRoot:    "src",
  generatedRoot: "src/generated",
  naming: {
    ridSuffix:    "Rid",
    linkSuffix:   "Link",
    actionSuffix: "Action",
  },
  enforceSplit: true,
});

/** Produce a config with project-specific overrides on top of defaults */
export function withProjectOverrides(overrides: Partial<Osdk2Config>): Osdk2Config {
  return { ...DEFAULT_OSDK2_CONFIG, ...overrides };
}
