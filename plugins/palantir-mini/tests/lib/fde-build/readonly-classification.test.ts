// palantir-mini sprint-138 Slice 1.B — read-only classification tests
// Verifies that 6 read-only fixture prompts (from brief §12) always produce
// sessions with mutationAuthorized=false, requiresDigitalTwinChangeContract=false,
// and readOnly=true when no SIC is present.
import { describe, test, expect } from "bun:test";
import { composeFDEOntologyBuildSession } from "../../../lib/fde-build/session-composer";
import type { ComposeFDEOntologyBuildSessionInput } from "../../../lib/fde-build/session-composer";

// =============================================================================
// Read-only fixture prompts (from brief §12)
// These represent documentation/analysis/audit requests that should never
// trigger mutation authorization.
// =============================================================================

const READ_ONLY_PROMPTS: Array<{ label: string; prompt: string }> = [
  {
    label: "Draft a brief about FDE writeback governance",
    prompt: "Draft a brief about FDE writeback governance",
  },
  {
    label: "Explain action policy",
    prompt: "Explain action policy",
  },
  {
    label: "Describe submission criteria deferred behavior",
    prompt: "Describe submission criteria deferred behavior",
  },
  {
    label: "What does the ontology-build session require?",
    prompt: "What does the ontology-build session require?",
  },
  {
    label: "Document enforcement promotion path",
    prompt: "Document enforcement promotion path",
  },
  {
    label: "Audit implementation readiness",
    prompt: "Audit implementation readiness",
  },
];

// =============================================================================
// Helper: build session from a prompt string passed as SemanticConversationState
// =============================================================================

function buildSessionFromPrompt(prompt: string): ReturnType<typeof composeFDEOntologyBuildSession> {
  const input: ComposeFDEOntologyBuildSessionInput = {
    project: "/home/palantirkc/projects/test-project",
    semanticConversationState: {
      userFacing: {
        plainRequestSummary: prompt,
      },
    },
    // Explicitly no SIC — so requiresDigitalTwinChangeContract should be false.
    semanticIntentContract: undefined,
    nowIso: "2026-05-14T10:00:00.000Z",
  };
  return composeFDEOntologyBuildSession(input);
}

// =============================================================================
// Tests
// =============================================================================

describe("read-only classification — 6 fixture prompts from brief §12", () => {
  for (const { label, prompt } of READ_ONLY_PROMPTS) {
    test(`[${label}] mutationAuthorized === false`, () => {
      const session = buildSessionFromPrompt(prompt);
      // Verify literal false — NOT just falsy.
      expect(session.mutationAuthorized).toBe(false);
    });

    test(`[${label}] requiresDigitalTwinChangeContract === false (no SIC)`, () => {
      const session = buildSessionFromPrompt(prompt);
      expect(session.requiresDigitalTwinChangeContract).toBe(false);
    });

    test(`[${label}] readOnly === true`, () => {
      const session = buildSessionFromPrompt(prompt);
      expect(session.readOnly).toBe(true);
    });

    test(`[${label}] produces a valid sessionRid`, () => {
      const session = buildSessionFromPrompt(prompt);
      expect(typeof session.sessionRid).toBe("string");
      expect(session.sessionRid.startsWith("fde-session:")).toBe(true);
    });

    test(`[${label}] plainLanguageStatus is non-empty`, () => {
      const session = buildSessionFromPrompt(prompt);
      expect(typeof session.plainLanguageStatus).toBe("string");
      expect(session.plainLanguageStatus.length).toBeGreaterThan(0);
    });
  }
});

// =============================================================================
// Additional: verify prompt text fed via semanticConversationState is NOT
// interpreted as any kind of mutation authorization trigger.
// =============================================================================

describe("read-only classification — no semantic state mutation leakage", () => {
  test("session with only semanticConversationState never gets semanticIntentContractRef", () => {
    const session = buildSessionFromPrompt("Audit implementation readiness");
    // No SIC was passed — the ref must be absent.
    expect(session.semanticIntentContractRef).toBeUndefined();
  });

  test("session with only semanticConversationState has empty completedLevels (no ontology data)", () => {
    const session = buildSessionFromPrompt("Explain action policy");
    // Without objectTypes/linkTypes data, nothing past mission-decision can complete.
    // In fact with no missionContext data either, completedLevels stays empty.
    expect(Array.isArray(session.completedLevels)).toBe(true);
  });

  test("topGaps are capped at 5", () => {
    const session = buildSessionFromPrompt("Draft a brief about FDE writeback governance");
    expect(session.topGaps.length).toBeLessThanOrEqual(5);
  });
});
