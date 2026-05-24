// palantir-mini sprint-138 Slice 1.B — pm-fde-session-preview skill tests
// Verifies:
//   1. SKILL.md exists at the expected path.
//   2. Frontmatter has name=pm-fde-session-preview (or plugin-namespaced form).
//   3. Frontmatter description is non-empty.
//   4. Body contains "mutationAuthorized" or "read-only" (invariant documentation).
//   5. bridge/mcp-server.ts does NOT register pm_fde_session_preview or pm-fde-session-preview
//      in its TOOLS array (skill-only invariant).
import { describe, test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// Path resolution
// =============================================================================

const PLUGIN_ROOT = path.resolve(
  import.meta.dir,
  "..", // tests/
  "..", // plugin root
);

const SKILL_MD_PATH = path.join(
  PLUGIN_ROOT,
  "skills",
  "pm-fde-session-preview",
  "SKILL.md",
);

const MCP_SERVER_PATH = path.join(PLUGIN_ROOT, "bridge", "mcp-server.ts");

// =============================================================================
// Helper — read file or fail
// =============================================================================

function readFileOrFail(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file does not exist: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

// =============================================================================
// Helper — extract frontmatter field
// =============================================================================

function extractFrontmatterField(content: string, field: string): string | undefined {
  const fmStart = content.indexOf("---\n");
  if (fmStart !== 0) return undefined;
  const fmEnd = content.indexOf("\n---", fmStart + 4);
  if (fmEnd === -1) return undefined;
  const frontmatter = content.slice(fmStart + 4, fmEnd);
  const m = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return m?.[1]?.trim();
}

// =============================================================================
// Tests — SKILL.md existence and frontmatter
// =============================================================================

describe("pm-fde-session-preview SKILL.md — existence", () => {
  test("SKILL.md exists at expected path", () => {
    expect(fs.existsSync(SKILL_MD_PATH)).toBe(true);
  });

  test("SKILL.md is readable and non-empty", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    expect(content.length).toBeGreaterThan(100);
  });
});

describe("pm-fde-session-preview SKILL.md — frontmatter validation", () => {
  test("frontmatter name field is pm-fde-session-preview (or namespaced form)", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const nameField = extractFrontmatterField(content, "name");
    expect(nameField).toBeDefined();
    // Accept bare name or plugin-namespaced form (palantir-mini:pm-fde-session-preview)
    expect(nameField!.includes("pm-fde-session-preview")).toBe(true);
  });

  test("frontmatter description is non-empty", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const descField = extractFrontmatterField(content, "description");
    expect(descField).toBeDefined();
    expect(descField!.length).toBeGreaterThan(10);
  });

  test("frontmatter has valid YAML delimiter (starts with ---)", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    expect(content.startsWith("---\n")).toBe(true);
  });

  test("frontmatter has closing delimiter", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const fmStart = content.indexOf("---\n");
    const fmEnd = content.indexOf("\n---", fmStart + 4);
    expect(fmEnd).toBeGreaterThan(0);
  });
});

// =============================================================================
// Tests — read-only invariant documentation in body
// =============================================================================

describe("pm-fde-session-preview SKILL.md — mutation invariant documentation", () => {
  test("body mentions mutationAuthorized (invariant must be documented)", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    // The skill body must document the read-only invariant.
    const hasMutationDoc =
      content.includes("mutationAuthorized") || content.includes("mutation-authorized");
    expect(hasMutationDoc).toBe(true);
  });

  test("body mentions read-only (skill purpose documentation)", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const hasReadOnly =
      content.includes("read-only") ||
      content.includes("read only") ||
      content.includes("READ-ONLY") ||
      content.includes("readOnly");
    expect(hasReadOnly).toBe(true);
  });

  test("body contains 'NOT in MCP TOOLS' or equivalent statement", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const hasNotInMcp =
      content.includes("NOT in MCP TOOLS") ||
      content.includes("not registered") ||
      content.includes("skill-only") ||
      content.includes("NOT registered");
    expect(hasNotInMcp).toBe(true);
  });
});

// =============================================================================
// Tests — bridge/mcp-server.ts does NOT register this skill as a TOOL
// =============================================================================

describe("pm-fde-session-preview — NOT in MCP TOOLS (skill-only invariant)", () => {
  test("bridge/mcp-server.ts exists", () => {
    expect(fs.existsSync(MCP_SERVER_PATH)).toBe(true);
  });

  test("mcp-server.ts does NOT register pm_fde_session_preview as a TOOL", () => {
    const content = readFileOrFail(MCP_SERVER_PATH);
    expect(content.includes("pm_fde_session_preview")).toBe(false);
  });

  test("mcp-server.ts does NOT register pm-fde-session-preview as a TOOL", () => {
    const content = readFileOrFail(MCP_SERVER_PATH);
    expect(content.includes("pm-fde-session-preview")).toBe(false);
  });

  test("mcp-server.ts does NOT register grade_fde_readiness as a TOOL", () => {
    const content = readFileOrFail(MCP_SERVER_PATH);
    expect(content.includes("grade_fde_readiness")).toBe(false);
  });
});
