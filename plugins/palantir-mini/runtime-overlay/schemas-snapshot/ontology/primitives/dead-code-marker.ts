/**
 * palantir-mini — DeadCodeMarker primitive (prim-learn-08)
 *
 * Typed flag for gated-off / @deprecated / dead code paths. Lets the
 * system track what is safe to reap and when.
 *
 * Authority chain:
 *   research/palantir/ -> schemas/ontology/primitives/dead-code-marker.ts
 *   -> palantir-mini/lib/audits/dead-code-scan.ts
 *   -> MCP handler scan_dead_code
 *
 * Branded RID pattern (zero runtime cost):
 *   type DeadCodeMarkerRid = string & { __brand: "DeadCodeMarkerRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose DeadCodeMarker primitive (prim-learn-08)
 */

export type DeadCodeMarkerRid = string & {
  readonly __brand: "DeadCodeMarkerRid";
};

export const deadCodeMarkerRid = (s: string): DeadCodeMarkerRid =>
  s as DeadCodeMarkerRid;

export type DeadCodeGateKind = "env" | "flag" | "commit" | "deprecated";

export interface DeadCodeGate {
  readonly kind: DeadCodeGateKind;
  /**
   * Value associated with the gate:
   *   env        -> env var name (e.g. "FEATURE_X_ENABLED")
   *   flag       -> runtime flag name
   *   commit     -> SHA at which the code was first gated off
   *   deprecated -> @deprecated tag message
   */
  readonly value: string;
}

export interface DeadCodeMarkerDeclaration {
  readonly rid: DeadCodeMarkerRid;
  /** "src/systems/runtime.ts#writeBeatFocusTarget" */
  readonly symbolPath: string;
  readonly gatedBy: DeadCodeGate;
  /** ISO date the code was first gated off */
  readonly firstGatedAt: string;
  /** ISO date after which deletion is safe */
  readonly reapableAfter?: string;
  readonly notes?: string;
}

export interface DeadCodeScanner {
  (projectPath: string): ReadonlyArray<DeadCodeMarkerDeclaration>;
}

/** Registry helper — v0 minimal registry via plain Map */
export class DeadCodeMarkerRegistry {
  private readonly markers = new Map<DeadCodeMarkerRid, DeadCodeMarkerDeclaration>();

  register(decl: DeadCodeMarkerDeclaration): void {
    this.markers.set(decl.rid, decl);
  }

  get(rid: DeadCodeMarkerRid): DeadCodeMarkerDeclaration | undefined {
    return this.markers.get(rid);
  }

  list(): DeadCodeMarkerDeclaration[] {
    return [...this.markers.values()];
  }

  /**
   * Scan a project for dead-code markers. Implementation-specific scanners
   * (grep for @deprecated, `if (false)` patterns, env-gated blocks) are
   * plugged in by the audits layer; this contract defines the return shape.
   */
  scan(
    projectPath: string,
    scanner: DeadCodeScanner,
  ): DeadCodeMarkerDeclaration[] {
    const found = scanner(projectPath);
    for (const marker of found) {
      this.markers.set(marker.rid, marker);
    }
    return [...found];
  }

  /** Filter markers whose reapableAfter has passed (as of `now`). */
  reapable(now: string): DeadCodeMarkerDeclaration[] {
    return [...this.markers.values()].filter(
      (m) => m.reapableAfter !== undefined && m.reapableAfter <= now,
    );
  }
}

export const DEAD_CODE_MARKER_REGISTRY = new DeadCodeMarkerRegistry();
