// palantir-mini — parallel-spawn-version-advisory hook
// Fires on: PreToolUse with matcher "Agent" (subagent spawn)
//
// Per rule 12 v3.19.0 §Parallel-spawn dispatch + user directive 2026-05-13
// mid-session: "너는 idle time에 기존의 lead delegation hooks/rules 등에서
// 병렬/순차 spawn해서 작업시간 효율화하는 것 추가해라."
//
// Purpose:
//   When ≥2 Agent spawns occur within 60 seconds in the same Lead session
//   and a spawn is targeting a version-bumping change (CHANGELOG / package.json /
//   plugin.json / marketplace.json) WITHOUT carrying a "Pre-assigned plugin version:"
//   or "Pre-assigned schemas version:" literal in the briefing → emit advisory
//   validation_phase_completed(errorClass="parallel_spawn_no_slot_reservation").
//
//   Advisory ONLY — never blocks. The risk is CHANGELOG / package.json conflicts
//   on parallel PRs that all try to bump the same version.
//
//   ALSO: when ≥2 Agent spawns within 60s and the briefing lacks
//   `isolation: "worktree"` hint → emit advisory
//   errorClass="parallel_spawn_no_worktree_isolation".
//   Rationale: 4 concurrent subagents without worktree isolation caused
//   cross-branch working-tree corruption (empirically observed sprint-135 2026-05-13).
//
// Slot reservation detection:
//   Looks for literal: "Pre-assigned plugin version:" OR "Pre-assigned schemas version:"
//
// Worktree isolation detection:
//   Looks for: `isolation: "worktree"` OR `"isolation":"worktree"` in the prompt/tool_input
//
// Version-bumping change detection:
//   Looks for CHANGELOG / package.json / plugin.json / marketplace.json in the prompt
//
// Session-scoped spawn tracking:
//   Uses a module-level Map keyed by session_id → timestamps[]
//   (in-process memory; single-process per Claude Code session is sufficient)
//
// Bypass: PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS=1

import { emit } from "../scripts/log";

// In-process session spawn timestamps: session_id → array of epoch-ms spawn times
const sessionSpawnTimes = new Map<string, number[]>();

/** Sliding window of spawns within the last N ms */
const WINDOW_MS = 60_000;

/** Keywords that suggest a version-bumping PR */
const VERSION_BUMP_KEYWORDS = [
  "CHANGELOG",
  "package.json",
  "plugin.json",
  "marketplace.json",
  "version:",
  '"version"',
  "semver",
  "bump",
  "v6.",
  "v5.",
  "v4.",
];

/** Slot reservation signals */
const SLOT_RESERVATION_KEYWORDS = [
  "Pre-assigned plugin version:",
  "Pre-assigned schemas version:",
];

/** Worktree isolation signal */
const WORKTREE_ISOLATION_KEYWORDS = [
  'isolation: "worktree"',
  '"isolation":"worktree"',
  "isolation: 'worktree'",
];

interface ToolInput {
  prompt?: string;
  subagent_type?: string;
  description?: string;
}

interface HookPayload {
  cwd?: string;
  session_id?: string;
  tool_name?: string;
  tool_input?: ToolInput;
}

interface HookResult {
  message: string;
  hookSpecificOutput?: {
    additionalContext?: string;
  };
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

export default async function parallelSpawnVersionAdvisory(
  payload: unknown
): Promise<HookResult> {
  // Bypass
  if (process.env.PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS === "1") {
    return {
      message: "palantir-mini: parallel-spawn-version-advisory BYPASS (env)",
    };
  }

  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const sessionId = p.session_id ?? "unknown";
  const toolName = p.tool_name ?? "Agent";
  const prompt = p.tool_input?.prompt ?? "";
  const subagentType = p.tool_input?.subagent_type ?? "(unspecified)";
  const now = Date.now();

  // --- Update session spawn times ---
  const times = sessionSpawnTimes.get(sessionId) ?? [];
  times.push(now);
  // Prune entries older than window
  const recent = times.filter((t) => now - t <= WINDOW_MS);
  sessionSpawnTimes.set(sessionId, recent);

  // Only act when ≥2 spawns within window (current spawn + ≥1 prior)
  if (recent.length < 2) {
    return {
      message: `palantir-mini: parallel-spawn-version-advisory OK (single spawn in window, no parallel advisory needed)`,
    };
  }

  const advisories: string[] = [];

  // --- Check 1: Version-slot reservation ---
  const isVersionBumping = containsAny(prompt, VERSION_BUMP_KEYWORDS);
  const hasSlotReservation = containsAny(prompt, SLOT_RESERVATION_KEYWORDS);

  if (isVersionBumping && !hasSlotReservation) {
    const msg = [
      `palantir-mini: parallel-spawn-version-advisory ADVISORY — ${recent.length} Agent spawns within 60s; this spawn appears version-bumping but lacks slot pre-reservation.`,
      ``,
      `Missing phrase: "Pre-assigned plugin version: X.Y.Z" (or schemas version).`,
      `Without slot reservation, parallel PRs may conflict on CHANGELOG.md / package.json / plugin.json.`,
      ``,
      `Rule 12 v3.19.0 §Slot pre-reservation: Lead assigns a hard version slot per PR before spawning.`,
      `Example briefing addition: "Pre-assigned plugin version: 6.43.0. Use ONLY this version; do NOT compute next-available."`,
      ``,
      `ADVISORY ONLY — spawn proceeds. Add slot reservation to briefing to suppress.`,
      `Bypass: PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS=1`,
    ].join("\n");
    advisories.push(msg);

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "parallel_spawn_no_slot_reservation",
        },
        toolName,
        cwd,
        sessionId,
        identity: "monitor",
        memoryLayers: ["working"],
        reasoning: `parallel-spawn-version-advisory: ${recent.length} spawns in 60s; version-bumping spawn (subagent_type=${subagentType}) missing "Pre-assigned plugin version:" phrase — CHANGELOG/package.json conflict risk.`,
      });
    } catch {
      /* best-effort */
    }
  }

  // --- Check 2: Worktree isolation ---
  const hasWorktreeIsolation = containsAny(
    prompt,
    WORKTREE_ISOLATION_KEYWORDS
  );

  if (!hasWorktreeIsolation) {
    const msg = [
      `palantir-mini: parallel-spawn-version-advisory ADVISORY — ${recent.length} Agent spawns within 60s; this spawn's briefing lacks "isolation: \\"worktree\\"" hint.`,
      ``,
      `Rule 12 v3.19.0 §Eligibility criterion #4: ALL parallel-eligible spawns MUST use isolation: "worktree" in Agent args.`,
      `Without worktree isolation, concurrent subagents share the main repo's working tree; concurrent "git checkout -b" calls can cross-bleed uncommitted edits between branches.`,
      `Empirical failure: sprint-135 2026-05-13 — 4 concurrent subagents corrupted each other's working trees.`,
      ``,
      `Add to briefing: "You are running with worktree isolation (isolation: \\"worktree\\"). ..."`,
      `And pass isolation: "worktree" in your Agent tool call args.`,
      ``,
      `ADVISORY ONLY — spawn proceeds. Add isolation hint to suppress.`,
      `Bypass: PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS=1`,
    ].join("\n");
    advisories.push(msg);

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "parallel_spawn_no_worktree_isolation",
        },
        toolName,
        cwd,
        sessionId,
        identity: "monitor",
        memoryLayers: ["working"],
        reasoning: `parallel-spawn-version-advisory: ${recent.length} spawns in 60s; spawn (subagent_type=${subagentType}) briefing lacks isolation: "worktree" hint — shared-worktree race risk.`,
      });
    } catch {
      /* best-effort */
    }
  }

  if (advisories.length === 0) {
    return {
      message: `palantir-mini: parallel-spawn-version-advisory OK (${recent.length} spawns in window; slot reservation + worktree isolation confirmed)`,
    };
  }

  const combined = advisories.join("\n\n---\n\n");
  return {
    message: combined,
    hookSpecificOutput: {
      additionalContext: combined,
    },
  };
}
