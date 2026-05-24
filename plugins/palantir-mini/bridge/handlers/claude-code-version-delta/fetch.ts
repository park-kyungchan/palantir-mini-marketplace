// palantir-mini v3.3.0 — claude-code-version-delta fetch + local-scan helpers (B.4)
// Extracted from claude_code_version_delta.ts.

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { extractVersions, isClaudeCodeVersion } from "./semver";

/**
 * Attempt to fetch the remote release notes page via curl.
 * Returns raw body text, or null on failure + populates errorOut.
 */
export function fetchReleaseNotes(url: string, errorOut: { message: string }): string | null {
  try {
    const raw = execSync(
      `curl -sL --max-time 15 ${JSON.stringify(url)}`,
      { timeout: 17_000, encoding: "utf8" }
    );
    return typeof raw === "string" ? raw : null;
  } catch (e) {
    errorOut.message = (e as Error).message ?? "curl failed";
    return null;
  }
}

/**
 * Scan a directory of markdown files for version citations.
 * Returns map of version string → array of file basenames that cite it.
 */
export function scanLocalResearchVersions(researchRoot: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!fs.existsSync(researchRoot)) return result;

  const addEntry = (v: string, file: string) => {
    const existing = result.get(v) ?? [];
    if (!existing.includes(file)) existing.push(file);
    result.set(v, existing);
  };

  for (const entry of fs.readdirSync(researchRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const fullPath = path.join(researchRoot, entry.name);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }
    const versions = extractVersions(content).filter(isClaudeCodeVersion);
    const deduped = Array.from(new Set(versions));
    for (const v of deduped) {
      addEntry(v, entry.name);
    }
  }
  return result;
}

/** Default research root derived from HOME env var. */
export function defaultResearchRoot(): string {
  const home = process.env.HOME ?? "/home/palantirkc";
  return path.join(home, ".claude", "research", "claude-code");
}
