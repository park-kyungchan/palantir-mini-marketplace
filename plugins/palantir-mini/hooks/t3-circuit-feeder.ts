// palantir-mini v4.11.0 — t3-circuit-feeder hook (rule 26 §Substrate routing T3)
// Fires on: PostToolUse with matcher
//   mcp__plugin_palantir-mini_palantir-mini__emit_event (advisory, async)
//
// Per rule 26 v1.0.0 §Substrate routing line "T3 → +decisions/ subdir (BackProp input)":
//   When the emitted envelope satisfies BOTH:
//     1. valueGrade === "T3"
//     2. withWhat.refinementTarget is well-formed (isRefinementTarget() guard)
//   THEN write the envelope payload to:
//     <sessionRoot>/.palantir-mini/session/decisions/<kind>/<eventId>.json
//   This closes the BackPropagation circuit.
//
// Semantics:
//   - PostToolUse: fires AFTER emit_event completes — envelope is stored in events.jsonl.
//   - Advisory only (async): NEVER blocks. Hook failure exits 0 with error on stderr.
//   - Idempotent: same eventId written twice = no-op (file already exists check).
//   - kind is sanitized to kebab-case from RefinementTargetKind (already kebab-case
//     per schema, but sanitize defensively: lowercase, replace non-alphanumeric with "-").
//
// File layout:
//   <project>/.palantir-mini/session/decisions/<kind>/<eventId>.json
//
// On success, emits validation_phase_completed errorClass="t3_circuit_routed" per rule 10.
//
// Authority: ~/.claude/rules/26-valuable-data-standard.md §Substrate routing
//            ~/.claude/schemas/ontology/primitives/refinement-target.ts
//            ~/.claude/schemas/ontology/primitives/value-grade.ts
//            sprint-059 W1.2 (T-W1.2) — BackProp circuit closure

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";
import {
  isRefinementTarget,
  type RefinementTarget,
} from "#schemas/ontology/primitives/refinement-target";

const TARGET_TOOL = "emit_event";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    project?: string;
    envelope?: {
      type?:       string;
      eventId?:    string;
      when?:       string;
      valueGrade?: string;
      payload?:    Record<string, unknown>;
      withWhat?: {
        reasoning?:        string;
        hypothesis?:       string;
        memoryLayers?:     readonly string[];
        refinementTarget?: unknown;
      };
    };
  };
}

interface HookResult {
  message:           string;
  decision?:         "continue";
  additionalContext?: string;
}

/**
 * Sanitize a RefinementTargetKind string to a safe directory component.
 * RefinementTargetKind is already kebab-case per schema; we defensively
 * lowercase and replace any non-alphanumeric-hyphen chars with "-".
 */
export function sanitizeKind(kind: string): string {
  return kind
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "") || "other";
}

/**
 * Resolve the decisions directory for this project.
 * Layout: <projectRoot>/.palantir-mini/session/decisions/
 */
function decisionsDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "decisions");
}

/**
 * Write a T3 envelope to decisions/<kind>/<eventId>.json atomically.
 * Returns the absolute path written, or null if the file already existed (idempotent).
 */
function writeDecisionFile(
  baseDir: string,
  kind: string,
  eventId: string,
  envelope: NonNullable<HookPayload["tool_input"]>["envelope"],
): string | null {
  const kindDir = path.join(baseDir, sanitizeKind(kind));
  fs.mkdirSync(kindDir, { recursive: true });

  const filePath = path.join(kindDir, `${eventId}.json`);

  // Idempotent: same eventId → no-op
  if (fs.existsSync(filePath)) {
    return null;
  }

  const content = JSON.stringify(
    {
      eventId,
      type:             envelope?.type,
      when:             envelope?.when ?? new Date().toISOString(),
      valueGrade:       "T3",
      refinementTarget: envelope?.withWhat?.refinementTarget,
      payload:          envelope?.payload ?? {},
      withWhat:         envelope?.withWhat,
      _routedAt:        new Date().toISOString(),
      _routedBy:        "t3-circuit-feeder",
    },
    null,
    2,
  );

  // Atomic write: write to tmp file then rename so readers never see partial state.
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, content, "utf8");
  fs.renameSync(tmpPath, filePath);

  return filePath;
}

export default async function t3CircuitFeeder(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const toolName = p.tool_name ?? "";

  // Only intercept emit_event PostToolUse.
  if (normalizePalantirMiniMcpToolName(toolName) !== TARGET_TOOL) {
    return {
      message: `palantir-mini: t3-circuit-feeder skipped (tool=${toolName})`,
      decision: "continue",
    };
  }

  const envelope = p.tool_input?.envelope;
  if (!envelope || !envelope.type) {
    return {
      message: "palantir-mini: t3-circuit-feeder skipped (no envelope)",
      decision: "continue",
    };
  }

  // Gate 1: valueGrade must be T3.
  if (envelope.valueGrade !== "T3") {
    return {
      message: `palantir-mini: t3-circuit-feeder skipped (grade=${envelope.valueGrade ?? "missing"} — only T3 routed)`,
      decision: "continue",
    };
  }

  // Gate 2: withWhat.refinementTarget must be well-formed.
  const rawTarget = envelope.withWhat?.refinementTarget;
  if (!isRefinementTarget(rawTarget)) {
    return {
      message: `palantir-mini: t3-circuit-feeder skipped (T3 but refinementTarget missing or malformed — skipping BackProp route)`,
      decision: "continue",
      additionalContext:
        "[rule 26 §R5] T3 envelope should carry a well-formed refinementTarget to feed BackPropagation. " +
        "Add withWhat.refinementTarget: { kind, filePathOrRid, description, confidenceLevel }.",
    };
  }

  const refinementTarget = rawTarget as RefinementTarget;
  const eventId = envelope.eventId ?? `evt-unknown-${Date.now()}`;
  const projectRoot = p.tool_input?.project ?? p.cwd ?? process.cwd();
  const baseDir = decisionsDir(projectRoot);

  let writtenPath: string | null;
  try {
    writtenPath = writeDecisionFile(baseDir, refinementTarget.kind, eventId, envelope);
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    process.stderr.write(
      `[palantir-mini/t3-circuit-feeder] write failed for eventId=${eventId}: ${msg}\n`,
    );
    return {
      message: `palantir-mini: t3-circuit-feeder write error (${msg})`,
      decision: "continue",
    };
  }

  if (writtenPath === null) {
    // Idempotent no-op: file already existed.
    return {
      message: `palantir-mini: t3-circuit-feeder no-op (eventId=${eventId} already routed)`,
      decision: "continue",
    };
  }

  // Emit validation_phase_completed errorClass="t3_circuit_routed" per rule 10 §5-dim.
  // payload shape is constrained to { phase, passed, errorClass? } — extra context
  // goes into the reasoning field of withWhat.
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "design",
      passed:     true,
      errorClass: "t3_circuit_routed",
    },
    toolName:   "PostToolUse",
    cwd:        projectRoot,
    sessionId:  p.session_id,
    identity:   "monitor",
    memoryLayers: ["procedural", "semantic"],
    reasoning:
      `t3-circuit-feeder: T3 envelope (type=${envelope.type}, eventId=${eventId}) ` +
      `routed to decisions/${sanitizeKind(refinementTarget.kind)}/${eventId}.json — ` +
      `BackPropagation circuit closed per rule 26 §Substrate routing.`,
  }).catch(() => {});

  return {
    message: `palantir-mini: t3-circuit-feeder routed (eventId=${eventId}, kind=${refinementTarget.kind})`,
    decision: "continue",
    additionalContext:
      `[rule 26 §Substrate routing] T3 envelope written to decisions/${sanitizeKind(refinementTarget.kind)}/${eventId}.json`,
  };
}
