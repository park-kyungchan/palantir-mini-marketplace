// palantir-mini PR-13 — Hook enforcement level
//   enforcement: observe
//   rationale:   no permissionDecision and no process.exit(2); logs drift signals only; non-blocking in current configuration.
// palantir-mini v0 — PreToolUse hook handler
// Fires on: PreToolUse(Edit|Write|MultiEdit)
//
// Responsibilities:
//   1. Check if the edit targets an ontology file (schemas/ontology/** or ontology/**)
//   2. Append an edit_proposed event to events.jsonl
//   3. Return hookSpecificOutput with permissionDecision:"allow" by default
//      (OR "deny" if the edit violates a managed-settings.d/ policy)
//   4. Inject a 5-event lineage summary into additionalContext
//
// Correction 2: Uses hookSpecificOutput.permissionDecision, NOT deprecated
// top-level decision field. Precedence: deny > defer > ask > allow.

import { emit, projectRoot, eventsPathFor } from "../scripts/log";
import { replayLineage } from "../lib/event-log/replay";

interface HookPayload {
  session_id?:    string;
  transcript_path?: string;
  cwd?:           string;
  hook_event_name?: string;
  tool_name?:     string;
  tool_input?:    {
    file_path?: string;
    content?:   string;
    old_string?: string;
    new_string?: string;
  };
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "allow" | "deny" | "ask" | "defer";
    permissionDecisionReason: string;
    additionalContext?: string;
  };
}

function isOntologyFile(filePath: string | undefined): boolean {
  if (!filePath) return false;
  // schemas/ontology/** (palantir-mini canonical schemas)
  if (filePath.includes("schemas/ontology/")) return true;
  // <project>/ontology/*.ts (palantir-math style)
  if (/\/ontology\/.+\.ts$/.test(filePath)) return true;
  // Project descender layers that consume ontology declarations
  if (/\/src\/generated\/.*-registry\.generated\.ts$/.test(filePath)) return true;
  if (/\/src\/lib\/(changeResolver|capabilityRegistry|capabilityResolver)\.ts$/.test(filePath)) return true;
  // Convex schema/queries/mutations are codegen-driven from ontology in palantir-math
  if (/\/convex\/(schema|queries|mutations)\.ts$/.test(filePath)) return true;
  // Canonical artifacts owned by ontology contracts
  if (/\/problems\/[^/]+\/seq-(data|frames)\.json$/.test(filePath)) return true;
  return false;
}

export default async function preEditOntology(payload: unknown): Promise<HookOutput> {
  const p = (payload ?? {}) as HookPayload;
  const toolName = p.tool_name ?? "unknown";
  const filePath = p.tool_input?.file_path;
  const cwd = p.cwd ?? process.cwd();

  // v0: always allow, but emit an edit_proposed event for audit
  if (isOntologyFile(filePath)) {
    try {
      await emit({
        type: "edit_proposed",
        payload: {
          functionName: `PreToolUse:${toolName}`,
          params: { filePath, hasContent: !!p.tool_input?.content, hasNewString: !!p.tool_input?.new_string },
          hypotheticalEdits: [],
        },
        toolName,
        cwd,
        sessionId: p.session_id,
        identity: "claude-code",
      });
    } catch {
      // best-effort — never block the edit on event-log write failure
    }
  }

  // Inject last 5 ontology-related events as lineage context
  let lineageContext = "";
  try {
    const epath = eventsPathFor(projectRoot());
    const replay = replayLineage(epath, {
      eventTypes: ["edit_proposed", "edit_committed", "drift_detected"],
      limit: 5,
    });
    if (replay.events.length > 0) {
      lineageContext = `palantir-mini lineage (last ${replay.events.length} events):\n` +
        replay.events.map((e) => `  [seq=${e.sequence}] ${e.type} by ${e.byWhom.agentName ?? e.byWhom.identity}`).join("\n");
    }
  } catch {
    // best-effort
  }

  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: isOntologyFile(filePath)
        ? "palantir-mini: ontology edit recorded as edit_proposed event"
        : "palantir-mini: non-ontology edit (no action)",
      ...(lineageContext ? { additionalContext: lineageContext } : {}),
    },
  };
}
