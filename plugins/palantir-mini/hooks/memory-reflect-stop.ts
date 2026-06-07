// palantir-mini — hooks/memory-reflect-stop.ts
// R-ID A.W5.b — Stop hook: reflect pm-recap digest into MEMORY.md cache block
//
// Fires at session end (Stop). Calls reflectMemoryToCache(projectRoot) from
// lib/runtime-overlay/memory-reflect.ts.
//
// Emits:
//   - memory_reflected (T2) on written: true — session activity visible in MEMORY.md
//   - memory_reflect_skipped (T2 advisory) on written: false with reason
//
// Bypass: env PALANTIR_MINI_MEMORY_REFLECT_DISABLE=1
//
// Authority: plan inherited-discovering-quill.md §4.A.W5
//            rule 02 §Memory (MEMORY.md memory system; session cache block pattern)
//            rule 10 §append-only invariant (events.jsonl only; MEMORY.md is external)
//            the former Lead-Protocol policy §Hook v2 conventions (timeout seconds; advisory async: true)

import { emit } from "../scripts/log";
import { reflectMemoryToCache } from "../lib/runtime-overlay/memory-reflect";

interface HookPayload {
  cwd?: string;
  session_id?: string;
}

interface HookResult {
  message: string;
  decision: "continue";
  reason?: string;
}

export default async function memoryReflectStop(
  payload: unknown,
): Promise<HookResult> {
  // Bypass
  if (process.env.PALANTIR_MINI_MEMORY_REFLECT_DISABLE === "1") {
    return {
      message: "palantir-mini/memory-reflect-stop: skipped (PALANTIR_MINI_MEMORY_REFLECT_DISABLE=1)",
      decision: "continue",
    };
  }

  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  const sessionId = p.session_id;

  let result: Awaited<ReturnType<typeof reflectMemoryToCache>>;
  try {
    result = await reflectMemoryToCache(cwd);
  } catch (err) {
    // best-effort; never block session end
    const msg = err instanceof Error ? err.message : String(err);
    return {
      message: `palantir-mini/memory-reflect-stop: error — ${msg}`,
      decision: "continue",
    };
  }

  if (result.written) {
    // Emit memory_reflected event (T2 episodic — session activity visible in MEMORY.md)
    try {
      await emit({
        type: "phase_completed",
        payload: {
          phaseTag: "memory_reflected",
          taskId: "memory-reflect-stop",
          validations: ["pm-recap-digest-written-to-memory-md"],
        },
        toolName: "Stop",
        cwd,
        sessionId,
        identity: "monitor",
        reasoning: `memory-reflect-stop: MEMORY.md cache block updated (hash changed). Digest: ${result.digest?.slice(0, 80) ?? ""}…`,
        memoryLayers: ["episodic"],
      });
    } catch {
      // best-effort
    }

    return {
      message: `palantir-mini/memory-reflect-stop: MEMORY.md cache block updated`,
      decision: "continue",
    };
  }

  // written: false — emit advisory
  const reason = result.reason;

  // Only emit advisory events for actionable reasons (skip trivial "unchanged")
  if (reason !== "unchanged") {
    try {
      await emit({
        type: "phase_completed",
        payload: {
          phaseTag: "memory_reflect_skipped",
          taskId: "memory-reflect-stop",
          validations: [`skip-reason:${reason}`],
        },
        toolName: "Stop",
        cwd,
        sessionId,
        identity: "monitor",
        reasoning: `memory-reflect-stop: skipped reflection. reason="${reason}". ${
          reason === "no-cache-block"
            ? "Add <!-- pm-recap-cache-start --> / <!-- pm-recap-cache-end --> markers to MEMORY.md once to enable automatic reflection."
            : reason === "no-memory-file"
            ? "MEMORY.md not found at expected path. Set PALANTIR_MINI_MEMORY_PATH to override."
            : ""
        }`,
        memoryLayers: ["episodic"],
      });
    } catch {
      // best-effort
    }
  }

  const reasonMsg =
    reason === "unchanged"
      ? "digest unchanged"
      : reason === "no-cache-block"
      ? "no cache fence in MEMORY.md (add markers manually once)"
      : reason === "no-memory-file"
      ? "MEMORY.md not found"
      : `skipped (${reason})`;

  return {
    message: `palantir-mini/memory-reflect-stop: ${reasonMsg}`,
    decision: "continue",
  };
}
