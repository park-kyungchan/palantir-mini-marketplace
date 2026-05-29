import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");

const CODEX_DEFAULT_SKILLS = [
  "pm-dirty-classify",
  "pm-dtc-fill",
  "pm-events-rotate",
  "pm-intent-to-ontology",
  "pm-mcp-reload",
  "pm-memory-map",
  "pm-ontology-engineering-lead",
  "pm-orchestrate",
  "pm-recap",
  "pm-replay",
  "pm-review",
  "pm-rule-audit",
  "pm-semantic-intent-gate",
  "pm-ship",
  "pm-value-audit",
  "pm-verify",
] as const;

function read(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function skillDirs(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
}

describe("Codex skill surface", () => {
  test("Codex manifest exposes a curated default skill directory", () => {
    const manifest = JSON.parse(read(path.join(PLUGIN_ROOT, ".codex-plugin", "plugin.json")));
    expect(manifest.skills).toBe("./codex-skills/");
  });

  test("Codex default skills stay small and delegate to canonical skills", () => {
    const canonicalDir = path.join(PLUGIN_ROOT, "skills");
    const codexDir = path.join(PLUGIN_ROOT, "codex-skills");
    const canonicalSkills = skillDirs(canonicalDir);
    const codexSkills = skillDirs(codexDir);

    expect(codexSkills).toEqual([...CODEX_DEFAULT_SKILLS].sort());
    expect(canonicalSkills.length).toBeGreaterThan(codexSkills.length);
    expect(codexSkills.length).toBeLessThanOrEqual(20);

    for (const skill of codexSkills) {
      const wrapperPath = path.join(codexDir, skill, "SKILL.md");
      const canonicalPath = path.join(canonicalDir, skill, "SKILL.md");
      const wrapper = read(wrapperPath);

      expect(fs.existsSync(canonicalPath), `${canonicalPath} should exist`).toBe(true);
      expect(wrapper).toContain(`../../skills/${skill}/SKILL.md`);
      expect(wrapper).toContain("thin Codex default export");
    }
  });
});
