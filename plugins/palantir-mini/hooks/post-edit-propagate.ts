// palantir-mini v1 — PostToolUse hook handler
// Fires on: PostToolUse(Edit|Write|MultiEdit)
//
// Responsibilities:
//   1. Append a drift_detected (stale_codegen) event for ontology schema-source edits,
//      DEDUPED per affected file (suppress a repeat while an unresolved drift is pending).
//   2. Trigger CodegenRun (v1) — a REAL lib/codegen/descender-gen.ts invocation, DEBOUNCED
//      so it does not run on every keystroke-edit (and never on the dedupe path).
//   3. Optionally run Post-Write phase drift check.
//
// F1b — a raw schema-source FILE edit makes codegen potentially stale = a DRIFT
// signal, NOT a commit. edit_committed asserts the governed commit path ran and may
// ONLY originate from lib/actions/commit.ts (the ActionType write-back gate, ssot/
// palantir approval-and-lineage = sole edit_committed emitter); forging it here from
// an ungoverned file edit bypasses that gate, so this hook emits drift instead.
//
// rule 08 (codegen authority): pm-codegen is the SOLE writer of src/generated/** with a
// mandatory header. The CodegenRun below delegates to lib/codegen/descender-gen.ts
// (runCodegen), which wraps every generated file with the AUTO-GENERATED header — so this
// hook NEVER writes generated files directly; it only triggers the authoritative writer.

import { emit, eventsPathFor } from "../scripts/log";
import { readEvents } from "../lib/event-log/read";
import { runCodegen } from "../lib/codegen/descender-gen";
import type { EventEnvelope } from "../lib/event-log/types";

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

/** Default CodegenRun debounce window (ms). Overridable for tests/ops. */
const DEFAULT_CODEGEN_DEBOUNCE_MS = 30_000;

function codegenDebounceMs(): number {
  const raw = process.env.PALANTIR_MINI_CODEGEN_DEBOUNCE_MS;
  if (raw === undefined) return DEFAULT_CODEGEN_DEBOUNCE_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CODEGEN_DEBOUNCE_MS;
}

/**
 * (b) Dedup — is a stale_codegen drift for THIS file already pending-unresolved?
 *
 * "Pending-unresolved" = a prior `drift_detected{driftType:"stale_codegen",
 * affectedObjectType:<filePath>}` row exists with a sequence GREATER than the most recent
 * `codegen_completed` (codegen regenerates descendants → resolves the staleness it covers).
 * A repeat drift for the same path while one is still pending is suppressed so rapid
 * multi-edit bursts do not flood the actively-consumed drift lane with duplicates.
 *
 * Reads the SAME events.jsonl the emit below writes to (scripts/log eventsPathFor honors
 * the PALANTIR_MINI_EVENTS_FILE override), so the substrate is the single source of truth —
 * no parallel dedup state file.
 */
function isDriftPendingUnresolved(events: EventEnvelope[], filePath: string): boolean {
  let lastCodegenCompletedSeq = -1;
  let lastStaleDriftSeq = -1;
  for (const ev of events) {
    const seq = ev.sequence ?? 0;
    if (ev.type === "codegen_completed") {
      if (seq > lastCodegenCompletedSeq) lastCodegenCompletedSeq = seq;
    } else if (ev.type === "drift_detected") {
      const p = ev.payload as { driftType?: unknown; affectedObjectType?: unknown };
      if (p?.driftType === "stale_codegen" && p?.affectedObjectType === filePath) {
        if (seq > lastStaleDriftSeq) lastStaleDriftSeq = seq;
      }
    }
  }
  // Pending iff a stale drift for this path exists AND no codegen_completed superseded it.
  return lastStaleDriftSeq > -1 && lastStaleDriftSeq > lastCodegenCompletedSeq;
}

/**
 * (c) CodegenRun debounce — has codegen run within the debounce window already?
 *
 * Reads the most recent `codegen_started` timestamp; if it is within
 * codegenDebounceMs() of now, the run is debounced (skipped) so a keystroke burst does
 * not re-run codegen on every edit. The skipped drift stays pending-unresolved, so the
 * NEXT edit in the burst is deduped at (b).
 */
function isCodegenDebounced(events: EventEnvelope[], nowMs: number): boolean {
  const windowMs = codegenDebounceMs();
  if (windowMs <= 0) return false;
  let lastStartedMs = -1;
  for (const ev of events) {
    if (ev.type !== "codegen_started") continue;
    const t = Date.parse(ev.when as unknown as string);
    if (Number.isFinite(t) && t > lastStartedMs) lastStartedMs = t;
  }
  return lastStartedMs > -1 && nowMs - lastStartedMs < windowMs;
}

export default async function postEditPropagate(payload: unknown): Promise<{ message: string }> {
  const p = (payload ?? {}) as HookPayload;
  const filePath = p.tool_input?.file_path;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "unknown";

  if (!isOntologyFile(filePath)) {
    return { message: "palantir-mini: non-ontology edit, no propagation" };
  }

  const affectedFile = filePath ?? "unknown-file";

  // Read the current event log once for both the dedup (b) and debounce (c) decisions.
  let events: EventEnvelope[] = [];
  try {
    events = readEvents(eventsPathFor(cwd));
  } catch {
    events = [];
  }

  // (b) DEDUP — suppress a repeat drift while one is still pending-unresolved for this path.
  // Skips the CodegenRun too: the pending drift's prior pass already owns the regeneration.
  if (isDriftPendingUnresolved(events, affectedFile)) {
    return {
      message: `palantir-mini: stale_codegen drift already pending for ${affectedFile} — deduped (no repeat drift, no redundant codegen)`,
    };
  }

  try {
    await emit({
      type: "drift_detected",
      payload: {
        driftType: "stale_codegen",
        affectedObjectType: affectedFile,
      },
      toolName,
      cwd,
      sessionId: p.session_id,
      identity: "claude-code",
    });
  } catch (e) {
    return { message: `palantir-mini: emit failed: ${(e as Error).message}` };
  }

  // (c) CodegenRun v1 ForwardProp — a REAL descender-gen invocation, DEBOUNCED.
  // Disable entirely (drift-signal only) via PALANTIR_MINI_CODEGEN_ON_EDIT_DISABLE=1.
  if (process.env.PALANTIR_MINI_CODEGEN_ON_EDIT_DISABLE === "1") {
    return { message: `palantir-mini: drift_detected (stale_codegen) appended for ${affectedFile}; codegen disabled` };
  }
  // Re-read so the just-appended drift is visible; debounce off the codegen_started lane.
  let postDriftEvents: EventEnvelope[] = events;
  try {
    postDriftEvents = readEvents(eventsPathFor(cwd));
  } catch {
    postDriftEvents = events;
  }
  if (isCodegenDebounced(postDriftEvents, Date.now())) {
    return { message: `palantir-mini: drift_detected (stale_codegen) appended for ${affectedFile}; codegen debounced` };
  }
  try {
    const result = await runCodegen({ projectRoot: cwd });
    if (result.errors.length > 0) {
      return {
        message: `palantir-mini: drift_detected (stale_codegen) appended for ${affectedFile}; codegen ran with ${result.errors.length} error(s): ${result.errors[0]}`,
      };
    }
    return {
      message: `palantir-mini: drift_detected (stale_codegen) appended + CodegenRun regenerated ${result.generatedFiles.length} file(s) for ${affectedFile}`,
    };
  } catch (e) {
    // ForwardProp is best-effort — the drift signal already landed; a codegen failure
    // must not mask that the drift was recorded.
    return {
      message: `palantir-mini: drift_detected (stale_codegen) appended for ${affectedFile}; codegen failed: ${(e as Error).message}`,
    };
  }
}
