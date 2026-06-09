// palantir-mini v1.3 — MCP tool handler: audit_events_5d_conformance
// Domain: LEARN (LineageConformancePolicy prim-learn-09 + AppendOnlyEventLog)
//
// Reads events.jsonl and checks each event against the 5D lineage policy.
// Authority chain: rules/10-events-jsonl.md → schemas/ontology/primitives/lineage-conformance-policy.ts
//
// XRUN-1 (strict descent): audits via the canonical `isDimensionComplete`
//   predicate so empty sub-objects (throughWhich:{}/byWhom:{}) are flagged.
// XRUN-6 (archive coverage): reads via lib/event-log/read.ts readEvents, which
//   auto-merges archive/events-rotated-*.jsonl, so a post-rotation window no
//   longer masks accumulated non-conformance. Quarantined rows (dropped for
//   missing dimensions) are INCLUDED so they still count in the violation
//   denominator. readEvents has no when-filter, so the time-window filter is
//   re-applied here.

import {
  LINEAGE_CONFORMANCE_POLICY_REGISTRY,
  DEFAULT_POLICY,
  SESSION_STARTED_POLICY,
  FOUR_DIM_LIFECYCLE_POLICIES,
} from "#schemas/ontology/primitives/lineage-conformance-policy";
import type { LineageViolation } from "#schemas/ontology/primitives/lineage-conformance-policy";
import { eventsPathFor } from "../../scripts/log";
import { readEvents } from "../../lib/event-log/read";

// Register default policies
LINEAGE_CONFORMANCE_POLICY_REGISTRY.register(DEFAULT_POLICY);
LINEAGE_CONFORMANCE_POLICY_REGISTRY.register(SESSION_STARTED_POLICY);
for (const policy of FOUR_DIM_LIFECYCLE_POLICIES) {
  LINEAGE_CONFORMANCE_POLICY_REGISTRY.register(policy);
}

interface AuditEvents5dConformanceArgs {
  project: string;
  from?: string;
  to?: string;
}

interface EventTypeStats {
  [eventType: string]: number;
}

interface AuditEvents5dConformanceResult {
  eventsScanned: number;
  eventTypeStats: EventTypeStats;
  violations: Array<{ event: unknown; missingDims: string[] }>;
}

export default async function auditEvents5dConformance(
  rawArgs: unknown,
): Promise<AuditEvents5dConformanceResult> {
  const args = (rawArgs ?? {}) as AuditEvents5dConformanceArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("audit_events_5d_conformance: `project` is required");
  }

  const eventsPath = eventsPathFor(args.project);

  // XRUN-6: readEvents auto-merges live + archive/events-rotated-*.jsonl and,
  // with includeQuarantine, appends rows that were dropped for missing 5-dim
  // fields so they still count in the denominator. Returns [] when neither the
  // live file nor any archive exists.
  const { events: merged } = readEvents(eventsPath, {
    includeArchive: "all",
    includeQuarantine: true,
  });
  if (merged.length === 0) {
    return { eventsScanned: 0, eventTypeStats: {}, violations: [] };
  }

  // Re-apply the when-window filter (readEvents has no time filter).
  // Quarantined rows arrive as QuarantineRecord ({ originalLine, errorClass });
  // recover the underlying envelope from originalLine so they classify by their
  // real type/when. An unrecoverable quarantine row stays as-is — it has no
  // `when`/`type`/dims and is therefore counted as an `unknown`-type violation
  // (a row dropped for missing dimensions, exactly what must stay in the
  // denominator). Such rows have no reliable `when`, so the window filter
  // (which is a no-op when `when` is absent) conservatively keeps them.
  const events: unknown[] = [];
  for (const entry of merged) {
    if (typeof entry !== "object" || entry === null) continue;
    let parsed: unknown = entry;
    const maybeQuarantine = entry as { originalLine?: unknown; errorClass?: unknown };
    if (typeof maybeQuarantine.originalLine === "string" && maybeQuarantine.errorClass !== undefined) {
      try {
        const recovered = JSON.parse(maybeQuarantine.originalLine) as unknown;
        if (typeof recovered === "object" && recovered !== null) parsed = recovered;
      } catch {
        // unrecoverable quarantine row — keep the record as a missing-dims violation
      }
    }
    const ev = parsed as { when?: string };
    if (args.from && ev.when && ev.when < args.from) continue;
    if (args.to && ev.when && ev.when > args.to) continue;
    events.push(parsed);
  }

  // XRUN-1: strict=true descends into throughWhich/byWhom sub-fields so empty
  // sub-objects are flagged (the leak the legacy top-level check let through).
  const report = LINEAGE_CONFORMANCE_POLICY_REGISTRY.audit(
    events as Parameters<typeof LINEAGE_CONFORMANCE_POLICY_REGISTRY.audit>[0],
    true,
  );

  const eventTypeStats: EventTypeStats = {};
  for (const ev of events) {
    const type = (ev as { type?: string }).type ?? "unknown";
    eventTypeStats[type] = (eventTypeStats[type] ?? 0) + 1;
  }

  return {
    eventsScanned: report.eventsScanned,
    eventTypeStats,
    violations: report.violations.map((v: LineageViolation) => ({
      event: v.event,
      missingDims: [...v.missingDims],
    })),
  };
}
