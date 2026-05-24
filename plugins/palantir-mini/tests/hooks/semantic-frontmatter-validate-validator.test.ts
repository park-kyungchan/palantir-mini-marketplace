// palantir-mini v3.5.0 — semantic-frontmatter-validate validator tests (B5 split sibling)
// Coverage: validateSemanticFrontmatter combinator (prefer JSDoc → fallback YAML → none).

import { test, expect, describe } from "bun:test";
import { validateSemanticFrontmatter } from "../../hooks/semantic-frontmatter-validate";

describe("validateSemanticFrontmatter", () => {
  test("prefers JSDoc form when present and valid", () => {
    const content = `/**
 * @owner team
 * @purpose Valid
 */`;
    const r = validateSemanticFrontmatter(content);
    expect(r.valid).toBe(true);
    expect(r.form).toBe("jsdoc");
  });

  test("falls back to YAML form when JSDoc absent", () => {
    const content = `// @semantic-frontmatter
// owner: team
// purpose: yaml form
export const x = 1;`;
    const r = validateSemanticFrontmatter(content);
    expect(r.valid).toBe(true);
    expect(r.form).toBe("yaml-comment");
  });

  test("returns form=none + invalid when neither present", () => {
    const r = validateSemanticFrontmatter("export const x = 1;");
    expect(r.valid).toBe(false);
    expect(r.form).toBe("none");
    expect(r.missingFields).toEqual(["@owner", "@purpose"]);
  });

  test("JSDoc with missing fields is invalid + form=jsdoc", () => {
    const content = `/**
 * @owner team
 */`;
    const r = validateSemanticFrontmatter(content);
    expect(r.valid).toBe(false);
    expect(r.form).toBe("jsdoc");
    expect(r.missingFields).toContain("@purpose");
  });
});
