// palantir-mini v4.15.0 — user-prompt-ontology-intent-extract hook (sprint-063 W2.B)
// Fires on: UserPromptSubmit (advisory, async, NEVER blocking)
//
// PURPOSE: Downstream discovery advisory. Detect when a user prompt signals a
// complex task that should go through the current public Intent-to-Ontology path.
// The canonical prompt-to-DTC front door remains prompt-front-door-capture
// + pm_semantic_intent_gate; this hook does not prove user intent or DTC approval.
//
// Current public path: pm_semantic_intent_gate -> ontology_context_query ->
// pm_substrate_query as needed -> pm_intent_router after approved SIC/DTC.
//
// Heuristic (any 1 of 3 conditions triggers advisory):
//   A. prompt length ≥600 chars
//   B. ≥2 file-path-like tokens (patterns: /<path>.<ext> or ~/<path>/<path>)
//   C. ≥2 keywords from intent keywords list
//
// Keywords: ontology, impact, refactor, implement, design, build, integrate,
//           migrate, ship, deploy
//
// Bypass: PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1 (audited via intent_protocol_bypass_invoked)
//
// Emits: validation_phase_completed errorClass="intent_to_ontology_protocol_advised"
//
// NEVER blocks. Pass-through silently when heuristic does not match.
//
// Authority: sprint-063 W2.B; rule 12 v3.10.0 §MCP-First protocol;
//            rule 26 §Axis E (procedural + semantic).

import { emit } from "../scripts/log";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  session_id?:    string;
  cwd?:           string;
  prompt?:        string;
  prompt_length?: number;
}

interface HookResult {
  message:            string;
  additionalContext?: string;
}

// ─── Heuristic config ────────────────────────────────────────────────────────

/** Minimum prompt length to trigger advisory (condition A). */
const LENGTH_THRESHOLD = 600;

/** Minimum keyword matches to trigger advisory (condition C). */
const KEYWORD_THRESHOLD = 2;

/** Minimum file-path token matches to trigger advisory (condition B). */
const FILE_PATH_THRESHOLD = 2;

/**
 * Keywords that signal complex ontology/implementation work where
 * the Intent-to-Ontology Protocol is valuable.
 */
const INTENT_KEYWORDS: ReadonlyArray<string> = [
  "ontology",
  "impact",
  "refactor",
  "implement",
  "design",
  "build",
  "integrate",
  "migrate",
  "ship",
  "deploy",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Count file-path-like tokens. Matches absolute /foo/bar.ts, relative src/foo.ts, ~/ paths. */
function countFilePathTokens(text: string): number {
  // Pattern: path.ext OR ~/path/path
  const matches = text.match(/(?:^|\s)((?:~\/|\/)?[\w\-./]+\.(?:ts|tsx|js|json|md|sh|py))\b/gm);
  return matches?.length ?? 0;
}

/** Count matched intent keywords (case-insensitive substring). */
function countKeywordHits(lower: string): number {
  let count = 0;
  for (const kw of INTENT_KEYWORDS) {
    if (lower.includes(kw)) count++;
  }
  return count;
}

// ─── Advisory text ───────────────────────────────────────────────────────────

/** Build the additionalContext advisory for Lead. */
function buildAdvisory(reasons: string[]): string {
  return [
    `palantir-mini Intent-to-Ontology advisory (${reasons.join(", ")}):`,
    ``,
    `Preserve prompt-front-door identity, then call pm_semantic_intent_gate with promptId/promptHash when available.`,
    ``,
    `Use current public discovery before first Edit/Write/MultiEdit:`,
    `  1. ontology_context_query -> context, impact, risk, FDE/DTC readiness`,
    `  2. pm_substrate_query mode=workflow/by-grade -> lineage and BackProp value when needed`,
    `  3. pm_intent_router -> only after approved SIC/DTC or an explicit recorded runtime gap`,
    `  4. Bind WorkContract/SprintContract for mutation slices`,
    ``,
    `Shortcut after semantic gate: /palantir-mini:pm-intent-to-ontology "<intent>" <scopePaths...>`,
    ``,
    `Bypass: PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1 (audited).`,
  ].join("\n");
}

// ─── Hook entry point ─────────────────────────────────────────────────────────

export default async function userPromptOntologyIntentExtract(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd       = p.cwd ?? process.cwd();
  const sessionId = p.session_id;

  try {
    // ── Bypass ────────────────────────────────────────────────────────────────
    if (process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS === "1") {
      try {
        await emit({
          type:    "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "intent_protocol_bypass_invoked",
          },
          toolName:     "PALANTIR_MINI_INTENT_PROTOCOL_BYPASS",
          cwd,
          sessionId,
          identity:     "monitor",
          memoryLayers: ["working"],
          reasoning:    "user-prompt-ontology-intent-extract: bypass via PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1. Audited per sprint-062 Phase 2 W1-alpha.",
        });
      } catch { /* best-effort */ }
      return { message: "palantir-mini: user-prompt-ontology-intent-extract BYPASS (env)" };
    }

    // ── Extract prompt ────────────────────────────────────────────────────────
    const promptText   = String(p.prompt ?? "");
    const promptLength = p.prompt_length ?? promptText.length;
    const lower        = promptText.toLowerCase();

    // ── Heuristic conditions ──────────────────────────────────────────────────
    const conditionLength   = promptLength >= LENGTH_THRESHOLD;
    const conditionFilePath = countFilePathTokens(promptText) >= FILE_PATH_THRESHOLD;
    const conditionKeyword  = countKeywordHits(lower) >= KEYWORD_THRESHOLD;

    // Any 1 condition triggers the advisory
    if (!conditionLength && !conditionFilePath && !conditionKeyword) {
      return {
        message: "palantir-mini: user-prompt-ontology-intent-extract — heuristic clear",
      };
    }

    // ── Build advisory ────────────────────────────────────────────────────────
    const reasons: string[] = [];
    if (conditionLength)   reasons.push(`length≥${LENGTH_THRESHOLD} (${promptLength})`);
    if (conditionFilePath) reasons.push(`file-paths≥${FILE_PATH_THRESHOLD}`);
    if (conditionKeyword)  reasons.push(`keyword-count≥${KEYWORD_THRESHOLD}`);

    const additionalContext = buildAdvisory(reasons);

    // ── Emit lineage event ────────────────────────────────────────────────────
    try {
      await emit({
        type:    "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     true,
          errorClass: "intent_to_ontology_protocol_advised",
        },
        toolName:     "user-prompt-ontology-intent-extract",
        cwd,
        sessionId,
        identity:     "monitor",
        memoryLayers: ["procedural", "semantic"],
        reasoning:    `user-prompt-ontology-intent-extract: downstream Intent-to-Ontology advisory surfaced after prompt-front-door capture / pm_semantic_intent_gate path. reasons=${reasons.join(", ")}; promptLength=${promptLength}. Current public path uses ontology_context_query, pm_substrate_query, and pm_intent_router after approved SIC/DTC.`,
      });
    } catch { /* best-effort */ }

    return {
      message:          `palantir-mini: user-prompt-ontology-intent-extract — advisory (${reasons.join(", ")})`,
      additionalContext,
    };

  } catch (err) {
    // NEVER throw from a UserPromptSubmit hook
    const errMsg = err instanceof Error ? err.message : String(err);
    try {
      process.stderr.write(
        `[palantir-mini/user-prompt-ontology-intent-extract] unexpected error (suppressed): ${errMsg}\n`,
      );
    } catch { /* truly silent */ }
    return {
      message: `palantir-mini: user-prompt-ontology-intent-extract error suppressed (${errMsg})`,
    };
  }
}
