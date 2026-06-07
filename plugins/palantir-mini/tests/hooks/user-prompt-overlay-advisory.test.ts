// palantir-mini v4.13.0 — tests/hooks/user-prompt-overlay-advisory.test.ts (sprint-061 A.W3)
//
// Tests for user-prompt-overlay-advisory:
//   1. Short prompt (< 800 chars, no keywords, no files) → silent pass-through
//   2. Long prompt (≥ 800 chars) → additionalContext with pm_rule_query reference
//   3. Keyword hit (≥ 2 keywords) → additionalContext surfaced
//   4. File-path hit (≥ 3 .ts/.md files) → additionalContext surfaced
//   5. Never blocks — always returns result (never throws)
//   6. additionalContext content — contains pm_rule_query + impact_query
//   7. Null/undefined payload → graceful

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import userPromptOverlayAdvisory from "../../hooks/user-prompt-overlay-advisory";

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-overlay-advisory-"));
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── 1. Short prompt → silent pass-through ───────────────────────────────────

describe("short_prompt_passthrough", () => {
  test("short prompt with no keywords returns clear message and no additionalContext", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "Hello, how are you?",
      prompt_length: 19,
    });

    expect(result.message).toContain("heuristic clear");
    expect(result.additionalContext).toBeUndefined();
  });

  test("empty prompt returns clear message", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "",
      prompt_length: 0,
    });

    expect(result.message).toContain("user-prompt-overlay-advisory");
    expect(result.additionalContext).toBeUndefined();
  });
});

// ─── 2. Long prompt (≥ 800 chars) → advisory surfaced ────────────────────────

describe("long_prompt_advisory", () => {
  test("prompt ≥ 800 chars triggers additionalContext", async () => {
    const longPrompt = "a".repeat(850);
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: longPrompt,
      prompt_length: 850,
    });

    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("complex task advisory");
    expect(result.message).toContain("length≥800");
  });
});

// ─── 3. Keyword hit ──────────────────────────────────────────────────────────

describe("keyword_hit_advisory", () => {
  test("2 matching keywords trigger advisory (ontology + harness)", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "Let us discuss the ontology schema and harness design pattern.",
      prompt_length: 62,
    });

    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("keyword-count≥2");
  });

  test("2 matching keywords trigger advisory (MCP + spec)", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "Review the MCP tool spec for correctness.",
      prompt_length: 41,
    });

    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("keyword-count≥2");
  });

  test("only 1 keyword does NOT trigger advisory", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "The harness pattern is well designed.",
      prompt_length: 37,
    });

    // 1 keyword + short = no advisory (< 800 chars, only 1 keyword, no file paths)
    expect(result.additionalContext).toBeUndefined();
  });
});

// ─── 4. File-path hit ────────────────────────────────────────────────────────

describe("filepath_hit_advisory", () => {
  test("3 file paths trigger advisory", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "Please update foo.ts and bar.md and baz.json to reflect the changes.",
      prompt_length: 70,
    });

    expect(result.additionalContext).toBeDefined();
    expect(result.message).toContain("file-paths≥3");
  });

  test("2 file paths do NOT trigger advisory alone", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "Please update foo.ts and bar.md.",
      prompt_length: 31,
    });

    // 2 files + short prompt + 0 keywords = no advisory
    expect(result.additionalContext).toBeUndefined();
  });
});

// ─── 5. Never blocks / never throws ─────────────────────────────────────────

describe("never_throws", () => {
  test("null payload is handled gracefully", async () => {
    let threw = false;
    try {
      await userPromptOverlayAdvisory(null);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  test("undefined payload is handled gracefully", async () => {
    let threw = false;
    try {
      await userPromptOverlayAdvisory(undefined);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  test("message is always a non-empty string", async () => {
    const result = await userPromptOverlayAdvisory({ prompt: "test" });
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });
});

// ─── 6. additionalContext content ────────────────────────────────────────────

describe("advisory_content", () => {
  test("additionalContext references pm_rule_query", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "a".repeat(900),
      prompt_length: 900,
    });

    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain("prompt-front-door");
    expect(result.additionalContext).toContain("pm_semantic_intent_gate");
    expect(result.additionalContext).toContain("pm_rule_query");
  });

  test("additionalContext references impact_query", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "a".repeat(900),
      prompt_length: 900,
    });

    expect(result.additionalContext).toContain("impact_query");
  });

  test("additionalContext references rule 12", async () => {
    const result = await userPromptOverlayAdvisory({
      cwd: TMP,
      prompt: "a".repeat(900),
      prompt_length: 900,
    });

    expect(result.additionalContext).toContain("MCP-First protocol");
  });
});
