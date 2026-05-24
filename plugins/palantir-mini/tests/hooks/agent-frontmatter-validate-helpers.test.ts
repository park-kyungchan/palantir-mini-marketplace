// palantir-mini v3.7.0 — agent-frontmatter-validate helpers sibling (A.4 split)
// Coverage: extractFrontmatter + detectDeclaredFields + validateAgentFile +
// listAgentMdFiles + isNonAgentDocFile pure-fn unit tests.

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  extractFrontmatter,
  detectDeclaredFields,
  validateAgentFile,
  listAgentMdFiles,
  isNonAgentDocFile,
} from "../../hooks/agent-frontmatter-validate";

function makeTmpProject(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-fm-${label}-`));
}

function writeAgentMd(root: string, name: string, body: string): string {
  const dir = path.join(root, ".claude", "agents");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.md`);
  fs.writeFileSync(file, body, "utf8");
  return file;
}

const CONFORMANT = `---
name: researcher
description: does research
model: opus
tools:
  - Read
  - Grep
maxTurns: 20
memory: project
---

Body here.
`;

const MISSING_MODEL = `---
name: bad-one
description: no model field
tools: [Read]
---

Body here.
`;

const HAS_INITIAL_PROMPT = `---
name: legacy
description: has forbidden field
model: sonnet
tools: [Read]
initialPrompt: "hello"
---

Body.
`;

const WARN_ONLY_MISSING_RECOMMENDED = `---
name: minimal
description: minimal def
model: sonnet
tools: [Read]
---

Body.
`;

const NO_FRONTMATTER = `This has no frontmatter at all.
`;

describe("agent-frontmatter-validate helpers", () => {
  test("extractFrontmatter finds YAML block", () => {
    const fm = extractFrontmatter(CONFORMANT);
    expect(fm).not.toBeNull();
    expect(fm!).toContain("name: researcher");
  });

  test("extractFrontmatter returns null without block", () => {
    expect(extractFrontmatter(NO_FRONTMATTER)).toBeNull();
  });

  test("detectDeclaredFields returns top-level keys", () => {
    const fm = extractFrontmatter(CONFORMANT)!;
    const keys = detectDeclaredFields(fm);
    expect(keys.has("name")).toBe(true);
    expect(keys.has("model")).toBe(true);
    expect(keys.has("tools")).toBe(true);
    expect(keys.has("maxTurns")).toBe(true);
    expect(keys.has("memory")).toBe(true);
  });

  test("validateAgentFile — conformant file has no missingRequired/forbidden", () => {
    const tmp = makeTmpProject("h1");
    const f = writeAgentMd(tmp, "ok", CONFORMANT);
    const r = validateAgentFile(f);
    expect(r.missingRequired).toHaveLength(0);
    expect(r.forbiddenPresent).toHaveLength(0);
    expect(r.missingRecommended).toHaveLength(0);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("validateAgentFile — missing model flagged", () => {
    const tmp = makeTmpProject("h2");
    const f = writeAgentMd(tmp, "bad", MISSING_MODEL);
    const r = validateAgentFile(f);
    expect(r.missingRequired).toContain("model");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("validateAgentFile — initialPrompt flagged", () => {
    const tmp = makeTmpProject("h3");
    const f = writeAgentMd(tmp, "legacy", HAS_INITIAL_PROMPT);
    const r = validateAgentFile(f);
    expect(r.forbiddenPresent).toContain("initialPrompt");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("validateAgentFile — warn-only missing recommended", () => {
    const tmp = makeTmpProject("h4");
    const f = writeAgentMd(tmp, "minimal", WARN_ONLY_MISSING_RECOMMENDED);
    const r = validateAgentFile(f);
    expect(r.missingRequired).toHaveLength(0);
    expect(r.forbiddenPresent).toHaveLength(0);
    expect(r.missingRecommended).toContain("maxTurns");
    expect(r.missingRecommended).toContain("memory");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("listAgentMdFiles returns sorted absolute paths", () => {
    const tmp = makeTmpProject("h5");
    writeAgentMd(tmp, "a1", CONFORMANT);
    writeAgentMd(tmp, "a2", CONFORMANT);
    const files = listAgentMdFiles(path.join(tmp, ".claude", "agents"));
    expect(files.length).toBe(2);
    expect(files.every((f) => path.isAbsolute(f))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("isNonAgentDocFile recognises conventional doc basenames", () => {
    expect(isNonAgentDocFile("BROWSE.md")).toBe(true);
    expect(isNonAgentDocFile("INDEX.md")).toBe(true);
    expect(isNonAgentDocFile("README.md")).toBe(true);
    expect(isNonAgentDocFile("CHANGELOG.md")).toBe(true);
    expect(isNonAgentDocFile("claude.md")).toBe(true);
    expect(isNonAgentDocFile("memory.md")).toBe(true);
    expect(isNonAgentDocFile("notes.md")).toBe(true);
    expect(isNonAgentDocFile("researcher.md")).toBe(false);
    expect(isNonAgentDocFile("hook-builder.md")).toBe(false);
  });

  test("listAgentMdFiles skips BROWSE/INDEX/README doc files", () => {
    const tmp = makeTmpProject("h6");
    const dir = path.join(tmp, ".claude", "agents");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "BROWSE.md"), "# router\n");
    fs.writeFileSync(path.join(dir, "INDEX.md"), "# index\n");
    fs.writeFileSync(path.join(dir, "README.md"), "# readme\n");
    writeAgentMd(tmp, "real-agent", CONFORMANT);
    const files = listAgentMdFiles(dir);
    expect(files.length).toBe(1);
    expect(files[0]!.endsWith("real-agent.md")).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
