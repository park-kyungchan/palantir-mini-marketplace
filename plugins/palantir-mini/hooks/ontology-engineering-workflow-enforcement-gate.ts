// palantir-mini — PreToolUse hook: ontology-engineering-workflow-enforcement-gate
// (THIN ENTRY — gate-split refactor. Fast top-level logic + static imports only;
// the full assessment (hooks/gates/ontology-engineering-workflow-enforcement-gate.impl.ts)
// is loaded via dynamic import() ONLY when the fast path below does not apply, so a
// read-only host tool call (Read/Grep/Glob/...) with no legacy-UI / ontology-engineering
// marker in the raw payload skips loading the heavy module graph entirely.
//
// Fast-path preconditions (ALL must hold to skip the impl):
//   1. `tool_name` (lowercased) is a member of CLAUDE_TOOL_PROFILE.readOnlyTools.
//   2. The RAW stdin string contains NONE of LEGACY_RUNTIME_UI_TOKENS (case-sensitive).
//   3. The LOWERCASED raw stdin string contains NONE of ONTOLOGY_ENGINEERING_MARKERS.
// Otherwise, dynamically import the impl and delegate fully via `runFromPayload`.

import { CLAUDE_TOOL_PROFILE } from "../lib/runtime/tool-profile";
import { LEGACY_RUNTIME_UI_TOKENS, ONTOLOGY_ENGINEERING_MARKERS } from "./gates/pretool-fast-path-constants";

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
    }
  } catch {
    return "";
  }
  return Buffer.concat(chunks).toString("utf8");
}

interface EntryPayloadShape {
  readonly tool_name?: string;
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: unknown = {};
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw);
    } catch {
      process.stdout.write(JSON.stringify({
        message: "palantir-mini: ontology-engineering workflow gate skipped - malformed hook payload",
      }) + "\n");
      return;
    }
  }

  const toolName = ((payload as EntryPayloadShape)?.tool_name ?? "").toLowerCase();
  const isReadOnlyTool = CLAUDE_TOOL_PROFILE.readOnlyTools.has(toolName);
  const hasLegacyUiToken = LEGACY_RUNTIME_UI_TOKENS.some((token) => raw.includes(token));
  const lowerRaw = raw.toLowerCase();
  const hasOntologyEngineeringMarker = ONTOLOGY_ENGINEERING_MARKERS.some((marker) => lowerRaw.includes(marker));

  if (isReadOnlyTool && !hasLegacyUiToken && !hasOntologyEngineeringMarker) {
    process.stdout.write(
      JSON.stringify({
        message: "palantir-mini: ontology-engineering workflow gate skipped",
      }) + "\n",
    );
    return;
  }

  const mod = await import("./gates/ontology-engineering-workflow-enforcement-gate.impl");
  process.stdout.write(JSON.stringify(await mod.runFromPayload(payload)) + "\n");
}

if (import.meta.main) {
  void main();
}
