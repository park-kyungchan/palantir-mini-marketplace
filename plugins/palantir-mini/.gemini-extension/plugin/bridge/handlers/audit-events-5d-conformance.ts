// palantir-mini v1.3 — MCP tool handler: audit_events_5d_conformance
// Domain: LEARN (LineageConformancePolicy prim-learn-09 + AppendOnlyEventLog)
//
// Reads events.jsonl and checks each event against the 5D lineage policy.
// Authority chain: rules/10-events-jsonl.md → schemas/ontology/primitives/lineage-conformance-policy.ts

import * as fs from "fs";
import * as path from "path";
import {
  LINEAGE_CONFORMANCE_POLICY_REGISTRY,
  DEFAULT_POLICY,
  SESSION_STARTED_POLICY,
  FOUR_DIM_LIFECYCLE_POLICIES,
} from "#schemas/ontology/primitives/lineage-conformance-policy";
import type { LineageViolation } from "#schemas/ontology/primitives/lineage-conformance-policy";

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

  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) {
    return { eventsScanned: 0, eventTypeStats: {}, violations: [] };
  }

  const raw = fs.readFileSync(eventsPath, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);

  const events: unknown[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as unknown;
      if (typeof parsed !== "object" || parsed === null) continue;
      const ev = parsed as { when?: string };
      if (args.from && ev.when && ev.when < args.from) continue;
      if (args.to && ev.when && ev.when > args.to) continue;
      events.push(parsed);
    } catch {
      // skip malformed lines
    }
  }

  const report = LINEAGE_CONFORMANCE_POLICY_REGISTRY.audit(
    events as Parameters<typeof LINEAGE_CONFORMANCE_POLICY_REGISTRY.audit>[0],
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
