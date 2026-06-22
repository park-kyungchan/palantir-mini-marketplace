// palantir-mini — second-brain-fold hook (LEARN lane, Stop, advisory-only shim)
// Fires on: Stop — advisory only, NEVER blocks. This is the THIN cross-repo shim.
//
// PURPOSE: Once-per-session, fold the current session's Claude Code transcript into
// the project's second-brain knowledge graph (Layer-2, graph.json) by subprocess-
// invoking the project's OWN second-brain fold engine, then forwarding the engine's
// emit-ready verdict objects into events.jsonl (Layer-1) via the in-band emit() path.
//
// BOUNDARY (cross-repo engine ⇄ shim):
//   - The ENGINE (<root>/second-brain/scripts/fold.ts) is pure + LLM-DI. It OWNS
//     graph.json, never imports pm, never writes events.jsonl. It prints emit-ready
//     objects to stdout: { verdicts: EmitObj[], summary: EmitObj | null }.
//   - This SHIM is THIN: forward (spawn the engine) + emit (one emit() per object)
//     + never-block. It does NOT compute graph state and does NOT grade events —
//     grading happens in-band inside emit() (the SAME autoGradeEnvelope as Path A).
//
// A Stop hook is a bun child process, NOT the model — it CANNOT call the MCP
// emit_event tool. It MUST use the in-band emit() helper (scripts/log), which runs
// the SAME grader. Never use MCP emit_event; never call appendEventAtomic directly.
//
// Logic:
//   1. Find project root from cwd; skip if none (not a tracked project).
//   2. Gate on `.palantir-mini/` existing; skip if absent.
//   3. ADDITIONAL gate: skip if <root>/second-brain/scripts/fold.ts is absent
//      (no-op on projects without the engine).
//   4. Bypass envvar PALANTIR_MINI_SECOND_BRAIN_FOLD_BYPASS=1 → skip + emit one
//      *_bypass_invoked validation_phase_completed so bypass-budget-monitor audits it.
//   5. Resolve the session transcript path (~/.claude/projects/<slug>/<sessionId>.jsonl);
//      skip if sessionId or the transcript file is missing.
//   6. spawnSync the engine; on non-zero exit → stderr advisory + return (never block).
//   7. JSON.parse stdout; emit() one event per verdict + the summary (best-effort).
//   8. Always returns { message } (Stop hook never blocks).
//
// Cross-ref: hooks/ontology-drift-fold.ts (exact precedent: async, advisory, read-only,
//            in-band emit, bypass-audit branch), scripts/log.ts emit() (Path B).

// @domain: LEARN

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "node:child_process";
import { emit } from "../scripts/log";
import { findProjectRoot } from "../lib/project/find-root";

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

    // 6. Run the engine (subprocess). Never block on failure.
    const run = spawnSync(
      "bun",
      ["run", enginePath, "--transcript", transcript, "--session", sessionId, "--project", root],
      { cwd: root, encoding: "utf8", timeout: 90_000, maxBuffer: 64 * 1024 * 1024 },
    );

    if (run.status !== 0) {
      try {
        process.stderr.write(
          `[palantir-mini/second-brain-fold] engine exited ${run.status} (suppressed): ` +
          `${(run.stderr ?? "").trim() || (run.error?.message ?? "unknown error")}\n`,
        );
      } catch { /* truly silent */ }
      return {
        message: `palantir-mini: second-brain-fold advisory — engine non-zero exit (${run.status}); no fold applied. See stderr.`,
      };
    }

    // 7. Parse stdout + forward verdicts + summary (best-effort each) via the
    //    shared helper, so the session-start sweep path emits identically.
    const skipped = (() => {
      try {
        return (JSON.parse((run.stdout ?? "").trim() || "{}") as EngineResult).skipped === true;
      } catch { return false; }
    })();
    const emitted = await forwardFoldOutput(run.stdout ?? "", root, sessionId);

    if (emitted === 0) {
      return {
        message: `palantir-mini: second-brain-fold OK (nothing to fold${skipped ? " — session already folded" : ""}).`,
      };
    }

    return {
      message:
        `palantir-mini: second-brain-fold OK — forwarded ${emitted} event(s) ` +
        `to events.jsonl (session ${sessionId}).`,
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
