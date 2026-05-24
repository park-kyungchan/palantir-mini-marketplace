// palantir-mini v3.6.0 — shared fixtures for claude-code-version-delta tests (A6 trim).

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function tmpResearchRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-a4-research-"));
}

export function writeResearchFile(root: string, name: string, content: string): void {
  fs.writeFileSync(path.join(root, name), content, "utf8");
}

/** Minimal mock release-notes page that contains version strings in headers. */
export function mockReleasePage(versions: string[]): string {
  return versions
    .map((v) => `## Claude Code v${v}\n\nSome release notes for ${v}.\n`)
    .join("\n");
}
