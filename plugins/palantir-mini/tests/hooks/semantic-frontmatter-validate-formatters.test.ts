// palantir-mini v3.5.0 — semantic-frontmatter-validate formatter tests (B5 split sibling)
// Coverage: checkJsDocForm + checkYamlCommentForm pure-function paths.

import { test, expect, describe } from "bun:test";
import {
  checkJsDocForm,
  checkYamlCommentForm,
} from "../../hooks/semantic-frontmatter-validate";

describe("checkJsDocForm", () => {
  test("detects JSDoc with both @owner + @purpose", () => {
    const content = `/**
 * Some description
 * @owner kosmos-team
 * @purpose Test fixture for validation
 */
export const x = 1;`;
    const r = checkJsDocForm(content);
    expect(r.found).toBe(true);
    expect(r.missingFields).toEqual([]);
  });

  test("detects JSDoc but flags missing @owner", () => {
    const content = `/**
 * @purpose Test fixture
 */
export const x = 1;`;
    const r = checkJsDocForm(content);
    expect(r.found).toBe(true);
    expect(r.missingFields).toContain("@owner");
  });

  test("detects JSDoc but flags missing @purpose", () => {
    const content = `/**
 * @owner team
 */
export const x = 1;`;
    const r = checkJsDocForm(content);
    expect(r.found).toBe(true);
    expect(r.missingFields).toContain("@purpose");
  });

  test("returns found=false when no leading JSDoc", () => {
    const r = checkJsDocForm("export const x = 1;");
    expect(r.found).toBe(false);
    expect(r.missingFields).toEqual([]);
  });

  test("only matches JSDoc at file top (not later in file)", () => {
    const content = `import * as fs from "fs";
/**
 * @owner team
 * @purpose mid-file block
 */`;
    const r = checkJsDocForm(content);
    expect(r.found).toBe(false);
  });
});

describe("checkYamlCommentForm", () => {
  test("detects @semantic-frontmatter marker + owner: + purpose:", () => {
    const content = `// @semantic-frontmatter
// owner: team
// purpose: Test
export const x = 1;`;
    const r = checkYamlCommentForm(content);
    expect(r.found).toBe(true);
    expect(r.missingFields).toEqual([]);
  });

  test("flags missing owner: key", () => {
    const content = `// @semantic-frontmatter
// purpose: Test
export const x = 1;`;
    const r = checkYamlCommentForm(content);
    expect(r.found).toBe(true);
    expect(r.missingFields).toContain("owner:");
  });

  test("flags missing purpose: key", () => {
    const content = `// @semantic-frontmatter
// owner: team
export const x = 1;`;
    const r = checkYamlCommentForm(content);
    expect(r.found).toBe(true);
    expect(r.missingFields).toContain("purpose:");
  });

  test("returns found=false when no marker", () => {
    const content = `// owner: team
// purpose: Test
export const x = 1;`;
    const r = checkYamlCommentForm(content);
    expect(r.found).toBe(false);
  });
});
