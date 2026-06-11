/**
 * P3 + P5b (Round 2) — make the `turn` tool response SELF-DESCRIBING about the two
 * mechanisms the diagnosis (pm-nondeterminism-findings.md) found undiscoverable from
 * the surface:
 *
 *  - P3: when a turn mints `turnDecisionSpecs` that no `userDecisionRecord` has
 *    answered yet, the response must ECHO the still-open `choiceId`s AND NAME the input
 *    field (`choiceApplications`) that records them — so the operator can clear the
 *    `decision-ledger.forward-only-existing-gap` warning without reverse-engineering the
 *    input schema. Closing the loop (submitting `choiceApplications`) must drop the
 *    spec out of the advisory (it round-tripped).
 *  - P5b: the response must state WHERE the session is (`phase`) and the canonical NEXT
 *    action (the head of the already-derived `allowedNextActions`), so a tool response
 *    self-locates instead of leaving the operator to infer the next call.
 *
 * Both are pure response-augmentation off the freshly-written workflow state (handler
 * functions `decisionAdvisoryForState` / `phaseAdvisoryForState`); they MUST NOT change
 * the persisted state. These tests drive the REAL handler (no mocks) and mirror the
 * canonical `turn` invocation in pm-ontology-engineering-workflow.test.ts so the session
 * reliably reaches `semantic-contract-ready` with open decision specs.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { handleOntologyEngineeringWorkflow } from "../../../bridge/handlers/pm-ontology-engineering-workflow";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import { writeUniversalOntologyEntry } from "../../../lib/ontology-entry/entry-store";

let projectRoot: string;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-oe-decision-phase-"));
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

function writeEntry(): string {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: "Implement an ontology engineering workflow for teacher intervention decisions.",
    projectRoot,
    promptId: "prompt-advisory",
    promptHash: "hash-advisory",
    sessionId: "runtime-session",
    runtime: "codex",
    createdAt: "2026-06-11T00:00:00.000Z",
  });
  return writeUniversalOntologyEntry(entry).entryRef;
}

/** The canonical typed-field `turn` signal that advances readiness to SIC-ready. */
const READY_SIGNAL = {
  mission: {
    operationalDecision: "Decide teacher intervention readiness.",
    decisionOwnerRole: "teacher",
    successSignals: ["teacher can choose next intervention"],
  },
  evidence: {
    evidenceDefinition: "Student answer and explanation evidence.",
    observableSignals: ["answer pattern"],
    sourceArtifactRefs: ["evidence://student-answer"],
    missingEvidenceQuestions: [],
  },
  objectNames: ["Student"],
  linkNames: ["Student has answer"],
  actionNames: ["Record intervention"],
  functionNames: ["Score explanation"],
  chatbotContextNames: ["Teacher assistant state"],
  sourceRefs: ["evidence://student-answer"],
} as const;

async function startAndTurn() {
  const entryRef = writeEntry();
  await handleOntologyEngineeringWorkflow({
    action: "start",
    projectRoot,
    universalOntologyEntryRef: entryRef,
    sessionId: "fde-session:advisory",
    createdAt: "2026-06-11T00:01:00.000Z",
  });
  return handleOntologyEngineeringWorkflow({
    action: "turn",
    projectRoot,
    sessionId: "fde-session:advisory",
    sanitizedTurnSummary: "Track teacher intervention readiness.",
    signal: READY_SIGNAL,
    emittedAt: "2026-06-11T00:02:00.000Z",
  });
}

describe("pm-ontology-engineering-workflow — P3 decisionAdvisory", () => {
  test("turn with open turnDecisionSpecs echoes the open choiceIds and names choiceApplications", async () => {
    const turn = await startAndTurn();

    // Precondition: the turn minted decision specs and none round-tripped yet (the exact
    // state the forward-only-existing-gap warning fires on).
    expect(turn.state.turnDecisionSpecs.length).toBeGreaterThan(0);
    expect(turn.state.userDecisionRecords).toEqual([]);
    expect(turn.state.decisionLedgerAuditFindings).toEqual([
      expect.objectContaining({ findingId: "decision-ledger.forward-only-existing-gap" }),
    ]);

    // P3 — the response surfaces the round-trip mechanism.
    expect(turn.decisionAdvisory).toBeDefined();
    // Names the EXACT input field that records the open decisions.
    expect(turn.decisionAdvisory?.recordInputField).toBe("choiceApplications");
    // Echoes EVERY open spec's choiceId (1:1 with the open specs).
    const openSpecIds = turn.state.turnDecisionSpecs.map((spec) => spec.choiceId);
    expect(turn.decisionAdvisory?.openChoiceIds).toEqual(openSpecIds);
    expect(turn.decisionAdvisory?.openChoiceIds.length).toBe(openSpecIds.length);
    // Each echoed choice carries choiceId + kind + label for actionability.
    expect(turn.decisionAdvisory?.openChoices.length).toBe(openSpecIds.length);
    for (const choice of turn.decisionAdvisory?.openChoices ?? []) {
      expect(typeof choice.choiceId).toBe("string");
      expect(choice.choiceId.length).toBeGreaterThan(0);
      expect(["accept", "reject", "defer", "answer"]).toContain(choice.kind);
      expect(typeof choice.label).toBe("string");
    }
    // The note must NAME the field so the surface is self-describing.
    expect(turn.decisionAdvisory?.note).toContain("choiceApplications");
  });

  test("decisionAdvisory is a pure echo — it does not write userDecisionRecords into state", async () => {
    const turn = await startAndTurn();
    // The advisory surfaced open choices, but recorded nothing (no choiceApplications was
    // submitted on this turn). The mechanism stays advisory, not auto-applying.
    expect(turn.decisionAdvisory).toBeDefined();
    expect(turn.state.userDecisionRecords).toEqual([]);
  });

  test("submitting choiceApplications records the decision and clears it from the advisory", async () => {
    await startAndTurn();

    // Read the open choiceId minted by the first turn (off the persisted state).
    const beforeStatus = await handleOntologyEngineeringWorkflow({
      action: "status",
      projectRoot,
      sessionId: "fde-session:advisory",
    });
    const openSpec = beforeStatus.state.turnDecisionSpecs[0];
    expect(openSpec).toBeDefined();

    // Submit a choiceApplication against that emitted choiceId — the documented round-trip.
    const recorded = await handleOntologyEngineeringWorkflow({
      action: "turn",
      projectRoot,
      sessionId: "fde-session:advisory",
      sanitizedTurnSummary: "Record the open turn-card decision.",
      choiceApplications: [
        {
          decisionId: openSpec!.choiceId,
          choiceId: openSpec!.choiceId,
          kind: "accept",
          decision: "accepted",
          fdeSessionRef: "fde-ontology-engineering://session/fde-session:advisory",
        },
      ],
      emittedAt: "2026-06-11T00:03:00.000Z",
    });

    // The submitted choiceId now has a matching UserDecisionRecord …
    expect(recorded.state.userDecisionRecords.map((r) => r.choiceId)).toContain(openSpec!.choiceId);
    // … so it is no longer echoed as open (if any specs remain, they exclude this one;
    // if it was the only open spec, the advisory is absent entirely).
    expect(recorded.decisionAdvisory?.openChoiceIds ?? []).not.toContain(openSpec!.choiceId);
  });
});

describe("pm-ontology-engineering-workflow — P5b phaseAdvisory", () => {
  test("turn response states the current phase and the canonical next action", async () => {
    const turn = await startAndTurn();

    expect(turn.phaseAdvisory).toBeDefined();
    // Phase echoes the derived state phase (not a re-derivation).
    expect(turn.phaseAdvisory?.phase).toBe(turn.state.phase);
    // Canonical next action is the HEAD of the already-derived allowedNextActions.
    expect(turn.phaseAdvisory?.canonicalNextAction).toBe(turn.state.allowedNextActions[0]);
    // The full allowed set is echoed alongside, identical to state.
    expect(turn.phaseAdvisory?.allowedNextActions).toEqual(turn.state.allowedNextActions);
    // At SIC-ready, the canonical next action is draft_sic (the surface tells you what to call).
    expect(turn.state.phase).toBe("semantic-contract-ready");
    expect(turn.phaseAdvisory?.canonicalNextAction).toBe("draft_sic");
    // The note names both the phase and the action so the response self-locates.
    expect(turn.phaseAdvisory?.note).toContain(turn.state.phase);
    expect(turn.phaseAdvisory?.note).toContain("draft_sic");
  });
});
