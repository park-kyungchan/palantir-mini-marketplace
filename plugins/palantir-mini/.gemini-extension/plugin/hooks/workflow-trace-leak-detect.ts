#!/usr/bin/env bun
// palantir-mini — workflow-trace-leak-detect PreCompact hook (PR-10)
//
// Scans <project>/.palantir-mini/session/workflow-traces/*.json.
// For each snapshot where lastEvent !== "closed" AND updatedAt is older than
// 1 hour, emits workflow_trace_leak_detected event.
//
// Advisory only — never exits with non-zero (no blocking).
//
// Rule cross-refs:
//   rule 01 §ForwardProp — traces that never close break the lifecycle chain
//   rule 10 §5-dim       — events carry full envelope + reasoning ≥40 chars
//   rule 26 §A3          — reasoning satisfies A3 (≥40 chars) per rule 26
//
// Authority: foamy-giggling-kettle plan lines 746-787 (PR-10 spec §Hook)

import * as fs from "node:fs";
import * as path from "node:path";
import { emit } from "../scripts/log";

interface PreCompactInput {
  cwd?: string;
  session_id?: string;
}

async function main(): Promise<void> {
  let input: PreCompactInput = {};
  try {
    const raw = fs.readFileSync(0, "utf8");
    input = raw.trim() ? (JSON.parse(raw) as PreCompactInput) : {};
  } catch {
    /* best-effort stdin parse */
  }

  const cwd = input.cwd ?? process.cwd();
  const tracesDir = path.join(cwd, ".palantir-mini", "session", "workflow-traces");

  if (!fs.existsSync(tracesDir)) {
    process.exit(0);
    return;
  }

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const now = Date.now();
  let leakCount = 0;

  let files: string[];
  try {
    files = fs.readdirSync(tracesDir).filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"));
  } catch {
    process.exit(0);
    return;
  }

  for (const file of files) {
    let snapshot: Record<string, unknown>;
    try {
      snapshot = JSON.parse(
        fs.readFileSync(path.join(tracesDir, file), "utf8"),
      ) as Record<string, unknown>;
    } catch {
      continue;
    }

    if (snapshot.lastEvent === "closed") continue;

    const updatedAt = String(snapshot.updatedAt ?? "");
    const t = Date.parse(updatedAt);
    if (Number.isNaN(t)) continue;
    if (now - t < ONE_HOUR_MS) continue;

    leakCount += 1;
    const ageMin = Math.round((now - t) / 60_000);

    try {
      await emit({
        type: "workflow_trace_leak_detected",
        payload: {
          traceId: String(snapshot.traceId ?? ""),
          mode: String(snapshot.mode ?? ""),
          lastEvent: String(snapshot.lastEvent ?? ""),
          updatedAt,
          ageMs: now - t,
        } as Record<string, unknown>,
        toolName: "workflow-trace-leak-detect",
        cwd,
        sessionId: input.session_id,
        identity: "claude-code",
        reasoning:
          `workflow-trace-leak-detect: trace ${snapshot.traceId} still in state ` +
          `${snapshot.lastEvent} after ${ageMin}min without close — ` +
          `PreCompact advisory per PR-10 leak detection; rule 01 §ForwardProp lifecycle invariant`,
        memoryLayers: ["procedural"],
      });
    } catch {
      /* best-effort emit */
    }
  }

  if (leakCount > 0) {
    try {
      process.stderr.write(
        `palantir-mini workflow-trace-leak-detect: ${leakCount} trace(s) unclosed >1h (advisory)\n`,
      );
    } catch {
      /* best-effort stderr */
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
