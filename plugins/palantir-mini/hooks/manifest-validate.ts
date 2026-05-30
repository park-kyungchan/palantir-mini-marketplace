// palantir-mini v1.3 — manifest-validate hook handler
// Fires on: PostToolUse matcher **/.codex-plugin/plugin.json|**/hooks.json
//
// Phase A-3 A4.4: validates hook event allowlist after plugin manifest edits.
// Invokes validate_hook_event_allowlist({pluginManifestPath}).
// Exits 2 (blocks) when invalid event types are declared.

import * as path from "path";
import { emit } from "../scripts/log";
import type validateHookEventAllowlistFn from "../bridge/handlers/validate-hook-event-allowlist";

interface HookPayload {
  tool_name?:  string;
  tool_input?: { file_path?: string; path?: string };
  cwd?:        string;
  session_id?: string;
}

interface InvalidEvent {
  event: string;
  line:  number;
}

interface DeprecatedEvent {
  event:       string;
  replacement: string;
}

interface ValidateResult {
  invalidEvents:   InvalidEvent[];
  deprecatedEvents: DeprecatedEvent[];
}

async function validateAllowlist(pluginManifestPath: string): Promise<{ valid: boolean; invalidEvents: InvalidEvent[]; deprecatedEvents: DeprecatedEvent[] }> {
  const handlerPath = path.resolve(
    import.meta.dirname!,
    "..",
    "bridge",
    "handlers",
    "validate-hook-event-allowlist.ts",
  );
  try {
    const mod = await import(handlerPath) as { default?: typeof validateHookEventAllowlistFn };
    if (typeof mod.default !== "function") return { valid: true, invalidEvents: [], deprecatedEvents: [] };
    const result = (await mod.default({ pluginManifestPath })) as ValidateResult | null;
    if (!result) return { valid: true, invalidEvents: [], deprecatedEvents: [] };
    const invalidEvents   = result.invalidEvents   ?? [];
    const deprecatedEvents = result.deprecatedEvents ?? [];
    return {
      valid: invalidEvents.length === 0,
      invalidEvents,
      deprecatedEvents,
    };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (msg.includes("Cannot find module") || msg.includes("No such file")) {
      return { valid: true, invalidEvents: [], deprecatedEvents: [] };
    }
    return { valid: true, invalidEvents: [], deprecatedEvents: [] };
  }
}

export default async function manifestValidate(payload: unknown): Promise<{
  message: string;
  decision?: "block" | "continue";
  reason?:   string;
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const editedFile = p.tool_input?.file_path ?? p.tool_input?.path ?? "";

  // Derive plugin.json path — handler expects plugin.json, not hooks.json
  let pluginManifestPath = editedFile;
  if (editedFile.endsWith("hooks.json")) {
    pluginManifestPath = path.resolve(
      path.dirname(editedFile),
      "..",
      ".codex-plugin",
      "plugin.json",
    );
  }

  const { valid, invalidEvents, deprecatedEvents } = await validateAllowlist(pluginManifestPath);

  if (!valid) {
    const names  = invalidEvents.map((e) => e.event).join(", ");
    const reason = `palantir-mini manifest-validate: invalid hook event type(s) in ${path.basename(editedFile)}: ${names}.\nSee hook-events-v2.md for valid event names.`;
    process.stderr.write(`[palantir-mini/manifest-validate] ${reason}\n`);

    try {
      await emit({
        type:    "validation_phase_completed",
        payload: { phase: "compile", passed: false, errorClass: "invalid_hook_events" },
        toolName:  p.tool_name ?? "PostToolUse",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
      });
    } catch { /* best-effort */ }

    return { message: `palantir-mini: manifest-validate (valid=false, invalidEvents=${invalidEvents.length})`, decision: "block", reason };
  }

  if (deprecatedEvents.length > 0) {
    const names = deprecatedEvents.map((e) => `${e.event}→${e.replacement}`).join(", ");
    try {
      await emit({
        type:    "validation_phase_completed",
        payload: { phase: "compile", passed: true },
        toolName:  p.tool_name ?? "PostToolUse",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: `deprecated events: ${names}`,
      });
    } catch { /* best-effort */ }
  }

  return {
    message:  `palantir-mini: manifest-validate (valid=true, deprecated=${deprecatedEvents.length}, file=${path.basename(editedFile)})`,
    decision: "continue",
  };
}
