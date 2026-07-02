// palantir-mini sprint-139 Worker 4
// FDE skip is session-aware: PreToolUse payloads do not need raw prompt text.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
} from "../../lib/prompt-front-door";
import type { FDEOntologyEngineeringSession } from "../../lib/fde-ontology-engineering/types";
import { writeFDEOntologyEngineeringSessionSnapshot } from "../../lib/fde-ontology-engineering/session-store";

let projectRoot: string;

beforeEach(async () => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-fde-skip-"));
  fs.writeFileSync(path.join(projectRoot, "package.json"), "{\"name\":\"fde-skip-test\"}\n");
  process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";
  delete process.env.PALANTIR_MINI_EVENTS_FILE;

  const store = new PromptFrontDoorStore({ projectRoot });
  await store.saveEnvelope(
    createPromptEnvelope({
      rawPrompt: "Explore FDE ontology engineering read-only.",
      sessionId: "session-fde-skip",
      runtime: "codex",
      projectRoot,
      capturedAt: "2026-05-21T00:00:00.000Z",
      sequence: 1,
    }),
  );
});

afterEach(() => {
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

function writeFDESession(
  overrides: Partial<FDEOntologyEngineeringSession> = {},
): FDEOntologyEngineeringSession {
  const session: FDEOntologyEngineeringSession = {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-ontology-engineering:session-aware-skip",
    projectRoot,
    universalOntologyEntryRef: "universal-ontology-entry://fde-skip",
    phase: "evidence-definition",
    turnCount: 1,
    userFacingSummary: "Read-only ontology engineering.",
    confirmedNonGoals: ["No protected mutation before approved SIC/DTC."],
    latentHypotheses: [],
    acceptedHypothesisIds: [],
    rejectedHypothesisIds: [],
    objectCandidates: [],
    linkCandidates: [],
    actionCandidates: [],
    functionCandidates: [],
    chatbotContextCandidates: [],
    unresolvedQuestions: [],
    sourceRefs: ["universal-ontology-entry://fde-skip"],
    recentTurnSummaries: [],
    turnRecordIds: [],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:01:00.000Z",
    ...overrides,
  };
  writeFDEOntologyEngineeringSessionSnapshot(session);
  return session;
}

describe("prompt-dtc-enforcement-gate FDE session-aware skip", () => {
  test("PreToolUse payload without prompt skips for current read-only FDE session", async () => {
    const session = writeFDESession();

    const result = await promptDtcEnforcementGate({
      cwd: projectRoot,
      session_id: "session-fde-skip",
      tool_name: "mcp__palantir_mini__ontology_context_query",
      tool_input: { scopePaths: ["lib/chatbot-studio"] },
    });

    expect(result.decision).toBeUndefined();
    expect(result.message).toContain("FDE ontology-engineering read-only session");
    expect(result.additionalContext).toContain(session.sessionId);
    expect(result.additionalContext).toContain("Protected mutation still requires approved SIC/DTC");
  });

  test("current read-only FDE session never skips protected mutation", async () => {
    writeFDESession();

    const result = await promptDtcEnforcementGate({
      cwd: projectRoot,
      session_id: "session-fde-skip",
      tool_name: "mcp__palantir_mini__commit_edits",
      tool_input: { scopePaths: ["lib/chatbot-studio"] },
    });

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("BLOCKING");
  });

  test("payload.prompt alone no longer drives FDE skip", async () => {
    const result = await promptDtcEnforcementGate({
      cwd: projectRoot,
      session_id: "session-fde-skip",
      prompt: "Explain FDE ontology readiness without editing anything.",
      tool_name: "mcp__palantir_mini__ontology_context_query",
      tool_input: { action: "read" },
    });

    expect(result.message).toContain("read-only or allowed");
    expect(result.message).not.toContain("FDE ontology-engineering read-only session");
  });
});
