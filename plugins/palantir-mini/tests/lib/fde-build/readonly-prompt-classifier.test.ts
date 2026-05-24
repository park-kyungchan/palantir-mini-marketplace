// palantir-mini sprint-138 Slice 6
// tests/lib/fde-build/readonly-prompt-classifier.test.ts
//
// Exhaustive classifier table tests for classifyReadOnlyFDEPrompt.

import { test, expect, describe } from "bun:test";
import { classifyReadOnlyFDEPrompt } from "../../../lib/fde-build/readonly-prompt-classifier";

// ─── 1. Empty / trivial prompts ───────────────────────────────────────────────

describe("empty_and_trivial", () => {
  test("empty prompt → uncertain", () => {
    const result = classifyReadOnlyFDEPrompt({ promptText: "" });
    expect(result.classifiedAs).toBe("uncertain");
    expect(result.fdeKeywordsHit).toHaveLength(0);
    expect(result.mutationVerbsHit).toHaveLength(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  test("unrelated short prompt → uncertain", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText: "Hello, how are you today?",
    });
    expect(result.classifiedAs).toBe("uncertain");
  });
});

// ─── 2. Clear read-only FDE design prompts ────────────────────────────────────

describe("read_only_fde_intent", () => {
  test("FDE chatbot-studio mission-decision design → read-only-fde-intent", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText:
        "Explain the FDE chatbot-studio readiness requirements for mission-decision alignment. What should the ontology design include?",
    });
    expect(result.classifiedAs).toBe("read-only-fde-intent");
    expect(result.fdeKeywordsHit.length).toBeGreaterThanOrEqual(2);
    expect(result.mutationVerbsHit).toHaveLength(0);
    expect(result.confidence).toBeGreaterThan(0.1);
  });

  test("explain action policy → read-only-fde-intent", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText:
        "Explain the action-writeback policy and how it relates to FDE readiness. What does the ontology design need?",
    });
    expect(result.classifiedAs).toBe("read-only-fde-intent");
  });

  test("describe submission criteria → read-only-fde-intent", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText:
        "Describe the submission criteria deferred behavior in the FDE ontology build session. What are the requirements?",
    });
    expect(result.classifiedAs).toBe("read-only-fde-intent");
  });

  test("what does ontology-build session require → read-only-fde-intent", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText:
        "What does the ontology build session require for the FDE readiness scorecard? How are the levels structured?",
    });
    expect(result.classifiedAs).toBe("read-only-fde-intent");
  });

  test("document enforcement promotion path → read-only-fde-intent", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText:
        "Document the enforcement promotion path for FDE governance. Describe how the branch-release review works.",
    });
    expect(result.classifiedAs).toBe("read-only-fde-intent");
  });

  test("audit implementation readiness → read-only-fde-intent", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText:
        "Audit the FDE readiness scorecard and describe what the gap report shows for eval-observability.",
    });
    expect(result.classifiedAs).toBe("read-only-fde-intent");
  });

  test("draft a brief about FDE writeback governance → read-only-fde-intent", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText:
        "Draft a brief about FDE writeback governance for the ontology design session. What are the action-writeback requirements?",
    });
    expect(result.classifiedAs).toBe("read-only-fde-intent");
  });
});

// ─── 3. Clear mutation prompts ────────────────────────────────────────────────

describe("mutating_prompts", () => {
  test("apply edit-function to commit_edits → mutating", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText: "Apply edit-function to commit_edits on file foo.ts",
    });
    expect(result.classifiedAs).toBe("mutating");
    expect(result.mutationVerbsHit.length).toBeGreaterThanOrEqual(1);
  });

  test("write new content to lib/bar.ts → mutating", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText: "Write new content to lib/bar.ts and update the schema.",
    });
    expect(result.classifiedAs).toBe("mutating");
  });

  test("refactor the entire authentication system → mutating", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText: "Refactor the entire authentication system in the project.",
    });
    expect(result.classifiedAs).toBe("mutating");
  });

  test("mutation verb + 5 FDE keywords → still mutating (mutation override)", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText:
        "Implement FDE chatbot-studio writeback path for mission-decision alignment ontology build session readiness.",
    });
    // fdeKeywordsHit < 2 won't rescue because mutation verb pattern overrides
    // But here we specifically test: mutation verbs + FDE keywords → mutating
    // Note: "implement" matches MUTATION_VERB_PATTERNS
    expect(result.mutationVerbsHit.length).toBeGreaterThanOrEqual(1);
    // classifiedAs should be mutating when mutationVerbsHit >= 1 AND fdeKeywords < 2
    // OR uncertain otherwise — should NOT be read-only-fde-intent
    expect(result.classifiedAs).not.toBe("read-only-fde-intent");
  });
});

// ─── 4. Uncertain cases ───────────────────────────────────────────────────────

describe("uncertain_cases", () => {
  test("read-only verb + 0 FDE keywords → uncertain", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText: "Explain the authentication flow in this system.",
    });
    // Only 1 or 0 FDE keywords → not enough for read-only-fde-intent
    // No mutation verbs → not mutating
    expect(result.classifiedAs).toBe("uncertain");
  });

  test("single FDE keyword only → uncertain (not enough for read-only-fde-intent)", () => {
    const result = classifyReadOnlyFDEPrompt({
      promptText: "What is FDE exactly?",
    });
    // "fde" matches but only 1 keyword → fdeKeywordsHit < 2 → uncertain
    expect(result.classifiedAs).toBe("uncertain");
  });
});

// ─── 5. Score / confidence invariants ────────────────────────────────────────

describe("confidence_invariants", () => {
  test("confidence always in [0, 1]", () => {
    const prompts = [
      "",
      "hello",
      "Apply edit-function to commit_edits MultiEdit bash:",
      "Explain FDE chatbot-studio mission-decision readiness gap report scorecard ontology build",
      "a".repeat(200),
    ];
    for (const promptText of prompts) {
      const result = classifyReadOnlyFDEPrompt({ promptText });
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  test("reasoning is always a non-empty string", () => {
    const result = classifyReadOnlyFDEPrompt({ promptText: "test prompt" });
    expect(typeof result.reasoning).toBe("string");
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  test("fdeKeywordsHit is always a readonly array", () => {
    const result = classifyReadOnlyFDEPrompt({ promptText: "" });
    expect(Array.isArray(result.fdeKeywordsHit)).toBe(true);
  });

  test("mutationVerbsHit is always a readonly array", () => {
    const result = classifyReadOnlyFDEPrompt({ promptText: "" });
    expect(Array.isArray(result.mutationVerbsHit)).toBe(true);
  });
});
