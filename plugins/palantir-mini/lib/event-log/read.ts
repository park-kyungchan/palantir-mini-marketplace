/**
 * palantir-mini v6.44.0 — Read events.jsonl (orchestrator)
 * @owner palantirkc-plugin-events
 * @purpose Read live + archive event log; foldToSnapshot delegated to ./read/fold-snapshot.
 *
 * v6.44.0: malformed rows quarantined per canonical plan v2 §4 row 4.6.
 * HARD INVARIANT (canonical §10): NEVER blind-delete events.
 */
// Domain: LEARN (prim-learn-01 AppendOnlyEventLog) + LOGIC (prim-logic-05 Reducer)

import * as fs from "fs";
import * as path from "path";
import type { EventEnvelope } from "./types";
import { quarantineMalformedRow, readQuarantine } from "./quarantine";

export { foldToSnapshot } from "./read/fold-snapshot";
export { readQuarantine, readQuarantineManifest } from "./quarantine";

const HARD_REQUIRED_FIELDS = ["when", "atopWhich", "throughWhich", "byWhom"] as const;

function validateEnvelope(obj: unknown): { valid: boolean; missingField?: string } {
  if (typeof obj !== "object" || obj === null) {
    return { valid: false, missingField: "(not an object)" };
  }
  for (const field of HARD_REQUIRED_FIELDS) {
    const val = (obj as Record<string, unknown>)[field];
    if (val === undefined || val === null) {
      return { valid: false, missingField: field };
    }
  }
  return { valid: true };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : undefined;
}

function stringField(source: Record<string, unknown> | undefined, field: string): string | undefined {
  const value = source?.[field];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function isLegacyRuntimeGapEvent(obj: Record<string, unknown>): boolean {
  const type = stringField(obj, "type") ?? "";
  if (type.includes("runtime_gap") || type.includes("runtime-gap")) return true;

  const payload = asRecord(obj.payload);
  const status = stringField(payload, "status") ?? "";
  const errorClass = stringField(payload, "errorClass") ?? "";
  const reason = stringField(payload, "reason") ?? "";
  return [status, errorClass, reason].some((value) =>
    value.toLowerCase().includes("runtime-gap") ||
    value.toLowerCase().includes("runtime gap") ||
    value.toLowerCase().includes("runtime_gap"),
  );
}

function reconcileLegacyRuntimeGapWithWhat(obj: Record<string, unknown>): EventEnvelope {
  if (obj.withWhat !== undefined || !isLegacyRuntimeGapEvent(obj)) {
    return obj as unknown as EventEnvelope;
  }

  const payload = asRecord(obj.payload);
  const byWhom = asRecord(obj.byWhom);
  const runtime =
    stringField(payload, "runtime") ??
    stringField(byWhom, "runtime") ??
    stringField(byWhom, "identity") ??
    "unknown";
  const reason = stringField(payload, "reason") ?? stringField(payload, "errorClass") ?? "runtime gap";
  const type = stringField(obj, "type") ?? "unknown";

  return {
    ...obj,
    withWhat: {
      reasoning:
        `readEvents reconciled legacy runtime-gap event without rewriting source log; ` +
        `type=${type}; runtime=${runtime}; reason=${reason}`,
      hypothesis:
        "Legacy runtime-gap events remain queryable through Decision Lineage without mutating append-only events.jsonl.",
      memoryLayers: ["procedural"],
      refinementTarget: {
        kind: "rule-conformance-policy",
        filePathOrRid: "rule 26 §R5 runtime-gap legacy reconciliation",
        description: "Legacy runtime-gap event lacked withWhat and was enriched in memory only.",
        confidenceLevel: "medium",
      },
    },
  } as unknown as EventEnvelope;
}

export interface ReadEventsOptions {
  includeArchive?: "all" | "live-only" | "archive-only";
  since?: number;
  includeQuarantine?: boolean;
}

export interface ReadEventsResult {
  events: EventEnvelope[];
  archiveCount: number;
}

export function readEvents(eventsPath: string): EventEnvelope[];
export function readEvents(eventsPath: string, options: ReadEventsOptions): ReadEventsResult;
export function readEvents(
  eventsPath: string,
  options?: ReadEventsOptions,
): EventEnvelope[] | ReadEventsResult {
  const mode              = options?.includeArchive ?? "all";
  const since             = options?.since;
  const includeQuarantine = options?.includeQuarantine ?? false;

  const sessionDir     = path.dirname(eventsPath);
  const archiveDirPath = path.join(sessionDir, "archive");

  const liveExists    = fs.existsSync(eventsPath);
  const archiveExists = fs.existsSync(archiveDirPath);

  if (!liveExists && !archiveExists) {
    if (options !== undefined) {
      const quarantined = includeQuarantine
        ? (readQuarantine(sessionDir) as unknown as EventEnvelope[])
        : [];
      return { events: quarantined, archiveCount: 0 };
    }
    return [];
  }

  const all: EventEnvelope[] = [];
  let archiveCount = 0;

  function parseLine(line: string, lineNumber: number, sourceFile: string): void {
    if (line.trim().length === 0) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      try {
        quarantineMalformedRow({
          sessionDir,
          originalLine: line,
          lineNumber,
          sourceFile,
          errorClass:   "json_parse_error",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      } catch { /* best-effort */ }
      return;
    }

    const validation = validateEnvelope(parsed);
    if (!validation.valid) {
      try {
        quarantineMalformedRow({
          sessionDir,
          originalLine: line,
          lineNumber,
          sourceFile,
          errorClass:   "missing_required_field",
          errorMessage: `Missing required 5-dim field: ${validation.missingField}`,
        });
      } catch { /* best-effort */ }
      return;
    }

    all.push(reconcileLegacyRuntimeGapWithWhat(parsed as Record<string, unknown>));
  }

  if (mode !== "archive-only" && liveExists) {
    const content = fs.readFileSync(eventsPath, "utf8");
    content.split("\n").forEach((line, idx) => parseLine(line, idx + 1, eventsPath));
  }

  if (mode !== "live-only" && archiveExists) {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(archiveDirPath)
        .filter((f) => f.startsWith("events-rotated-") && f.endsWith(".jsonl"))
        .sort();
    } catch { /* best-effort */ }
    archiveCount = entries.length;
    for (const f of entries) {
      const archivePath = path.join(archiveDirPath, f);
      try {
        const content = fs.readFileSync(archivePath, "utf8");
        content.split("\n").forEach((line, idx) => parseLine(line, idx + 1, archivePath));
      } catch { /* skip unreadable archive file */ }
    }
  }

  all.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const filteredEvents = since !== undefined
    ? all.filter((e) => (e.sequence ?? 0) >= since)
    : all;

  const result = includeQuarantine
    ? [...filteredEvents, ...(readQuarantine(sessionDir) as unknown as EventEnvelope[])]
    : filteredEvents;

  if (options !== undefined) {
    return { events: result, archiveCount };
  }
  return result;
}
