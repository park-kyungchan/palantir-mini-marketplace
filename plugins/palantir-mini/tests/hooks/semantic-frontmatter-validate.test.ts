// palantir-mini v3.5.0 — semantic-frontmatter-validate hook tests (B5 split orchestrator)
// Coverage: handler dispatch (skip paths + PreToolUse blocking + PostToolUse advisory).
// Pure-function tests for checkJsDocForm/checkYamlCommentForm/validateSemanticFrontmatter
// moved to siblings semantic-frontmatter-validate-formatters.test.ts and
// semantic-frontmatter-validate-validator.test.ts.

import { test, expect, describe } from "bun:test";
import semanticFrontmatterValidate from "../../hooks/semantic-frontmatter-validate";

describe("semanticFrontmatterValidate handler — skip paths", () => {
  test("skips when no file_path", async () => {
    const result = await semanticFrontmatterValidate({});
    expect(result.decision).toBe("continue");
    expect(result.message).toMatch(/no file_path/i);
  });

  test("skips non-.ts file", async () => {
    const result = await semanticFrontmatterValidate({
      tool_input: { file_path: "/home/test/schemas/ontology/primitives/foo.md" },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toMatch(/not in scope/i);
  });

  test("skips .ts file outside required paths", async () => {
    const result = await semanticFrontmatterValidate({
      tool_input: { file_path: "/home/test/lib/utils.ts" },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toMatch(/not in scope/i);
  });

  test("skips when no content available (PreToolUse with empty new_string)", async () => {
    const result = await semanticFrontmatterValidate({
      hook_event_name: "PreToolUse",
      tool_input: {
        file_path: "/home/test/schemas/ontology/primitives/foo.ts",
        new_string: "",
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toMatch(/no content/i);
  });
});

describe("semanticFrontmatterValidate handler — PreToolUse blocking", () => {
  test("blocks PreToolUse when frontmatter missing", async () => {
    const result = await semanticFrontmatterValidate({
      hook_event_name: "PreToolUse",
      tool_input: {
        file_path: "/home/test/schemas/ontology/primitives/foo.ts",
        content: "export const foo = 1;",
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toMatch(/missing semantic frontmatter/i);
  });

  test("continues PreToolUse when JSDoc valid", async () => {
    const result = await semanticFrontmatterValidate({
      hook_event_name: "PreToolUse",
      tool_input: {
        file_path: "/home/test/schemas/ontology/primitives/foo.ts",
        content: `/**
 * @owner team
 * @purpose Foo primitive
 */
export const foo = 1;`,
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toMatch(/valid=true.*jsdoc/);
  });

  test("continues PreToolUse when YAML form valid", async () => {
    const result = await semanticFrontmatterValidate({
      hook_event_name: "PreToolUse",
      tool_input: {
        file_path: "/home/test/schemas/ontology/contracts/bar.ts",
        content: `// @semantic-frontmatter
// owner: team
// purpose: bar
export const bar = 2;`,
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toMatch(/valid=true.*yaml/);
  });

  test("blocks for files under plugins/palantir-mini/lib/ (Phase B3 scope)", async () => {
    const result = await semanticFrontmatterValidate({
      hook_event_name: "PreToolUse",
      tool_input: {
        file_path: "/home/test/plugins/palantir-mini/lib/util.ts",
        content: "export const x = 1;",
      },
    });
    expect(result.decision).toBe("block");
  });
});

describe("semanticFrontmatterValidate handler — PostToolUse advisory", () => {
  test("PostToolUse missing frontmatter is advisory (continue + additionalContext)", async () => {
    const result = await semanticFrontmatterValidate({
      hook_event_name: "PostToolUse",
      tool_input: {
        file_path: "/home/test/schemas/ontology/primitives/foo.ts",
        new_string: "export const foo = 1;",
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.additionalContext).toMatch(/missing semantic frontmatter/i);
  });

  test("PostToolUse with valid frontmatter is silent continue", async () => {
    const result = await semanticFrontmatterValidate({
      hook_event_name: "PostToolUse",
      tool_input: {
        file_path: "/home/test/schemas/ontology/primitives/foo.ts",
        new_string: `/**
 * @owner team
 * @purpose Foo primitive
 */
export const foo = 1;`,
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.additionalContext).toBeUndefined();
  });
});
