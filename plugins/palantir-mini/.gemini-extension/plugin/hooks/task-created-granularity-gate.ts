// palantir-mini v1.3 — TaskCreated hook: task-created-granularity-gate
// Fires on: TaskCreated (Blocking)
//
// Phase A-3 A9.2: enforces rule 12 §Task granularity on task creation.
// Required: 4 section markers (DELETE/ADD/KEEP/VERIFY) + ≥1 absolute file path
// + VERIFY step contains a runnable command.
// Warns if ≥3 distinct file paths (potential multi-file violation).

import * as path from "path";
import { emit } from "../scripts/log";

interface HookPayload {
  task_id?:     string;
  subject?:     string;
  description?: string;
  session_id?:  string;
  cwd?:         string;
}

const SECTION_RE = /\b(DELETE|ADD(?:\/MODIFY)?|KEEP|VERIFY)\b/gi;
const FILE_PATH_RE = /\/home\/palantirkc\/[\w\-./]+\.(?:ts|tsx|md|json|jsonl)/g;
const RUNNABLE_CMD_RE = /\b(?:bun|bunx|grep|jq|ls|test)\b/;

export interface GranularityCheckResult {
  violations:  string[];
  warnings:    string[];
}

export function checkGranularity(description: string): GranularityCheckResult {
  const violations: string[] = [];
  const warnings:   string[] = [];

  // Required sections (case-insensitive)
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const sectionRe = /\b(DELETE|ADD(?:\/MODIFY)?|KEEP|VERIFY)\b/gi;
  while ((m = sectionRe.exec(description)) !== null) {
    const tag = m[1]!.toUpperCase().replace("/MODIFY", "");
    found.add(tag);
  }
  for (const required of ["DELETE", "ADD", "KEEP", "VERIFY"]) {
    if (!found.has(required)) {
      violations.push(`Missing required section: ${required}`);
    }
  }

  // ≥1 absolute file path
  const filePaths = description.match(FILE_PATH_RE) ?? [];
  if (filePaths.length === 0) {
    violations.push("Missing ≥1 absolute file path (/home/palantirkc/... with .ts/.tsx/.md/.json/.jsonl extension)");
  }

  // Warn if ≥3 distinct paths
  const distinctPaths = new Set(filePaths);
  if (distinctPaths.size >= 3) {
    warnings.push(`${distinctPaths.size} distinct file paths detected — potential multi-file violation (rule 12 §Task granularity). Add explicit barrel/index exception if intentional.`);
  }

  // VERIFY step must contain a runnable command
  const verifyMatch = /\bVERIFY\b.*$/im.exec(description);
  if (verifyMatch && !RUNNABLE_CMD_RE.test(verifyMatch[0])) {
    violations.push("VERIFY step must include a runnable command (bun, bunx, grep, jq, ls, or test)");
  }

  return { violations, warnings };
}

export default async function taskCreatedGranularityGate(payload: unknown): Promise<{
  message:   string;
  decision?: "block" | "continue";
  reason?:   string;
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const description = p.description ?? "";

  if (!description.trim()) {
    return { message: "palantir-mini: task-created-granularity-gate — no description, skipped", decision: "continue" };
  }

  const { violations, warnings } = checkGranularity(description);

  if (warnings.length > 0) {
    process.stderr.write(`[palantir-mini/task-created-granularity-gate] WARN task=${p.task_id}: ${warnings.join("; ")}\n`);
  }

  if (violations.length > 0) {
    const base = [
      `palantir-mini task-created-granularity-gate: task "${p.subject ?? p.task_id}" violates rule 12 §Task granularity:`,
      ...violations.map((v) => `  - ${v}`),
      "See ~/.claude/rules/12-lead-protocol-v2.md §Task granularity",
    ].join("\n");
    const { withRuleExcerpt } = await import("../scripts/rule-excerpt");
    const reason = await withRuleExcerpt(base, 12);
    process.stderr.write(`[palantir-mini/task-created-granularity-gate] ${reason}\n`);

    try {
      await emit({
        type:      "validation_phase_completed",
        payload:   { phase: "design", passed: false, errorClass: "task_granularity_violation" },
        toolName:  "TaskCreated",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: violations.join("; "),
      });
    } catch { /* best-effort */ }

    return {
      message:  `palantir-mini: task-created-granularity-gate (blocked, ${violations.length} violation(s))`,
      decision: "block",
      reason,
    };
  }

  return {
    message:  `palantir-mini: task-created-granularity-gate (continue, task=${p.task_id ?? "unknown"})`,
    decision: "continue",
  };
}
