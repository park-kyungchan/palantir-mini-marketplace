import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  archiveContextCapsule,
  attachContractRefsToCapsule,
  attachDtcFillStateToCapsule,
  attachOntologyContextQueryRefToCapsule,
  attachRoutingProjectionToCapsule,
  attachSemanticConversationStateToCapsule,
  attachUniversalOntologyEntryRefToCapsule,
  createContextCapsule,
  freezeContextCapsule,
  loadContextCapsule,
  persistContextCapsule,
} from "../../../lib/context/context-capsule";
import type { DtcFillSequenceSession } from "../../../lib/chatbot-studio/dtc-fill-session";
import {
  buildLLMControlFacingState,
} from "../../../lib/chatbot-studio/semantic-conversation-state";
import { createHarnessRatchetProposal } from "../../../lib/harness/ratchet-proposal";


describe("internal context and readiness records", () => {
  test("creates internal context capsules without public MCP exposure", () => {
    const capsule = createContextCapsule(
      {
        purpose: "subagent-handoff",
        projectRoot: "/tmp/project",
        contractRefs: ["prompt-front-door://contract/semantic-intent/example"],
        changedPaths: ["bridge/mcp-server.ts"],
      },
      new Date("2026-05-11T00:00:00.000Z"),
    );

    expect(capsule.lifecycle).toBe("internal");
    expect(capsule.capsuleId).toMatch(/^context-capsule:/);
    expect(capsule.createdAt).toBe("2026-05-11T00:00:00.000Z");
  });

  test("persists, patches, freezes, and archives a context capsule", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-context-capsule-"));
    try {
      const capsule = createContextCapsule({
        purpose: "subagent-handoff",
        projectRoot: project,
        promptId: "prompt-test",
        sessionId: "session-test",
      }, new Date("2026-05-11T00:00:00.000Z"));
      const persistedPath = await persistContextCapsule(capsule, project);
      expect(fs.existsSync(persistedPath)).toBe(true);

      const loaded = await loadContextCapsule(capsule.capsuleId, project);
      expect(loaded?.lifecycle).toBe("persisted");

      const withRefs = await attachContractRefsToCapsule("prompt-test", {
        semanticIntentContractRef: "semantic:test",
        digitalTwinChangeContractRef: "dtc:test",
      }, project);
      expect(withRefs?.contractRefs).toContain("semantic:test");
      expect(withRefs?.contractRefs).toContain("dtc:test");

      const withConversation = await attachSemanticConversationStateToCapsule("prompt-test", {
        stateId: "semantic-conversation:prompt-test",
        schemaVersion: "palantir-mini/semantic-conversation-state/v1",
        prompt: {
          promptId: "prompt-test",
          sessionId: "session-test",
          runtime: "codex",
        },
        userFacing: {
          preferredLanguage: "ko",
          userExpertise: "non_programmer",
          plainRequestSummary: "사용자 의미 확인",
          confirmedNonGoals: [],
          unresolvedQuestions: [],
        },
        ontologyFacing: {
          activatedObjectRefs: [],
          activatedActionRefs: [],
          activatedSurfaceRefs: [],
          activatedLaneRefs: [],
          forbiddenSurfaceRefs: [],
        },
        skillFacing: {
          candidateSkillRefs: [],
          selectedSkillRefs: [],
          skillRoutingReason: "No skills selected.",
        },
        llmControlFacing: buildLLMControlFacingState("semantic-conversation:prompt-test"),
        contractFacing: {
          semanticIntentContractRef: "semantic:test",
          digitalTwinChangeContractRef: "dtc:test",
          dtcReady: true,
        },
        projectFacing: {
          projectRoot: project,
          projectScopeLaneIds: [],
          requiredValidationPacks: [],
        },
        lifecycle: "dtc-approved",
      }, project);
      expect(withConversation?.semanticConversationState?.stateId).toBe(
        "semantic-conversation:prompt-test",
      );

      const withRouting = await attachRoutingProjectionToCapsule("prompt-test", {
        decision: "lead-direct",
      }, project);
      expect(withRouting?.routingProjection).toMatchObject({ decision: "lead-direct" });

      const withEntry = await attachUniversalOntologyEntryRefToCapsule(
        "prompt-test",
        "universal-ontology-entry://entry-test",
        project,
      );
      expect(withEntry?.universalOntologyEntryRef).toBe("universal-ontology-entry://entry-test");

      const withQuery = await attachOntologyContextQueryRefToCapsule(
        "prompt-test",
        "ontology-context-query://query-test",
        project,
      );
      expect(withQuery?.ontologyContextQueryRef).toBe("ontology-context-query://query-test");

      const frozen = await freezeContextCapsule(capsule.capsuleId, project, "precompact");
      expect(frozen.lifecycle).toBe("frozen");
      expect(frozen.frozenReason).toBe("precompact");
      expect(frozen.frozenAt).toBeDefined();

      const archived = await archiveContextCapsule(capsule.capsuleId, project);
      expect(fs.existsSync(archived.archivePath)).toBe(true);
      expect(fs.existsSync(persistedPath)).toBe(false);
      const archivedJson = JSON.parse(fs.readFileSync(archived.archivePath, "utf8"));
      expect(archivedJson.lifecycle).toBe("archived");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("concurrent persist uses independent atomic capsule files", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-context-capsule-concurrent-"));
    try {
      const capsules = [0, 1].map((idx) =>
        createContextCapsule({
          purpose: "subagent-handoff",
          projectRoot: project,
          promptId: `prompt-${idx}`,
        }, new Date(`2026-05-11T00:00:0${idx}.000Z`)),
      );
      const paths = await Promise.all(capsules.map((capsule) =>
        persistContextCapsule(capsule, project),
      ));
      expect(paths.every((filePath) => fs.existsSync(filePath))).toBe(true);
      expect(new Set(paths).size).toBe(2);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("creates harness ratchet proposals as internal records", () => {
    const proposal = createHarnessRatchetProposal({
      scope: "timeout",
      reason: "Codex adapter timed out a hook",
      evidenceRefs: ["hook-timeout://example"],
      proposedChange: "Increase timeout for a governance hook",
      rollback: "Restore previous timeout",
    });

    expect(proposal.lifecycle).toBe("internal");
    expect(proposal.status).toBe("proposed");
    expect(proposal.proposalId).toMatch(/^harness-ratchet:timeout:[a-f0-9]{12}$/);
  });

});

describe("attachDtcFillStateToCapsule", () => {
  const baseContract = {
    contractId: "dtc:test-contract",
    status: "draft" as const,
    semanticIntentContractRef: "semantic:test",
    affectedSurfaces: [],
    changeBoundary: "test boundary",
    branchProposalPolicy: "none",
    permissionBoundary: "local",
    replayMigrationPlan: "none",
    observabilityPlan: "none",
    toolSurfaceReadiness: "ready",
    evaluationPlan: "none",
    risks: [],
  };

  function makeSession(overrides: Partial<DtcFillSequenceSession> = {}): DtcFillSequenceSession {
    return {
      schemaVersion: "palantir-mini/dtc-fill-session/v1",
      sessionId: "session-test",
      contractId: "dtc:test-contract",
      fillSequenceId: "fill-seq:test",
      currentTurnIndex: 2,
      completedTurns: [0, 1],
      dtcDraft: { ...baseContract },
      startedAt: "2026-05-15T00:00:00.000Z",
      lastTurnAt: "2026-05-15T00:01:00.000Z",
      fillVerdict: "draft",
      mutationAuthorized: false,
      ...overrides,
    };
  }

  test("returns dtcFillSequence array from session.dtcDraft.dtcFillSequence", () => {
    const steps = [
      { step: 0, question: "Q0", answer: "A0", filledAt: "2026-05-15T00:00:00.000Z", source: "user" as const },
      { step: 1, question: "Q1", answer: "A1", filledAt: "2026-05-15T00:01:00.000Z", source: "user" as const },
    ];
    const session = makeSession({ dtcDraft: { ...baseContract, dtcFillSequence: steps } });
    const partial = attachDtcFillStateToCapsule("prompt-test", session, "/tmp/project");
    expect(partial.dtcFillSequence).toEqual(steps);
  });

  test("returns activeDTCTurnIndex matching session.currentTurnIndex", () => {
    const session = makeSession({ currentTurnIndex: 3 });
    const partial = attachDtcFillStateToCapsule("prompt-test", session, "/tmp/project");
    expect(partial.activeDTCTurnIndex).toBe(3);
  });

  test("returns empty dtcFillSequence array when dtcDraft has none", () => {
    const session = makeSession({ dtcDraft: { ...baseContract } }); // no dtcFillSequence
    const partial = attachDtcFillStateToCapsule("prompt-test", session, "/tmp/project");
    expect(partial.dtcFillSequence).toEqual([]);
  });

  test("returns activeDTCTurnIndex=-1 when session.currentTurnIndex=-1", () => {
    const session = makeSession({ currentTurnIndex: -1 });
    const partial = attachDtcFillStateToCapsule("prompt-test", session, "/tmp/project");
    expect(partial.activeDTCTurnIndex).toBe(-1);
  });
});
