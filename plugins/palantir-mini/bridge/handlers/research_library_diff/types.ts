// palantir-mini v3.5.0 — research_library_diff sibling: type definitions
// v3.5.0 N1-LARGE wave 3 decomposition (was bridge/handlers/research_library_diff.ts 201 LOC).

export interface ResearchSectionDiff {
  /** Section directory name under ~/.claude/research/ */
  section: string;
  /** Absolute path to the section directory */
  sectionPath: string;
  /** Total number of .md files found in the section (recursive) */
  docCount: number;
  /** Parsed entries from _changelog.md (empty array if file missing or empty) */
  changelogEntries: ChangelogEntry[];
  /** True when _changelog.md exists but has no parseable entries */
  changelogEmpty: boolean;
  /** True when _changelog.md is absent entirely */
  changelogMissing: boolean;
}

export interface ChangelogEntry {
  /** Raw line from _changelog.md */
  raw: string;
  /** Best-effort parsed date (ISO8601 prefix) */
  date: string | null;
  /** Rest of the line after the date token */
  description: string;
}

export interface ResearchLibraryDiffResult {
  /** Absolute path to the research library root */
  libraryRoot: string;
  /** Sections that were found */
  sections: ResearchSectionDiff[];
  /** Total .md file count across all sections */
  totalDocCount: number;
  /** Number of sections lacking a _changelog.md */
  sectionsWithoutChangelog: number;
  /** Number of sections with _changelog.md present */
  sectionsWithChangelog: number;
}

export interface ResearchLibraryDiffArgs {
  /**
   * Override for research library root.
   * Defaults to ~/.claude/research/.
   */
  libraryRoot?: string;
  /**
   * Specific section names to query (e.g. ["claude-code", "palantir-vision"]).
   * When omitted, all first-level subdirectories are scanned.
   */
  sections?: string[];
}
