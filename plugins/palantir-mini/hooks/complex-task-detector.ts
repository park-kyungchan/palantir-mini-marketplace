// palantir-mini v4.12.0 — complex-task-detector hook (sprint-053 W2A; sprint-056 W2.C3 marker-write added; sprint-060 W1.3 demote+tighten)
// Fires on: UserPromptSubmit (advisory, async)
//
// Downstream advisory only. The canonical prompt-to-DTC front door is
// prompt-front-door-capture + pm_semantic_intent_gate. This hook does not prove
// user intent or DTC approval; it only classifies prompt complexity and routes
// Lead toward planning/delegation after the prompt front door has captured the
// prompt identity.
//
// sprint-056 W2.C3 addition: when ≥3 conditions matched, ALSO writes a per-session
// marker file <projectRoot>/.palantir-mini/session/.complex-task-pending.json
// with { sessionId, conditionsMatched, when }. This file is read by pre-delegation-check.ts
// (W2.C1) to escalate the denial message when a complex task was detected.
//
// sprint-060 W1.3 changes (closes P1.LD4 / M13 / D.5 architecture review):
//   - valueGrade demoted to T1 (advisory is operational trace, NOT refinement input)
//   - Removed refinementTarget from emit (T3 was incorrect per rule 26 §Grading)
//   - Keyword list tightened: removed {ontology, schema} (matched too broadly)
//   - Length threshold raised 800 → 1200 (was matching simple bug-fix prompts)
//   - Detection gate raised ≥2 → ≥3 conditions (stricter; fewer false positives)
//   - Condition labels updated to reflect new thresholds
//
// Authority: rule 12 v3.5.0 §Complex-task EnterPlanMode protocol.
//            rule 12 v3.4.0 §Pre-delegation analysis framework (W2.C3).
//            rule 26 v1.1.0 §Grading (T1 = operational trace; T3 requires refinementTarget).
// Plan:      ~/.claude/plans/ (sprint-053 W2A + sprint-056 W2.C3 + sprint-060 W1.3).

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot } from "./harness-base-mode-advisory";

interface HookPayload {
  session_id?:    string;
  cwd?:           string;
  prompt_length?: number;
  prompt?:        string;
}

interface HookResult {
  message:            string;
  decision?:          "continue";
  additionalContext?: string;
}

/** Keywords that suggest multi-file feature work (case-insensitive substring match).
 *
 * sprint-060 W1.3: removed ambiguous "implement", "build", "audit", "across",
 * "all of", "ontology", "schema" — those match too broadly in any palantir-mini
 * work. Kept only terms that specifically signal large-scope structural changes.
 * Korean broad-scope terms retained; "감사" removed (too common as greeting).
 */
const COMPLEX_KEYWORDS: ReadonlyArray<string> = [
  "refactor",
  "redesign",
  "blueprint",
  "migration",
  "multi-file change",
  "architecture review",
  "전반",
  "전체",
  "여러",
];

/** Count how many of the keyword substrings appear in the lowercased prompt text. */
function countKeywordHits(lower: string): number {
  let count = 0;
  for (const kw of COMPLEX_KEYWORDS) {
    if (lower.includes(kw)) {
      count++;
    }
  }
  return count;
}

/** Count file-path-like tokens (e.g. foo.ts, bar.md) in the prompt text. */
function countFilePathHits(text: string): number {
  return String(text).match(/\S+\.(ts|tsx|md|json|js|py|sh)\b/g)?.length ?? 0;
}

export default async function complexTaskDetector(payload: unknown): Promise<HookResult> {
  try {
    const p = (payload ?? {}) as HookPayload;
    const cwd = p.cwd ?? process.cwd();
    const promptText = String(p.prompt ?? "");

    // Bypass: explicit opt-out.
    if (promptText.includes("skip-delegate")) {
      return {
        message: "palantir-mini: complex-task-detector — bypassed (skip-delegate)",
      };
    }

    // Heuristic conditions.
    const promptLength = p.prompt_length ?? 0;
    const lower = promptText.toLowerCase();
    const keywordHits = countKeywordHits(lower);
    const filePathHits = countFilePathHits(promptText);

    // sprint-060 W1.3: length threshold raised 800→1200; keyword threshold kept at ≥2
    // (reduced keyword list compensates); condition gate raised ≥2→≥3.
    const conditionLength    = promptLength >= 1200;
    const conditionKeyword   = keywordHits >= 2;
    const conditionFilePaths = filePathHits >= 3;

    const conditionsMatched: string[] = [];
    if (conditionLength)    conditionsMatched.push("length≥1200");
    if (conditionKeyword)   conditionsMatched.push("keyword-count≥2");
    if (conditionFilePaths) conditionsMatched.push("file-paths≥3");

    if (conditionsMatched.length < 3) {
      return {
        message: "palantir-mini: complex-task-detector — heuristic clear",
      };
    }

    // ≥3 conditions matched — write per-session marker file (sprint-056 W2.C3).
    // This file is read by pre-delegation-check.ts to escalate block messages.
    try {
      const projectRoot = findProjectRoot(cwd);
      if (projectRoot) {
        const sessionDir = path.join(projectRoot, ".palantir-mini", "session");
        fs.mkdirSync(sessionDir, { recursive: true });
        const markerPath = path.join(sessionDir, ".complex-task-pending.json");
        const marker = {
          sessionId:         p.session_id ?? "unknown",
          conditionsMatched,
          when:              new Date().toISOString(),
        };
        const tmpPath = markerPath + ".tmp";
        fs.writeFileSync(tmpPath, JSON.stringify(marker));
        fs.renameSync(tmpPath, markerPath);
      }
    } catch { /* best-effort — never crash UserPromptSubmit */ }

    // ≥3 conditions matched — emit advisory event (best-effort).
    // sprint-060 W1.3: valueGrade demoted to T1 (operational trace only; NOT a
    // refinement input — no refinementTarget on this envelope). Rule 26 §Grading:
    // T3 requires withWhat.refinementTarget; advisory does not refine ontology.
    emit({
      type: "validation_phase_completed",
      payload: {
        phase:      "design",
        passed:     true,
        errorClass: "complex_task_detected",
      },
      toolName:  "UserPromptSubmit",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      valueGrade: "T1",
      memoryLayers: ["working", "episodic"],
      reasoning: `User prompt heuristic matched all 3 of {length≥1200, keyword-count≥2, file-paths≥3}; downstream advisory routes Lead to pre-delegation skill + plan-mode entry after prompt-front-door capture / pm_semantic_intent_gate. promptLength=${promptLength} keywordHits=${keywordHits} filePathHits=${filePathHits} conditionsMatched=[${conditionsMatched.join(",")}]`,
      hypothesis: "Surfacing downstream advisory after prompt capture reduces Lead-direct one-shot drift on multi-file work.",
    }).catch(() => { /* best-effort — never crash UserPromptSubmit */ });

    const additionalContext =
      "[complex-task] prompt looks like ≥3-file feature work. Treat prompt-front-door-capture + pm_semantic_intent_gate as the prompt/DTC proof path, then consider /plan + /palantir-mini:pm-delegate-or-direct (rule 12 §Pre-delegation framework). Bypass: include 'skip-delegate' literal in prompt.";

    try {
      process.stderr.write(
        `palantir-mini: complex-task-detector — heuristic matched (${conditionsMatched.join(", ")}); advisory surfaced.\n`,
      );
    } catch { /* best-effort */ }

    return {
      message:          `palantir-mini: complex-task-detector — complex task detected (${conditionsMatched.join(", ")})`,
      additionalContext,
    };
  } catch (e) {
    return {
      message: `palantir-mini: complex-task-detector — error: ${(e as Error).message ?? String(e)}`,
    };
  }
}
