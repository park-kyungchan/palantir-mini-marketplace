import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const PLUGIN_ROOT = resolve(import.meta.dir, "../..");
const SCAN_ROOTS = [
  join(PLUGIN_ROOT, "agents"),
  join(PLUGIN_ROOT, "skills"),
] as const;

const FORBIDDEN_PATTERNS = [
  { pattern: /identity: "claude-code"/, reason: "agent docs must use <active-runtime-identity> examples" },
  { pattern: /"identity": "claude-code"/, reason: "skill docs must use <active-runtime-identity> examples" },
  { pattern: /surface: "claude-code-cli"/, reason: "agent docs must use <active-runtime-surface> examples" },
  { pattern: /Co-Authored-By: Claude Opus 4\.7/, reason: "ship docs must not force a Claude co-author trailer" },
  { pattern: /\["claude-opus-[^"]+", "claude-sonnet-[^"]+"\]/, reason: "AIP agent defaults must come from deployment/runtime config" },
] as const;

const ALLOWLIST = new Set([
  "skills/pm-lineage/SKILL.md",
]);

function* markdownFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* markdownFiles(full);
    else if (entry.endsWith(".md")) yield full;
  }
}

describe("runtime-neutral docs sentinel", () => {
  test("agent and skill examples do not hard-code Claude as plugin-wide runtime authority", () => {
    const violations: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const filePath of markdownFiles(root)) {
        const rel = relative(PLUGIN_ROOT, filePath);
        if (ALLOWLIST.has(rel)) continue;
        const content = readFileSync(filePath, "utf8");
        for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
          if (pattern.test(content)) violations.push(`${rel}: ${reason}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
