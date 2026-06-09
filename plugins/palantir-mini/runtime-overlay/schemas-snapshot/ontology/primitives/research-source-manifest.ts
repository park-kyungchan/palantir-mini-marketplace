/**
 * @stable — ResearchSourceManifest primitive (prim-research-09, v1.39.0)
 *
 * Typed manifest declaring which external sources a research-library subdirectory
 * mirrors, plus refresh expectations. Replaces free-form file globs with a
 * versioned interface so staleness audits + refresh workflows operate on
 * structured metadata rather than directory scans.
 *
 * One MANIFEST.json per research-library subdirectory:
 *   ~/.claude/research/<topic>/MANIFEST.json
 *
 * Authority chain:
 *   research/anthropic/{effective-harnesses,harness-design,scaling-managed-agents}.md
 *     + research/palantir-foundry/aip/aip-evals*.md
 *     + research/palantir-foundry/ai-fde/*.md
 *     + research/palantir-vision/aipcon-devcon/{ai-fde,aip-evals,devcon,aipcon}.md
 *     + research/claude-code/{features,plugin-system,managed-agents}.md
 *     ↓
 *   plans/<W1.C SSoT-9 plan>.md (manifest-driven research staleness)
 *     ↓
 *   schemas/ontology/primitives/research-source-manifest.ts (this file)
 *     ↓
 *   research/<topic>/MANIFEST.json (per-library JSON instances)
 *     ↓
 *   palantir-mini/hooks/research-staleness-check.ts (SessionStart advisory)
 *     + bridge/handlers/research-staleness-audit.ts (MCP audit handler)
 *     + skills/pm-research-staleness-audit/SKILL.md (user-invoked audit)
 *
 * D/L/A domain: LEARN (manifest is metadata about evidence-source freshness +
 * refresh contracts; pairs with ResearchDocument for per-doc lineage).
 *
 * Rule cross-refs: rule 02 v3.1.0 §Research retrieval (research/ AI-agent
 * read-only SSoT), rule 26 v1.0.0 §Axis A3 (evidence-cited).
 *
 * @owner palantirkc-ontology
 * @purpose Typed evidence-source manifest with refresh-class governance
 */

/**
 * Branded RID for a ResearchSourceManifest. Each manifest names exactly one
 * research-library subdirectory (e.g. "manifest:research/anthropic").
 */
export type ResearchSourceManifestRid = string & {
  readonly __brand: "ResearchSourceManifestRid";
};

export const researchSourceManifestRid = (s: string): ResearchSourceManifestRid =>
  s as ResearchSourceManifestRid;

/**
 * Three canonical refresh classes. The class governs the *expected* cadence at
 * which a source is reverified against its upstream URL; staleness audits use
 * the lookup `RESEARCH_REFRESH_CLASS_DAYS[refreshClass]` as the default
 * `expectedRefreshDays` when a per-source override is absent.
 *
 * - `hot`  — fast-moving operational docs (default 7 days). E.g. Foundry AIP
 *   feature pages that ship behind weekly releases.
 * - `warm` — engineering blogs + canonical docs that change monthly. E.g.
 *   Anthropic engineering posts, Claude Code feature pages.
 * - `cold` — interpretation / synthesis material that rarely changes. E.g.
 *   AIPCon / DevCon talk recaps, philosophy notes.
 */
export type RefreshClass = "hot" | "warm" | "cold";

export const REFRESH_CLASSES: readonly RefreshClass[] = ["hot", "warm", "cold"] as const;

export function isRefreshClass(s: string): s is RefreshClass {
  return (REFRESH_CLASSES as readonly string[]).includes(s);
}

/**
 * Default expected-refresh-days lookup. Used when a `ResearchSource` does not
 * carry a per-source `expectedRefreshDays` override.
 */
export const RESEARCH_REFRESH_CLASS_DAYS: Record<RefreshClass, number> = {
  hot: 7,
  warm: 30,
  cold: 90,
};

/**
 * Single evidence-source declaration within a manifest. Pairs an upstream URL
 * with the local mirror path + freshness contract.
 */
export interface ResearchSource {
  /** Canonical upstream URL the local mirror is sourced from. */
  readonly sourceUrl: string;
  /**
   * Absolute or library-relative path to the local mirror file (e.g.
   * "/home/palantirkc/.claude/research/anthropic/harness-design-2026-03-24.md"
   * or "harness-design-2026-03-24.md" relative to the manifest's directory).
   */
  readonly mirrorPath: string;
  /**
   * Number of days after which the source is considered stale. Override of
   * the class default (`RESEARCH_REFRESH_CLASS_DAYS[refreshClass]`).
   */
  readonly expectedRefreshDays: number;
  /** Refresh-cadence bucket; governs default `expectedRefreshDays`. */
  readonly refreshClass: RefreshClass;
  /** ISO timestamp of last successful fetch / verification. */
  readonly lastFetchedAt: string;
  /**
   * Optional content hash (hex digest) of the local mirror at lastFetchedAt.
   * Audit handlers may recompute the hash to detect silent local edits;
   * absence is permitted (omit when hashing is impractical).
   */
  readonly contentHash?: string;
}

/**
 * Type guard for `ResearchSource`. Use at JSON-parse boundaries to verify a
 * MANIFEST.json entry conforms before passing to staleness audits.
 */
export function isResearchSource(x: unknown): x is ResearchSource {
  if (typeof x !== "object" || x === null) return false;
  const r = x as ResearchSource;
  return (
    typeof r.sourceUrl === "string" &&
    r.sourceUrl.length > 0 &&
    typeof r.mirrorPath === "string" &&
    r.mirrorPath.length > 0 &&
    typeof r.expectedRefreshDays === "number" &&
    Number.isFinite(r.expectedRefreshDays) &&
    r.expectedRefreshDays >= 0 &&
    typeof r.refreshClass === "string" &&
    isRefreshClass(r.refreshClass) &&
    typeof r.lastFetchedAt === "string" &&
    r.lastFetchedAt.length > 0 &&
    (r.contentHash === undefined ||
      (typeof r.contentHash === "string" && r.contentHash.length > 0))
  );
}

/**
 * Top-level manifest declaration. One per research-library subdirectory.
 */
export interface ResearchSourceManifest {
  readonly manifestId: ResearchSourceManifestRid;
  /** Manifest schema version (e.g. "1.0.0"). Independent of schemas pkg semver. */
  readonly version: string;
  /**
   * Owner identifier (agent name / role / team). Matches the `byWhom.agent`
   * convention used in events.jsonl emit envelopes.
   */
  readonly owner: string;
  readonly sources: ReadonlyArray<ResearchSource>;
}

/**
 * Type guard for `ResearchSourceManifest`. Use after JSON.parse on
 * MANIFEST.json before consuming entries.
 */
export function isResearchSourceManifest(x: unknown): x is ResearchSourceManifest {
  if (typeof x !== "object" || x === null) return false;
  const m = x as ResearchSourceManifest;
  if (typeof m.manifestId !== "string" || m.manifestId.length === 0) return false;
  if (typeof m.version !== "string" || m.version.length === 0) return false;
  if (typeof m.owner !== "string" || m.owner.length === 0) return false;
  if (!Array.isArray(m.sources)) return false;
  return m.sources.every(isResearchSource);
}

/**
 * In-memory registry helper. Mirrors the `ResearchDocumentRegistry` pattern —
 * minimal Map-backed storage with `staleEntries(now)` for audit dispatch.
 */
export class ResearchSourceManifestRegistry {
  private readonly manifests = new Map<ResearchSourceManifestRid, ResearchSourceManifest>();

  register(decl: ResearchSourceManifest): void {
    this.manifests.set(decl.manifestId, decl);
  }

  get(rid: ResearchSourceManifestRid): ResearchSourceManifest | undefined {
    return this.manifests.get(rid);
  }

  list(): ResearchSourceManifest[] {
    return [...this.manifests.values()];
  }

  /**
   * Return all `ResearchSource` entries (across all registered manifests) that
   * are stale at `now` (epoch ms). A source is stale when
   * `now - Date.parse(lastFetchedAt) > expectedRefreshDays * 86400_000`.
   *
   * Each returned record carries the `manifestId` of the parent manifest so
   * callers can group findings per library.
   */
  staleEntries(
    now: number,
  ): ReadonlyArray<{
    readonly manifestId: ResearchSourceManifestRid;
    readonly source: ResearchSource;
    readonly daysSinceLastFetch: number;
  }> {
    const stale: Array<{
      manifestId: ResearchSourceManifestRid;
      source: ResearchSource;
      daysSinceLastFetch: number;
    }> = [];
    for (const m of this.manifests.values()) {
      for (const src of m.sources) {
        const fetchedAt = Date.parse(src.lastFetchedAt);
        if (Number.isNaN(fetchedAt)) continue;
        const daysSince = (now - fetchedAt) / 86_400_000;
        if (daysSince > src.expectedRefreshDays) {
          stale.push({
            manifestId: m.manifestId,
            source: src,
            daysSinceLastFetch: daysSince,
          });
        }
      }
    }
    return stale;
  }
}

export const RESEARCH_SOURCE_MANIFEST_REGISTRY = new ResearchSourceManifestRegistry();
