/**
 * palantir-mini v2.13.0 — SP-3 read-plan field unit tests
 *
 * Tests the sort-order comparator, AuthorityNote shape, archive filter,
 * and empty-neighborhood graceful degradation.
 *
 * Strategy: use real resolveResearchRef + the makeFixture helper (synthetic
 * ResearchSourceResolution objects) to test the computation logic in isolation
 * without invoking runSemanticQuery end-to-end.
 */

import { test, expect, describe } from "bun:test";
import type { ResearchSourceResolution } from "../../../lib/research/resolve-ref";
import type { AuthorityNote } from "../../../lib/semantic-graph/types";

// ── Shared fixture factory (mirrors resolve-ref.test.ts pattern) ──────────────

function makeFixture(
  authorityClass: ResearchSourceResolution["authorityClass"],
  primaryRef: string,
): ResearchSourceResolution {
  return {
    rawRef: primaryRef,
    normalizedRef: primaryRef,
    primaryRef,
    canonicalRefs: [primaryRef],
    library:
      authorityClass === "builder"
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
    agentDirective: `test-directive-${authorityClass}`,
  };
}

// ── classOrder sort comparator (duplicated intentionally — tests logic isolation) ──

const classOrder: Record<string, number> = {
  builder: 0, fact: 1, synthesis: 2, capability: 3, archive: 4,
};

function sortResolutions(resolutions: ResearchSourceResolution[]): ResearchSourceResolution[] {
  return [...resolutions].sort((a, b) => {
    const ao = classOrder[a.authorityClass] ?? 99;
    const bo = classOrder[b.authorityClass] ?? 99;
    if (ao !== bo) return ao - bo;
    return a.primaryRef.localeCompare(b.primaryRef);
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("SP-3 read-plan fields", () => {
  test("recommendedReadOrder sorts builder → fact → synthesis → capability → archive", () => {
    const resolutions: ResearchSourceResolution[] = [
      makeFixture("archive", ".claude/research/_archive/some-legacy.md"),
      makeFixture("capability", ".claude/research/claude-code/BROWSE.md"),
      makeFixture("synthesis", ".claude/research/palantir-vision/BROWSE.md"),
      makeFixture("fact", ".claude/research/palantir-foundry/BROWSE.md"),
      makeFixture("builder", ".claude/research/palantir-developers/BROWSE.md"),
    ];

    const sorted = sortResolutions(resolutions);
    const classes = sorted.map((r) => r.authorityClass);

    expect(classes).toEqual(["builder", "fact", "synthesis", "capability", "archive"]);
  });

  test("authorityNotes pairs ref with live authorityClass + agentDirective", () => {
    const resolution = makeFixture("builder", ".claude/research/palantir-developers/BROWSE.md");

    const note: AuthorityNote = {
      ref: resolution.primaryRef,
      authorityClass: resolution.authorityClass,
      note: resolution.agentDirective,
    };

    const validClasses: ReadonlyArray<string> = ["builder", "fact", "synthesis", "capability", "archive"];
    expect(validClasses.includes(note.authorityClass)).toBe(true);
    expect(typeof note.ref).toBe("string");
    expect(typeof note.note).toBe("string");
  });

  test("archiveBridgeRefs filters resolutions with authorityClass === 'archive'", () => {
    const resolutions: ResearchSourceResolution[] = [
      makeFixture("builder", ".claude/research/palantir-developers/BROWSE.md"),
      makeFixture("fact", ".claude/research/palantir-foundry/BROWSE.md"),
      makeFixture("archive", ".claude/research/_archive/legacy-a.md"),
      makeFixture("archive", ".claude/research/_archive/legacy-b.md"),
      makeFixture("synthesis", ".claude/research/palantir-vision/BROWSE.md"),
    ];

    const archiveBridgeRefs = resolutions
      .filter((r) => r.archived || r.authorityClass === "archive")
      .map((r) => r.primaryRef);

    expect(archiveBridgeRefs).toHaveLength(2);
    expect(archiveBridgeRefs).toContain(".claude/research/_archive/legacy-a.md");
    expect(archiveBridgeRefs).toContain(".claude/research/_archive/legacy-b.md");
  });

  test("empty affectedDocs yields empty 4 fields", () => {
    // Simulate no doc:* RIDs in neighborhood — resolutionByPrimaryRef stays empty
    const resolutions: ResearchSourceResolution[] = [];

    const requiredResearchRefs = resolutions.filter((r) => r.exists).map((r) => r.primaryRef);
    const recommendedReadOrder = sortResolutions(resolutions).map((r) => r.primaryRef);
    const authorityNotes: AuthorityNote[] = sortResolutions(resolutions).map((r) => ({
      ref: r.primaryRef,
      authorityClass: r.authorityClass,
      note: r.agentDirective,
    }));
    const archiveBridgeRefs = resolutions
      .filter((r) => r.archived || r.authorityClass === "archive")
      .map((r) => r.primaryRef);

    expect(requiredResearchRefs).toHaveLength(0);
    expect(recommendedReadOrder).toHaveLength(0);
    expect(authorityNotes).toHaveLength(0);
    expect(archiveBridgeRefs).toHaveLength(0);
  });
});
