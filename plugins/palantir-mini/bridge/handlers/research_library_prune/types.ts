// palantir-mini v3.4.0 — research_library_prune sibling: types
// Extracted from bridge/handlers/research_library_prune.ts during N1-LARGE wave 2 decomp.
// Pure type declarations — no runtime imports.

export interface ResearchLibraryPruneArgs {
  /**
   * Absolute path to the research library root to prune.
   * Defaults to ~/.claude/research/palantir-vision/.
   */
  libraryRoot?: string;
  /**
   * Docs older than this many days (by mtime) are flagged as stale-by-age.
   * Default: 90 days.
   */
  staleAgeDays?: number;
  /**
   * When true, only report what WOULD be pruned; do not move files.
   * Default: true (dry-run is the safe default).
   */
  dryRun?: boolean;
  /**
   * Subdirectory name under libraryRoot to move pruned files to.
   * Default: ".prune-archive".
   */
  archiveDirName?: string;
  /** Session identity for event envelope byWhom.agentName */
  agentName?: string;
}

/** Reason a doc was flagged for pruning. */
export type PruneReason = "stale-by-age" | "no-citation";

export interface PruneCandidate {
  /** Absolute path to the research doc. */
  path: string;
  /** Relative path under libraryRoot, for display. */
  relativePath: string;
  /** File mtime as ISO8601 string. */
  mtimeISO: string;
  /** Age of file in days. */
  ageInDays: number;
  /** All reasons this file was flagged. */
  reasons: PruneReason[];
  /** Where the file would be / was archived to. */
  archivePath: string;
  /** True when the file was actually moved (only possible on dryRun=false). */
  moved: boolean;
  /** Error message if the move failed. */
  moveError?: string;
}

export interface ResearchLibraryPruneResult {
  libraryRoot: string;
  dryRun: boolean;
  staleAgeDays: number;
  totalDocsScanned: number;
  pruneCount: number;
  movedCount: number;
  errorCount: number;
  candidates: PruneCandidate[];
  emittedEvent: boolean;
}
