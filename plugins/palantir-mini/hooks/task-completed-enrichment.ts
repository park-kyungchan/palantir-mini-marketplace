// palantir-mini v4.14.0 — task-completed-enrichment hook (sprint-062 W6-β C5)
// Fires on: PostToolUse(TaskUpdate) — async advisory, NEVER blocks
//
// PURPOSE: Claude Code's native TaskUpdate(status=completed) calls lack
// withWhat (reasoning + memoryLayers), producing 5-dim violations (rule 10).
// Sprint-060 audit found 22 of 5144 events were TaskCompleted envelopes
// missing withWhat. This hook synthesizes a withWhat envelope from the task
// context and emits a paired validation_phase_completed event.
//
// Logic:
//   1. Read stdin PostToolUse JSON payload.
//   2. If tool_name !== "TaskUpdate" OR tool_input.status !== "completed" → no-op.
//   3. Synthesize withWhat:
//      reasoning: "<task subject/description> → completed"
//      memoryLayers: ["procedural"]
//      refinementTarget: (inferred from task type when discernible)
//   4. Emit validation_phase_completed errorClass="task_completed_enriched".
//   5. Always exit 0 (advisory; never blocks).
//
// Authority:
//   rule 10 (events-jsonl) — 5-dim envelope invariant; closes 22 of 5144 violations
//   rule 26 (valuable-data-standard) §Axis E memory-mapped
//   sprint-062 plan §Phase 7 C5 + sprint-060 P1 carry-over audit (R1-F8)

// @domain: ACTION

import { emit } from "../scripts/log";

// ─── Input types ──────────────────────────────────────────────────────────────

interface TaskUpdateInput {
  taskId?:      string;
  status?:      string;
  /** Short task title or subject (1 line). */
  subject?:     string;
  /** Longer task body / description. */
  description?: string;
}

interface HookPayload {
  tool_name?:    string;
  tool_input?:   TaskUpdateInput;
  tool_result?:  unknown;
  session_id?:   string;
  cwd?:          string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Infer a procedural refinementTarget from task subject.
 * Heuristic: look for keywords in the subject to categorize.
 */
function inferRefinementTarget(
  subject: string | undefined,
  description: string | undefined,
): { kind: "other"; filePathOrRid: string; description: string; confidenceLevel: "low" } | undefined {
  const combined = `${subject ?? ""} ${description ?? ""}`.toLowerCase();

  // Heuristic: emit a refinement target only when the task is clearly
  // implementation work (hook, skill, etc.). kind is always "other" since
  // "hook" and "skill" are not valid RefinementTargetKind values.
  if (
    combined.includes("hook") ||
    combined.includes("skill") ||
    combined.includes("/palantir-mini:") ||
    combined.includes("implement") ||
    combined.includes("handler")
  ) {
    return {
      kind:            "other" as const,
      filePathOrRid:   subject ?? "task",
      description:     `task completed: ${subject ?? "implementation task"}`,
      confidenceLevel: "low",
    };
  }
  return undefined;
}

/**
 * Trim a string to at most maxChars characters, appending ellipsis if truncated.
 */
function truncate(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars - 3) + "...";
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Read PostToolUse payload from stdin
  let rawInput = "";
  try {
    for await (const chunk of process.stdin) rawInput += chunk;
  } catch {
    process.exit(0); // stdin read error — exit silently
  }

  let payload: HookPayload = {};
  try {
    payload = JSON.parse(rawInput) as HookPayload;
  } catch {
    // Malformed input — advisory hook never blocks
    process.exit(0);
  }

  // Only fire on TaskUpdate(status=completed)
  if (payload.tool_name !== "TaskUpdate") {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const input = payload.tool_input ?? {};
  if (input.status !== "completed") {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const cwd = payload.cwd ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  const sessionId = payload.session_id;

  // Synthesize withWhat.reasoning from available task context
  const subjectPart = input.subject ?? `task ${input.taskId ?? "(unknown)"}`;
  const descPart = input.description
    ? ` — ${truncate(input.description, 120)}`
    : "";
  const reasoning =
    `${subjectPart} → completed${descPart}. ` +
    `TaskUpdate status=completed enriched by task-completed-enrichment hook; ` +
    `closes sprint-060 P1 C5 5-dim violation (rule 10 withWhat missing).`;

  const refinementTarget = inferRefinementTarget(input.subject, input.description);

  // Emit enrichment event
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase:      "runtime",
        passed:     true,
        errorClass: "task_completed_enriched",
      },
      toolName: "TaskUpdate",
      cwd,
      sessionId,
      identity: "claude-code",
      memoryLayers: ["procedural"],
      reasoning,
      ...(refinementTarget !== undefined ? { refinementTarget } : {}),
    });
  } catch {
    // best-effort — advisory hook never blocks on emit failure
    try {
      process.stderr.write(
        "[palantir-mini/task-completed-enrichment] emit failed (suppressed)\n",
      );
    } catch { /* truly silent */ }
  }

  // Advisory — always continue
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}

if (import.meta.main) {
  main().catch((err) => {
    process.stderr.write(
      `[task-completed-enrichment] error: ${String(err)}\n`,
    );
    process.exit(0); // Advisory — never block on failure
  });
}
