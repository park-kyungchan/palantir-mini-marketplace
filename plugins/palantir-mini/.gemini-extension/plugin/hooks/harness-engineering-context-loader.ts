// palantir-mini v4.12.0 — harness-engineering-context-loader hook (sprint-053 W2A; sprint-060 W2.2 R3-F8)
// Fires on: SessionStart (advisory, async)
//
// Lazily reads 4 harness-engineering 1차 자료. Default SessionStart behavior
// stays token-thin; set PALANTIR_MINI_HARNESS_CONTEXT_EAGER=1 or
// PALANTIR_MINI_SESSION_CONTEXT_MODE=eager to inject excerpts.
//
// sprint-060 W2.2 R3-F8: MAX_LINES reduced from 30 → 15 per architecture review
// §5.D.8 ("inflates per-session token budget"). 4 files × 15 lines = ~60 lines total
// vs prior ~120 lines; saves ~500 tokens per session startup.
//
// Authority: rule 12 v3.5.0 §Harness Engineering context awareness.
// Plan:      ~/.claude/plans/ (sprint-053 W2A).

import * as fs from "fs";
import { emit } from "../scripts/log";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:            string;
  decision?:          "continue";
  additionalContext?: string;
}

/**
 * Max lines to include from each harness-engineering file (budget-conscious).
 * Reduced from 30 → 15 per sprint-060 W2.2 R3-F8 (architecture review §5.D.8):
 * 4 files × 15 lines saves ~500 tokens vs prior 4 files × 30 lines.
 */
const MAX_LINES = 15;

function eagerContextEnabled(): boolean {
  return (
    process.env["PALANTIR_MINI_HARNESS_CONTEXT_EAGER"] === "1" ||
    process.env["PALANTIR_MINI_SESSION_CONTEXT_MODE"] === "eager"
  );
}

/** Harness-engineering 1차 자료 to inject at session start. */
const ROUTER_FILES: ReadonlyArray<{ label: string; filePath: string }> = [
  {
    label: "anthropic/scaling-managed-agents-2026-04-08.md",
    filePath: "/home/palantirkc/.claude/research/anthropic/scaling-managed-agents-2026-04-08.md",
  },
  {
    label: "anthropic/harness-design-2026-03-24.md",
    filePath: "/home/palantirkc/.claude/research/anthropic/harness-design-2026-03-24.md",
  },
  {
    label: "harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md",
    filePath: "/home/palantirkc/.claude/research/harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md",
  },
  {
    label: "anthropic/opus-4-7-postmortem-2026-04-23.md",
    filePath: "/home/palantirkc/.claude/research/anthropic/opus-4-7-postmortem-2026-04-23.md",
  },
];

/**
 * Read a file and return its first `maxLines` lines.
 * Returns null if the file does not exist or cannot be read.
 */
function readFirstLines(filePath: string, maxLines: number): string | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split("\n");
    const sliced = lines.slice(0, maxLines);
    // Indicate truncation when the file had more lines.
    if (lines.length > maxLines) {
      sliced.push(`… (truncated after ${maxLines} lines)`);
    }
    return sliced.join("\n");
  } catch {
    return null;
  }
}

export default async function harnessEngineeringContextLoader(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  if (!eagerContextEnabled()) {
    return {
      message: "palantir-mini: harness-engineering-context-loader — lazy mode (no SessionStart context injection; router/delegation will request context when needed)",
      decision: "continue",
    };
  }

  const sections: string[] = [
    "## Harness Engineering 1차 자료 (rule 12 §Harness Engineering context awareness)\n",
  ];
  let loadedCount = 0;
  const missingFiles: string[] = [];

  for (const { label, filePath } of ROUTER_FILES) {
    const content = readFirstLines(filePath, MAX_LINES);
    if (content === null) {
      missingFiles.push(label);
      sections.push(`### ${label}\n_(file not found: ${filePath})_\n`);
    } else {
      loadedCount++;
      sections.push(`### ${label}\n\`\`\`\n${content}\n\`\`\`\n`);
    }
  }

  const additionalContext = sections.join("\n");

  // Emit 5-dim event — best-effort (never blocks SessionStart).
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "design",
      passed:     loadedCount > 0,
      errorClass: "harness_engineering_context_loaded",
    },
    toolName:  "SessionStart",
    cwd,
    sessionId: p.session_id,
    identity:  "monitor",
    reasoning: `sprint-053 W2A (R3-F8 sprint-060 W2.2: MAX_LINES 30→15) — SessionStart hook auto-loads 4 harness-engineering 1차 자료 (Brain/Hands/Session, Prithvi 3-agent, 4-vendor convergence, Opus 4.7 token-inflation) as additionalContext per rule 12 v3.5.0 §Harness Engineering context awareness; MAX_LINES=${MAX_LINES}; loaded ${loadedCount}/${ROUTER_FILES.length} file(s); missing=[${missingFiles.join(",")}]`,
    hypothesis: "Auto-injecting harness-engineering context eliminates per-session re-discovery cost; Lead's mode-selection (rule 20) improves at first dispatch.",
    memoryLayers: ["procedural", "semantic"],
    refinementTarget: {
      kind:            "other",
      filePathOrRid:   "hooks/harness-engineering-context-loader.ts",
      description:     "SessionStart hook auto-injects harness-engineering 1차 자료 excerpts as additionalContext",
      confidenceLevel: "high",
    },
  }).catch(() => { /* best-effort — never crash SessionStart */ });

  if (loadedCount === 0) {
    return {
      message:  "palantir-mini: harness-engineering-context-loader — no harness-engineering files found (advisory)",
      decision: "continue",
    };
  }

  return {
    message:          `palantir-mini: harness-engineering-context-loader — loaded ${loadedCount}/${ROUTER_FILES.length} file(s)`,
    decision:         "continue",
    additionalContext,
  };
}
