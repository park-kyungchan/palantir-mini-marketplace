// palantir-mini sprint-064 W2 - Prompt front door capture hook
// Fires on: UserPromptSubmit (synchronous)
//
// Captures payload.prompt into a PromptEnvelope without retaining the raw prompt
// by default, then points the Lead at the semantic gate through Codex's
// UserPromptSubmit hookSpecificOutput.additionalContext shape.

import * as fs from "fs";
import * as path from "path";
import {
  createPromptEnvelope,
  type PromptCurrentPointer,
  type PromptEnvelope,
  type PromptRuntime,
} from "../lib/prompt-front-door";
import { createUniversalOntologyEntry } from "../lib/ontology-entry/universal-entry";
import { writeUniversalOntologyEntry } from "../lib/ontology-entry/entry-store";
import {
  buildOntologyEngineeringResponseTemplateContext,
  isOntologyEngineeringResponseRequired,
} from "../lib/ontology-engineering-response-template";
// transitionUniversalOntologyEntry is used by downstream handlers (ontology-context-query,
// pm-semantic-intent-gate, pm-intent-router) for status transitions AFTER the initial capture.
// Capture itself uses emit() directly for the user_prompt_submitted event.
import { emit } from "../scripts/log";
import { findProjectRoot } from "./harness-base-mode-advisory";

interface HookPayload {
  readonly session_id?: string;
  readonly turn_id?: string;
  readonly cwd?: string;
  readonly prompt?: string;
  readonly hook_event_name?: string;
}

interface HookResult {
  readonly continue?: boolean;
  readonly message?: string;
  readonly hookSpecificOutput?: {
    readonly hookEventName: "UserPromptSubmit";
    readonly additionalContext: string;
  };
}

function safeSegment(value: string): string {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function atomicWriteJsonSync(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

function readJsonSync<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    return null;
  }
}

export function resolveCaptureProjectRoot(cwd: string): string {
  const explicit = process.env.PALANTIR_MINI_PROJECT;
  if (explicit && explicit.trim().length > 0) return explicit;
  return findProjectRoot(cwd) ?? cwd;
}

export function promptFrontDoorRoot(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "prompt-front-door");
}

export function envelopePathFor(
  projectRoot: string,
  sessionId: string,
  promptId: string,
): string {
  return path.join(
    promptFrontDoorRoot(projectRoot),
    "sessions",
    safeSegment(sessionId),
    `${safeSegment(promptId)}.json`,
  );
}

export function currentPointerPathFor(
  projectRoot: string,
  runtime: PromptRuntime,
  sessionId: string,
): string {
  return path.join(
    promptFrontDoorRoot(projectRoot),
    "current",
    `${safeSegment(runtime)}-${safeSegment(sessionId)}.json`,
  );
}

export function writePromptCaptureSync(envelope: PromptEnvelope): PromptCurrentPointer {
  const pointer: PromptCurrentPointer = {
    schemaVersion: "prompt-front-door/current/v1",
    runtime: envelope.runtime,
    sessionId: envelope.sessionId,
    promptId: envelope.promptId,
    promptHash: envelope.promptHash,
    updatedAt: new Date().toISOString(),
  };
  atomicWriteJsonSync(
    envelopePathFor(envelope.projectRoot, envelope.sessionId, envelope.promptId),
    envelope,
  );
  atomicWriteJsonSync(
    currentPointerPathFor(envelope.projectRoot, envelope.runtime, envelope.sessionId),
    pointer,
  );
  return pointer;
}

function detectRuntime(payload: HookPayload): PromptRuntime {
  const hostRuntime = process.env.PALANTIR_MINI_HOST_RUNTIME;
  if (
    hostRuntime === "codex" ||
    hostRuntime === "claude" ||
    hostRuntime === "cursor" ||
    hostRuntime === "gemini"
  ) {
    return hostRuntime;
  }
  if (payload.hook_event_name === "UserPromptSubmit" && typeof payload.turn_id === "string") {
    return "codex";
  }
  return "claude";
}

function buildGateContext(envelope: PromptEnvelope, universalOntologyEntryRef?: string): string {
  const lines = [
    "palantir-mini prompt front door captured this prompt.",
    universalOntologyEntryRef ? `UniversalOntologyEntryRef: ${universalOntologyEntryRef}` : "",
    "",
    "Before ontology-affecting routing, call `pm_semantic_intent_gate` with:",
    `  promptId: ${envelope.promptId}`,
    `  promptHash: ${envelope.promptHash}`,
    `  sessionId: ${envelope.sessionId}`,
    `  runtime: ${envelope.runtime}`,
    "",
    "Policy: Query ontology context first when available. Request DTC approval only for mutation. UniversalOntologyEntry and OntologyContextSeed are retrieval/warning inputs, not mutation authority. Keep runtime-local files thin. Route with palantir-mini first; use native subagents with plugin recipe authority and state native gaps.",
  ];

  if (isOntologyEngineeringResponseRequired(envelope.promptExcerpt ?? "")) {
    lines.push(
      "",
      buildOntologyEngineeringResponseTemplateContext({
        runtime: envelope.runtime,
        enforcementSurface: "UserPromptSubmit",
      }),
    );
  }

  return lines.join("\n");
}

async function emitCaptureEvent(envelope: PromptEnvelope, cwd: string): Promise<void> {
  try {
    await emit({
      type: "user_prompt_submitted",
      payload: {
        promptLength: envelope.promptLength,
      },
      toolName: "prompt-front-door-capture",
      cwd,
      sessionId: envelope.sessionId,
      identity: "monitor",
      memoryLayers: ["working", "episodic", "semantic"],
      reasoning: `Prompt front door captured promptId=${envelope.promptId} and promptHash=${envelope.promptHash}; raw prompt was not retained in the envelope.`,
    });
  } catch {
    // best-effort: prompt capture storage is the authoritative Wave 2 side effect.
  }
}

async function emitMissingPromptEvent(payload: HookPayload, cwd: string): Promise<void> {
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: false,
        errorClass: "prompt_front_door_missing_prompt",
      },
      toolName: "prompt-front-door-capture",
      cwd,
      sessionId: payload.session_id,
      identity: "monitor",
      valueGrade: "T2",
      memoryLayers: ["working", "episodic"],
      reasoning: "UserPromptSubmit did not include payload.prompt, so prompt-front-door capture records an advisory failure and does not block the prompt in Wave 2.",
      refinementTarget: {
        kind: "other",
        filePathOrRid: "hooks/prompt-front-door-capture.ts",
        description: "Missing UserPromptSubmit payload.prompt should be investigated if a runtime emits this shape during prompt-front-door capture.",
        confidenceLevel: "medium",
      },
    });
  } catch {
    // best-effort, advisory-only by design.
  }
}

export default async function promptFrontDoorCapture(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const rawPrompt = typeof p.prompt === "string" ? p.prompt : "";

  if (rawPrompt.length === 0) {
    await emitMissingPromptEvent(p, cwd);
    return {
      continue: true,
      message: "palantir-mini: prompt-front-door-capture advisory - missing payload.prompt",
    };
  }

  const sessionId = p.session_id ?? "local";
  const runtime = detectRuntime(p);
  const projectRoot = resolveCaptureProjectRoot(cwd);
  const previous = readJsonSync<PromptCurrentPointer>(
    currentPointerPathFor(projectRoot, runtime, sessionId),
  );
  const envelope = createPromptEnvelope({
    rawPrompt,
    sessionId,
    runtime,
    projectRoot,
    sequence: Date.now(),
    previousPromptHash: previous?.promptHash,
  });

  writePromptCaptureSync(envelope);
  const entryWrite = writeUniversalOntologyEntry(createUniversalOntologyEntry({
    rawUserRequest: rawPrompt,
    projectRoot,
    promptId: envelope.promptId,
    promptHash: envelope.promptHash,
    sessionId: envelope.sessionId,
    runtime: envelope.runtime,
    createdAt: envelope.capturedAt,
  }));
  await emitCaptureEvent(envelope, cwd);

  return {
    continue: true,
    message: `palantir-mini: prompt-front-door-capture stored ${envelope.promptId}`,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: buildGateContext(envelope, entryWrite.entryRef),
    },
  };
}
