// palantir-mini sprint-138 Slice 2.B — pm-fde-naming-audit skill tests
// Verifies:
//   1. SKILL.md exists at the expected path.
//   2. Frontmatter is parseable (valid --- delimiters).
//   3. Frontmatter name = pm-fde-naming-audit (or namespaced form).
//   4. Frontmatter description is non-empty.
//   5. Body mentions "read-only" (skill read-only invariant).
//   6. Body mentions "compatibility" (compatibility-identifier preservation invariant).
//   7. bridge/mcp-server.ts does NOT register pm_fde_naming_audit or
//      pm-fde-naming-audit in its TOOLS array (skill-only invariant).
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
  "pm-fde-naming-audit",
  "SKILL.md",
);

const MCP_SERVER_PATH = path.join(PLUGIN_ROOT, "bridge", "mcp-server.ts");

// =============================================================================
// Helper — read file or fail with descriptive error
// =============================================================================

function readFileOrFail(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file does not exist: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

// =============================================================================
// Helper — extract frontmatter field value
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
// Tests — SKILL.md existence
// =============================================================================

describe("pm-fde-naming-audit SKILL.md — existence", () => {
  test("SKILL.md exists at expected path", () => {
    expect(fs.existsSync(SKILL_MD_PATH)).toBe(true);
  });

  test("SKILL.md is readable and non-empty", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    expect(content.length).toBeGreaterThan(100);
  });
});

// =============================================================================
// Tests — frontmatter validation
// =============================================================================

describe("pm-fde-naming-audit SKILL.md — frontmatter", () => {
  test("frontmatter has valid opening delimiter (starts with ---)", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    expect(content.startsWith("---\n")).toBe(true);
  });

  test("frontmatter has valid closing delimiter", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const fmStart = content.indexOf("---\n");
    const fmEnd = content.indexOf("\n---", fmStart + 4);
    expect(fmEnd).toBeGreaterThan(0);
  });

  test("frontmatter name field is pm-fde-naming-audit (or namespaced)", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const nameField = extractFrontmatterField(content, "name");
    expect(nameField).toBeDefined();
    // Accept bare name or palantir-mini:pm-fde-naming-audit
    expect(nameField!.includes("pm-fde-naming-audit")).toBe(true);
  });

  test("frontmatter description is non-empty (≥ 10 chars)", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const descField = extractFrontmatterField(content, "description");
    expect(descField).toBeDefined();
    expect(descField!.length).toBeGreaterThan(10);
  });

  test("frontmatter description mentions 'naming audit' or 'naming'", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const descField = extractFrontmatterField(content, "description");
    const lower = (descField ?? "").toLowerCase();
    expect(lower.includes("naming") || lower.includes("audit")).toBe(true);
  });
});

// =============================================================================
// Tests — body invariant documentation
// =============================================================================

describe("pm-fde-naming-audit SKILL.md — invariant documentation in body", () => {
  test("body mentions 'read-only' (read-only invariant documented)", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const hasReadOnly =
      content.includes("read-only") ||
      content.includes("read only") ||
      content.includes("READ-ONLY") ||
      content.includes("readOnly");
    expect(hasReadOnly).toBe(true);
  });

  test("body mentions 'compatibility' (compatibility-identifier preservation invariant)", () => {
    const content = readFileOrFail(SKILL_MD_PATH);
    const hasCompat =
      content.includes("compatibility") || content.includes("compat");
    expect(hasCompat).toBe(true);
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

describe("pm-fde-naming-audit — NOT in MCP TOOLS (skill-only invariant)", () => {
  test("bridge/mcp-server.ts exists", () => {
    expect(fs.existsSync(MCP_SERVER_PATH)).toBe(true);
  });

  test("mcp-server.ts does NOT register pm_fde_naming_audit", () => {
    const content = readFileOrFail(MCP_SERVER_PATH);
    expect(content.includes("pm_fde_naming_audit")).toBe(false);
  });

  test("mcp-server.ts does NOT register pm-fde-naming-audit", () => {
    const content = readFileOrFail(MCP_SERVER_PATH);
    expect(content.includes("pm-fde-naming-audit")).toBe(false);
  });
});
