// palantir-mini — second-brain-fold hook (LEARN lane, Stop, deterministic bookmark)
// Fires on: Stop — advisory only, NEVER blocks.
//
// LOCUS (P1-2): Stop hook = deterministic detect+bookmark ONLY. The LLM fold runs
// on the model turn, triggered by SessionStart additionalContext, via a native
// subagent (palantir-mini:second-brain-fold) + the MCP emit_event path. This hook
// NEVER spawns the engine and NEVER does LLM work.
//
// WHY THE SHIFT: a Stop hook is a detached bun child process, NOT the model — it
// CANNOT call the model or the MCP emit_event tool. The prior design spawned the
// engine here and forwarded verdicts via the in-band emit() path (identity
// "monitor", bypassing the pretool-emit-event-value gate). The model-driven locus
// (a) keeps the heavy/fragile LLM work off the hot Stop path (15s fs-only vs 120s
// engine-spawn), and (b) routes the emit through the gated MCP path with the real
// runtime identity. See agents/second-brain-fold.md + hooks/session-start.ts.
//
// Logic (NO LLM, NO engine spawn):
//   1. Find project root from cwd; skip if none (not a tracked project).
//   2. Gate on `.palantir-mini/` existing; skip if absent.
//   3. ADDITIONAL gate: skip if <root>/second-brain/scripts/fold.ts is absent
//      (no-op on projects without the engine).
//   4. Bypass envvar PALANTIR_MINI_SECOND_BRAIN_FOLD_BYPASS=1 → skip + emit one
//      *_bypass_invoked validation_phase_completed so bypass-budget-monitor audits
//      it (returns BEFORE markPending, so a bypassed session is never queued).
//   5. Resolve the session transcript path (~/.claude/projects/<slug>/<sessionId>.jsonl);
//      skip if sessionId or the transcript file is missing.
//   6. markPending(...) — deterministically bookmark this session for the
//      model-driven fold (atomic fs write; no engine, no LLM).
//   7. Always returns { message } (Stop hook never blocks).
//
// forwardFoldOutput (below) is KEPT + EXPORTED as the version-fallback engine-stdout
// -> Path-B helper (P2-9/F9). It is no longer called from the Stop path.
//
// Cross-ref: lib/second-brain/pending-fold.ts (the bookmark), hooks/session-start.ts
//            (detect+inject), agents/second-brain-fold.md (the model-driven fold).

// @domain: LEARN

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot } from "../lib/project/find-root";
import { markPending } from "../lib/second-brain/pending-fold";
import { resolveHostRuntimeIdentity } from "../lib/runtime/identity";

/** Bypass envvar — turns this fold lane OFF for a project/session (audited). */
const SECOND_BRAIN_FOLD_BYPASS = "PALANTIR_MINI_SECOND_BRAIN_FOLD_BYPASS";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message: string;
}

/** One emit-ready object as printed by the engine's stdout contract. */
interface EngineEmitObj {
  type:             string;
  payload:          Record<string, unknown>;
  memoryLayers?:    readonly ("working" | "episodic" | "semantic" | "procedural")[];
  hypothesis?:      string;
  refinementTarget?: {
    kind:            string;
    filePathOrRid:   string;
    description:     string;
    confidenceLevel: string;
  };
}

interface EngineResult {
  verdicts?: EngineEmitObj[];
  summary?:  EngineEmitObj | null;
  skipped?:  boolean;
}

/** Best-effort forward of ONE engine emit-ready object into events.jsonl (Path B). */
async function forward(obj: EngineEmitObj, root: string, sessionId: string): Promise<void> {
  try {
    await emit({
      type:             obj.type as never,
      payload:          obj.payload as never,
      toolName:         "Stop",
      cwd:              root,
      sessionId,
      identity:         "monitor",
      memoryLayers:     obj.memoryLayers,
      hypothesis:       obj.hypothesis,
      refinementTarget: obj.refinementTarget as never,
    });
  } catch { /* best-effort — Stop hook never blocks */ }
}

/**
 * Forward the engine's stdout into events.jsonl (Path B): JSON.parse the engine
 * `{ verdicts, summary }` contract and emit() one event per verdict + the summary.
 * Returns the number of events emitted (verdicts + summary). Best-effort throughout —
 * a parse failure (or any forward error) emits nothing and returns 0; the caller never
 * blocks. This is the SAME forwarding the Stop shim performs, hoisted so the
 * session-start crash-recovery sweep can reuse it for Layer-1 parity.
 */
export async function forwardFoldOutput(stdout: string, root: string, sessionId: string): Promise<number> {
  let result: EngineResult;
  try {
    result = JSON.parse((stdout ?? "").trim() || "{}") as EngineResult;
  } catch (e) {
    try {
      process.stderr.write(
        `[palantir-mini/second-brain-fold] could not parse engine stdout (suppressed): ${(e as Error).message}\n`,
      );
    } catch { /* truly silent */ }
    return 0;
  }

  const verdicts = Array.isArray(result.verdicts) ? result.verdicts : [];
  for (const v of verdicts) {
    await forward(v, root, sessionId);
  }
  let summaryForwarded = 0;
  if (result.summary) {
    await forward(result.summary, root, sessionId);
    summaryForwarded = 1;
  }
  return verdicts.length + summaryForwarded;
}

export default async function secondBrainFold(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const sessionId = p.session_id;

  try {
    // 1. Find project root
    const root = findProjectRoot(cwd);
    if (!root) {
      return { message: "palantir-mini: second-brain-fold skipped (not a tracked project)" };
    }

    // 2. Gate on .palantir-mini/ existing
    if (!fs.existsSync(path.join(root, ".palantir-mini"))) {
      return { message: "palantir-mini: second-brain-fold skipped (no .palantir-mini/)" };
    }

    // 3. Engine-existence gate — no-op on projects without the second-brain engine
    const enginePath = path.join(root, "second-brain", "scripts", "fold.ts");
    if (!fs.existsSync(enginePath)) {
      return { message: "palantir-mini: second-brain-fold skipped (no second-brain engine)" };
    }

    // 4. Bypass envvar → skip + audit (so bypass-budget-monitor counts it)
    if (process.env[SECOND_BRAIN_FOLD_BYPASS] === "1") {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: { phase: "design", passed: true, errorClass: "second_brain_fold_bypass_invoked" },
          toolName: "Stop",
          cwd:      root,
          sessionId,
          identity: "monitor",
          memoryLayers: ["episodic", "procedural"],
          reasoning: `second-brain-fold: ${SECOND_BRAIN_FOLD_BYPASS}=1 set — memory fold skipped for this session.`,
        });
      } catch { /* best-effort */ }
      return { message: `palantir-mini: second-brain-fold skipped (${SECOND_BRAIN_FOLD_BYPASS}=1)` };
    }

    // 5. Resolve transcript path: slug = root absolute path with every "/" → "-"
    if (!sessionId) {
      return { message: "palantir-mini: second-brain-fold skipped (no session_id)" };
    }
    const slug = path.resolve(root).split(path.sep).join("-");
    const transcript = path.join(os.homedir(), ".claude", "projects", slug, sessionId + ".jsonl");
    if (!fs.existsSync(transcript)) {
      return { message: `palantir-mini: second-brain-fold skipped (no transcript at ${transcript})` };
    }

    // 6. Deterministically bookmark this session for the model-driven fold (NO LLM,
    //    no engine spawn). The model-driven fold subagent clears it on success;
    //    SessionStart reads it to decide whether to inject the fold trigger.
    markPending(root, {
      sessionId,
      transcriptPath: transcript,
      bookmarkedAt:   new Date().toISOString(),
      runtime:        resolveHostRuntimeIdentity(),
    });

    return {
      message: `palantir-mini: second-brain-fold bookmarked session ${sessionId} for model-driven fold (no LLM at Stop).`,
    };

  } catch (err) {
    // Never fail the hook — always allow through
    const errMsg = (err as Error).message ?? String(err);
    try {
      process.stderr.write(
        `[palantir-mini/second-brain-fold] unexpected error (suppressed): ${errMsg}\n`,
      );
    } catch { /* truly silent */ }
    return {
      message: `palantir-mini: second-brain-fold error suppressed (${errMsg})`,
    };
  }
}
