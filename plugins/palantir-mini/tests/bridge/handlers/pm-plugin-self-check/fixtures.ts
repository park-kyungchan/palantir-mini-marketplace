// palantir-mini v3.5.0 — pm-plugin-self-check shared test fixtures (B1 split)
// Extracted from pm-plugin-self-check.test.ts. Keeps individual test files
// under the 200-LOC budget by removing per-test boilerplate.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const tmpDirs: string[] = [];

export const savedEnv: Record<string, string | undefined> = {};

export function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-self-check-"));
  tmpDirs.push(dir);
  return dir;
}

export function cleanupTmpDirs(): void {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
}

export function saveEnv(): void {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
}

export function restoreEnv(): void {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;

  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
}

/** Create a minimal plugin-like directory tree. Currently unused by orchestrator
 * (real plugin tree is exercised) but kept for future test variants. */
export function makePluginTree(
  root: string,
  opts: {
    agentFiles?: string[];
    skillDirs?: string[];
    missingSkillMdDirs?: string[];
  } = {},
): void {
  const agentFiles = opts.agentFiles ?? ["researcher.md"];
  const skillDirs = opts.skillDirs ?? ["pm-orchestrate"];

  const agentsDir = path.join(root, "agents");
  fs.mkdirSync(agentsDir, { recursive: true });
  for (const f of agentFiles) {
    fs.writeFileSync(path.join(agentsDir, f), `# ${f}\n`);
  }

  const skillsDir = path.join(root, "skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  for (const s of skillDirs) {
    const sDir = path.join(skillsDir, s);
    fs.mkdirSync(sDir, { recursive: true });
    fs.writeFileSync(path.join(sDir, "SKILL.md"), `# ${s}\n`);
  }
  for (const s of opts.missingSkillMdDirs ?? []) {
    const sDir = path.join(skillsDir, s);
    fs.mkdirSync(sDir, { recursive: true });
  }

  const pluginDir = path.join(root, ".claude-plugin");
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, "plugin.json"),
    JSON.stringify({ compatibleSchemaVersions: ">=1.15.0 <2.0.0", version: "2.23.0" }),
  );
}

/** Create a fake schemas/package.json adjacent to <pluginRoot>/../schemas/. */
export function writeSchemasPackageJson(pluginRoot: string, version: string): void {
  const schemasDir = path.join(pluginRoot, "..", "schemas");
  fs.mkdirSync(schemasDir, { recursive: true });
  fs.writeFileSync(path.join(schemasDir, "package.json"), JSON.stringify({ version }));
}
