import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { UniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import {
  UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION,
} from "../../../lib/ontology-entry/universal-entry";
import {
  appendFDEOntologyTurnRecord,
  applyFDEOntologyTurnRecordToSession,
  createFDEOntologyTurnRecord,
  createFDEOntologyEngineeringSessionFromEntry,
  fdeOntologyEngineeringCurrentPath,
  fdeOntologyEngineeringSessionPath,
  hashFDEOntologyTurnMessage,
  readCurrentFDEOntologyEngineeringSession,
  readFDEOntologyEngineeringSession,
  readFDEOntologyTurnRecord,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../../lib/fde-ontology-engineering/session-store";

let projectRoot: string;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-session-"));
});

afterEach(() => {
  try { fs.rmSync(projectRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

function entry(overrides: Partial<UniversalOntologyEntry> = {}): UniversalOntologyEntry {
  return {
    entryId: "universal-ontology-entry:test-entry",
    schemaVersion: UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION,
    createdAt: "2026-05-19T00:00:00.000Z",
    prompt: {
      promptId: "prompt-1",
      promptHash: "hash-1",
      sessionId: "session-1",
      runtime: "codex",
      excerpt: "초등 사고력수학에서 학생이 어디서 막히는지 보고 싶다.",
    },
    project: {
      projectRoot,
      candidateProjectIds: ["palantir-mini"],
    },
    classification: {
      requestKind: "planning",
      mutationExpected: false,
      learnerVisible: true,
      requiresDtc: true,
      canProceedReadOnly: true,
    },
    ontologySeed: {
      nouns: ["학생", "사고력수학"],
      verbs: ["관찰"],
      surfaceHints: [],
      capabilityHints: ["ontology"],
    },
    status: "captured",
    ...overrides,
  };
}

describe("FDE ontology engineering session store", () => {
  test("creates a session from UniversalOntologyEntry", () => {
    const session = createFDEOntologyEngineeringSessionFromEntry({
      entry: entry(),
      createdAt: "2026-05-19T01:00:00.000Z",
      ontologyContextQueryRef: "ontology-context-query:test",
    });

    expect(session.schemaVersion).toBe("palantir-mini/fde-ontology-engineering-session/v1");
    expect(session.phase).toBe("entry-intent");
    expect(session.turnCount).toBe(0);
    expect(session.projectRoot).toBe(projectRoot);
    expect(session.userFacingSummary).toContain("초등 사고력수학");
    expect(session.universalOntologyEntryRef).toContain("universal-ontology-entry://");
    expect(session.ontologyContextQueryRef).toBe("ontology-context-query:test");
    expect(session.sourceRefs).toContain(session.universalOntologyEntryRef);
    expect(session.stableSummary?.acceptedHypothesisCount).toBe(0);
    expect(session.phaseHistory?.[0]?.phase).toBe("entry-intent");
  });

  test("persists session snapshot and current pointer", () => {
    const session = createFDEOntologyEngineeringSessionFromEntry({
      entry: entry(),
      sessionId: "fde-session:test",
      createdAt: "2026-05-19T01:00:00.000Z",
    });

    const result = writeFDEOntologyEngineeringSessionSnapshot(session);
    const loaded = readFDEOntologyEngineeringSession(projectRoot, "fde-session:test");
    const current = readCurrentFDEOntologyEngineeringSession(projectRoot);

    expect(fs.existsSync(result.sessionPath)).toBe(true);
    expect(fs.existsSync(result.currentPath)).toBe(true);
    expect(result.sessionPath).toBe(fdeOntologyEngineeringSessionPath(projectRoot, "fde-session:test"));
    expect(result.currentPath).toBe(fdeOntologyEngineeringCurrentPath(projectRoot));
    expect(result.sessionRef).toBe("fde-ontology-engineering://session/fde-session:test");
    expect(loaded?.sessionId).toBe("fde-session:test");
    expect(current?.sessionId).toBe("fde-session:test");
  });

  test("appends turn records without storing raw prompt text in the session snapshot", () => {
    const session = createFDEOntologyEngineeringSessionFromEntry({
      entry: entry(),
      sessionId: "fde-session:test",
      createdAt: "2026-05-19T01:00:00.000Z",
    });
    writeFDEOntologyEngineeringSessionSnapshot(session);

    const rawUserMessage = "학생이 조건을 놓치는지 파악하고 싶다.";
    const result = appendFDEOntologyTurnRecord({
      projectRoot,
      sessionId: "fde-session:test",
      userMessageHash: hashFDEOntologyTurnMessage(rawUserMessage),
      leadSummary: "조건 읽기 evidence를 먼저 확인한다.",
      acceptedHypothesisIds: ["latent-thinking-step-evidence"],
      deferredHypothesisIds: ["latent-parent-notification"],
      newQuestions: ["학생 풀이 과정 중심인가?"],
      sourceRefs: ["/home/palantirkc/docs/myp-mathematics-subject-guide-2021/"],
      emittedAt: "2026-05-19T01:05:00.000Z",
    });

    const loadedRecord = readFDEOntologyTurnRecord(
      projectRoot,
      "fde-session:test",
      result.record.turnId,
    );
    const rawSessionSnapshot = fs.readFileSync(
      fdeOntologyEngineeringSessionPath(projectRoot, "fde-session:test"),
      "utf8",
    );

    expect(loadedRecord?.userMessageHash).toMatch(/^sha256:/);
    expect(loadedRecord?.leadSummary).toBe("조건 읽기 evidence를 먼저 확인한다.");
    expect(result.session.turnCount).toBe(1);
    expect(result.session.acceptedHypothesisIds).toContain("latent-thinking-step-evidence");
    expect(loadedRecord?.deferredHypothesisIds).toContain("latent-parent-notification");
    expect(result.session.deferredHypothesisIds).toContain("latent-parent-notification");
    expect(result.session.turnRecordIds).toEqual([result.record.turnId]);
    expect(result.session.recentTurnSummaries).toHaveLength(1);
    expect(rawSessionSnapshot).not.toContain(rawUserMessage);
  });

  test("supports 500+ turns with bounded recent summaries", () => {
    let session = createFDEOntologyEngineeringSessionFromEntry({
      entry: entry(),
      sessionId: "fde-session:long",
      createdAt: "2026-05-19T01:00:00.000Z",
    });

    for (let i = 0; i < 505; i++) {
      const record = createFDEOntologyTurnRecord({
        sessionId: "fde-session:long",
        turnIndex: i,
        turnId: `turn-${i}`,
        userMessageHash: hashFDEOntologyTurnMessage(`raw-message-${i}`),
        leadSummary: `lead-summary-${i}`,
        emittedAt: `2026-05-19T01:${String(i % 60).padStart(2, "0")}:00.000Z`,
      });
      session = applyFDEOntologyTurnRecordToSession(session, record);
    }

    writeFDEOntologyEngineeringSessionSnapshot(session);
    const loaded = readFDEOntologyEngineeringSession(projectRoot, "fde-session:long");
    expect(loaded?.turnCount).toBe(505);
    expect(loaded?.turnRecordIds).toHaveLength(505);
    expect(loaded?.recentTurnSummaries).toHaveLength(20);
    expect(loaded?.recentTurnSummaries[0]?.turnId).toBe("turn-485");
    expect(loaded?.recentTurnSummaries[19]?.turnId).toBe("turn-504");

    const rawSessionSnapshot = fs.readFileSync(
      fdeOntologyEngineeringSessionPath(projectRoot, "fde-session:long"),
      "utf8",
    );
    expect(rawSessionSnapshot).not.toContain("raw-message-504");
  });
});
