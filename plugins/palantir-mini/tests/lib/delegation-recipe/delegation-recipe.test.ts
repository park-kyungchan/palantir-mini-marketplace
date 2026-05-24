// palantir-mini v4.5.0 — tests/lib/delegation-recipe/delegation-recipe.test.ts
// Verifies buildRecipe() for the 5 representative cases from SKILL.md.
// Rule 12 §Pre-delegation framework + Rule 07 §Agent file-ownership.

import { test, expect, describe } from "bun:test";
import { buildRecipe } from "../../../lib/delegation-recipe/recipe-builder";

describe("buildRecipe — 5 representative delegation cases", () => {
  // ── Case 1: Edit rule 12 → protocol-designer (sonnet) ─────────────────────
  test("rule edit → protocol-designer with quick sprint", () => {
    const result = buildRecipe({
      intent: "Edit rule 12 to add new pre-delegation framework section",
      scopePaths: [".claude/rules/12-lead-protocol-v2.md"],
      complexityHint: "single-file",
    });

    expect(result.decision).toBe("delegate-to-protocol-designer");
    expect(result.recipe).toBeDefined();
    const r = result.recipe!;
    expect(r.agent).toBe("protocol-designer");
    expect(r.agentModel).toBe("sonnet");
    expect(r.mcpTools).toContain("pm_rule_query");
    expect(r.mcpTools).toContain("pm_rule_audit");
    expect(r.mcpTools).toContain("emit_event");
    expect(r.sprintArgs.mode).toBe("quick");
    expect(r.sprintArgs.iterationLimit).toBe(1);
    expect(r.memoryLayers).toContain("semantic");
    expect(r.memoryLayers).toContain("procedural");
    expect(r.briefingTemplate).toContain("protocol-designer");
    expect(r.briefingTemplate).toContain("quick");
  });

  // ── Case 2: New PostToolUse hook → hook-builder (sonnet) ──────────────────
  test("new hook → hook-builder with commit_edits tool set", () => {
    const result = buildRecipe({
      intent: "Add NEW PostToolUse hook for Edit/Write tracking with emit_event",
      scopePaths: [".claude/plugins/palantir-mini/hooks/edit-write-tracker.ts"],
      complexityHint: "single-file",
    });

    expect(result.decision).toBe("delegate-to-hook-builder");
    expect(result.recipe).toBeDefined();
    const r = result.recipe!;
    expect(r.agent).toBe("hook-builder");
    expect(r.agentModel).toBe("sonnet");
    expect(r.mcpTools).toContain("apply_edit_function");
    expect(r.mcpTools).toContain("commit_edits");
    expect(r.mcpTools).toContain("compute_edits_dry_run");
    expect(r.sprintArgs.mode).toBe("quick");
    // hook-builder out-of-scope must include plugin.json and agents/**
    expect(r.outOfScope).toContain(".claude-plugin/plugin.json");
    expect(r.outOfScope.some((p) => p.includes("agents"))).toBe(true);
  });

  // ── Case 3: New schemas primitive → ontology-steward (opus) ───────────────
  test("new schemas primitive → ontology-steward with pm-codegen skill", () => {
    const result = buildRecipe({
      intent: "Add NEW schemas primitive ClaudeCodeVersionDeclaration to schemas/ontology/primitives/",
      scopePaths: [".claude/schemas/ontology/primitives/claude-code-version-declaration.ts"],
      complexityHint: "single-file",
    });

    expect(result.decision).toBe("delegate-to-ontology-steward");
    expect(result.recipe).toBeDefined();
    const r = result.recipe!;
    expect(r.agent).toBe("ontology-steward");
    expect(r.agentModel).toBe("opus");
    expect(r.skills).toContain("/palantir-mini:pm-codegen");
    expect(r.skills).toContain("/palantir-mini:pm-verify");
    expect(r.memoryLayers).toContain("semantic");
    expect(r.memoryLayers).toContain("procedural");
    expect(r.sprintArgs.mode).toBe("quick");
  });

  // ── Case 4: Mirror blog → docs-researcher (opus) ──────────────────────────
  test("mirror blog into research/ → docs-researcher with research skill", () => {
    const result = buildRecipe({
      intent: "Mirror Palantir blog post from URL into research/ as markdown",
      scopePaths: [".claude/research/palantir-vision/blog-example-2026-05-06.md"],
      complexityHint: "single-file",
    });

    expect(result.decision).toBe("delegate-to-docs-researcher");
    expect(result.recipe).toBeDefined();
    const r = result.recipe!;
    expect(r.agent).toBe("docs-researcher");
    expect(r.agentModel).toBe("opus");
    expect(r.skills).toContain("/palantir-mini:pm-research-diff");
    expect(r.memoryLayers).toContain("episodic");
    expect(r.memoryLayers).toContain("semantic");
  });

  // ── Case 5: Mass-edit 12 agents → implementer (sonnet) full sprint ─────────
  test("mass-edit 12 agents → implementer with full sprint args", () => {
    const result = buildRecipe({
      intent: "Mass-edit 12 plugin agents adding emit_event guidance section to each",
      complexityHint: "multi-file",
    });

    expect(result.decision).toBe("delegate-to-implementer");
    expect(result.recipe).toBeDefined();
    const r = result.recipe!;
    expect(r.agent).toBe("implementer");
    expect(r.agentModel).toBe("sonnet");
    expect(r.sprintArgs.mode).toBe("full");
    expect(r.sprintArgs.iterationLimit).toBe(4);
    expect(r.sprintArgs.timeoutMs).toBe(3600000);
  });
});

describe("buildRecipe — lead-direct decision", () => {
  test("trivial + ≤3 files → lead-direct with no recipe", () => {
    const result = buildRecipe({
      intent: "Fix typo in CLAUDE.md",
      scopePaths: ["CLAUDE.md"],
      complexityHint: "trivial",
    });

    expect(result.decision).toBe("lead-direct");
    expect(result.recipe).toBeUndefined();
    expect(result.rationale).toContain("trivial");
  });

  test("trivial + 0 files → lead-direct", () => {
    const result = buildRecipe({
      intent: "Read a file to check content",
      complexityHint: "trivial",
    });

    expect(result.decision).toBe("lead-direct");
    expect(result.recipe).toBeUndefined();
  });
});

describe("buildRecipe — sprint mode escalation", () => {
  test("4 files triggers full sprint regardless of complexityHint", () => {
    const result = buildRecipe({
      intent: "Add emit_event guidance to multiple hook files",
      scopePaths: [
        "hooks/a.ts",
        "hooks/b.ts",
        "hooks/c.ts",
        "hooks/d.ts",
      ],
    });

    expect(result.recipe?.sprintArgs.mode).toBe("full");
    expect(result.recipe?.sprintArgs.iterationLimit).toBe(4);
  });

  test("cross-cutting hint triggers full sprint", () => {
    const result = buildRecipe({
      intent: "Refactor event envelope across all handlers",
      scopePaths: ["bridge/handlers/"],
      complexityHint: "cross-cutting",
    });

    expect(result.recipe?.sprintArgs.mode).toBe("full");
  });
});

describe("buildRecipe — WorkContract/RouterBinding metadata", () => {
  test("contractBinding is additive and preserves existing DelegationRecipe fields", () => {
    const result = buildRecipe({
      intent: "Add NEW PostToolUse hook for Edit/Write tracking with emit_event",
      scopePaths: [".claude/plugins/palantir-mini/hooks/edit-write-tracker.ts"],
      complexityHint: "single-file",
      contractBinding: {
        workContractRef: "work-contract:approved:test",
        routerBindingRef: "router-binding:approved:test",
      },
    });

    expect(result.decision).toBe("delegate-to-hook-builder");
    expect(result.recipe?.agent).toBe("hook-builder");
    expect(result.recipe?.mcpTools).toContain("commit_edits");
    expect(result.recipe?.sprintArgs.mode).toBe("quick");
    expect(result.recipe?.contractBinding).toEqual({
      workContractRef: "work-contract:approved:test",
      routerBindingRef: "router-binding:approved:test",
    });
  });

  test("contractBinding remains absent for legacy callers", () => {
    const result = buildRecipe({
      intent: "Add NEW PostToolUse hook for Edit/Write tracking with emit_event",
      scopePaths: [".claude/plugins/palantir-mini/hooks/edit-write-tracker.ts"],
      complexityHint: "single-file",
    });

    expect(result.recipe?.contractBinding).toBeUndefined();
  });
});
