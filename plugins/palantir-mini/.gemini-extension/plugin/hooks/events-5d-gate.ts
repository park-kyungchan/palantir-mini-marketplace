// palantir-mini v1.3 — events-5d-gate hook handler
// Fires on: PreCompact stage 2 (decision: block eligible)
//
// Phase A-3 A4.6: guards context compaction while events.jsonl has
// rule-10 5D conformance violations above threshold (default 10%).
// Invokes audit_events_5d_conformance({project: cwd}).

import * as path from "path";
import { emit } from "../scripts/log";
import { withRuleExcerpt } from "../scripts/rule-excerpt";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

const VIOLATION_THRESHOLD_PCT = 0.10;

async function auditConformance(project: string): Promise<{
  totalEvents: number;
  violationCount: number;
  violationPct: number;
  details: string;
}> {
  const handlerPath = path.resolve(
    import.meta.dirname!,
    "..",
    "bridge",
    "handlers",
    "audit-events-5d-conformance.ts",
  );
  try {
    const mod = await import(handlerPath) as { default?: (a: unknown) => Promise<unknown> };
    if (typeof mod.default !== "function") {
      return { totalEvents: 0, violationCount: 0, violationPct: 0, details: "handler not yet available (A2 pending)" };
    }
    const result = (await mod.default({ project })) as {
      eventsScanned?: number;
      violations?: unknown[];
    } | null;
    if (!result) return { totalEvents: 0, violationCount: 0, violationPct: 0, details: "no result" };
    const total  = result.eventsScanned ?? 0;
    const viols  = result.violations?.length ?? 0;
    const pct    = total > 0 ? viols / total : 0;
    return {
      totalEvents:   total,
      violationCount: viols,
      violationPct:  pct,
      details:       `${viols}/${total} events non-conformant (${(pct * 100).toFixed(1)}%)`,
    };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (msg.includes("Cannot find module") || msg.includes("No such file")) {
      return { totalEvents: 0, violationCount: 0, violationPct: 0, details: "handler not yet available (A2 pending)" };
    }
    return { totalEvents: 0, violationCount: 0, violationPct: 0, details: `audit error: ${msg.slice(0, 80)}` };
  }
}

export default async function events5dGate(payload: unknown): Promise<{
  message: string;
  decision?: "block" | "continue";
  reason?:   string;
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  const audit = await auditConformance(cwd);

  try {
    await emit({
      type:      "validation_phase_completed",
      payload:   {
        phase:       "compile",
        passed:      audit.violationPct <= VIOLATION_THRESHOLD_PCT,
        errorClass:  audit.violationPct > VIOLATION_THRESHOLD_PCT ? "5d_conformance_violations" : undefined,
      },
      toolName:  "PreCompact",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      reasoning: audit.details,
    });
  } catch { /* best-effort */ }

  if (audit.violationPct > VIOLATION_THRESHOLD_PCT) {
    const base = `palantir-mini events-5d-gate: events.jsonl has ${audit.details}. Resolve 5D conformance violations before compaction (rule 10).`;
    const reason = await withRuleExcerpt(base, 10);
    process.stderr.write(`[palantir-mini/events-5d-gate] ${reason}\n`);
    return {
      message:  `palantir-mini: events-5d-gate (blocked, ${audit.details})`,
      decision: "block",
      reason,
    };
  }

  return {
    message:  `palantir-mini: events-5d-gate (continue, ${audit.details})`,
    decision: "continue",
  };
}
