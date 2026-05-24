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
  isPalantirMiniWorkflowResponseRequired,
  validatePalantirMiniWorkflowResponseTemplateText,
} from "../lib/ontology-engineering-response-template";

function extractResponseText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  for (const key of ["response", "assistantResponse", "assistant_response", "text", "message"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
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

  try {
    await emit({
      type: "session_ended",
      payload: {
        reason: "other",
        eventCount,
        workflowResponseValidation: (() => {
          const text = extractResponseText(payload);
          if (!text) {
            return {
              status: "runtime-gap",
              reason: "Stop payload did not expose assistant response text for template validation.",
            };
          }
          const required = isPalantirMiniWorkflowResponseRequired(text);
          const validation = validatePalantirMiniWorkflowResponseTemplateText(text);
          return {
            status: required && !validation.valid ? "fail" : "pass",
            required,
            validation,
          };
        })(),
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
