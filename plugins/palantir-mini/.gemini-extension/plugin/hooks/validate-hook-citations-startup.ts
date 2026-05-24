// palantir-mini v4.12.0 — validate-hook-citations-startup hook (sprint-060 W2.2 R6-F11)
// Fires on: SessionStart (advisory, async)
//
// PURPOSE: Run the validate_hook_citations MCP audit at session start so stale
// rule citations are detected without requiring a hook edit to trigger
// rule-citation-validate (PostToolUse:Edit). Closes architecture review §5.I.4:
// "validate_hook_citations currently requires an edit to fire; should be SessionStart
// audit (or daily cron) to detect stale citations proactively."
//
// Behaviour:
//   1. Call validateHookCitations() directly (same logic as the MCP handler).
//   2. If staleCount > 0 → emit advisory + surface in additionalContext.
//   3. Emit validation_phase_completed with errorClass="hook_citation_audit_completed".
//   4. Never blocks — always advisory (async: true).
//
// Authority: rule 22 v1.0.0 §Validation trigger (new session-start path).
// Cross-ref: bridge/handlers/validate-hook-citations.ts (same audit logic).

import { emit } from "../scripts/log";
import validateHookCitations from "../bridge/handlers/validate-hook-citations";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:            string;
  decision?:          "continue";
  additionalContext?: string;
}

export default async function validateHookCitationsStartup(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  let staleCount = 0;
  let auditSummary = "";
  let staleDetail = "";

  try {
    const result = await validateHookCitations(null);
    staleCount = result.forwardMismatches.length + result.reverseMismatches.length;
    auditSummary = result.summary;

    if (staleCount > 0) {
      // Build a concise advisory listing each stale citation.
      const lines: string[] = [
        `=== HOOK CITATION AUDIT (rule 22 — SessionStart) ===`,
        `${staleCount} stale citation(s) detected:`,
        ``,
      ];
      for (const fm of result.forwardMismatches) {
        lines.push(`  [FORWARD] ${fm.hookFile}: rule ${fm.citedRuleId} — ${fm.reason}`);
      }
      for (const rm of result.reverseMismatches) {
        lines.push(`  [REVERSE] rule ${rm.ruleId} (${rm.slug}) ↔ hook "${rm.citedHook}": ${rm.reason}`);
      }
      lines.push(``);
      lines.push(`Fix: update each hook to reference the active rule ID (or remove stale citations).`);
      lines.push(`Detail: pm_rule_query({byId:22}) for fix protocol.`);
      staleDetail = lines.join("\n");
    }
  } catch (err) {
    // Audit failure is non-fatal — advisory never blocks
    const errMsg = err instanceof Error ? err.message : String(err);
    auditSummary = `hook-citation-audit error: ${errMsg}`;
    staleCount = 0;
  }

  // Emit 5-dim event — best-effort, never blocks SessionStart.
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "design",
      passed:     staleCount === 0,
      errorClass: "hook_citation_audit_completed",
    },
    toolName:  "SessionStart",
    cwd,
    sessionId: p.session_id,
    identity:  "monitor",
    memoryLayers: ["procedural", "semantic"],
    reasoning: `sprint-060 W2.2 R6-F11 — SessionStart hook-citation audit per rule 22: staleCount=${staleCount}. ${auditSummary}`,
    hypothesis: "Proactive session-start citation audit catches stale rule references before hooks fire, reducing silent-failure surface.",
    ...(staleCount > 0 ? {
      refinementTarget: {
        kind:            "rule-conformance-policy" as const,
        filePathOrRid:   "hooks/(stale citations — see audit detail)",
        description:     `${staleCount} stale hook citation(s) detected at session start — hooks cite retired or nonexistent rule IDs.`,
        confidenceLevel: "high" as const,
      },
    } : {}),
  }).catch(() => { /* best-effort — never crash SessionStart */ });

  if (staleCount === 0) {
    return {
      message:  `palantir-mini: validate-hook-citations-startup — all citations valid`,
      decision: "continue",
    };
  }

  return {
    message:          `palantir-mini: validate-hook-citations-startup — ${staleCount} stale citation(s) detected (advisory)`,
    decision:         "continue",
    additionalContext: staleDetail,
  };
}
