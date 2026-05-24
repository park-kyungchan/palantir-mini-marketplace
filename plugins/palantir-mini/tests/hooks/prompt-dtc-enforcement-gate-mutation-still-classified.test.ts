// palantir-mini sprint-138 Slice 6
// tests/hooks/prompt-dtc-enforcement-gate-mutation-still-classified.test.ts
//
// Regression tests: mutation prompts should NOT be rescued by the FDE-aware
// skip branch. The existing gate behavior must be preserved for mutation work.
//
// Verifies:
//   - mutation prompt fixtures → FDE skip NOT triggered
//   - classifier correctly identifies mutation verbs, preventing false-positive bypass
//   - read-only verb + 0 FDE keywords → uncertain, NOT read-only-fde-intent

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { classifyReadOnlyFDEPrompt } from "../../lib/fde-build/readonly-prompt-classifier";

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-mutation-"));
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, "events.jsonl");
});

afterEach(() => {
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

const MUTATION_FIXTURES = [
  "Apply edit-function to commit_edits on file foo.ts",
  "Write new content to lib/bar.ts and update the implementation",
  "Refactor the entire authentication system in the project",
  "MultiEdit the hooks to implement the new feature",
  "bash: rm -rf temp/ && create new directory",
];

// ─── 1. Mutation fixtures → NOT read-only-fde-intent ─────────────────────────

describe("mutation_fixtures_not_classified_as_fde", () => {
  for (const prompt of MUTATION_FIXTURES) {
    test(`NOT read-only-fde: "${prompt.slice(0, 60)}"`, () => {
      const result = classifyReadOnlyFDEPrompt({ promptText: prompt });
      expect(result.classifiedAs).not.toBe("read-only-fde-intent");
    });
  }
});

// ─── 2. FDE skip branch NOT triggered for mutation prompts ───────────────────

describe("fde_skip_not_triggered_for_mutations", () => {
  test("mutation prompt: isReadOnlyFDEIntent condition is false (mutationVerbsHit > 0)", () => {
    for (const prompt of MUTATION_FIXTURES) {
      const classification = classifyReadOnlyFDEPrompt({ promptText: prompt });
      // The FDE skip branch requires BOTH:
      //   classifiedAs === "read-only-fde-intent" AND mutationVerbsHit.length === 0
      // For mutation fixtures, at least one condition is false.
      const isReadOnlyFDEIntent =
        classification.classifiedAs === "read-only-fde-intent" &&
        classification.mutationVerbsHit.length === 0;

      expect(isReadOnlyFDEIntent).toBe(false);
    }
  });

  test("mutation prompt with FDE keywords: still NOT read-only-fde-intent (mutation wins)", () => {
    // Even if FDE keywords are present, mutation verbs cause mutating or uncertain classification.
    const prompt =
      "Implement FDE chatbot-studio mission-decision changes by applying edit-function to commit_edits in the ontology build session.";
    const classification = classifyReadOnlyFDEPrompt({ promptText: prompt });

    // mutationVerbsHit should be non-empty (implement + apply + commit)
    expect(classification.mutationVerbsHit.length).toBeGreaterThan(0);

    // FDE skip branch requires mutationVerbsHit.length === 0 — this prompt fails that check
    const isReadOnlyFDEIntent =
      classification.classifiedAs === "read-only-fde-intent" &&
      classification.mutationVerbsHit.length === 0;
    expect(isReadOnlyFDEIntent).toBe(false);
  });
});

// ─── 3. Regression: gate behavior unchanged for non-FDE prompts ───────────────

describe("gate_behavior_regression", () => {
  test("mode=off + mutation prompt → gate exits with 'off' message (not FDE skip)", async () => {
    delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;

    const mod = await import("../../hooks/prompt-dtc-enforcement-gate");
    const gate = mod.default;

    const result = await gate({
      cwd: TMP,
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/foo.ts" },
      // No prompt field → fdePromptText will be "" → FDE skip skipped entirely
    }) as unknown as Record<string, unknown>;

    expect(result.message).toContain("off");
  });

  test("mode=advisory + mutation-only prompt → gate proceeds to assess (not FDE skip)", async () => {
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "advisory";

    const mod = await import("../../hooks/prompt-dtc-enforcement-gate");
    const gate = mod.default;

    const result = await gate({
      cwd: TMP,
      session_id: "test-mutation-session",
      prompt: "Apply edit-function to commit_edits on file foo.ts",
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/foo.ts" },
    }) as unknown as Record<string, unknown>;

    // Should NOT return the FDE skip message
    expect(result.message).not.toContain("FDE read-only design intent");
    // Should instead fall through to normal gate path (advisory or assessment result)
    expect(typeof result.message).toBe("string");
  });

  test("mode=advisory + empty prompt → gate proceeds normally (no FDE skip)", async () => {
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "advisory";

    const mod = await import("../../hooks/prompt-dtc-enforcement-gate");
    const gate = mod.default;

    const result = await gate({
      cwd: TMP,
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/bar.ts" },
      // No prompt → fdePromptText.trim() === "" → FDE skip branch not entered
    }) as unknown as Record<string, unknown>;

    // Should NOT be the FDE skip message
    expect(result.message).not.toContain("FDE read-only design intent");
    expect(typeof result.message).toBe("string");
  });
});

// ─── 4. Ensure no exit(2) from gate for any mutation fixture ─────────────────

describe("no_exit_2_from_gate", () => {
  test("gate never throws for any mutation fixture in advisory mode", async () => {
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "advisory";

    const mod = await import("../../hooks/prompt-dtc-enforcement-gate");
    const gate = mod.default;

    for (const prompt of MUTATION_FIXTURES) {
      let threw = false;
      try {
        await gate({
          cwd: TMP,
          prompt,
          tool_name: "Edit",
          tool_input: { file_path: "/tmp/x.ts" },
        });
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    }
  });
});
