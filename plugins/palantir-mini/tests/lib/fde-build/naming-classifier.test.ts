/**
 * palantir-mini sprint-138 Slice 2.B — naming-classifier golden table tests
 *
 * Verifies that classifyTermHit correctly classifies all 11 baseline terms
 * (brief §8) and returns null for unknown terms.
 */
import { describe, test, expect, beforeEach } from "bun:test";
import {
  classifyTermHit,
  getBaselineTermSpecs,
  isCompatibilityIdentifier,
  resetFindingCounter,
} from "../../../lib/fde-build/naming-classifier";

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  resetFindingCounter();
});

// =============================================================================
// Golden table — all 11 baseline terms
// =============================================================================

describe("classifyTermHit — preferred-user-facing (2 terms)", () => {
  test("AIP Chatbot Studio → preferred-user-facing", () => {
    const finding = classifyTermHit({
      term: "AIP Chatbot Studio",
      location: "README.md",
      line: 1,
      excerpt: "AIP Chatbot Studio is the new name",
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("preferred-user-facing");
    expect(finding!.severity).toBe("info");
    expect(finding!.term).toBe("AIP Chatbot Studio");
    expect(finding!.location).toBe("README.md");
    expect(finding!.line).toBe(1);
  });

  test("AIP Chatbot → preferred-user-facing", () => {
    const finding = classifyTermHit({
      term: "AIP Chatbot",
      location: "docs/guide.md",
      line: 42,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("preferred-user-facing");
    expect(finding!.severity).toBe("info");
  });
});

describe("classifyTermHit — legacy-user-facing (4 terms)", () => {
  test("AIP Agent Studio → legacy-user-facing with rename-in-prose action", () => {
    const finding = classifyTermHit({
      term: "AIP Agent Studio",
      location: "lib/something.ts",
      line: 10,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("legacy-user-facing");
    expect(finding!.severity).toBe("advisory");
    expect(finding!.recommendedAction).toBe("rename-in-prose");
  });

  test("AIP Agent → legacy-user-facing with flag-with-compatibility-note action", () => {
    const finding = classifyTermHit({
      term: "AIP Agent",
      location: "CHANGELOG.md",
      line: 55,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("legacy-user-facing");
    expect(finding!.recommendedAction).toBe("flag-with-compatibility-note");
  });

  test("parameters → legacy-user-facing", () => {
    const finding = classifyTermHit({
      term: "parameters",
      location: "skills/pm-foo/SKILL.md",
      line: 5,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("legacy-user-facing");
    expect(finding!.recommendedAction).toBe("flag-with-compatibility-note");
  });

  test("validations → legacy-user-facing", () => {
    const finding = classifyTermHit({
      term: "validations",
      location: "agents/foo.md",
      line: 7,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("legacy-user-facing");
    expect(finding!.recommendedAction).toBe("flag-with-compatibility-note");
  });
});

describe("classifyTermHit — compatibility-identifier (5 terms)", () => {
  test("agentRid → compatibility-identifier with non-empty compatibilityReason", () => {
    const finding = classifyTermHit({
      term: "agentRid",
      location: "lib/foo.ts",
      line: 20,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("compatibility-identifier");
    expect(finding!.compatibilityReason).toBeTruthy();
    expect((finding!.compatibilityReason ?? "").length).toBeGreaterThan(0);
    expect(finding!.severity).toBe("info");
  });

  test("AIPAgentDeclaration → compatibility-identifier with non-empty compatibilityReason", () => {
    const finding = classifyTermHit({
      term: "AIPAgentDeclaration",
      location: "runtime-overlay/schemas-snapshot/ontology/primitives/aip-agent.ts",
      line: 1,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("compatibility-identifier");
    expect(finding!.compatibilityReason).toBeTruthy();
  });

  test("aipAgentRid → compatibility-identifier with non-empty compatibilityReason", () => {
    const finding = classifyTermHit({
      term: "aipAgentRid",
      location: "lib/bar.ts",
      line: 5,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("compatibility-identifier");
    expect(finding!.compatibilityReason).toBeTruthy();
  });

  test("AIP_AGENT_REGISTRY → compatibility-identifier with non-empty compatibilityReason", () => {
    const finding = classifyTermHit({
      term: "AIP_AGENT_REGISTRY",
      location: "lib/baz.ts",
      line: 3,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("compatibility-identifier");
    expect(finding!.compatibilityReason).toBeTruthy();
  });

  test("legacyNames → compatibility-identifier with non-empty compatibilityReason", () => {
    const finding = classifyTermHit({
      term: "legacyNames",
      location: "lib/something.ts",
      line: 59,
    });
    expect(finding).not.toBeNull();
    expect(finding!.classification).toBe("compatibility-identifier");
    expect(finding!.compatibilityReason).toBeTruthy();
  });
});

describe("classifyTermHit — unknown term", () => {
  test("unknown term returns null", () => {
    const finding = classifyTermHit({
      term: "foo bar completely unknown",
      location: "README.md",
      line: 1,
    });
    expect(finding).toBeNull();
  });

  test("empty string returns null", () => {
    expect(classifyTermHit({ term: "", location: "a.md" })).toBeNull();
  });

  test("partial term match returns null (must be exact)", () => {
    // "AIP Chatbot" is in the table, "AIP" alone is not
    expect(classifyTermHit({ term: "AIP", location: "a.md" })).toBeNull();
  });
});

// =============================================================================
// getBaselineTermSpecs
// =============================================================================

describe("getBaselineTermSpecs", () => {
  test("returns 11 entries", () => {
    const specs = getBaselineTermSpecs();
    expect(specs.length).toBe(11);
  });

  test("all compatibility-identifier entries have non-empty compatibilityReason", () => {
    const specs = getBaselineTermSpecs();
    for (const spec of specs) {
      if (spec.classification === "compatibility-identifier") {
        expect(spec.compatibilityReason).toBeTruthy();
      }
    }
  });

  test("exactly 2 preferred-user-facing entries", () => {
    const specs = getBaselineTermSpecs();
    const preferred = specs.filter((s) => s.classification === "preferred-user-facing");
    expect(preferred.length).toBe(2);
  });

  test("exactly 4 legacy-user-facing entries", () => {
    const specs = getBaselineTermSpecs();
    const legacy = specs.filter((s) => s.classification === "legacy-user-facing");
    expect(legacy.length).toBe(4);
  });

  test("exactly 5 compatibility-identifier entries", () => {
    const specs = getBaselineTermSpecs();
    const compat = specs.filter((s) => s.classification === "compatibility-identifier");
    expect(compat.length).toBe(5);
  });
});

// =============================================================================
// isCompatibilityIdentifier
// =============================================================================

describe("isCompatibilityIdentifier", () => {
  test("agentRid is a compatibility identifier", () => {
    expect(isCompatibilityIdentifier("agentRid")).toBe(true);
  });

  test("AIPAgentDeclaration is a compatibility identifier", () => {
    expect(isCompatibilityIdentifier("AIPAgentDeclaration")).toBe(true);
  });

  test("AIP Chatbot Studio is NOT a compatibility identifier", () => {
    expect(isCompatibilityIdentifier("AIP Chatbot Studio")).toBe(false);
  });

  test("AIP Agent is NOT a compatibility identifier", () => {
    expect(isCompatibilityIdentifier("AIP Agent")).toBe(false);
  });

  test("unknown term is NOT a compatibility identifier", () => {
    expect(isCompatibilityIdentifier("totally-unknown")).toBe(false);
  });
});

// =============================================================================
// findingId stability
// =============================================================================

describe("findingId counter", () => {
  test("finding IDs are stable after reset", () => {
    resetFindingCounter();
    const f1 = classifyTermHit({ term: "AIP Chatbot Studio", location: "a.md" });
    expect(f1!.findingId).toBe("finding-0001");

    const f2 = classifyTermHit({ term: "AIP Chatbot", location: "b.md" });
    expect(f2!.findingId).toBe("finding-0002");

    resetFindingCounter();
    const f3 = classifyTermHit({ term: "AIP Chatbot Studio", location: "a.md" });
    expect(f3!.findingId).toBe("finding-0001");
  });
});
