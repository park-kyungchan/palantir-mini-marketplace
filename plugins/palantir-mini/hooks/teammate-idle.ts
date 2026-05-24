// palantir-mini v1.2 — TeammateIdle hook handler
// Fires on: TeammateIdle (agent idle event from Claude Code v2.1.110+)
//
// v1.2 (2026-04-20, post-monitor-purge):
//   - drift-watch subprocess trigger REMOVED. Prior execSync("bun run drift-watch.ts --once")
//     blocked the hook for 10s per idle event, spawned setInterval daemons that survived
//     timeout (drift-watch had no --once branch), and caused WSL vmmem CPU >100% → crash.
//     Drift checks are now on-demand via MCP (detect_doc_drift, verify_schema_pin,
//     verify_codegen_headers) surfaced through /palantir-mini:pm-verify.
// v1.1 (Phase A-2 W2-2 defect #4):
//   - Auto-shutdown: idleCount >= 3 && blockedByDepth > 1 ⇒ shutdown_request.
//
// See rule 12 §Lazy-spawn + shutdown, rule 12 §Team default + Lazy-spawn,
// feedback_monitors-permanently-disabled.md.

import { emit } from "../scripts/log";

interface HookPayload {
  agent_id?:          string;
  idle_count?:        number;
  blocked_by_depth?:  number;
  session_id?:        string;
  cwd?:               string;
}

export const AUTO_SHUTDOWN_IDLE_THRESHOLD    = 3;
export const AUTO_SHUTDOWN_BLOCKED_THRESHOLD = 1;

export default async function teammateIdle(payload: unknown): Promise<{ message: string; additionalContext?: string }> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const idleCount = p.idle_count ?? 0;
  const blockedByDepth = p.blocked_by_depth ?? 0;
  const agentId = p.agent_id ?? "unknown";

  try {
    await emit({
      type: "teammate_idle",
      payload: {
        agentId,
        idleCount,
      },
      toolName:  "TeammateIdle",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
    });
  } catch {
    // best-effort
  }

  // Auto-shutdown gate (defect #4 remediation)
  let shutdownContext = "";
  if (idleCount >= AUTO_SHUTDOWN_IDLE_THRESHOLD && blockedByDepth > AUTO_SHUTDOWN_BLOCKED_THRESHOLD) {
    try {
      await emit({
        type: "shutdown_request",
        payload: {
          agentId,
          reason:         "auto-idle-shutdown",
          idleCount,
          blockedByDepth,
        },
        toolName:  "TeammateIdle",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: `idleCount=${idleCount} >= ${AUTO_SHUTDOWN_IDLE_THRESHOLD} && blockedByDepth=${blockedByDepth} > ${AUTO_SHUTDOWN_BLOCKED_THRESHOLD}`,
      });
      shutdownContext = `auto-shutdown requested (agent=${agentId}, idle=${idleCount}, depth=${blockedByDepth})`;
    } catch {
      // best-effort — never block on shutdown emit failure
    }
  }

  // v1.2: drift-watch subprocess trigger intentionally removed.
  // Drift detection is on-demand via /palantir-mini:pm-verify (MCP handlers).

  return {
    message: `palantir-mini: teammate_idle recorded (agent=${agentId}, idleCount=${idleCount}, blockedByDepth=${blockedByDepth})`,
    ...(shutdownContext.length > 0 ? { additionalContext: shutdownContext } : {}),
  };
}
