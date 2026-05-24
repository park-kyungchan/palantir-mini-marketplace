// palantir-mini v3.3.0 — claude-code-version-delta markdown parser (B.4)
// Extracted from claude_code_version_delta.ts.

import { extractVersions, isClaudeCodeVersion } from "./semver";

/**
 * Parse section headers from markdown text that look like version entries.
 * Returns map of version string → header line.
 */
export function parseMarkdownVersionHeaders(md: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = md.split("\n");
  for (const line of lines) {
    if (!line.startsWith("#")) continue;
    const versions = extractVersions(line).filter(isClaudeCodeVersion);
    for (const v of versions) {
      if (!result.has(v)) result.set(v, line.trim());
    }
  }
  return result;
}
