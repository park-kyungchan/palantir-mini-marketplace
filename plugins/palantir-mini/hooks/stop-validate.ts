// palantir-mini v0 — Stop hook handler
// Fires on: Stop (end of Claude's response)
//
// Responsibilities:
//   1. Append a session_ended event with the event count
//   2. Run a last-mile invariant check on events.jsonl

import * as fs from "fs";
import { emit, projectRoot, eventsPathFor } from "../scripts/log";
import { readEvents } from "../lib/event-log/read";
import {
  isPalantirMiniWorkflowResponseRequiredForState,
  promptTextSuggestsPalantirMiniWorkflow,
  validatePalantirMiniWorkflowResponseTemplateText,
} from "../lib/ontology-engineering-response-template";
import { PromptFrontDoorStore } from "../lib/prompt-front-door/store";
import { PROMPT_RUNTIMES } from "../lib/prompt-front-door/envelope";

function extractResponseText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  for (const key of ["response", "assistantResponse", "assistant_response", "text", "message"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}

function extractSessionId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  for (const key of ["session_id", "sessionId"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}

/**
 * STATE-first (CTX-B): resolve the current front-door envelope for this session
 * and decide the footer requirement on its governed lifecycle state. Best-effort:
 * a missing session_id / envelope / corrupt store falls back to the surface-text
 * recall hint so the Stop validator never silently stops gating. The store read
 * is wrapped so a missing/corrupt front-door dir cannot throw.
 */
async function isWorkflowResponseRequired(
  root: string,
  payload: unknown,
  text: string,
): Promise<boolean> {
  const sessionId = extractSessionId(payload);
  if (sessionId !== undefined) {
    try {
      const store = new PromptFrontDoorStore({ projectRoot: root });
      for (const runtime of PROMPT_RUNTIMES) {
        const pointer = await store.readCurrentPointer(runtime, sessionId);
        if (!pointer) continue;
        const envelope = await store.readEnvelope(pointer.sessionId, pointer.promptId);
        if (envelope) {
          return isPalantirMiniWorkflowResponseRequiredForState({
            frontDoorState: envelope.state,
            pluginOptOut: envelope.palantirMiniPluginOptOut,
          });
        }
      }
    } catch {
      // Best-effort: fall through to the recall-hint fallback below.
    }
  }
  // No session state available -> recall-hint fallback (coverage retained).
  return promptTextSuggestsPalantirMiniWorkflow(text);
}

export default async function stopValidate(payload: unknown): Promise<{ message: string }> {
  const root = projectRoot();
  const epath = eventsPathFor(root);
  let eventCount = 0;
  if (fs.existsSync(epath)) {
    try {
      eventCount = readEvents(epath).length;
    } catch {
      // best-effort
    }
  }

  const workflowResponseValidation: {
    status: "pass" | "fail" | "runtime-gap";
    reason?: string;
    required?: boolean;
    validation?: unknown;
  } = await (async () => {
    const text = extractResponseText(payload);
    if (!text) {
      return {
        status: "runtime-gap" as const,
        reason: "Stop payload did not expose assistant response text for template validation.",
      };
    }
    const required = await isWorkflowResponseRequired(root, payload, text);
    const validation = validatePalantirMiniWorkflowResponseTemplateText(text);
    return {
      status: (required && !validation.valid ? "fail" : "pass") as "pass" | "fail",
      required,
      validation,
    };
  })();

  try {
    await emit({
      type: "session_ended",
      payload: {
        reason: "other",
        eventCount,
        workflowResponseValidation,
      },
      toolName: "Stop",
      cwd: root,
      identity: "claude-code",
    });
  } catch {
    // best-effort
  }

  return { message: `palantir-mini: session_ended event appended (total events so far: ${eventCount + 1})` };
}
