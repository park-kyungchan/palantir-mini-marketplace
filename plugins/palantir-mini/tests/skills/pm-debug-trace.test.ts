// palantir-mini v6.50.0 — pm-debug-trace skill tests (sprint-110 PR 4.8)
//
// Test plan:
//   S1: SKILL.md frontmatter has required name and description fields
//   S2: SKILL.md body mentions all 4 filter keys (promptId, sessionId, commitSha, correlationId)
//   S3: SKILL.md body mentions includeArchive option
//   S4: SKILL.md body mentions includeQuarantine option
//   S5: SKILL.md body mentions limit option
//   S6: SKILL.md references canonical plan v2 §4 row 4.8
//   S7: SKILL.md declares memory layers (episodic + semantic)

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";

const SKILL_PATH = path.join(
  import.meta.dir,
  "../../skills/pm-debug-trace/SKILL.md",
);

const skillContent = fs.readFileSync(SKILL_PATH, "utf8");

// ─── Frontmatter helpers ──────────────────────────────────────────────────────

function getFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match || !match[1]) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) {
      result[key.trim()] = rest.join(":").trim();
    }
  }
  return result;
}

const frontmatter = getFrontmatter(skillContent);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("pm-debug-trace SKILL.md frontmatter", () => {
  test("S1a: has name field", () => {
    expect(frontmatter.name).toBe("pm-debug-trace");
  });

  test("S1b: has non-empty description field", () => {
    expect(typeof frontmatter.description).toBe("string");
    expect((frontmatter.description ?? "").length).toBeGreaterThan(10);
  });
});

describe("pm-debug-trace SKILL.md body — filter keys", () => {
  test("S2a: mentions promptId key", () => {
    expect(skillContent).toContain("promptId");
  });

  test("S2b: mentions sessionId key", () => {
    expect(skillContent).toContain("sessionId");
  });

  test("S2c: mentions commitSha key", () => {
    expect(skillContent).toContain("commitSha");
  });

  test("S2d: mentions correlationId key", () => {
    expect(skillContent).toContain("correlationId");
  });
});

describe("pm-debug-trace SKILL.md body — optional flags", () => {
  test("S3: mentions includeArchive option", () => {
    expect(skillContent).toContain("includeArchive");
  });

  test("S4: mentions includeQuarantine option", () => {
    expect(skillContent).toContain("includeQuarantine");
  });

  test("S5: mentions limit option", () => {
    expect(skillContent).toContain("--limit");
  });
});

describe("pm-debug-trace SKILL.md body — provenance + memory", () => {
  test("S6: references canonical plan v2 §4 row 4.8", () => {
    expect(skillContent).toContain("4.8");
  });

  test("S7a: declares episodic memory layer", () => {
    expect(skillContent).toContain("episodic");
  });

  test("S7b: declares semantic memory layer", () => {
    expect(skillContent).toContain("semantic");
  });
});
