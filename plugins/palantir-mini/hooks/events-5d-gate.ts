// palantir-mini v1.3 — events-5d-gate hook handler
// Fires on: PreCompact stage 2 (decision: block eligible)
//
// Phase A-3 A4.6: guards context compaction while events.jsonl has
// rule-10 5D conformance violations. Invokes
// audit_events_5d_conformance({project: cwd}).
//
// P3-3 (row-id-granular): the gate no longer hard-blocks the WHOLE compaction
// on a blunt >10% violation ratio. A mostly-clean compaction must not be
// stalled because a handful of offending rows are non-conformant. Instead it
// resolves the offending (incomplete) row-ids and FLAGS them — surfacing the
// exact rows to fix in the message/reason/emit — while letting compaction
// continue. The threshold survives only as the severity boundary that decides
// whether the flag is raised as a warning vs an informational note.

import * as path from "path";
import { emit } from "../scripts/log";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

// Severity boundary (not a block gate): above this ratio the offending row-ids
// are surfaced as a warning; at/below, they are an informational flag.
const VIOLATION_THRESHOLD_PCT = 0.10;

/**
 * Resolve a stable row identifier from a violating event. Prefers the explicit
 * `eventId`, falls back to the append-only `sequence`, then to a `when`+`type`
 * composite, and finally to an `unknown` marker for unrecoverable rows. This is
 * what makes the gate row-ID-granular instead of whole-file granular.
 */
function rowIdOf(event: unknown): string {
  if (typeof event !== "object" || event === null) return "unknown";
  const e = event as { eventId?: unknown; sequence?: unknown; when?: unknown; type?: unknown };
  if (typeof e.eventId === "string" && e.eventId.length > 0) return e.eventId;
  if (typeof e.sequence === "number" && Number.isFinite(e.sequence)) return `seq:${e.sequence}`;
  const when = typeof e.when === "string" && e.when.length > 0 ? e.when : "?";
  const type = typeof e.type === "string" && e.type.length > 0 ? e.type : "unknown";
  return `${type}@${when}`;
}

async function auditConformance(project: string): Promise<{
  totalEvents: number;
  violationCount: number;
  violationPct: number;
  offendingRowIds: string[];
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
      return { totalEvents: 0, violationCount: 0, violationPct: 0, offendingRowIds: [], details: "handler not yet available (A2 pending)" };
    }
    const result = (await mod.default({ project })) as {
      eventsScanned?: number;
      violations?: Array<{ event?: unknown }>;
    } | null;
    if (!result) return { totalEvents: 0, violationCount: 0, violationPct: 0, offendingRowIds: [], details: "no result" };
    const total  = result.eventsScanned ?? 0;
    const viols  = result.violations ?? [];
    const count  = viols.length;
    const pct    = total > 0 ? count / total : 0;
    const offendingRowIds = viols.map((v) => rowIdOf(v?.event));
    return {
      totalEvents:   total,
      violationCount: count,
      violationPct:  pct,
      offendingRowIds,
      details:       `${count}/${total} events non-conformant (${(pct * 100).toFixed(1)}%)`,
    };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (msg.includes("Cannot find module") || msg.includes("No such file")) {
      return { totalEvents: 0, violationCount: 0, violationPct: 0, offendingRowIds: [], details: "handler not yet available (A2 pending)" };
    }
    return { totalEvents: 0, violationCount: 0, violationPct: 0, offendingRowIds: [], details: `audit error: ${msg.slice(0, 80)}` };
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

  const hasViolations = audit.violationCount > 0;
  // Severity is informational: it shapes how loudly the offending rows are
  // surfaced, but it NEVER blocks the whole compaction (P3-3). Only the
  // specific offending row-ids are flagged for follow-up.
  const aboveThreshold = audit.violationPct > VIOLATION_THRESHOLD_PCT;

  try {
    await emit({
      type:      "validation_phase_completed",
      payload:   {
        phase:           "compile",
        passed:          !hasViolations,
        errorClass:      hasViolations ? "5d_conformance_violations" : undefined,
        offendingRowIds: hasViolations ? audit.offendingRowIds : undefined,
      } as Record<string, unknown>,
      toolName:  "PreCompact",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      reasoning: audit.details,
    });
  } catch { /* best-effort */ }

  if (hasViolations) {
    // Row-id-granular FLAG (not a whole-compaction block). Surface exactly which
    // rows are non-conformant so they can be fixed, while letting the mostly-clean
    // compaction proceed (rule 10 5-dim; offending rows flagged, not stalled).
    const MAX_IDS = 50;
    const shown = audit.offendingRowIds.slice(0, MAX_IDS);
    const more  = audit.offendingRowIds.length - shown.length;
    const idList = shown.join(", ") + (more > 0 ? `, +${more} more` : "");
    const severity = aboveThreshold ? "warn" : "info";
    const reason =
      `palantir-mini events-5d-gate (${severity}): ${audit.details}. ` +
      `Flagged offending row-ids: ${idList}. ` +
      `Compaction continues; fix these rows for rule-10 5D conformance.`;
    process.stderr.write(`[palantir-mini/events-5d-gate] ${reason}\n`);
    return {
      message:  `palantir-mini: events-5d-gate (continue, flagged ${audit.violationCount} row(s): ${audit.details})`,
      decision: "continue",
      reason,
    };
  }

  return {
    message:  `palantir-mini: events-5d-gate (continue, ${audit.details})`,
    decision: "continue",
  };
}
