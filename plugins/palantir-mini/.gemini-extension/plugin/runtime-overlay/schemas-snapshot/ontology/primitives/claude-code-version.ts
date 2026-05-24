/**
 * palantir-mini — ClaudeCodeVersion primitive (prim-version-01)
 *
 * Pins the authoritative Claude Code runtime version + the feature surface
 * (hook events, slash commands, MCP capabilities) it is known to expose.
 * Feeds the version-drift audit and `check_cc_version` MCP handler.
 *
 * Authority chain:
 *   research/claude-code/*.md -> schemas/ontology/primitives/claude-code-version.ts (this file)
 *   -> palantir-mini/mcp handlers: check_cc_version
 *   -> plugin hooks: session-drift-check
 *
 * Branded RID pattern (zero runtime cost):
 *   type ClaudeCodeVersionRid = string & { __brand: "ClaudeCodeVersionRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose ClaudeCodeVersion primitive (prim-version-01)
 */

export type ClaudeCodeVersionRid = string & { readonly __brand: "ClaudeCodeVersionRid" };

export const claudeCodeVersionRid = (s: string): ClaudeCodeVersionRid => s as ClaudeCodeVersionRid;

export interface ClaudeCodeDeprecation {
  readonly name: string;
  /** Version the symbol was removed in (semver) */
  readonly removedIn: string;
  readonly replacement?: string;
}

export interface ClaudeCodeFeatureSurface {
  readonly hookEvents: ReadonlyArray<string>;
  readonly slashCommands: ReadonlyArray<string>;
  readonly mcpCapabilities?: ReadonlyArray<string>;
}

export interface ClaudeCodeVersionDeclaration {
  readonly rid: ClaudeCodeVersionRid;
  /** Semver string (e.g. "2.1.113") */
  readonly version: string;
  /** Release ISO timestamp */
  readonly releasedAt: string;
  /** ISO timestamp of last reconciliation against official docs */
  readonly docsVerifiedAt: string;
  /** Plugin IDs that require at least this version */
  readonly requiredByPlugin: ReadonlyArray<string>;
  readonly features: ClaudeCodeFeatureSurface;
  readonly deprecated?: ReadonlyArray<ClaudeCodeDeprecation>;
}

const parseSemver = (v: string): [number, number, number] => {
  const parts = v.split(".").map((p) => Number.parseInt(p, 10));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
};

/**
 * Pure semver compare: -1 if a<b, 0 if equal, 1 if a>b.
 * Only major/minor/patch are compared; pre-release tags are ignored.
 */
export const compareClaudeCodeVersions = (a: string, b: string): -1 | 0 | 1 => {
  const [am, an, ap] = parseSemver(a);
  const [bm, bn, bp] = parseSemver(b);
  if (am !== bm) return am < bm ? -1 : 1;
  if (an !== bn) return an < bn ? -1 : 1;
  if (ap !== bp) return ap < bp ? -1 : 1;
  return 0;
};

/** Registry helper — v0 minimal registry via plain Map */
export class ClaudeCodeVersionRegistry {
  private readonly versions = new Map<ClaudeCodeVersionRid, ClaudeCodeVersionDeclaration>();

  register(decl: ClaudeCodeVersionDeclaration): void {
    this.versions.set(decl.rid, decl);
  }

  get(rid: ClaudeCodeVersionRid): ClaudeCodeVersionDeclaration | undefined {
    return this.versions.get(rid);
  }

  list(): ClaudeCodeVersionDeclaration[] {
    return [...this.versions.values()];
  }

  /** Returns the highest-semver declaration currently registered. */
  getLatest(): ClaudeCodeVersionDeclaration | undefined {
    let latest: ClaudeCodeVersionDeclaration | undefined;
    for (const decl of this.versions.values()) {
      if (latest === undefined || compareClaudeCodeVersions(decl.version, latest.version) === 1) {
        latest = decl;
      }
    }
    return latest;
  }

  compareVersions(a: string, b: string): -1 | 0 | 1 {
    return compareClaudeCodeVersions(a, b);
  }
}

export const CLAUDE_CODE_VERSION_REGISTRY = new ClaudeCodeVersionRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Claude Code CLI version pin; runtime-specific, no Foundry equivalent",
};
export { categoryFoundryEquivalent as claudeCodeVersionFoundryEquivalent };
