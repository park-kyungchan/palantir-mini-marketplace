/**
 * palantir-mini — Wave 2 SP-1 unit tests
 * Covers: formatAuthorityHint dispatch for all 5 authorityClass values.
 * Does NOT invoke resolveResearchRef end-to-end (covered at schema level).
 */

import { test, expect, describe } from "bun:test";
import { formatAuthorityHint } from "../../../lib/research/resolve-ref";
import type { ResearchSourceResolution } from "../../../lib/research/resolve-ref";

function makeFixture(authorityClass: ResearchSourceResolution["authorityClass"]): ResearchSourceResolution {
  return {
    rawRef: `test-ref-${authorityClass}`,
    normalizedRef: `.claude/research/test/${authorityClass}.md`,
    primaryRef: `.claude/research/test/${authorityClass}.md`,
    canonicalRefs: [`.claude/research/test/${authorityClass}.md`],
    library: authorityClass === "builder"
      ? "palantir-developers"
      : authorityClass === "fact"
      ? "palantir-foundry"
      : authorityClass === "synthesis"
      ? "palantir-vision"
      : authorityClass === "capability"
      ? "claude-code"
      : "_archive",
    authorityClass,
    resolutionKind: "active-direct",
    archived: authorityClass === "archive",
    legacyBridge: authorityClass === "archive",
    exists: false,
    agentDirective: "test directive",
  };
}

describe("formatAuthorityHint", () => {
  test("builder class", () => {
    const hint = formatAuthorityHint(makeFixture("builder"));
    expect(hint).toContain("builder");
    expect(hint).toContain("read order");
  });

  test("fact class", () => {
    const hint = formatAuthorityHint(makeFixture("fact"));
    expect(hint).toContain("fact");
    expect(hint).toContain("exact wording");
  });

  test("synthesis class", () => {
    const hint = formatAuthorityHint(makeFixture("synthesis"));
    expect(hint).toContain("synthesis");
    expect(hint).toContain("supporting official refs");
  });

  test("capability class", () => {
    const hint = formatAuthorityHint(makeFixture("capability"));
    expect(hint).toContain("capability");
    expect(hint).toContain("Claude-runtime");
  });

  test("archive class", () => {
    const hint = formatAuthorityHint(makeFixture("archive"));
    expect(hint).toContain("archive");
    expect(hint).toContain("active layer");
  });
});
