import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");
const PLUGIN_MANIFEST = path.join(PLUGIN_ROOT, ".codex-plugin", "plugin.json");
const CODEX_SKILLS_DIR = path.join(PLUGIN_ROOT, "codex-skills");
const CANONICAL_SKILLS_DIR = path.join(PLUGIN_ROOT, "skills");

const EXPECTED_CODEX_SKILLS = [
  "pm-mcp-reload",
  "pm-ontology-engineering-lead",
  "pm-orchestrate",
  "pm-recap",
  "pm-review",
  "pm-semantic-intent-gate",
  "pm-ship",
  "pm-verify",
] as const;

const NON_DEFAULT_CANONICAL_SKILLS = [
  "pm-dirty-classify",
  "pm-dtc-fill",
  "pm-intent-to-ontology",
  "pm-memory-map",
  "pm-replay",
  "pm-rule-audit",
  "pm-value-audit",
] as const;

interface CodexPluginManifest {
  readonly skills?: string;
  readonly agents?: string;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function skillDirs(root: string): string[] {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .filter((entry) => fs.existsSync(path.join(root, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function frontmatter(filePath: string): string {
  const source = fs.readFileSync(filePath, "utf8");
  expect(source.startsWith("---\n"), filePath).toBe(true);
  const end = source.indexOf("\n---", 4);
  expect(end, filePath).toBeGreaterThan(0);
  return source.slice(4, end);
}

describe("Codex skill and agent export surface", () => {
  test("Codex plugin manifest exports only the thin codex-skills directory", () => {
    const manifest = readJson<CodexPluginManifest>(PLUGIN_MANIFEST);
    const skillsPath = manifest.skills;

    expect(skillsPath).toBe("./codex-skills/");
    if (typeof skillsPath !== "string") {
      throw new Error("plugin.json must declare a Codex skills path");
    }
    expect(path.resolve(PLUGIN_ROOT, skillsPath)).toBe(CODEX_SKILLS_DIR);
    expect(path.resolve(PLUGIN_ROOT, skillsPath)).not.toBe(CANONICAL_SKILLS_DIR);
  });

  test("Codex exported wrappers are the small front-door continuity and release set", () => {
    const exported = skillDirs(CODEX_SKILLS_DIR);

    expect(exported).toEqual([...EXPECTED_CODEX_SKILLS]);
    for (const skillName of exported) {
      const fm = frontmatter(path.join(CODEX_SKILLS_DIR, skillName, "SKILL.md"));
      expect(fm).toContain(`name: ${skillName}`);
      expect(fm).toContain("surfaceStatus: public-core");
      expect(fs.existsSync(path.join(CANONICAL_SKILLS_DIR, skillName, "SKILL.md"))).toBe(true);
    }
  });

  test("canonical skills remain source authority but are not Codex defaults", () => {
    const canonical = skillDirs(CANONICAL_SKILLS_DIR);
    const exported = new Set(skillDirs(CODEX_SKILLS_DIR));

    expect(canonical.length).toBeGreaterThan(EXPECTED_CODEX_SKILLS.length);
    for (const skillName of NON_DEFAULT_CANONICAL_SKILLS) {
      expect(canonical).toContain(skillName);
      expect(exported.has(skillName)).toBe(false);
    }
  });

  test("Codex plugin manifest does not export native agents", () => {
    const manifest = readJson<CodexPluginManifest>(PLUGIN_MANIFEST);

    expect(manifest.agents).toBeUndefined();
  });
});
