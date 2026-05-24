// palantir-mini v3.3.0 — claude-code-version-delta shared types (B.4)
// Extracted from claude_code_version_delta.ts (369 LOC) per N1-LARGE wave 1.

export interface ClaudeCodeVersionDeltaArgs {
  /**
   * Absolute path to the local research library root that contains
   * features.md, hook-events-v2.md, palantir-mini-blueprint.md.
   * Defaults to ~/.claude/research/claude-code/ resolved from HOME.
   */
  researchRoot?: string;
  /**
   * Override fetch URL (useful for testing against a local mirror).
   * Defaults to the Anthropic release-notes page.
   */
  releaseNotesUrl?: string;
  /** Session identity for event envelope byWhom.agentName */
  agentName?: string;
  /**
   * When true, also emit a learning_captured event for each new version
   * detected (in addition to the summary claude_code_version_checked event).
   * Defaults to false — keep event volume low by default.
   */
  emitPerVersion?: boolean;
}

export interface VersionEntry {
  version: string;
  /** True when the version appears in the remote release notes */
  seenRemote: boolean;
  /** True when the version appears in any local research file */
  seenLocal: boolean;
  /** Which local files cite this version (basenames) */
  localFiles: string[];
  /** Raw section header from remote page that introduced this version, if any */
  remoteHeader?: string;
}

export interface ClaudeCodeVersionDeltaResult {
  /** Last version recorded in local research files */
  localLatest: string | null;
  /** Latest version parsed from remote release notes (null on network failure) */
  remoteLatest: string | null;
  /** True when remoteLatest > localLatest (new version available) */
  newVersionAvailable: boolean;
  /**
   * Versions present in remote but absent from all local research files.
   * Empty when network is unavailable or no delta detected.
   */
  newVersions: VersionEntry[];
  /**
   * All versions cross-referenced (union of local + remote).
   * Ordered descending by semver (newest first).
   */
  allVersions: VersionEntry[];
  /** ISO8601 timestamp of this check */
  checkedAt: string;
  /** Summary message suitable for Lead DM / status line */
  summary: string;
  /** Set when a network or parse error occurred */
  error?: string;
  /** Number of events emitted during this handler invocation */
  emittedEventCount: number;
}

/** Default release-notes URL. */
export const DEFAULT_RELEASE_NOTES_URL =
  "https://docs.anthropic.com/en/release-notes/claude-code";
