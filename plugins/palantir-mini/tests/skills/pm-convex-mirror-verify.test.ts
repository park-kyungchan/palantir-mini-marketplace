// palantir-mini v6.62.0 — pm-convex-mirror-verify skill tests (sprint-103 PR 4.1d)
//
// Test plan:
//   S1: SKILL.md frontmatter has required name and description fields
//   S2: SKILL.md body mentions all 4 delta fields (localOnly/cloudOnly/mismatched/matched)
//   S3: SKILL.md body mentions STUB MODE handling
//   S4: SKILL.md body mentions Cloud-unreachable handling
//   S5: SKILL.md references canonical plan v2 §4 row 4.1d
//   S6: SKILL.md declares memory layers (episodic + semantic)
//   L1: computeParityDelta — all matched when local == cloud
//   L2: computeParityDelta — localOnly when cloud missing entries
//   L3: computeParityDelta — cloudOnly when local missing entries
//   L4: computeParityDelta — mismatched when raw payloads diverge
//   L5: computeParityDelta — sampledMismatches capped at 5
//   L6: computeParityDelta — handles empty arrays

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { computeParityDelta } from "../../lib/convex-mirror/verify";

const SKILL_PATH = path.join(
  import.meta.dir,
  "../../skills/pm-convex-mirror-verify/SKILL.md",
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

// ─── SKILL.md structural tests ────────────────────────────────────────────────

describe("pm-convex-mirror-verify SKILL.md frontmatter", () => {
  test("S1a: has name field equal to pm-convex-mirror-verify", () => {
    expect(frontmatter.name).toBe("pm-convex-mirror-verify");
  });

  test("S1b: has non-empty description field", () => {
    expect(typeof frontmatter.description).toBe("string");
    expect((frontmatter.description ?? "").length).toBeGreaterThan(10);
  });
});

describe("pm-convex-mirror-verify SKILL.md body — delta fields", () => {
  test("S2a: mentions localOnly delta field", () => {
    expect(skillContent).toContain("localOnly");
  });

  test("S2b: mentions cloudOnly delta field", () => {
    expect(skillContent).toContain("cloudOnly");
  });

  test("S2c: mentions mismatched delta field", () => {
    expect(skillContent).toContain("mismatched");
  });

  test("S2d: mentions matched delta field", () => {
    expect(skillContent).toContain("matched");
  });
});

describe("pm-convex-mirror-verify SKILL.md body — error handling", () => {
  test("S3: mentions STUB MODE handling", () => {
    expect(skillContent).toContain("PALANTIR_MINI_CONVEX_STUB");
  });

  test("S4: mentions Cloud-unreachable handling", () => {
    expect(skillContent).toContain("unreachable");
  });
});

describe("pm-convex-mirror-verify SKILL.md body — provenance + memory", () => {
  test("S5: references canonical plan v2 §4 row 4.1d", () => {
    expect(skillContent).toContain("4.1d");
  });

  test("S6a: declares episodic memory layer", () => {
    expect(skillContent).toContain("episodic");
  });

  test("S6b: declares semantic memory layer", () => {
    expect(skillContent).toContain("semantic");
  });
});

// ─── computeParityDelta unit tests ───────────────────────────────────────────

describe("computeParityDelta — pure function", () => {
  test("L1: all matched when local and cloud are identical", () => {
    const events = [
      { eventId: "e1", raw: '{"a":1}' },
      { eventId: "e2", raw: '{"a":2}' },
    ];
    const delta = computeParityDelta(events, events);
    expect(delta.matched).toBe(2);
    expect(delta.localOnly).toBe(0);
    expect(delta.cloudOnly).toBe(0);
    expect(delta.mismatched).toBe(0);
    expect(delta.totalLocal).toBe(2);
    expect(delta.totalCloud).toBe(2);
    expect(delta.sampledMismatches).toHaveLength(0);
  });

  test("L2: localOnly when cloud is missing entries", () => {
    const local = [
      { eventId: "e1", raw: '{"a":1}' },
      { eventId: "e2", raw: '{"a":2}' },
    ];
    const cloud = [{ eventId: "e1", raw: '{"a":1}' }];
    const delta = computeParityDelta(local, cloud);
    expect(delta.localOnly).toBe(1);
    expect(delta.matched).toBe(1);
    expect(delta.cloudOnly).toBe(0);
    expect(delta.mismatched).toBe(0);
  });

  test("L3: cloudOnly when local is missing entries", () => {
    const local = [{ eventId: "e1", raw: '{"a":1}' }];
    const cloud = [
      { eventId: "e1", raw: '{"a":1}' },
      { eventId: "e2", raw: '{"a":2}' },
    ];
    const delta = computeParityDelta(local, cloud);
    expect(delta.cloudOnly).toBe(1);
    expect(delta.matched).toBe(1);
    expect(delta.localOnly).toBe(0);
    expect(delta.mismatched).toBe(0);
  });

  test("L4: mismatched when raw payloads diverge for same eventId", () => {
    const local = [{ eventId: "e1", raw: '{"a":1}' }];
    const cloud = [{ eventId: "e1", raw: '{"a":999}' }];
    const delta = computeParityDelta(local, cloud);
    expect(delta.mismatched).toBe(1);
    expect(delta.matched).toBe(0);
    expect(delta.sampledMismatches).toContain("e1");
  });

  test("L5: sampledMismatches capped at 5 entries", () => {
    const local = Array.from({ length: 10 }, (_, i) => ({
      eventId: `e${i}`,
      raw: '{"v":1}',
    }));
    const cloud = Array.from({ length: 10 }, (_, i) => ({
      eventId: `e${i}`,
      raw: '{"v":2}',
    }));
    const delta = computeParityDelta(local, cloud);
    expect(delta.mismatched).toBe(10);
    expect(delta.sampledMismatches.length).toBeLessThanOrEqual(5);
  });

  test("L6: handles empty arrays without throwing", () => {
    const delta = computeParityDelta([], []);
    expect(delta.localOnly).toBe(0);
    expect(delta.cloudOnly).toBe(0);
    expect(delta.mismatched).toBe(0);
    expect(delta.matched).toBe(0);
    expect(delta.totalLocal).toBe(0);
    expect(delta.totalCloud).toBe(0);
  });
});
