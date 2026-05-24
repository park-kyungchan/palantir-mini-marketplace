// palantir-mini v4.12.0 — complex-task-detector hook tests
// sprint-060 W1.3: rewrites tests for updated heuristic (≥3 conditions, length≥1200,
// tightened keyword list). Closes P1.LD4 / M13 / D.5 architecture review.
//
// Test plan:
//   Positive (4): all 3 conditions simultaneously — must fire advisory.
//   Negative (4): only 1 or 2 conditions — must NOT fire advisory.
//   Existing: skip-delegate bypass + null payload (2 carried over).

import { test, expect, describe } from "bun:test";

import complexTaskDetector from "../../hooks/complex-task-detector";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a prompt of at least `minLen` characters. */
function padToLength(base: string, minLen: number): string {
  const padding = "x".repeat(Math.max(0, minLen - base.length));
  return base + padding;
}

/** 3 file-path tokens that satisfy conditionFilePaths (≥3). */
const FILE_PATHS = "hooks/foo.ts lib/bar.ts tests/baz.ts";

/** 2 tightened keywords that satisfy conditionKeyword (≥2). */
const KEYWORDS_2 = "refactor redesign";

// ─── Positive tests (all 3 conditions match → advisory MUST fire) ────────────

describe("positive_all_three_conditions", () => {
  test("P1: length≥1200 + 2 keywords + 3 file-paths → advisory present", async () => {
    const base = `${KEYWORDS_2} ${FILE_PATHS} `;
    const prompt = padToLength(base, 1200);

    const result = await complexTaskDetector({ prompt, prompt_length: prompt.length });

    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain("[complex-task]");
    expect(result.additionalContext).toContain("prompt-front-door-capture");
    expect(result.additionalContext).toContain("pm_semantic_intent_gate");
    expect(result.additionalContext).toContain("/plan");
    expect(result.additionalContext).toContain("/palantir-mini:pm-delegate-or-direct");
    expect(result.message).toContain("complex task detected");
    expect(result.message).toContain("length≥1200");
    expect(result.message).toContain("keyword-count≥2");
    expect(result.message).toContain("file-paths≥3");
  });

  test("P2: architecture-review keyword + migration keyword + 4 file-paths + long prompt", async () => {
    const base = `architecture review and migration across hooks/a.ts lib/b.ts src/c.ts tests/d.ts `;
    const prompt = padToLength(base, 1200);

    const result = await complexTaskDetector({ prompt, prompt_length: prompt.length });

    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain("[complex-task]");
  });

  test("P3: blueprint + refactor + 3 file-paths + length exactly 1200", async () => {
    const base = `blueprint refactor plan hooks/a.ts lib/b.ts tests/c.ts `;
    const prompt = padToLength(base, 1200);

    const result = await complexTaskDetector({ prompt, prompt_length: 1200 });

    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain("[complex-task]");
  });

  test("P4: Korean 전반/전체 keywords (≥2) + 3 files + length≥1200", async () => {
    const base = `전반적인 전체 리팩터 hooks/a.ts lib/b.ts tests/c.ts `;
    const prompt = padToLength(base, 1200);

    const result = await complexTaskDetector({ prompt, prompt_length: prompt.length });

    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain("[complex-task]");
  });
});

// ─── Negative tests (only 1 or 2 conditions → advisory MUST NOT fire) ────────

describe("negative_below_three_conditions", () => {
  test("N1: only length≥1200 (no keywords, no file-paths) → no advisory", async () => {
    // Only 1 condition: length alone is not enough.
    const prompt = padToLength("fix a simple typo in the readme and update the changelog please", 1200);

    const result = await complexTaskDetector({ prompt, prompt_length: prompt.length });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });

  test("N2: only 3 file-paths (no keywords, short prompt) → no advisory", async () => {
    // Only 1 condition: file-paths alone.
    const result = await complexTaskDetector({
      prompt:        "edit hooks/a.ts lib/b.ts tests/c.ts",
      prompt_length: 35,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });

  test("N3: only 2 keywords (short prompt, no file-paths) → no advisory", async () => {
    // Only 1 condition: keywords alone.
    const result = await complexTaskDetector({
      prompt:        "do a refactor and redesign of the login screen",
      prompt_length: 47,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });

  test("N4: length≥1200 + 2 keywords but no file-paths → no advisory (only 2 conditions)", async () => {
    // 2 conditions: length + keywords. Still below ≥3 gate.
    const base = `refactor and redesign the entire login flow `;
    const prompt = padToLength(base, 1200);

    const result = await complexTaskDetector({ prompt, prompt_length: prompt.length });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });

  test("N5: removed keywords (ontology, schema) should NOT count even with files + length", async () => {
    // Verifies sprint-060 W1.3 keyword removal: "ontology" and "schema" no longer trigger.
    // Even with length + 3 files + these old keywords, 2 conditions = below gate.
    const base = `ontology schema update in hooks/a.ts lib/b.ts tests/c.ts `;
    const prompt = padToLength(base, 1200);

    // 2 conditions: length + file-paths. Keywords "ontology"/"schema" should NOT count.
    const result = await complexTaskDetector({ prompt, prompt_length: prompt.length });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });

  test("N6: length=1199 (just below threshold) + 2 keywords + 3 files → no advisory", async () => {
    // Verifies the new 1200 threshold is exclusive of 1199.
    const base = `refactor redesign hooks/a.ts lib/b.ts tests/c.ts `;
    const prompt = padToLength(base, 1199);

    const result = await complexTaskDetector({ prompt, prompt_length: 1199 });

    // Only 2 conditions (keyword + file-paths); length does not fire.
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });
});

// ─── Carried-over tests ───────────────────────────────────────────────────────

describe("skip_delegate_bypass", () => {
  test("prompt containing skip-delegate suppresses advisory even with all 3 conditions", async () => {
    const base = `skip-delegate refactor redesign hooks/a.ts lib/b.ts tests/c.ts `;
    const prompt = padToLength(base, 1200);

    const result = await complexTaskDetector({ prompt, prompt_length: prompt.length });

    expect(result.message).toContain("bypassed");
    expect(result.additionalContext).toBeUndefined();
  });
});

describe("null_payload_no_throw", () => {
  test("null payload does not throw and returns message string", async () => {
    let threw = false;
    let result: Awaited<ReturnType<typeof complexTaskDetector>>;

    try {
      result = await complexTaskDetector(null);
    } catch {
      threw = true;
      result = { message: "" };
    }

    expect(threw).toBe(false);
    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe("string");
  });
});
