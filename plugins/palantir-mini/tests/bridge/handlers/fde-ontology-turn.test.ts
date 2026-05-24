import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { TOOLS } from "../../../bridge/mcp-server";
import { handleFDEOntologyTurn } from "../../../bridge/handlers/fde-ontology-turn";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";
import { writeFDEOntologyEngineeringSessionSnapshot } from "../../../lib/fde-ontology-engineering/session-store";

let projectRoot: string;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-turn-"));
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

function session(): FDEOntologyEngineeringSession {
  return {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-session:turn",
    projectRoot,
    universalOntologyEntryRef: "universal-ontology-entry://turn",
    phase: "entry-intent",
    turnCount: 0,
    userFacingSummary: "Start FDE turn.",
    confirmedNonGoals: [],
    latentHypotheses: [],
    acceptedHypothesisIds: [],
    rejectedHypothesisIds: [],
    deferredHypothesisIds: [],
    objectCandidates: [],
    linkCandidates: [],
    actionCandidates: [],
    functionCandidates: [],
    chatbotContextCandidates: [],
    unresolvedQuestions: [],
    sourceRefs: ["universal-ontology-entry://turn"],
    recentTurnSummaries: [],
    turnRecordIds: [],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

describe("internal fde-ontology-turn handler", () => {
  test("is not registered as a public MCP tool", () => {
    expect(TOOLS.map((tool) => tool.name)).not.toContain("fde_ontology_turn");
    expect(TOOLS.map((tool) => tool.name)).not.toContain("fde-ontology-turn");
  });

  test("returns session, grade, lead card, sidecar, and next actions without raw prompt persistence", async () => {
    writeFDEOntologyEngineeringSessionSnapshot(session());
    const rawUserMessage = "RAW USER PROMPT SECRET";
    const result = await handleFDEOntologyTurn({
      projectRoot,
      sessionId: "fde-session:turn",
      rawUserMessage,
      sanitizedTurnSummary: "Design a framework discovery session.",
      acceptedHypothesisIds: ["latent:design-a-framework-discovery-session"],
      signal: {
        mission: {
          operationalDecision: "Decide framework shape.",
          decisionOwnerRole: "Lead",
          successSignals: ["SIC draft ready"],
        },
        evidence: {
          evidenceDefinition: "Framework evidence.",
          observableSignals: ["framework named"],
          sourceArtifactRefs: ["evidence://framework"],
          missingEvidenceQuestions: [],
        },
        objectNames: ["Framework"],
        linkNames: ["FrameworkSurface"],
        functionNames: ["SelectFramework"],
        sourceRefs: ["evidence://framework"],
      },
      emittedAt: "2026-05-21T00:01:00.000Z",
    });

    expect(result.sessionRef).toBe("fde-ontology-engineering://session/fde-session:turn");
    expect(result.sidecarRef).toBe(result.sidecar.contextId);
    expect(result.leadCard.mutationAuthorizedFromCard).toBe(false);
    expect(result.leadCardV2.mutationAuthorizedFromCard).toBe(false);
    expect(result.leadCardV2.schemaVersion).toBe("palantir-mini/lead-ontology-turn-card/v2");
    expect(result.nextActions.length).toBeGreaterThan(0);

    const sessionPath = path.join(
      projectRoot,
      ".palantir-mini/session/fde-ontology-engineering/fde-session:turn.json",
    );
    const rawSession = fs.readFileSync(sessionPath, "utf8");
    expect(rawSession).not.toContain(rawUserMessage);

    const turnDir = path.join(
      projectRoot,
      ".palantir-mini/session/fde-ontology-engineering/fde-session:turn/turns",
    );
    expect(fs.readdirSync(turnDir).length).toBe(1);
  });

  test("applies internal lead card choices into turn record, sidecar, and returned v2 card", async () => {
    writeFDEOntologyEngineeringSessionSnapshot({
      ...session(),
      latentHypotheses: [
        {
          hypothesisId: "latent:accept-choice",
          ruleId: "generic.prompt-mission-decision",
          status: "inferred",
          family: "mission-decision",
          readinessRequirementIds: ["latent-intent-decision"],
          plainLanguage: "Accept choice hypothesis.",
          whyLeadInferredThis: "Choice test.",
          whatUserMayNotHaveNoticed: "Choice affects readiness.",
          recommendedDefault: "Accept.",
          riskIfWrong: "Wrong choice.",
          whatWillNotHappenIfAccepted: ["No mutation authority."],
          ontologyImplication: {
            possibleObjects: ["MissionDecision"],
            possibleLinks: [],
            possibleActions: [],
            possibleFunctions: [],
          },
          evidenceNeeded: [],
          sourceRefs: [],
        },
      ],
    });

    const result = await handleFDEOntologyTurn({
      projectRoot,
      sessionId: "fde-session:turn",
      sanitizedTurnSummary: "Apply choice.",
      choiceApplications: [
        {
          choiceId: "choice:accept",
          kind: "accept",
          targetHypothesisId: "latent:accept-choice",
          appliesToRequirementIds: ["latent-intent-decision"],
        },
      ],
      emittedAt: "2026-05-21T00:02:00.000Z",
    });

    expect(result.session.acceptedHypothesisIds).toContain("latent:accept-choice");
    expect(result.sidecar.acceptedHypothesisRuleIds).toContain("generic.prompt-mission-decision");
    expect(result.sidecar.readinessRequirementIds).toContain("latent-intent-decision");
    expect(result.leadCardV2.stateEffectPreview.join("\n")).toContain("accepted hypothesis");
    expect(result.leadCardV2.choices[0]?.affectsSemanticIntent).toBe(true);
    expect(result.leadCardV2.choices[0]?.affectsDtc).toBe(false);
    expect(result.leadCardV2.choices[0]?.contextEngineeringDomain).toBe("data");
    expect(result.leadCardV2.mutationAuthorizedFromCard).toBe(false);
  });
});
