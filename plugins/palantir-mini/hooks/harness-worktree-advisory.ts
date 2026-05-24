// palantir-mini PR-13 — Hook enforcement level
//   enforcement: advisory
//   rationale:   async:true in hooks.json; emits advisory when generator-tier agent spawns without isolation=worktree; never blocks Agent dispatch.
// palantir-mini — harness-worktree-advisory hook (W1.D sprint-046)
// Fires on: PreToolUse — Agent tool only
//
// Advisory (non-blocking) hook: fires when a generator-tier subagent is spawned
// without isolation: "worktree". Emits a 5-dim event + stderr message so Lead
// can correct the oversight. Always returns { decision: "continue" }.
//
// Logic:
//   1. Parse tool_input.subagent_type + tool_input.isolation from stdin.
//   2. Check if subagent_type is in the generator-tier allowlist.
//   3. If in allowlist AND isolation !== "worktree":
//      a. Emit validation_phase_completed{ errorClass: "harness_worktree_advisory_emitted" }.
//      b. Print advisory to stderr.
//   4. Always return { message: "...", decision: "continue" } — non-blocking.
//   5. Wrap emit() in try/catch — best-effort, never crash spawn.
//
// Authority:
//   rule 16 v4.1.0 §Roles (isolation: "worktree" on generator-tier agents)
//   rule 26 §Axis E (memory-mapped; procedural layer — generator spawn pattern)
//   Lance Martin "Scaling Managed Agents" 2026-04-08 (cattle-not-pets principle)
//   Plan: mellow-plotting-oasis.md §W1.D

import { emit } from "../scripts/log";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    subagent_type?: string;
    isolation?:     string;
    [key: string]:  unknown;
  };
}

interface HookResult {
  message:   string;
  decision:  "continue";
}

// ─── Allowlist ────────────────────────────────────────────────────────────────
//
// Generator-tier subagent_types that SHOULD carry isolation: "worktree".
// Both namespaced (palantir-mini:<name>) and bare (<name>) forms are accepted
// to accommodate namespace flexibility.

const GENERATOR_TIER_ALLOWLIST = new Set([
  // Namespaced
  "palantir-mini:harness-generator",
  "palantir-mini:implementer",
  "palantir-mini:hook-builder",
  "palantir-mini:mc-implementer",
  "palantir-mini:pm-implementer",
  "palantir-mini:kosmos-implementer",
  // Bare (without namespace prefix)
  "harness-generator",
  "implementer",
  "hook-builder",
  "mc-implementer",
  "pm-implementer",
  "kosmos-implementer",
]);

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

// ─── Main handler ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: HookPayload = {};
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw) as HookPayload;
    } catch {
      process.stderr.write("[harness-worktree-advisory] stdin is not valid JSON — skipping\n");
      const result: HookResult = {
        message:  "palantir-mini: harness-worktree-advisory — parse error; skipping advisory",
        decision: "continue",
      };
      process.stdout.write(JSON.stringify(result) + "\n");
      process.exit(0);
    }
  }

  const cwd         = payload.cwd ?? process.cwd();
  const sessionId   = payload.session_id;
  const inp         = payload.tool_input ?? {};
  const subagentType = inp.subagent_type;
  const isolation    = inp.isolation;

  // Check whether this spawn needs an advisory
  const needsAdvisory =
    typeof subagentType === "string" &&
    subagentType.trim().length > 0 &&
    GENERATOR_TIER_ALLOWLIST.has(subagentType) &&
    isolation !== "worktree";

  if (needsAdvisory) {
    // 1. Emit 5-dim advisory event (best-effort — never crash spawn)
    try {
      const eventPayload: Record<string, unknown> = {
        phase:      "design",
        passed:     true,
        errorClass: "harness_worktree_advisory_emitted",
        subagentType,
        isolation: isolation ?? "(not set)",
        advisoryMessage:
          `Generator-tier agent '${subagentType}' spawned without isolation: "worktree". ` +
          `Add isolation: "worktree" to Agent params or accept this advisory.`,
      };
      await emit({
        type:    "validation_phase_completed",
        payload: eventPayload,
        toolName:    "Agent",
        cwd,
        sessionId,
        identity:    "monitor",
        reasoning:
          // rule 16 v4.1.0 §Roles + Lance Martin 2026-04-08 cattle-not-pets —
          // generator-tier agent spawned without isolation: "worktree"
          `rule 16 v4.1.0 §Roles + Lance Martin 2026-04-08 cattle-not-pets — ` +
          `generator-tier agent spawned without isolation: "worktree"`,
        hypothesis:
          "Lead's intentional override OR oversight; advisory only — non-blocking",
        memoryLayers: ["procedural"],
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   `Agent spawn for ${subagentType}`,
          description:     "Generator-tier spawn missed worktree isolation",
          confidenceLevel: "medium",
        },
      });
    } catch {
      // Best-effort — emit failure must never block agent spawn
    }

    // 2. Print advisory to stderr
    process.stderr.write(
      `palantir-mini: harness-worktree-advisory — '${subagentType}' spawning without isolation: "worktree" ` +
      `(rule 16 v4.1.0 cattle-not-pets). Add to Agent params or accept advisory.\n`,
    );
  }

  // Always continue — non-blocking advisory
  const result: HookResult = {
    message: needsAdvisory
      ? `palantir-mini: harness-worktree-advisory — advisory emitted for '${subagentType}' (no worktree isolation)`
      : `palantir-mini: harness-worktree-advisory — no advisory needed (subagentType=${subagentType ?? "none"} isolation=${isolation ?? "none"})`,
    decision: "continue",
  };
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

void main().catch((e) => {
  // Last-resort: never crash; always exit 0 so spawn proceeds
  process.stderr.write(`[harness-worktree-advisory] unhandled error: ${(e as Error).message}\n`);
  const fallback: HookResult = {
    message:  "palantir-mini: harness-worktree-advisory — unhandled error; continuing",
    decision: "continue",
  };
  process.stdout.write(JSON.stringify(fallback) + "\n");
  process.exit(0);
});
