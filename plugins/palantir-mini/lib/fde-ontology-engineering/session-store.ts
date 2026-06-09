import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { atomicWriteJsonSync } from "../fs-atomic";
import { safeSegment, stableDigest } from "../id-segment";
import type { UniversalOntologyEntry } from "../ontology-entry/universal-entry";
import { universalOntologyEntryRef } from "../ontology-entry/entry-store";
import type {
  FDEOntologyEngineeringCurrentPointer,
  FDEOntologyEngineeringPhase,
  FDEOntologyEngineeringSession,
  FDEOntologyPhaseHistoryEntry,
  FDEOntologyStableSummary,
  FDEOntologyTurnRecord,
  FDEOntologyTurnSummary,
} from "./types";
import {
  FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
  FDE_ONTOLOGY_TURN_RECORD_SCHEMA_VERSION,
} from "./types";

const SESSION_REF_PREFIX = "fde-ontology-engineering://session/";
const MAX_RECENT_TURN_SUMMARIES = 20;

export interface CreateFDEOntologyEngineeringSessionInput {
  readonly entry: UniversalOntologyEntry;
  readonly sessionId?: string;
  readonly ontologyContextQueryRef?: string;
  readonly workflowTraceRef?: string;
  readonly createdAt?: string;
}

export interface WriteFDEOntologyEngineeringSessionResult {
  readonly sessionPath: string;
  readonly currentPath: string;
  readonly sessionRef: string;
}

export interface AppendFDEOntologyTurnInput {
  readonly projectRoot: string;
  readonly sessionId: string;
  readonly turnId?: string;
  readonly userMessageHash: string;
  readonly leadSummary: string;
  readonly acceptedHypothesisIds?: readonly string[];
  readonly rejectedHypothesisIds?: readonly string[];
  readonly deferredHypothesisIds?: readonly string[];
  readonly newQuestions?: readonly string[];
  readonly sourceRefs?: readonly string[];
  readonly emittedAt?: string;
}

export interface AppendFDEOntologyTurnResult {
  readonly turnPath: string;
  readonly sessionPath: string;
  readonly record: FDEOntologyTurnRecord;
  readonly session: FDEOntologyEngineeringSession;
}

export interface CreateFDEOntologyTurnRecordInput {
  readonly sessionId: string;
  readonly turnIndex: number;
  readonly turnId?: string;
  readonly userMessageHash: string;
  readonly leadSummary: string;
  readonly acceptedHypothesisIds?: readonly string[];
  readonly rejectedHypothesisIds?: readonly string[];
  readonly deferredHypothesisIds?: readonly string[];
  readonly newQuestions?: readonly string[];
  readonly sourceRefs?: readonly string[];
  readonly emittedAt?: string;
}

function deriveSessionId(entry: UniversalOntologyEntry): string {
  return `fde-ontology-engineering:${stableDigest({
    entryId: entry.entryId,
    projectRoot: entry.project.projectRoot,
  })}`;
}

function deriveTurnId(sessionId: string, turnIndex: number, emittedAt: string): string {
  return `fde-turn:${stableDigest({ sessionId, turnIndex, emittedAt })}`;
}

function maxTurnIndex(session: FDEOntologyEngineeringSession): number {
  if (session.turnRecordIds.length === 0) return -1;
  return session.turnCount - 1;
}

function initialStableSummary(createdAt: string, sourceTurnIds: readonly string[] = []): FDEOntologyStableSummary {
  return {
    acceptedHypothesisCount: 0,
    rejectedHypothesisCount: 0,
    deferredHypothesisCount: 0,
    unresolvedBlockingQuestionCount: 0,
    sourceTurnIds,
    updatedAt: createdAt,
  };
}

function initialPhaseHistory(
  phase: FDEOntologyEngineeringPhase,
  enteredAt: string,
): readonly FDEOntologyPhaseHistoryEntry[] {
  return [{
    phase,
    enteredAt,
    reason: "Session created from UniversalOntologyEntry.",
  }];
}

export function hashFDEOntologyTurnMessage(message: string): string {
  return `sha256:${crypto.createHash("sha256").update(message).digest("hex")}`;
}

export function fdeOntologyEngineeringStoreDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "fde-ontology-engineering");
}

export function fdeOntologyEngineeringSessionPath(
  projectRoot: string,
  sessionId: string,
): string {
  return path.join(fdeOntologyEngineeringStoreDir(projectRoot), `${safeSegment(sessionId, { fallback: "session", maxLen: 128, allowColon: true })}.json`);
}

export function fdeOntologyEngineeringSessionDir(
  projectRoot: string,
  sessionId: string,
): string {
  return path.join(fdeOntologyEngineeringStoreDir(projectRoot), safeSegment(sessionId, { fallback: "session", maxLen: 128, allowColon: true }));
}

export function fdeOntologyEngineeringCurrentPath(projectRoot: string): string {
  return path.join(fdeOntologyEngineeringStoreDir(projectRoot), "current.json");
}

export function fdeOntologyEngineeringTurnRecordPath(
  projectRoot: string,
  sessionId: string,
  turnId: string,
): string {
  return path.join(
    fdeOntologyEngineeringSessionDir(projectRoot, sessionId),
    "turns",
    `${safeSegment(turnId, { fallback: "session", maxLen: 128, allowColon: true })}.json`,
  );
}

export function fdeOntologyEngineeringSessionRef(sessionId: string): string {
  return `${SESSION_REF_PREFIX}${safeSegment(sessionId, { fallback: "session", maxLen: 128, allowColon: true })}`;
}

export function createFDEOntologyEngineeringSessionFromEntry(
  input: CreateFDEOntologyEngineeringSessionInput,
): FDEOntologyEngineeringSession {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const entryRef = universalOntologyEntryRef(input.entry);
  return {
    schemaVersion: FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
    sessionId: input.sessionId ?? deriveSessionId(input.entry),
    projectRoot: input.entry.project.projectRoot,
    universalOntologyEntryRef: entryRef,
    ontologyContextQueryRef: input.ontologyContextQueryRef,
    workflowTraceRef: input.workflowTraceRef,
    phase: "entry-intent",
    turnCount: 0,
    userFacingSummary: input.entry.prompt.excerpt,
    confirmedNonGoals: [],
    latentHypotheses: [],
    acceptedHypothesisIds: [],
    rejectedHypothesisIds: [],
    deferredHypothesisIds: [],
    objectCandidates: [],
    linkCandidates: [],
    actionCandidates: [],
    functionCandidates: [],
    roleCandidates: [],
    propertyCandidates: [],
    chatbotContextCandidates: [],
    unresolvedQuestions: [],
    stableSummary: initialStableSummary(createdAt),
    phaseHistory: initialPhaseHistory("entry-intent", createdAt),
    sourceRefs: [entryRef],
    recentTurnSummaries: [],
    turnRecordIds: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function writeFDEOntologyEngineeringSessionSnapshot(
  session: FDEOntologyEngineeringSession,
): WriteFDEOntologyEngineeringSessionResult {
  const sessionPath = fdeOntologyEngineeringSessionPath(session.projectRoot, session.sessionId);
  const currentPath = fdeOntologyEngineeringCurrentPath(session.projectRoot);
  const sessionRef = fdeOntologyEngineeringSessionRef(session.sessionId);
  const current: FDEOntologyEngineeringCurrentPointer = {
    schemaVersion: "palantir-mini/fde-ontology-engineering-current/v1",
    sessionId: session.sessionId,
    sessionRef,
    projectRoot: session.projectRoot,
    updatedAt: session.updatedAt,
  };

  atomicWriteJsonSync(sessionPath, session);
  atomicWriteJsonSync(currentPath, current);
  return { sessionPath, currentPath, sessionRef };
}

export function readFDEOntologyEngineeringSession(
  projectRoot: string,
  sessionId: string,
): FDEOntologyEngineeringSession | null {
  const sessionPath = fdeOntologyEngineeringSessionPath(projectRoot, sessionId);
  if (!fs.existsSync(sessionPath)) return null;
  return JSON.parse(fs.readFileSync(sessionPath, "utf8")) as FDEOntologyEngineeringSession;
}

export function readCurrentFDEOntologyEngineeringSession(
  projectRoot: string,
): FDEOntologyEngineeringSession | null {
  const currentPath = fdeOntologyEngineeringCurrentPath(projectRoot);
  if (!fs.existsSync(currentPath)) return null;
  const current = JSON.parse(
    fs.readFileSync(currentPath, "utf8"),
  ) as FDEOntologyEngineeringCurrentPointer;
  return readFDEOntologyEngineeringSession(projectRoot, current.sessionId);
}

export function readFDEOntologyTurnRecord(
  projectRoot: string,
  sessionId: string,
  turnId: string,
): FDEOntologyTurnRecord | null {
  const turnPath = fdeOntologyEngineeringTurnRecordPath(projectRoot, sessionId, turnId);
  if (!fs.existsSync(turnPath)) return null;
  return JSON.parse(fs.readFileSync(turnPath, "utf8")) as FDEOntologyTurnRecord;
}

export function writeFDEOntologyTurnRecord(
  projectRoot: string,
  record: FDEOntologyTurnRecord,
): { readonly turnPath: string } {
  const turnPath = fdeOntologyEngineeringTurnRecordPath(projectRoot, record.sessionId, record.turnId);
  atomicWriteJsonSync(turnPath, record);
  return { turnPath };
}

export function updateFDEOntologyEngineeringSession(
  session: FDEOntologyEngineeringSession,
  patch: Partial<Omit<FDEOntologyEngineeringSession, "schemaVersion" | "sessionId" | "projectRoot" | "createdAt">> & {
    readonly phase?: FDEOntologyEngineeringPhase;
    readonly updatedAt?: string;
  },
): FDEOntologyEngineeringSession {
  return {
    ...session,
    ...patch,
    schemaVersion: FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
    sessionId: session.sessionId,
    projectRoot: session.projectRoot,
    createdAt: session.createdAt,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
}

export function createFDEOntologyTurnRecord(
  input: CreateFDEOntologyTurnRecordInput,
): FDEOntologyTurnRecord {
  const emittedAt = input.emittedAt ?? new Date().toISOString();
  return {
    schemaVersion: FDE_ONTOLOGY_TURN_RECORD_SCHEMA_VERSION,
    turnId: input.turnId ?? deriveTurnId(input.sessionId, input.turnIndex, emittedAt),
    sessionId: input.sessionId,
    turnIndex: input.turnIndex,
    userMessageHash: input.userMessageHash,
    leadSummary: input.leadSummary,
    acceptedHypothesisIds: input.acceptedHypothesisIds ?? [],
    rejectedHypothesisIds: input.rejectedHypothesisIds ?? [],
    deferredHypothesisIds: input.deferredHypothesisIds ?? [],
    newQuestions: input.newQuestions ?? [],
    sourceRefs: input.sourceRefs ?? [],
    emittedAt,
  };
}

export function applyFDEOntologyTurnRecordToSession(
  session: FDEOntologyEngineeringSession,
  record: FDEOntologyTurnRecord,
): FDEOntologyEngineeringSession {
  const summary: FDEOntologyTurnSummary = {
    turnId: record.turnId,
    turnIndex: record.turnIndex,
    leadSummary: record.leadSummary,
    emittedAt: record.emittedAt,
  };

  return updateFDEOntologyEngineeringSession(session, {
    turnCount: Math.max(session.turnCount, record.turnIndex + 1),
    acceptedHypothesisIds: Array.from(new Set([
      ...session.acceptedHypothesisIds,
      ...record.acceptedHypothesisIds,
    ])),
    rejectedHypothesisIds: Array.from(new Set([
      ...session.rejectedHypothesisIds,
      ...record.rejectedHypothesisIds,
    ])),
    deferredHypothesisIds: Array.from(new Set([
      ...(session.deferredHypothesisIds ?? []),
      ...record.deferredHypothesisIds,
    ])),
    sourceRefs: Array.from(new Set([...session.sourceRefs, ...record.sourceRefs])),
    recentTurnSummaries: [...session.recentTurnSummaries, summary].slice(-MAX_RECENT_TURN_SUMMARIES),
    turnRecordIds: [...session.turnRecordIds, record.turnId],
    updatedAt: record.emittedAt,
  });
}

export function appendFDEOntologyTurnRecord(
  input: AppendFDEOntologyTurnInput,
): AppendFDEOntologyTurnResult {
  const session = readFDEOntologyEngineeringSession(input.projectRoot, input.sessionId);
  if (session === null) {
    throw new Error(`FDE ontology engineering session not found: ${input.sessionId}`);
  }

  const emittedAt = input.emittedAt ?? new Date().toISOString();
  const turnIndex = maxTurnIndex(session) + 1;
  const record = createFDEOntologyTurnRecord({
    sessionId: input.sessionId,
    turnIndex,
    turnId: input.turnId,
    userMessageHash: input.userMessageHash,
    leadSummary: input.leadSummary,
    acceptedHypothesisIds: input.acceptedHypothesisIds ?? [],
    rejectedHypothesisIds: input.rejectedHypothesisIds ?? [],
    deferredHypothesisIds: input.deferredHypothesisIds ?? [],
    newQuestions: input.newQuestions ?? [],
    sourceRefs: input.sourceRefs ?? [],
    emittedAt,
  });
  const nextSession = applyFDEOntologyTurnRecordToSession(session, record);

  const { turnPath } = writeFDEOntologyTurnRecord(input.projectRoot, record);
  const { sessionPath } = writeFDEOntologyEngineeringSessionSnapshot(nextSession);
  return { turnPath, sessionPath, record, session: nextSession };
}
