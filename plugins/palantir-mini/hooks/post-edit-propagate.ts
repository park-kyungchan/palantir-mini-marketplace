// palantir-mini v0 — PostToolUse hook handler
// Fires on: PostToolUse(Edit|Write|MultiEdit)
//
// Responsibilities:
//   1. Append a drift_detected (stale_codegen) event for ontology schema-source edits
//   2. Trigger CodegenRun (deferred to v1 — v0 emits the event only)
//   3. Optionally run Post-Write phase drift check
//
// F1b — a raw schema-source FILE edit makes codegen potentially stale = a DRIFT
// signal, NOT a commit. edit_committed asserts the governed commit path ran and may
// ONLY originate from lib/actions/commit.ts (the ActionType write-back gate, ssot/
// palantir approval-and-lineage = sole edit_committed emitter); forging it here from
// an ungoverned file edit bypasses that gate, so this hook emits drift instead.

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
      type: "drift_detected",
      payload: {
        driftType: "stale_codegen",
        affectedObjectType: filePath ?? "unknown-file",
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
  return { message: `palantir-mini: drift_detected (stale_codegen) event appended for ${filePath}` };
}
