// palantir-mini v3.7.0 — hooks/rule-audit/mode-citation.ts
// Citation mode: PostToolUse:Edit on hooks/*.ts, advisory stale rule citation check.
// Extracted from rule-audit.ts during A.1 decomposition.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../../scripts/log";
import { CITATION_REGEX, loadKnownRules } from "./shared";
import type { HookPayload, HookResult } from "./types";

export async function runCitationMode(payload: HookPayload): Promise<HookResult> {
  const cwd = payload.cwd ?? process.cwd();
  const edited = payload.tool_input?.file_path;

  if (!edited || !/hooks\/.*\.ts$/.test(edited)) {
    return {
      message: "palantir-mini: rule-audit (mode=citation) skipped (non-hook file)",
      decision: "continue",
    };
  }

  if (!fs.existsSync(edited)) {
    return {
      message: "palantir-mini: rule-audit (mode=citation) skipped (edited file missing)",
      decision: "continue",
    };
  }

  const source = fs.readFileSync(edited, "utf8");
  const knownRules = await loadKnownRules();
  if (!knownRules) {
    return {
      message: "palantir-mini: rule-audit (mode=citation) skipped (registry unavailable)",
      decision: "continue",
    };
  }

  const citations = new Set<number>();
  let m: RegExpExecArray | null;
  CITATION_REGEX.lastIndex = 0;
  while ((m = CITATION_REGEX.exec(source)) !== null) {
    const n = parseInt(m[1] ?? "0", 10);
    if (!isNaN(n) && n > 0) citations.add(n);
  }

  const findings: string[] = [];
  for (const id of citations) {
    const rule = knownRules.get(id);
    if (!rule) {
      findings.push(`rule ${id}: not in registry (never existed or deleted)`);
    } else if (rule.supersededBy !== null) {
      findings.push(`rule ${id}: retired → supersededBy rule ${rule.supersededBy}`);
    }
  }

  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "post_write",
        passed: findings.length === 0,
        errorClass: findings.length > 0 ? "stale_rule_citation" : undefined,
      },
      toolName: "PostToolUse",
      cwd,
      sessionId: payload.session_id,
      identity: "monitor",
      reasoning:
        findings.length === 0
          ? `rule-audit (citation): ${citations.size} citation(s) all resolve`
          : `rule-audit (citation): ${findings.length} stale citation(s) in ${path.basename(edited)}`,
    });
  } catch {
    // best-effort
  }

  if (findings.length === 0) {
    return {
      message: `palantir-mini: rule-audit (mode=citation) OK (${citations.size} citations resolved)`,
      decision: "continue",
    };
  }

  const advisory = [
    `palantir-mini: rule-audit (mode=citation) — ${findings.length} stale rule citation(s) in ${path.basename(edited)}:`,
    ...findings.map((f) => `  - ${f}`),
    ``,
    `Update citations or replace with supersedor; see rules/CONTEXT.md §10 anti-pattern 9.`,
  ].join("\n");

  process.stderr.write(`[palantir-mini/rule-audit] ${advisory}\n`);
  return {
    message: `palantir-mini: rule-audit (mode=citation, advisory, ${findings.length} stale)`,
    decision: "continue",
    reason: advisory,
  };
}
