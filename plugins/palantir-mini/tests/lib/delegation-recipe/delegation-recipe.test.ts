// palantir-mini — tests/lib/delegation-recipe/delegation-recipe.test.ts
// Verifies buildRecipe() returns a neutral DispatchDecision: decision +
// 6-domain classification + default dispatchMode/risk. W3b-2b de-identified the
// recipe — agent/model/sprint/skills/mcpTools/briefing bindings were removed;
// a runtime adapter (Claude/Codex) maps domain → concrete agents downstream.

import { test, expect, describe } from "bun:test";
import { buildRecipe } from "../../../lib/delegation-recipe/recipe-builder";

describe("buildRecipe — domain classification → neutral DispatchDecision", () => {
  // ── Case 1: rule edit → domain "rule" ─────────────────────────────────────
  test("rule edit classifies to the 'rule' domain", () => {
    const result = buildRecipe({
      intent: "Edit rule 12 to add new pre-delegation framework section",
      scopePaths: [".claude/rules/12-lead-protocol-v2.md"],
      complexityHint: "single-file",
    });

    expect(result.decision).toBe("delegate");
    expect(result.domain).toBe("rule");
    // No ontologyContext → high-confidence default.
    expect(result.dispatchMode).toBe("lead-direct");
    expect(result.risk).toBe("low");
    expect(result.rationale).toContain("rule");
  });

  // ── Case 2: new hook → domain "hook" ──────────────────────────────────────
  test("new hook classifies to the 'hook' domain", () => {
    const result = buildRecipe({
      intent: "Add NEW PostToolUse hook for Edit/Write tracking with emit_event",
      scopePaths: [".claude/plugins/palantir-mini/hooks/edit-write-tracker.ts"],
      complexityHint: "single-file",
    });

    expect(result.decision).toBe("delegate");
    expect(result.domain).toBe("hook");
    expect(result.dispatchMode).toBe("lead-direct");
    expect(result.risk).toBe("low");
  });

  // ── Case 3: new schemas primitive → domain "primitive" ────────────────────
  test("new schemas primitive classifies to the 'primitive' domain", () => {
    const result = buildRecipe({
      intent: "Add NEW schemas primitive ClaudeCodeVersionDeclaration to schemas/ontology/primitives/",
      scopePaths: [".claude/schemas/ontology/primitives/claude-code-version-declaration.ts"],
      complexityHint: "single-file",
    });

    expect(result.decision).toBe("delegate");
    expect(result.domain).toBe("primitive");
  });

  // ── Case 4: mirror blog → domain "research" ───────────────────────────────
  test("mirror blog into research/ classifies to the 'research' domain", () => {
    const result = buildRecipe({
      intent: "Mirror Palantir blog post from URL into research/ as markdown",
      scopePaths: [".claude/research/palantir-vision/blog-example-2026-05-06.md"],
      complexityHint: "single-file",
    });

    expect(result.decision).toBe("delegate");
    expect(result.domain).toBe("research");
  });

  // ── Case 5: mass-edit → domain "mass-edit" ────────────────────────────────
  test("mass-edit intent classifies to the 'mass-edit' domain", () => {
    const result = buildRecipe({
      intent: "Mass-edit 12 plugin agents adding emit_event guidance section to each",
      complexityHint: "multi-file",
    });

    expect(result.decision).toBe("delegate");
    expect(result.domain).toBe("mass-edit");
  });
});

describe("buildRecipe — lead-direct decision", () => {
  test("trivial + ≤3 files → lead-direct, low risk", () => {
    const result = buildRecipe({
      intent: "Fix typo in CLAUDE.md",
      scopePaths: ["CLAUDE.md"],
      complexityHint: "trivial",
    });

    expect(result.decision).toBe("lead-direct");
    expect(result.dispatchMode).toBe("lead-direct");
    expect(result.risk).toBe("low");
    expect(result.rationale).toContain("trivial");
  });

  test("trivial + 0 files → lead-direct", () => {
    const result = buildRecipe({
      intent: "Read a file to check content",
      complexityHint: "trivial",
    });

    expect(result.decision).toBe("lead-direct");
  });
});
