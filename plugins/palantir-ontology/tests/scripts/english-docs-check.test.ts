// Permanent regression for scripts/english-docs-check.ts's pure detection
// logic (P340), using inline strings (no scratch .md files needed).

import { describe, expect, test } from "bun:test";
import { findNonEnglishChars } from "../../scripts/english-docs-check";

describe("english-docs-check: findNonEnglishChars", () => {
  test("plain English text with common typographic punctuation is clean", () => {
    const text = "The plugin’s scope is fixed — see the ADR index... → next.";
    expect(findNonEnglishChars(text)).toEqual([]);
  });

  test("Hangul text is flagged with line/column/script", () => {
    const text = "line one\n한국어 text";
    const violations = findNonEnglishChars(text);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.line).toBe(2);
    expect(violations[0]!.script).toBe("Hangul Syllables");
  });

  test("CJK ideographs are flagged", () => {
    const violations = findNonEnglishChars("some 文字 here");
    expect(violations.length).toBe(2);
    expect(violations[0]!.script).toBe("CJK Unified Ideographs");
  });
});
