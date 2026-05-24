// palantir-mini v1.36 — post-edit-verifier-suggest hook (sprint-028 W3.1)
// Fires on: PostToolUse (Edit|Write|MultiEdit; advisory, async)
//
// Suggests Lead spawn `verifier-correctness` + `verifier-adversarial` in
// parallel after a meaningful edit. Closes Agent #4 audit gap (researcher
// 2026-05-06): 15 edit_committed events across 3 projects → 0 verifier
// spawns (0% coverage) despite both agents' frontmatter mandating
// "use proactively after any teammate completes a task".
//
// Mode: ADVISORY only (never blocks). Heuristic: only suggest when the edit
// targets a non-trivial code path (not events.jsonl, not docs-only patterns).
//
// Authority: rule 12 v3.3.0 §Briefing template + rule 16 v4.0.0 §Default-On Policy.
//            agent-system-design.md:312-314 + skill-agent-audit-v1.5.md:96-97.

import * as path from "path";
import { emitSkillSuggestion } from "../lib/skill-suggestion-emit";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    file_path?: string;
    paths?:     string[];
  };
}

interface HookResult {
  message:           string;
  decision?:         "continue";
  additionalContext?: string;
}

/**
 * Filter trivial edit targets where verifier review adds noise rather than
 * value: append-only logs, tool-results dumps, .palantir-mini/ session
 * artifacts, plain docs (NEW: more conservative than W1.8).
 */
function isTrivialEdit(filePath: string): boolean {
  if (!filePath) return true;
  const trivialPatterns = [
    /events\.jsonl$/,
    /\.palantir-mini\/session\//,
    /\.palantir-mini\/harness\/sprints\/.*\/iterations\/.*(?:generator-state|feedback-\d+|analysis-\d+)\.md$/,
    /\.claude\/projects\/.*\/tool-results\//,
    /\.claude\/projects\/.*\/subagents\//,
    /package-lock\.json$/,
    /bun\.lockb$/,
  ];
  return trivialPatterns.some((re) => re.test(filePath));
}

export default async function postEditVerifierSuggest(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  const singleFile = p.tool_input?.file_path;
  const multiFiles = p.tool_input?.paths ?? [];
  const targets = singleFile ? [singleFile] : multiFiles;

  if (targets.length === 0) {
    return {
      message: "palantir-mini: post-edit-verifier-suggest skipped (no file path)",
      decision: "continue",
    };
  }

  const meaningful = targets.filter((f) => !isTrivialEdit(f));
  if (meaningful.length === 0) {
    return {
      message: `palantir-mini: post-edit-verifier-suggest skipped (${targets.length} trivial edit(s))`,
      decision: "continue",
    };
  }

  const advisory = [
    "[verifier fan-out advisory]",
    `${meaningful.length} meaningful edit(s) committed: ${meaningful.slice(0, 3).map((f) => path.basename(f)).join(", ")}${meaningful.length > 3 ? ` (+${meaningful.length - 3} more)` : ""}.`,
    "Per rule 12 v3.3.0 §Briefing + agent frontmatter ('use proactively after any teammate completes a task'),",
    "consider spawning verifier-correctness + verifier-adversarial in parallel for review.",
    "Lead's discretion — this advisory does not block.",
  ].join(" ");

  // Persist suggestion as 5-dim event so future BackProp can replay how often
  // verifier coverage was advised vs honored.
  await emitSkillSuggestion({
    suggestedSkillSlug: "pm-investigate",   // closest skill proxy; verifier agents are spawned via Agent tool, not Skill tool
    suggestedByHook:    "post-edit-verifier-suggest",
    triggerCondition:   `${meaningful.length} meaningful edit(s) post-Edit/Write/MultiEdit`,
    suggestionContext:  meaningful.slice(0, 5).join(","),
    memoryLayers:       ["procedural", "episodic"],
    cwd,
  });

  return {
    message: `palantir-mini: post-edit-verifier-suggest (${meaningful.length} files; advisory)`,
    decision: "continue",
    additionalContext: advisory,
  };
}
