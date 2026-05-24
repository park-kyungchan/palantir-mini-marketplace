import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { emit } from "../../scripts/log";
import type { DtcFillSequenceSession } from "../chatbot-studio/dtc-fill-session";
import type { SemanticConversationState } from "../chatbot-studio/semantic-conversation-state";
import type { DtcFillStep } from "../semantic-intent/fill-sequence";

export interface ContextCapsuleInput {
  readonly purpose: "codex-fallback" | "subagent-handoff" | "precompact-freeze" | "stop-freeze";
  readonly projectRoot: string;
  readonly promptId?: string;
  readonly sessionId?: string;
  readonly contractRefs?: readonly string[];
  readonly universalOntologyEntryRef?: string;
  readonly ontologyContextQueryRef?: string;
  readonly promptContractRefs?: Record<string, unknown>;
  readonly semanticConversationState?: SemanticConversationState;
  readonly routingProjection?: unknown;
  readonly activeContractRef?: string;
  readonly changedPaths?: readonly string[];
  readonly validationCommands?: readonly string[];
  readonly notes?: readonly string[];
  /** DTC fill steps captured during the turn-fill workflow (T0..T6). */
  readonly dtcFillSequence?: readonly DtcFillStep[];
  /** Current turn index 0-6; -1 if fill not yet started. */
  readonly activeDTCTurnIndex?: number;
}

export interface ContextCapsule extends ContextCapsuleInput {
  readonly capsuleId: string;
  readonly createdAt: string;
  readonly lifecycle: "internal" | "persisted" | "frozen" | "archived";
  readonly persistedAt?: string;
  readonly frozenAt?: string;
  readonly frozenReason?: "precompact" | "stop";
  readonly archivedAt?: string;
}

export function createContextCapsule(input: ContextCapsuleInput, now = new Date()): ContextCapsule {
  const createdAt = now.toISOString();
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ ...input, createdAt }))
    .digest("hex")
    .slice(0, 16);
  return {
    ...input,
    capsuleId: `context-capsule:${hash}`,
    createdAt,
    lifecycle: "internal",
  };
}

interface ContextCapsulePointer {
  readonly schemaVersion: "context-capsule/current/v1";
  readonly capsuleId: string;
  readonly capsulePath: string;
  readonly promptId?: string;
  readonly sessionId?: string;
  readonly updatedAt: string;
}

function contextCapsulesDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "context-capsules");
}

function archiveDir(projectRoot: string): string {
  return path.join(contextCapsulesDir(projectRoot), "archive");
}

function capsulePath(projectRoot: string, capsuleId: string): string {
  return path.join(contextCapsulesDir(projectRoot), `${capsuleId}.json`);
}

function currentPointerPath(projectRoot: string): string {
  return path.join(contextCapsulesDir(projectRoot), "current.json");
}

function atomicWriteJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeCurrentPointer(projectRoot: string, capsule: ContextCapsule, filePath: string): void {
  const pointer: ContextCapsulePointer = {
    schemaVersion: "context-capsule/current/v1",
    capsuleId: capsule.capsuleId,
    capsulePath: filePath,
    promptId: capsule.promptId,
    sessionId: capsule.sessionId,
    updatedAt: new Date().toISOString(),
  };
  atomicWriteJson(currentPointerPath(projectRoot), pointer);
}

export async function persistContextCapsule(
  capsule: ContextCapsule,
  projectRoot: string,
): Promise<string> {
  const filePath = capsulePath(projectRoot, capsule.capsuleId);
  const persisted: ContextCapsule = {
    ...capsule,
    lifecycle: "persisted",
    persistedAt: capsule.persistedAt ?? new Date().toISOString(),
  };
  atomicWriteJson(filePath, persisted);
  writeCurrentPointer(projectRoot, persisted, filePath);
  return filePath;
}

export async function loadContextCapsule(
  capsuleId: string,
  projectRoot: string,
): Promise<ContextCapsule | null> {
  return readJson<ContextCapsule>(capsulePath(projectRoot, capsuleId));
}

function loadCurrentCapsule(projectRoot: string): ContextCapsule | null {
  const pointer = readJson<ContextCapsulePointer>(currentPointerPath(projectRoot));
  if (pointer?.capsulePath) {
    const capsule = readJson<ContextCapsule>(pointer.capsulePath);
    if (capsule !== null) return capsule;
  }
  return null;
}

function findCapsuleByPromptId(projectRoot: string, promptId: string): ContextCapsule | null {
  const current = loadCurrentCapsule(projectRoot);
  if (current?.promptId === promptId) return current;

  const dir = contextCapsulesDir(projectRoot);
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.startsWith("context-capsule:") || !entry.endsWith(".json")) continue;
    const capsule = readJson<ContextCapsule>(path.join(dir, entry));
    if (capsule?.promptId === promptId) return capsule;
  }
  return null;
}

async function patchContextCapsule(
  projectRoot: string,
  capsule: ContextCapsule,
  patch: Partial<ContextCapsule>,
): Promise<ContextCapsule> {
  const next: ContextCapsule = { ...capsule, ...patch };
  await persistContextCapsule(next, projectRoot);
  return next;
}

export async function attachContractRefsToCapsule(
  promptId: string | undefined,
  contractRefs: object | undefined,
  projectRoot: string,
): Promise<ContextCapsule | null> {
  if (!promptId || contractRefs === undefined) return null;
  const capsule = findCapsuleByPromptId(projectRoot, promptId);
  if (capsule === null) return null;
  const refValues = Object.values(contractRefs).filter((value): value is string =>
    typeof value === "string" && value.length > 0,
  );
  return patchContextCapsule(projectRoot, capsule, {
    promptContractRefs: contractRefs as Record<string, unknown>,
    contractRefs: Array.from(new Set([...(capsule.contractRefs ?? []), ...refValues])),
  });
}

export async function attachUniversalOntologyEntryRefToCapsule(
  promptId: string | undefined,
  universalOntologyEntryRef: string | undefined,
  projectRoot: string,
): Promise<ContextCapsule | null> {
  if (!promptId || !universalOntologyEntryRef) return null;
  const capsule = findCapsuleByPromptId(projectRoot, promptId);
  if (capsule === null) return null;
  return patchContextCapsule(projectRoot, capsule, { universalOntologyEntryRef });
}

export async function attachOntologyContextQueryRefToCapsule(
  promptId: string | undefined,
  ontologyContextQueryRef: string | undefined,
  projectRoot: string,
): Promise<ContextCapsule | null> {
  if (!promptId || !ontologyContextQueryRef) return null;
  const capsule = findCapsuleByPromptId(projectRoot, promptId);
  if (capsule === null) return null;
  return patchContextCapsule(projectRoot, capsule, { ontologyContextQueryRef });
}

export async function attachSemanticConversationStateToCapsule(
  promptId: string | undefined,
  semanticConversationState: SemanticConversationState | undefined,
  projectRoot: string,
): Promise<ContextCapsule | null> {
  if (!promptId || semanticConversationState === undefined) return null;
  const capsule = findCapsuleByPromptId(projectRoot, promptId);
  if (capsule === null) return null;
  return patchContextCapsule(projectRoot, capsule, { semanticConversationState });
}

export async function attachRoutingProjectionToCapsule(
  promptId: string | undefined,
  routingProjection: unknown,
  projectRoot: string,
): Promise<ContextCapsule | null> {
  if (!promptId) return null;
  const capsule = findCapsuleByPromptId(projectRoot, promptId);
  if (capsule === null) return null;
  return patchContextCapsule(projectRoot, capsule, { routingProjection });
}

export async function freezeContextCapsule(
  capsuleId: string,
  projectRoot: string,
  reason: "precompact" | "stop",
): Promise<ContextCapsule> {
  const capsule = await loadContextCapsule(capsuleId, projectRoot);
  if (capsule === null) {
    throw new Error(`Context capsule not found: ${capsuleId}`);
  }
  const frozen: ContextCapsule = {
    ...capsule,
    lifecycle: "frozen",
    frozenAt: new Date().toISOString(),
    frozenReason: reason,
  };
  atomicWriteJson(capsulePath(projectRoot, capsuleId), frozen);
  writeCurrentPointer(projectRoot, frozen, capsulePath(projectRoot, capsuleId));
  return frozen;
}

export async function freezeActiveContextCapsule(
  projectRoot: string,
  reason: "precompact" | "stop",
): Promise<ContextCapsule | null> {
  const current = loadCurrentCapsule(projectRoot);
  if (current === null) return null;
  return freezeContextCapsule(current.capsuleId, projectRoot, reason);
}

export async function archiveContextCapsule(
  capsuleId: string,
  projectRoot: string,
): Promise<{ archivePath: string; eventEmitted: boolean }> {
  const capsule = await loadContextCapsule(capsuleId, projectRoot);
  if (capsule === null) {
    throw new Error(`Context capsule not found: ${capsuleId}`);
  }
  const archived: ContextCapsule = {
    ...capsule,
    lifecycle: "archived",
    archivedAt: new Date().toISOString(),
  };
  const archivePath = path.join(archiveDir(projectRoot), `${capsuleId}.json`);
  atomicWriteJson(archivePath, archived);
  try {
    fs.rmSync(capsulePath(projectRoot, capsuleId), { force: true });
  } catch {
    // best-effort: archived copy is the durable record.
  }
  writeCurrentPointer(projectRoot, archived, archivePath);

  let eventEmitted = false;
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: true,
        errorClass: "context_capsule_archived",
        capsuleId,
        archivePath,
      } as Record<string, unknown>,
      toolName: "context-capsule",
      cwd: projectRoot,
      identity: "monitor",
      memoryLayers: ["episodic", "semantic"],
      reasoning: `Context capsule archived at ${archivePath}.`,
    });
    eventEmitted = true;
  } catch {
    eventEmitted = false;
  }

  return { archivePath, eventEmitted };
}

export async function archiveActiveContextCapsule(
  projectRoot: string,
): Promise<{ archivePath: string; eventEmitted: boolean } | null> {
  const current = loadCurrentCapsule(projectRoot);
  if (current === null) return null;
  const frozen = current.lifecycle === "frozen"
    ? current
    : await freezeContextCapsule(current.capsuleId, projectRoot, "stop");
  return archiveContextCapsule(frozen.capsuleId, projectRoot);
}

/**
 * Pure helper — derives a Partial<ContextCapsuleInput> carrying DTC fill state
 * from a DtcFillSequenceSession. No I/O; caller decides whether to persist.
 *
 * @param _promptId   Caller-provided prompt identifier (reserved for future
 *                    capsule-lookup use; unused by the pure derivation).
 * @param dtcSession  The in-progress or completed DTC fill session.
 * @param _projectRoot Project root (reserved for future I/O variant; unused here).
 */
export function attachDtcFillStateToCapsule(
  _promptId: string,
  dtcSession: DtcFillSequenceSession,
  _projectRoot: string,
): Partial<ContextCapsuleInput> {
  return {
    dtcFillSequence: dtcSession.dtcDraft.dtcFillSequence ?? [],
    activeDTCTurnIndex: dtcSession.currentTurnIndex,
  };
}
