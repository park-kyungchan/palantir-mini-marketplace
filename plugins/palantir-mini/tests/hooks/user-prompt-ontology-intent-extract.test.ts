// palantir-mini v4.15.0 — user-prompt-ontology-intent-extract hook tests (sprint-062 Phase 2 W1-α)
//
// Test plan:
//   Short prompt (no conditions) → heuristic clear, no advisory
//   Long prompt (≥600 chars) → advisory emitted
//   File paths ≥2 → advisory emitted
//   Keywords ≥2 → advisory emitted
//   All conditions → advisory emitted, reasons all listed
//   PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1 → bypass message, no advisory
//   Null payload → no throw
//   Advisory content contains 6-step downstream protocol summary
//   Advisory content preserves prompt-front-door + semantic gate as proof path

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import userPromptOntologyIntentExtract from "../../hooks/user-prompt-ontology-intent-extract";

// ─── Helper ───────────────────────────────────────────────────────────────────

function padToLength(base: string, minLen: number): string {
  return base + "x".repeat(Math.max(0, minLen - base.length));
}

let savedBypass: string | undefined;

beforeEach(() => {
  savedBypass = process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS;
  delete process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS;
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS;
  }
});

// ─── Negative: heuristic clear ───────────────────────────────────────────────

describe("heuristic_clear", () => {
  test("N1: short prompt, no keywords, no file paths → heuristic clear", async () => {
    const result = await userPromptOntologyIntentExtract({
      prompt:        "fix a typo",
      prompt_length: 10,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });

  test("N2: prompt 599 chars, no keywords, no file paths → no advisory", async () => {
    const prompt = padToLength("update readme", 599);
    const result = await userPromptOntologyIntentExtract({ prompt, prompt_length: 599 });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });

  test("N3: only 1 keyword → below threshold (needs ≥2)", async () => {
    const result = await userPromptOntologyIntentExtract({
      prompt:        "refactor this function",
      prompt_length: 22,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });

  test("N4: only 1 file path → below threshold (needs ≥2)", async () => {
    const result = await userPromptOntologyIntentExtract({
      prompt:        "edit hooks/foo.ts please",
      prompt_length: 24,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });
});

// ─── Positive: condition A (length) ──────────────────────────────────────────

describe("condition_length", () => {
  test("P1: prompt ≥600 chars → advisory emitted", async () => {
    const prompt = padToLength("please help me fix this issue", 600);
    const result = await userPromptOntologyIntentExtract({ prompt, prompt_length: 600 });
    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("length≥600");
  });

  test("P2: prompt exactly 600 chars → advisory emitted (boundary inclusive)", async () => {
    const prompt = padToLength("x", 600);
    const result = await userPromptOntologyIntentExtract({ prompt, prompt_length: 600 });
    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("advisory");
  });
});

// ─── Positive: condition B (file paths) ──────────────────────────────────────

describe("condition_file_paths", () => {
  test("P3: 2 file path tokens → advisory emitted", async () => {
    const result = await userPromptOntologyIntentExtract({
      prompt:        "please edit hooks/foo.ts and lib/bar.ts to fix the issue",
      prompt_length: 55,
    });
    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("file-paths≥2");
  });

  test("P4: 3 file path tokens → advisory emitted", async () => {
    const result = await userPromptOntologyIntentExtract({
      prompt:        "edit hooks/a.ts and lib/b.ts and tests/c.ts for this sprint",
      prompt_length: 58,
    });
    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("file-paths≥2");
  });
});

// ─── Positive: condition C (keywords) ────────────────────────────────────────

describe("condition_keywords", () => {
  test("P5: 2 matching keywords → advisory emitted", async () => {
    const result = await userPromptOntologyIntentExtract({
      prompt:        "refactor and implement the new design",
      prompt_length: 37,
    });
    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("keyword-count≥2");
  });

  test("P6: keywords ontology + impact → advisory emitted", async () => {
    const result = await userPromptOntologyIntentExtract({
      prompt:        "assess the ontology impact of this change",
      prompt_length: 41,
    });
    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("keyword-count≥2");
  });

  test("P7: keywords ship + deploy → advisory emitted", async () => {
    const result = await userPromptOntologyIntentExtract({
      prompt:        "ship this and deploy to production",
      prompt_length: 34,
    });
    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("keyword-count≥2");
  });
});

// ─── Positive: all conditions ─────────────────────────────────────────────────

describe("all_conditions", () => {
  test("P8: length + file paths + keywords → all reasons listed", async () => {
    const base = "refactor and implement the ontology hooks/a.ts hooks/b.ts lib/c.ts ";
    const prompt = padToLength(base, 600);
    const result = await userPromptOntologyIntentExtract({ prompt, prompt_length: prompt.length });
    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("length≥600");
    expect(result.message).toContain("file-paths≥2");
    expect(result.message).toContain("keyword-count≥2");
  });
});

// ─── Advisory content ─────────────────────────────────────────────────────────

describe("advisory_content", () => {
  test("P9: advisory mentions current public discovery path", async () => {
    const prompt = padToLength("refactor and implement", 600);
    const result = await userPromptOntologyIntentExtract({ prompt, prompt_length: 600 });
    const ctx = result.additionalContext ?? "";
    expect(ctx).toContain("pm-intent-to-ontology");
    expect(ctx).toContain("pm_semantic_intent_gate");
    expect(ctx).toContain("ontology_context_query");
    expect(ctx).toContain("pm_substrate_query");
    expect(ctx).toContain("pm_intent_router");
    expect(ctx).toContain("Bind WorkContract/SprintContract");
    expect(ctx).not.toContain("pm_workflow_lineage_query");
    expect(ctx).not.toContain("pm_event_query_by_grade");
    expect(ctx).not.toContain("propagation_audit_forward");
  });

  test("P10: advisory marks ontology protocol as downstream discovery", async () => {
    const prompt = padToLength("implement build deploy", 600);
    const result = await userPromptOntologyIntentExtract({ prompt, prompt_length: 600 });
    const ctx = result.additionalContext ?? "";
    expect(ctx).toContain("Use current public discovery");
    expect(ctx).not.toContain("SKIPPED");
  });

  test("P11: advisory contains bypass instruction", async () => {
    const prompt = padToLength("refactor integrate", 600);
    const result = await userPromptOntologyIntentExtract({ prompt, prompt_length: 600 });
    const ctx = result.additionalContext ?? "";
    expect(ctx).toContain("PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1");
  });
});

// ─── Bypass ───────────────────────────────────────────────────────────────────

describe("bypass", () => {
  test("B1: PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1 → no advisory returned", async () => {
    process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS = "1";
    const prompt = padToLength("refactor implement ontology", 600);
    const result = await userPromptOntologyIntentExtract({ prompt, prompt_length: 600 });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("BYPASS");
  });
});

// ─── Robustness ───────────────────────────────────────────────────────────────

describe("robustness", () => {
  test("R1: null payload → no throw, returns message", async () => {
    let threw = false;
    let result: Awaited<ReturnType<typeof userPromptOntologyIntentExtract>>;
    try {
      result = await userPromptOntologyIntentExtract(null);
    } catch {
      threw = true;
      result = { message: "" };
    }
    expect(threw).toBe(false);
    expect(typeof result.message).toBe("string");
  });

  test("R2: undefined prompt → no throw, heuristic clear", async () => {
    const result = await userPromptOntologyIntentExtract({ prompt: undefined });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("heuristic clear");
  });
});
