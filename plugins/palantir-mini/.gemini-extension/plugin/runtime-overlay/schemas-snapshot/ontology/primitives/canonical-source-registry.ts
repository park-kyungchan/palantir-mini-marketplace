/**
 * @stable — CanonicalSourceRegistry primitive (prim-research-10, v1.41.0)
 *
 * Typed registry declaring the 10 canonical 1차 자료 sources that anchor every
 * cold-start orchestration + research-staleness audit + plan/blueprint citation
 * flow in this control plane. Each entry pairs an upstream URL with the local
 * mirror file path, retrieval cadence class, and source-class taxonomy.
 *
 * Sibling to `ResearchSourceManifest` (prim-research-09, v1.39.0):
 *   - `ResearchSourceManifest` is per-subdir (one MANIFEST.json per
 *     ~/.claude/research/<topic>/) — a *manifest* of arbitrary sources.
 *   - `CanonicalSourceRegistry` is registry-level (collection of sources
 *     promoted to canonical 1차 자료 status across the whole control plane) —
 *     the structured truth Cold-Start automation queries.
 *
 * The registry is intentionally narrow: only sources that the Lead protocol
 * (rule 12), harness substrate (rule 16), valuable-data standard (rule 26),
 * and Palantir/Anthropic vocabulary (CONTEXT.md §15) reference verbatim are
 * promoted to canonical status. Adding a new entry requires a schemas MINOR
 * bump + plan-level rationale.
 *
 * Authority chain:
 *   research/palantir-foundry/aip/{blog-securing-agents-agentic-runtime-1-2026-01-22,
 *                                  ai-fde-overview-and-modes-skills-2026-03-12,
 *                                  aip-evals-overview-and-ontology-edits-2026-04-14,
 *                                  connecting-ai-to-decisions-2024-01,
 *                                  blog-connecting-agents-2026-04-29}.md
 *     + research/anthropic/{effective-harnesses-2025-11-26,
 *                            scaling-managed-agents-2026-04-08,
 *                            harness-design-2026-03-24}.md
 *     + research/claude-code/{features,agent-system-design}.md
 *     ↓
 *   plans/vast-giggling-mccarthy.md §3 Wave 2 W2.C (this primitive)
 *     ↓
 *   schemas/ontology/primitives/canonical-source-registry.ts (this file)
 *     ↓
 *   palantir-mini/skills/pm-cold-start-orchestrate/SKILL.md (W2.A)
 *     + palantir-mini/hooks/cold-start-browse-index-loader.ts (W2.B)
 *     + palantir-mini/bridge/handlers/* (future audit consumers)
 *
 * D/L/A domain: LEARN (registry is metadata about which evidence sources hold
 * canonical 1차 자료 status; pairs with ResearchSourceManifest for per-subdir
 * lineage).
 *
 * Rule cross-refs: rule 02 v3.1.0 §Research retrieval (research/ AI-agent
 * read-only SSoT), rule 26 v1.0.0 §Axis A3 (evidence-cited), rule 26 §Anchors
 * footer (cites the same 1차 자료 mirrors), rule 16 v4.0.0 §Anchors
 * (Anthropic 1차 자료 trio).
 *
 * @owner palantirkc-ontology
 * @purpose Typed canonical-1차자료 registry with retrieval cadence governance
 */

import type { RefreshClass } from "./research-source-manifest";

/**
 * Branded RID for a CanonicalSourceRegistry. Each registry instance names a
 * single registry (e.g. "canonical-source-registry:default").
 */
export type CanonicalSourceRegistryRid = string & {
  readonly __brand: "CanonicalSourceRegistryRid";
};

export const canonicalSourceRegistryRid = (
  s: string,
): CanonicalSourceRegistryRid => s as CanonicalSourceRegistryRid;

/**
 * Branded RID for a single CanonicalSourceEntry within a registry.
 * Convention: "canonical-source:<source-class>:<short-slug>" e.g.
 * "canonical-source:palantir-foundry-canonical:connecting-agents-2026-04-29".
 */
export type CanonicalSourceEntryRid = string & {
  readonly __brand: "CanonicalSourceEntryRid";
};

export const canonicalSourceEntryRid = (
  s: string,
): CanonicalSourceEntryRid => s as CanonicalSourceEntryRid;

/**
 * Three canonical source classes. Class governs which authority chain segment
 * the source feeds and what cadence class it defaults to.
 *
 * - `palantir-foundry-canonical` — official Palantir Foundry / AIP / DevCon /
 *   AIPCon sources. Anchor for ontology + AIP Evals + AI FDE + Workflow
 *   Lineage + Securing Agents content. Default cadence: `cold` (interpretation
 *   material, talks, blogs that rarely change once published).
 *
 * - `claude-code-native-runtime-canonical` — official Anthropic Claude Code
 *   harness-design content authored by Anthropic engineers (Lance Martin,
 *   Justin Young, Prithvi Rajasekaran). Authority for harness taxonomy +
 *   Brain/Hands/Session model. Default cadence: `cold` (talk recaps + posts).
 *
 * - `claude-code-reference` — Claude Code product reference docs (features,
 *   agent system design). Default cadence: `warm` (product surface evolves
 *   monthly with Claude Code releases).
 */
export type CanonicalSourceClass =
  | "palantir-foundry-canonical"
  | "claude-code-native-runtime-canonical"
  | "claude-code-reference";

export const CANONICAL_SOURCE_CLASSES: readonly CanonicalSourceClass[] = [
  "palantir-foundry-canonical",
  "claude-code-native-runtime-canonical",
  "claude-code-reference",
] as const;

export function isCanonicalSourceClass(
  s: string,
): s is CanonicalSourceClass {
  return (CANONICAL_SOURCE_CLASSES as readonly string[]).includes(s);
}

/**
 * Default expected-refresh-days lookup per source class. Mirrors the
 * `RESEARCH_REFRESH_CLASS_DAYS` pattern from ResearchSourceManifest.
 *
 * - `palantir-foundry-canonical` defaults to `cold` (90 days).
 * - `claude-code-native-runtime-canonical` defaults to `cold` (90 days).
 * - `claude-code-reference` defaults to `warm` (30 days).
 *
 * Per-entry overrides via `expectedRefreshDays` field win over class defaults.
 */
export const CANONICAL_SOURCE_CLASS_DEFAULT_CADENCE: Record<
  CanonicalSourceClass,
  RefreshClass
> = {
  "palantir-foundry-canonical": "cold",
  "claude-code-native-runtime-canonical": "cold",
  "claude-code-reference": "warm",
};

/**
 * ISO8601 timestamp brand for unambiguous lastFetchedAt typing.
 */
export type ISO8601 = string & { readonly __brand: "ISO8601" };

export const iso8601 = (s: string): ISO8601 => s as ISO8601;

/**
 * SemVer brand for registry version typing (e.g. "1.0.0").
 */
export type SemVer = string & { readonly __brand: "SemVer" };

export const semVer = (s: string): SemVer => s as SemVer;

/**
 * Single canonical-1차 자료 entry within the registry. Each entry pairs an
 * upstream URL with the local mirror path + retrieval cadence + topic tag.
 */
export interface CanonicalSourceEntry {
  /** RID — "canonical-source:<class>:<slug>". */
  readonly rid: CanonicalSourceEntryRid;
  /** Canonical upstream URL. */
  readonly sourceUrl: string;
  /**
   * Absolute path to the local mirror file (e.g.
   * "/home/palantirkc/.claude/research/anthropic/harness-design-2026-03-24.md").
   * Always absolute — agents read these mirrors directly from disk, never
   * library-relative.
   */
  readonly localMirrorPath: string;
  /** Source-class taxonomy. */
  readonly sourceClass: CanonicalSourceClass;
  /**
   * Topic tag for human-readable grouping in plans/CHANGELOG/audit output.
   * E.g. "harness-taxonomy", "valuable-data", "ai-fde", "ontology-edits".
   */
  readonly topic: string;
  /**
   * Cadence class. Use class default unless the source's evolution speed
   * differs (e.g. Foundry feature pages may need `hot` despite class).
   */
  readonly cadenceClass: RefreshClass;
  /**
   * Number of days after which the source is considered stale. Override of
   * the class-default cadence lookup.
   */
  readonly expectedRefreshDays: number;
  /** ISO timestamp of last successful fetch / verification. */
  readonly lastFetchedAt: ISO8601;
  /**
   * Optional content hash (hex digest) of the local mirror at lastFetchedAt.
   * Audit handlers may recompute the hash to detect silent local edits.
   */
  readonly contentHash?: string;
}

/**
 * Top-level canonical-source registry declaration. One canonical instance
 * per control plane; consumer code pins the registry version + RID.
 */
export interface CanonicalSourceRegistryDeclaration {
  readonly rid: CanonicalSourceRegistryRid;
  /** Registry schema version (independent of schemas pkg semver). */
  readonly version: SemVer;
  /** Owner identifier (typically "palantirkc-ontology"). */
  readonly owner: string;
  readonly entries: ReadonlyArray<CanonicalSourceEntry>;
  /** ISO timestamp of registry emission. */
  readonly emittedAt: ISO8601;
}

/**
 * Type guard for `CanonicalSourceEntry`. Use at JSON-parse boundaries.
 */
export function isCanonicalSourceEntry(x: unknown): x is CanonicalSourceEntry {
  if (typeof x !== "object" || x === null) return false;
  const e = x as CanonicalSourceEntry;
  return (
    typeof e.rid === "string" &&
    e.rid.length > 0 &&
    typeof e.sourceUrl === "string" &&
    e.sourceUrl.length > 0 &&
    typeof e.localMirrorPath === "string" &&
    e.localMirrorPath.length > 0 &&
    typeof e.sourceClass === "string" &&
    isCanonicalSourceClass(e.sourceClass) &&
    typeof e.topic === "string" &&
    e.topic.length > 0 &&
    typeof e.cadenceClass === "string" &&
    (e.cadenceClass === "hot" ||
      e.cadenceClass === "warm" ||
      e.cadenceClass === "cold") &&
    typeof e.expectedRefreshDays === "number" &&
    Number.isFinite(e.expectedRefreshDays) &&
    e.expectedRefreshDays >= 0 &&
    typeof e.lastFetchedAt === "string" &&
    e.lastFetchedAt.length > 0 &&
    (e.contentHash === undefined ||
      (typeof e.contentHash === "string" && e.contentHash.length > 0))
  );
}

/**
 * Type guard for `CanonicalSourceRegistryDeclaration`.
 */
export function isCanonicalSourceRegistryDeclaration(
  x: unknown,
): x is CanonicalSourceRegistryDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const r = x as CanonicalSourceRegistryDeclaration;
  if (typeof r.rid !== "string" || r.rid.length === 0) return false;
  if (typeof r.version !== "string" || r.version.length === 0) return false;
  if (typeof r.owner !== "string" || r.owner.length === 0) return false;
  if (typeof r.emittedAt !== "string" || r.emittedAt.length === 0) return false;
  if (!Array.isArray(r.entries)) return false;
  return r.entries.every(isCanonicalSourceEntry);
}

/**
 * In-memory registry helper. Mirrors the `ResearchSourceManifestRegistry`
 * pattern — Map-backed storage with `byClass` selector + `staleEntries(now)`.
 */
export class CanonicalSourceRegistry {
  private readonly entries = new Map<
    CanonicalSourceEntryRid,
    CanonicalSourceEntry
  >();

  register(entry: CanonicalSourceEntry): void {
    this.entries.set(entry.rid, entry);
  }

  registerAll(decl: CanonicalSourceRegistryDeclaration): void {
    for (const e of decl.entries) this.register(e);
  }

  get(rid: CanonicalSourceEntryRid): CanonicalSourceEntry | undefined {
    return this.entries.get(rid);
  }

  list(): CanonicalSourceEntry[] {
    return [...this.entries.values()];
  }

  /**
   * Filter entries by source class. Used by cold-start orchestration to
   * pull, e.g. all `palantir-foundry-canonical` mirrors at once.
   */
  byClass(cls: CanonicalSourceClass): CanonicalSourceEntry[] {
    return [...this.entries.values()].filter((e) => e.sourceClass === cls);
  }

  /**
   * Return all entries that are stale at `now` (epoch ms). A source is
   * stale when `now - Date.parse(lastFetchedAt) > expectedRefreshDays *
   * 86_400_000`.
   */
  staleEntries(
    now: number,
  ): ReadonlyArray<{
    readonly entry: CanonicalSourceEntry;
    readonly daysSinceLastFetch: number;
  }> {
    const stale: Array<{
      entry: CanonicalSourceEntry;
      daysSinceLastFetch: number;
    }> = [];
    for (const e of this.entries.values()) {
      const fetchedAt = Date.parse(e.lastFetchedAt);
      if (Number.isNaN(fetchedAt)) continue;
      const daysSince = (now - fetchedAt) / 86_400_000;
      if (daysSince > e.expectedRefreshDays) {
        stale.push({ entry: e, daysSinceLastFetch: daysSince });
      }
    }
    return stale;
  }
}

/**
 * Singleton registry — agents and handlers register entries once at import
 * time so cold-start orchestration can query a single source of truth.
 *
 * Concrete instance — 10 canonical 1차 자료 sources (filled by W2.D research
 * mirroring + downstream registration). Listed here as comment-level inventory
 * so this primitive is self-documenting:
 *
 * palantir-foundry-canonical (5):
 *   1. blog-securing-agents-agentic-runtime-1-2026-01-22
 *      → ~/.claude/research/palantir-foundry/aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md
 *      topic: "agentic-runtime", cadence: cold
 *   2. ai-fde-overview-and-modes-skills-2026-03-12
 *      → ~/.claude/research/palantir-foundry/aip/ai-fde-overview-and-modes-skills-2026-03-12.md
 *      topic: "ai-fde", cadence: cold
 *   3. aip-evals-overview-and-ontology-edits-2026-04-14
 *      → ~/.claude/research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md
 *      topic: "aip-evals", cadence: cold
 *   4. connecting-ai-to-decisions-2024-01
 *      → ~/.claude/research/palantir-foundry/aip/connecting-ai-to-decisions-2024-01.md
 *      topic: "decision-lineage", cadence: cold
 *   5. blog-connecting-agents-2026-04-29
 *      → ~/.claude/research/palantir-vision/aipcon-devcon/blog-connecting-agents-2026-04-29.md
 *      topic: "agentic-memory", cadence: cold
 *
 * claude-code-native-runtime-canonical (3):
 *   6. effective-harnesses-2025-11-26 (Justin Young)
 *      → ~/.claude/research/anthropic/effective-harnesses-2025-11-26.md
 *      topic: "harness-taxonomy", cadence: cold
 *   7. scaling-managed-agents-2026-04-08 (Lance Martin)
 *      → ~/.claude/research/anthropic/scaling-managed-agents-2026-04-08.md
 *      topic: "managed-agents", cadence: cold
 *   8. harness-design-2026-03-24 (Prithvi Rajasekaran)
 *      → ~/.claude/research/anthropic/harness-design-2026-03-24.md
 *      topic: "3-agent-harness", cadence: cold
 *
 * claude-code-reference (2):
 *   9. claude-code/features
 *      → ~/.claude/research/claude-code/features.md
 *      topic: "claude-code-features", cadence: warm
 *  10. claude-code/agent-system-design
 *      → ~/.claude/research/claude-code/agent-system-design.md
 *      topic: "agent-system-design", cadence: warm
 *
 * Agents that consume this registry (W2.A skill, W2.B hook) MUST read entries
 * via the singleton or call `registerAll(decl)` once with a project-emitted
 * declaration so a single source of truth governs cold-start behavior.
 */
export const CANONICAL_SOURCE_REGISTRY = new CanonicalSourceRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "10-canonical-1차-자료 registry for cold-start orchestration; no Foundry equivalent",
};
export { categoryFoundryEquivalent as canonicalSourceRegistryFoundryEquivalent };
