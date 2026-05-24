// palantir-mini v0 — PostToolUse hook handler
// Fires on: PostToolUse(Edit|Write|MultiEdit)
//
// Responsibilities:
//   1. Append an edit_committed event for successful ontology edits
//   2. Trigger CodegenRun (deferred to v1 — v0 emits the event only)
//   3. Optionally run Post-Write phase drift check

import { emit } from "../scripts/log";

interface HookPayload {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: {
    file_path?: string;
  };
  tool_response?: {
    success?: boolean;
    error?: string;
  };
}

function isOntologyFile(filePath: string | undefined): boolean {
  if (!filePath) return false;
  if (filePath.includes("schemas/ontology/")) return true;
  if (/\/ontology\/.+\.ts$/.test(filePath)) return true;
  return false;
}

export default async function postEditPropagate(payload: unknown): Promise<{ message: string }> {
  const p = (payload ?? {}) as HookPayload;
  const filePath = p.tool_input?.file_path;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "unknown";

  if (!isOntologyFile(filePath)) {
    return { message: "palantir-mini: non-ontology edit, no propagation" };
  }

  try {
    await emit({
      type: "edit_committed",
      payload: {
        actionTypeRid: `PostToolUse:${toolName}`,
        appliedEdits: [
          {
            kind: "object",
            rid: filePath ?? "unknown-file",
            properties: { editedBy: toolName },
          },
        ],
        submissionCriteriaPassed: [],
      },
      toolName,
      cwd,
      sessionId: p.session_id,
      identity: "claude-code",
    });
  } catch (e) {
    return { message: `palantir-mini: emit failed: ${(e as Error).message}` };
  }

  // v0: CodegenRun propagation is a no-op placeholder.
  // v1: Run lib/codegen/descender-gen.ts and emit codegen_started/codegen_completed events.
  return { message: `palantir-mini: edit_committed event appended for ${filePath}` };
}
