// palantir-mini v3.4.0 — research_library_refresh sibling: types

export type ResearchLibrarySource =
  | "palantir-official"
  | "palantir-foundry"
  | "claude-code"
  | "palantir-vision"
  | "interaction"
  | "skills"
  | "all";

export interface ResearchLibraryRefreshArgs {
  /** Absolute path to the research library root (e.g. ~/.claude/research/palantir-vision/) */
  libraryRoot?: string;
  /** Compatibility selector used by older MCP schemas. Prefer libraryRoot for precise calls. */
  source?: ResearchLibrarySource;
  /**
   * Path to _manifest.json produced by A5.
   * Defaults to <libraryRoot>/_manifest.json.
   */
  manifestPath?: string;
  /**
   * Override stale threshold in days (default: 30).
   * Docs older than this are treated as stale and refreshed.
   */
  staleThresholdDays?: number;
  /** ISO date. When provided, entries verified before this date are treated as stale. */
  since?: string;
  /** Preview mode: compute stale docs but do not fetch, write, or emit events. */
  dryRun?: boolean;
  /** Session identity for event envelope byWhom.agentName */
  agentName?: string;
}

export interface ManifestEntry {
  /** Relative or absolute path to the research doc */
  path: string;
  /** ISO8601 last verified timestamp */
  lastVerified?: string;
  /** Generated official docs manifest fetched timestamp. */
  fetchedAt?: string;
  /** Upstream sitemap lastmod timestamp. */
  sourceLastmod?: string | null;
  /** Legacy manifest fetched date. Normalized to lastVerified when lastVerified is absent. */
  fetched?: string;
  /** Stale threshold override for this doc */
  staleThresholdDays?: number;
  /** Human-readable topic */
  topic?: string;
  /** Direct fetch URL for markdown/plaintext content. */
  url?: string;
  /** Provenance source URL. Not automatically treated as fetchable content. */
  source?: string;
  sourceUrl?: string;
  canonicalUrl?: string;
  title?: string | null;
  status?: string;
  filename?: string;
  subdir?: string;
  section?: string;
  doc_title?: string;
}

export interface ResearchLibraryManifest {
  version?: string;
  generatedAt?: string;
  generated?: string;
  root?: string;
  total?: number;
  docs?: ManifestEntry[];
  /** Legacy palantir-foundry seed-manifest shape. */
  entries?: ManifestEntry[];
}

export interface DocRefreshResult {
  path: string;
  topic?: string;
  wasStale: boolean;
  refreshedAt: string;
  refreshStatus?: "skipped_fresh" | "dry_run" | "refreshed" | "unfetchable" | "fetch_failed";
  /** Direct fetch URL used by the refresh path. Absent means the doc cannot be refreshed automatically. */
  fetchUrl?: string;
  /** Provenance URL from the manifest. Useful for manual/web extraction, not automatically write-safe. */
  sourceUrl?: string;
  /** Summary extracted from first 500 chars of file, or null on read error */
  summary: string | null;
  /** True when this was a preview result and no write/event was attempted. */
  dryRun?: boolean;
  error?: string;
}

export interface ResearchLibraryRefreshResult {
  libraryRoot: string;
  manifestPath: string;
  source?: ResearchLibrarySource;
  dryRun: boolean;
  totalDocs: number;
  staleDocs: number;
  /** Stale docs that would refresh in dry-run mode. */
  wouldRefresh?: number;
  refreshed: number;
  skipped: number;
  /** Stale docs that cannot be refreshed because no direct fetch URL exists. */
  staleUnfetchableDocs?: number;
  errors: number;
  docs: DocRefreshResult[];
  emittedEventCount: number;
  manifestMissing?: boolean;
  manifestMissingReason?: string;
  manifestMissingCount?: number;
  /** Present only for source=all aggregate calls. */
  libraries?: ResearchLibraryRefreshResult[];
}
