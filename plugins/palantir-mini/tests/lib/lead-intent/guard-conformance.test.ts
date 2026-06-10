// palantir-mini — SIC/DTC consolidation: primitive-guard conformance (Slice 4).
//
// The lib-side SemanticIntentContract / DigitalTwinChangeContract mirrors
// (lib/lead-intent/contracts.ts) now single-source their shared core from the
// snapshot PRIMITIVES and REQUIRE the schemaVersion the primitive guards check.
// This test pins the headline consequence of that consolidation: every lib
// CONSTRUCTOR mints a contract that satisfies the canonical primitive guard
// (isSemanticIntentContract / isDigitalTwinChangeContract).
//
// IMPORTANT — runtime-unwired by design (SACRED, this PR):
// these guards have ZERO non-test callers. The runtime read path stays a bare
// JSON.parse and validateSemanticIntentContract keeps its existing semantics.
// This file is forward-looking TYPE/constructor conformance only; it does NOT
// wire the guards into any runtime path. Do not change that here.

import { describe, expect, test } from "bun:test";
import {
  draftSemanticIntentContract,
  type SemanticIntentContract,
} from "../../../lib/lead-intent/contracts";
import { createSemanticIntentContractDraftFromFDEOntologySession } from "../../../lib/fde-ontology-engineering/sic-from-session";
import {
  FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
} from "../../../lib/fde-ontology-engineering/types";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";
import {
  buildContextEngineeringPlanV2,
} from "../../../lib/context-engineering/context-plan-builder";
import { draftDtcFromContextPlanV2 } from "../../../lib/context-engineering/dtc-from-context-plan";
import { isSemanticIntentContract } from "#schemas/ontology/primitives/semantic-intent-contract";
import { isDigitalTwinChangeContract } from "#schemas/ontology/primitives/digital-twin-change-contract";
import { makeSic } from "../../fixtures/contract-fixtures";

// Minimal FDE session — same Pick-satisfied shape the dtc-from-context-plan
// suite uses, extended with the fields the SIC-from-session draft consults.
const fdeSession: FDEOntologyEngineeringSession = {
  schemaVersion: FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
  sessionId: "fde-session:guard-conformance",
  projectRoot: "/repo",
  universalOntologyEntryRef: "universal-ontology-entry:guard-conformance",
  phase: "semantic-contract-ready",
  turnCount: 2,
  userFacingSummary: "Author a Decision object and its scoring function.",
  confirmedUserGoal: "Author a Decision object and its scoring function.",
  confirmedNonGoals: ["Do not approve mutation."],
  latentHypotheses: [],
  acceptedHypothesisIds: [],
  rejectedHypothesisIds: [],
  missionModel: {
    operationalDecision: "Author the Decision ontology surface.",
    decisionOwnerRole: "engineer",
    successSignals: ["object + function drafted"],
  },
  evidenceModel: {
    evidenceDefinition: "Plan candidates drive the draft.",
    observableSignals: ["candidate set"],
    sourceArtifactRefs: ["research:aip"],
    missingEvidenceQuestions: [],
  },
  objectCandidates: [
    { candidateId: "obj:decision", plainName: "Decision", whyItMayMatter: "", evidenceRefs: [] },
  ],
  linkCandidates: [],
  actionCandidates: [
    {
      candidateId: "act:approve",
      plainName: "ApproveMutation",
      operationalIntent: "",
      writebackRisk: "medium",
      evidenceRefs: [],
    },
  ],
  functionCandidates: [
    { candidateId: "fn:compute", plainName: "ComputeDecision", logicIntent: "", evidenceRefs: [] },
  ],
  roleCandidates: [],
  chatbotContextCandidates: [],
  unresolvedQuestions: [],
  sourceRefs: ["research:aip"],
  recentTurnSummaries: [],
  turnRecordIds: [],
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z",
};

const projectIndex = {
  projectRoot: "/repo",
  indexRef: "INDEX.md",
  authorityRefs: ["ontology/shared-core"],
  runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
  validationRefs: ["tests/lib/lead-intent/guard-conformance.test.ts"],
  sourceRefs: ["BROWSE.md"],
};

describe("SIC/DTC consolidation — primitive guard conformance", () => {
  test("draftSemanticIntentContract output satisfies isSemanticIntentContract", () => {
    const sic = draftSemanticIntentContract({
      intent: "ontology contract를 바꿔줘",
      scopePaths: ["ontology/data.ts"],
    });
    expect(isSemanticIntentContract(sic)).toBe(true);
    expect(sic.schemaVersion).toBe("prompt-dtc/semantic-intent-contract/v2");
  });

  test("createSemanticIntentContractDraftFromFDEOntologySession output satisfies isSemanticIntentContract", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(fdeSession);
    expect(isSemanticIntentContract(sic)).toBe(true);
    expect(sic.schemaVersion).toBe("prompt-dtc/semantic-intent-contract/v2");
  });

  test("draftDtcFromContextPlanV2 output satisfies isDigitalTwinChangeContract", () => {
    // Approved-shaped SIC fixture (the input draftDtcFromContextPlanV2 consumes),
    // built from the shared helper so schemaVersion is single-sourced.
    const semantic: SemanticIntentContract = makeSic({
      contractId: "semantic-intent:guard-conformance",
      status: "approved",
      rawIntent: "Author Decision ontology",
      confirmedIntent: "Author the Decision object and ComputeDecision function.",
      approvedNouns: ["Decision"],
      approvedVerbs: ["author"],
      affectedSurfaces: ["ontology/data/decision.ts"],
      approvalRef: "user:approved:guard-conformance",
    });

    const contextEngineeringPlan = buildContextEngineeringPlanV2({
      semanticIntentContract: semantic,
      fdeSession,
      projectIndex,
    });
    const result = draftDtcFromContextPlanV2({
      semanticIntentContract: semantic,
      fdeSession,
      contextEngineeringPlan,
      projectIndex,
    });

    expect(isDigitalTwinChangeContract(result.digitalTwinChangeContract)).toBe(true);
    expect(result.digitalTwinChangeContract.schemaVersion).toBe(
      "prompt-dtc/digital-twin-change-contract/v2",
    );
  });
});
