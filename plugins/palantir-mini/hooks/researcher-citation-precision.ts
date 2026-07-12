// palantir-mini PR-13 — Hook enforcement level
//   enforcement: advisory
//   rationale:   async:true in hooks.json; emits advisory when researcher agent is spawned without citation-precision pattern; never blocks Agent dispatch.
// palantir-mini — researcher-citation-precision hook (W3.G sprint-049)
// Fires on: PreToolUse — Agent tool only
//
// Advisory (non-blocking) hook: fires when a researcher subagent is spawned
// without an explicit citation-precision pattern in the briefing prompt.
//
// Background:
//   Opus 4.7 multi-source synthesis regression documented in:
//   ~/.claude/research/anthropic/opus-4-7-postmortem-2026-04-23.md
//   When researcher subagents receive prompts without explicit
//   "direct quote required" guidance, multi-source synthesis quality degrades.
//
// Logic:
//   1. Check tool_input.subagent_type === "palantir-mini:researcher".
//   2. Read tool_input.prompt.
//   3. Check for ANY of 6 citation-precision patterns (case-insensitive):
//        "direct quote" / "verbatim" / "cite the exact" /
//        "quote the source" / "include the original sentence" /
//        "do not paraphrase"
//   4. If NO pattern found:
//      a. Emit validation_phase_completed{ errorClass: "researcher_citation_precision_advisory", passed: true }.
//      b. Print advisory to stderr.
//      c. Return advisory message (non-blocking).
//   5. If pattern found → silent pass-through (no event, no stderr).
//   6. Non-researcher subagent_type → no-op.
//   7. Non-Agent tool → no-op.
//
// Authority:
//   the former Lead-Protocol policy v3.4.1 §Pre-delegation framework (researcher subagent briefing quality)
//   rule 26 §Axis E (memory-mapped; procedural + semantic layers)
//   ~/.claude/research/anthropic/opus-4-7-postmortem-2026-04-23.md
//   Plan: mellow-plotting-oasis.md §Wave 3 W3.G

import { emit } from "../scripts/log";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    subagent_type?: string;
    prompt?:        string;
    [key: string]:  unknown;
  };
}

interface HookResult {
  message:   string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** subagent_type values that trigger citation-precision check (both namespaced and bare). */
const RESEARCHER_TYPES = new Set([
  "palantir-mini:researcher",
  "researcher",
]);

/**
 * Citation-precision patterns. At least ONE must be present in the prompt.
 * Conservative (false-negative bias): match any of 6 phrases → silent pass.
 */
const CITATION_PRECISION_PATTERNS: RegExp[] = [
  /direct\s+quote/i,
  /verbatim/i,
  /cite\s+the\s+exact/i,
  /quote\s+the\s+source/i,
  /include\s+the\s+original\s+sentence/i,
  /do\s+not\s+paraphrase/i,
];

/**
 * Recommended pattern text to include in advisory message.
 * Gives Lead a copy-paste example to add to the briefing.
 */
const RECOMMENDED_PATTERN =
  `"Direct quote required: for every multi-source claim, include the exact verbatim sentence from ` +
  `the source. Do not paraphrase. Cite the exact passage."`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read all stdin as UTF-8. Returns empty string on TTY or error. */
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
    }
  } catch {
    return "";
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Check whether the given prompt string contains at least one of the
 * citation-precision patterns. Case-insensitive.
 *
 * Returns true  → pattern found → silent pass-through.
 * Returns false → no pattern found → advisory needed.
 */
export function hasCitationPrecisionPattern(prompt: string): boolean {
  return CITATION_PRECISION_PATTERNS.some((re) => re.test(prompt));
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: HookPayload = {};
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw) as HookPayload;
    } catch {
      process.stderr.write("[researcher-citation-precision] stdin is not valid JSON — skipping\n");
      const result: HookResult = {
        message:  "palantir-mini: researcher-citation-precision — parse error; skipping advisory",
      };
      process.stdout.write(JSON.stringify(result) + "\n");
      process.exit(0);
    }
  }

  const cwd        = payload.cwd ?? process.cwd();
  const sessionId  = payload.session_id;
  const inp        = payload.tool_input ?? {};
  const subagentType = inp.subagent_type;
  const prompt       = typeof inp.prompt === "string" ? inp.prompt : "";

  // Only applies to researcher subagent spawns
  const isResearcher =
    typeof subagentType === "string" &&
    subagentType.trim().length > 0 &&
    RESEARCHER_TYPES.has(subagentType);

  if (!isResearcher) {
    const result: HookResult = {
      message:  `palantir-mini: researcher-citation-precision — no-op (subagentType=${subagentType ?? "none"})`,
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // Pattern check — conservative false-negative bias
  if (hasCitationPrecisionPattern(prompt)) {
    // Citation pattern found → silent pass-through
    const result: HookResult = {
      message:  `palantir-mini: researcher-citation-precision — citation pattern present; no advisory`,
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // No citation pattern found → emit advisory
  const advisoryMsg =
    `palantir-mini: researcher-citation-precision ADVISORY — ` +
    `researcher subagent briefing lacks explicit citation-precision pattern.\n` +
    `\n` +
    `Recommended pattern to add to briefing:\n` +
    `  ${RECOMMENDED_PATTERN}\n` +
    `\n` +
    `Reference: Opus 4.7 multi-source synthesis regression (` +
    `~/.claude/research/anthropic/opus-4-7-postmortem-2026-04-23.md).\n` +
    `the former Lead-Protocol policy v3.4.1 §Pre-delegation framework.\n`;

  try {
    const eventPayload: Record<string, unknown> = {
      phase:      "design",
      passed:     true,
      errorClass: "researcher_citation_precision_advisory",
      subagentType,
      advisoryMessage: advisoryMsg,
      recommendedPattern: RECOMMENDED_PATTERN,
      postmortemRef: "~/.claude/research/anthropic/opus-4-7-postmortem-2026-04-23.md",
    };
    await emit({
      type:    "validation_phase_completed",
      payload: eventPayload,
      toolName:   "Agent",
      cwd,
      sessionId,
      identity:   "monitor",
      reasoning:
        `researcher-citation-precision: researcher subagent spawned without citation-precision ` +
        `pattern in briefing. Opus 4.7 multi-source synthesis regression documented in postmortem ` +
        `(2026-04-23). the former Lead-Protocol policy v3.4.1 §Pre-delegation framework — researcher briefing quality ` +
        `degrades without explicit direct-quote requirement.`,
      hypothesis:
        "Lead omitted citation-precision guidance OR intentional omission for non-synthesis tasks; advisory only — non-blocking",
      memoryLayers: ["procedural", "semantic"],
    });
  } catch {
    // Best-effort — emit failure must never block agent spawn
  }

  process.stderr.write(advisoryMsg);

  const result: HookResult = {
    message:
      `palantir-mini: researcher-citation-precision ADVISORY — ` +
      `'${subagentType}' spawned without citation-precision pattern (Opus 4.7 postmortem)`,
  };
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

// Guard main() behind import.meta.main so the exported helpers (hasCitationPrecisionPattern)
// can be imported in unit tests without triggering stdin-reading entrypoint.
if (import.meta.main) {
  void main().catch((e) => {
    // Last-resort: never crash; always exit 0 so spawn proceeds
    process.stderr.write(`[researcher-citation-precision] unhandled error: ${(e as Error).message}\n`);
    const fallback: HookResult = {
      message:  "palantir-mini: researcher-citation-precision — unhandled error; continuing",
    };
    process.stdout.write(JSON.stringify(fallback) + "\n");
    process.exit(0);
  });
}
