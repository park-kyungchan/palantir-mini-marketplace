// palantir-mini v4.13.0 — user-prompt-overlay-advisory hook (sprint-061 A.W3)
// Fires on: UserPromptSubmit (advisory, NEVER blocking)
//
// Downstream advisory only. The canonical prompt-to-DTC front door is
// prompt-front-door-capture + pm_semantic_intent_gate. This heuristic surfaces
// additionalContext routing Lead to pm_rule_query + impact_query after prompt
// identity has been captured; it is not proof of user intent or DTC approval.
//
// This is a lighter-weight advisory companion to complex-task-detector (which
// raises thresholds to ≥1200 chars + ≥3 conditions). This hook fires earlier
// at ≥800 chars / ≥2 keywords and specifically routes towards rule-lookup
// (pm_rule_query) + impact analysis (impact_query) as MCP-First protocol.
//
// Keywords: ontology, harness, MCP, convex, spec, implementation — terms that
// signal rule-system or architectural work where rule consultation is valuable.
//
// NEVER blocks. Pass-through silently when heuristic does not match.
//
// Authority: sprint-061 A.W3; rule 12 v3.10.0 §MCP-First protocol (proposed).
// Plan: ~/.claude/plans/inherited-discovering-quill.md §4.A.W3.

interface HookPayload {
  session_id?:    string;
  cwd?:           string;
  prompt_length?: number;
  prompt?:        string;
}

interface HookResult {
  message:            string;
  additionalContext?: string;
}

/** Keywords that signal rule-system or architectural work (case-insensitive). */
const ADVISORY_KEYWORDS: ReadonlyArray<string> = [
  "ontology",
  "harness",
  "mcp",
  "convex",
  "spec",
  "implementation",
];

/** Count file-path-like tokens (e.g. foo.ts, bar.md) in the prompt. */
function countFilePathHits(text: string): number {
  return String(text).match(/\S+\.(ts|tsx|md|json|js|py|sh)\b/g)?.length ?? 0;
}

/** Count matched advisory keywords (case-insensitive substring). */
function countKeywordHits(lower: string): number {
  let count = 0;
  for (const kw of ADVISORY_KEYWORDS) {
    if (lower.includes(kw)) count++;
  }
  return count;
}

export default async function userPromptOverlayAdvisory(
  payload: unknown,
): Promise<HookResult> {
  try {
    const p = (payload ?? {}) as HookPayload;
    const promptText   = String(p.prompt ?? "");
    const promptLength = p.prompt_length ?? promptText.length;
    const lower        = promptText.toLowerCase();

    const hitLength   = promptLength >= 800;
    const hitKeyword  = countKeywordHits(lower) >= 2;
    const hitFilePath = countFilePathHits(promptText) >= 3;

    if (!hitLength && !hitKeyword && !hitFilePath) {
      // Heuristic clear — pass-through silently.
      return { message: "palantir-mini: user-prompt-overlay-advisory — heuristic clear" };
    }

    const reasons: string[] = [];
    if (hitLength)   reasons.push(`length≥800 (${promptLength})`);
    if (hitKeyword)  reasons.push(`keyword-count≥2`);
    if (hitFilePath) reasons.push(`file-paths≥3`);

    const additionalContext =
      "Complex task detected. Preserve the prompt-front-door capture and call `pm_semantic_intent_gate` with prompt identity before mutating dispatch. Then consult `mcp__plugin_palantir-mini_palantir-mini__pm_rule_query` " +
      "for rule details + `mcp__plugin_palantir-mini_palantir-mini__impact_query` " +
      "(or skill `/palantir-mini:pm-impact-quick`) for impact analysis. " +
      "See rule 12 v3.10.0 §MCP-First protocol.";

    return {
      message: `palantir-mini: user-prompt-overlay-advisory — complex task advisory (${reasons.join(", ")})`,
      additionalContext,
    };
  } catch (e) {
    // Never throw from a UserPromptSubmit hook.
    return {
      message: `palantir-mini: user-prompt-overlay-advisory — error (${(e as Error).message ?? String(e)})`,
    };
  }
}
