// palantir-mini v1.3 — session-drift-check hook handler
// Fires on: SessionStart stage 2 (async: true, non-blocking)
//
// Phase A-3 A4.1: Governance substrate check at session boot.
// Invokes 4 MCP handlers in parallel, aggregates results into
// additionalContext for Lead, emits session_drift_check_completed.
//
// Handlers called (bridge/handlers/):
//   check_cc_version, detect_doc_drift, verify_schema_pin,
//   validate_managed_settings_fragments
//
// If a handler is not yet available (bridge not built), gracefully skips
// and notes unavailability in summary.

import * as path from "path";
import { emit, projectRoot } from "../scripts/log";

interface HookPayload {
  session_id?: string;
  cwd?:        string;
}

type HandlerResult = { ok: boolean; summary: string };

async function tryHandler(handlerName: string, args: unknown): Promise<HandlerResult> {
  const handlerPath = path.resolve(
    import.meta.dirname!,
    "..",
    "bridge",
    "handlers",
    `${handlerName}.ts`,
  );
  try {
    const mod = await import(handlerPath) as { default?: (a: unknown) => Promise<unknown> };
    if (typeof mod.default !== "function") {
      return { ok: false, summary: `${handlerName}: handler missing default export` };
    }
    const result = await mod.default(args);
    return { ok: true, summary: `${handlerName}: ${JSON.stringify(result).slice(0, 120)}` };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (msg.includes("Cannot find module") || msg.includes("No such file")) {
      return { ok: false, summary: `${handlerName}: not yet available (A2 pending)` };
    }
    return { ok: false, summary: `${handlerName}: error — ${msg.slice(0, 100)}` };
  }
}

export default async function sessionDriftCheck(payload: unknown): Promise<{
  message: string;
  additionalContext?: string;
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const root = projectRoot();

  const [ccVersion, docDrift, schemaPin, managedSettings] = await Promise.all([
    tryHandler("check-cc-version",                    { cwd }),
    tryHandler("detect-doc-drift",                    { project: cwd, scope: "all" }),
    tryHandler("verify-schema-pin",                   { project: cwd }),
    tryHandler("validate-managed-settings-fragments", { project: cwd }),
  ]);

  const results = [ccVersion, docDrift, schemaPin, managedSettings];
  const failCount = results.filter((r) => !r.ok).length;

  const summary = [
    "session-drift-check:",
    ...results.map((r) => `  ${r.ok ? "OK" : "WARN"} ${r.summary}`),
    failCount > 0 ? `${failCount} check(s) could not run — see WARN lines above.` : "all checks passed.",
  ].join("\n");

  try {
    await emit({
      type: "session_drift_check_completed" as "session_started",
      payload: {
        model:  "n/a",
        effort: `failCount=${failCount}`,
      } as { model: string; effort: string },
      toolName:  "SessionStart",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
    });
  } catch { /* best-effort */ }

  return {
    message: `palantir-mini: session_drift_check_completed (failCount=${failCount}, cwd=${path.basename(root)})`,
    additionalContext: summary,
  };
}
