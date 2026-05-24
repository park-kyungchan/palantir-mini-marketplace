import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";
import {
  buildFDESemanticIntentContext,
  readFDESemanticIntentContextSidecar,
  writeFDESemanticIntentContextSidecar,
} from "../../../lib/fde-ontology-engineering/semantic-intent-context";

let projectRoot: string;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-sidecar-"));
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

function session(rawPrompt: string): FDEOntologyEngineeringSession {
  return {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-session:sidecar",
    projectRoot,
    universalOntologyEntryRef: "universal-ontology-entry://sidecar",
    phase: "semantic-contract-ready",
    turnCount: 1,
    userFacingSummary: "Sanitized summary only.",
    confirmedUserGoal: "Build semantic intent context.",
    confirmedNonGoals: ["Do not persist raw prompt."],
    latentHypotheses: [
      {
        hypothesisId: "latent:sidecar",
        ruleId: "generic.prompt-mission-decision",
        status: "accepted",
        family: "framework-discovery",
        readinessRequirementIds: ["mission", "latent-intent-decision"],
        plainLanguage: "Use FDE context as sidecar.",
        whyLeadInferredThis: "Structured evidence.",
        whatUserMayNotHaveNoticed: "Sidecar can feed SIC draft.",
        recommendedDefault: "Accept sidecar.",
        riskIfWrong: "Wrong context.",
        whatWillNotHappenIfAccepted: ["No mutation authority."],
        ontologyImplication: {
          possibleObjects: ["Context"],
          possibleLinks: [],
          possibleActions: [],
          possibleFunctions: [],
        },
        evidenceNeeded: ["evidence://sidecar"],
        sourceRefs: ["evidence://sidecar"],
      },
    ],
    acceptedHypothesisIds: ["latent:sidecar"],
    rejectedHypothesisIds: [],
    deferredHypothesisIds: [],
    objectCandidates: [
      { candidateId: "object:context", plainName: "Context", whyItMayMatter: rawPrompt, evidenceRefs: [] },
    ],
    linkCandidates: [],
    actionCandidates: [],
    functionCandidates: [],
    chatbotContextCandidates: [],
    unresolvedQuestions: [],
    sourceRefs: ["evidence://sidecar"],
    recentTurnSummaries: [],
    turnRecordIds: ["turn-1"],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

describe("FDESemanticIntentContext sidecar", () => {
  test("persists structured context under session dir without raw prompt text", () => {
    const rawPrompt = "RAW PROMPT SHOULD NOT BE IN SIDECAR";
    const context = buildFDESemanticIntentContext(session(rawPrompt), "2026-05-21T00:00:00.000Z");
    const result = writeFDESemanticIntentContextSidecar(context);
    const rawSidecar = fs.readFileSync(result.sidecarPath, "utf8");
    const loaded = readFDESemanticIntentContextSidecar(projectRoot, "fde-session:sidecar");

    expect(result.sidecarPath).toContain(".palantir-mini/session/fde-ontology-engineering");
    expect(loaded?.contextId).toBe(context.contextId);
    expect(rawSidecar).not.toContain(rawPrompt);
    expect(rawSidecar).toContain("Build semantic intent context.");
    expect(loaded?.trace.sourceTurnIds).toEqual(["turn-1"]);
    expect(loaded?.acceptedHypothesisRuleIds).toContain("generic.prompt-mission-decision");
    expect(loaded?.readinessRequirementIds).toContain("latent-intent-decision");
    expect(loaded?.acceptedHypotheses[0]?.ruleId).toBe("generic.prompt-mission-decision");
  });
});
