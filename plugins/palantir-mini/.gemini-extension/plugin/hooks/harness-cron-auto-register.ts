// palantir-mini v4.10.0 — harness-cron-auto-register hook (sprint-056 W2.A)
// Fires on: SessionStart (advisory, async)
//
// PURPOSE: Durability workaround for CC v2.1.132 silently ignoring `durable:true`
// on CronCreate. Since cron registrations persist for current session only,
// this SessionStart hook re-registers the weekly substrate audit cron on
// every session start if the registration is absent.
//
// Logic:
//   1. Check PALANTIR_MINI_AUTO_CRON_DISABLE env var (bypass, audited).
//   2. Call CronList() — if any entry's prompt contains "weekly substrate health audit" → skip.
//   3. Else call CronCreate with verbatim cron prompt body from the weekly audit template.
//   4. Emit phase_completed{phaseTag:"weekly-substrate-audit-auto-registered"}.
//   5. Wrap CronList/CronCreate in try/catch — both APIs may be absent in some CC
//      versions; emit advisory + return graceful.
//
// Bypass:
//   PALANTIR_MINI_AUTO_CRON_DISABLE=1 → skip; emit phase_completed{phaseTag:"auto-cron-bypass-invoked"}
//
// Authority: ~/.claude/plans/2026-05-08-weekly-substrate-audit-template.md
//            ~/.claude/plans/bubbly-sauteeing-cocke.md §2 W2.A
//            rule 26 §Substrate routing + sprint-055 W1.D §G
//
// async: true — advisory; timeout: 8 seconds.

import { emit } from "../scripts/log";

interface HookPayload {
  session_id?: string;
  cwd?:        string;
}

interface HookResult {
  message:            string;
  additionalContext?: string;
}

/**
 * The verbatim cron prompt body from ~/.claude/plans/2026-05-08-weekly-substrate-audit-template.md
 * Kept inline to avoid filesystem reads at hook-fire time (faster, no IO failure risk).
 */
const WEEKLY_AUDIT_PROMPT = `Run weekly substrate health audit for /home/palantirkc per rule 26 §Substrate routing + sprint-055 W1.D §G:

1. Invoke 3 health handlers in parallel:
   - mcp__plugin_palantir-mini_palantir-mini__pm_outcome_pair_audit({ project: "/home/palantirkc" })
   - mcp__plugin_palantir-mini_palantir-mini__pm_value_grade_metrics({ project: "/home/palantirkc" })
   - mcp__plugin_palantir-mini_palantir-mini__pm_plugin_self_check({ projectPath: "/home/palantirkc" })

2. Aggregate verdicts. Compute:
   - orphan_ratio (target ≤ 5%; alert if > 8%)
   - t2_plus_ratio (target ≥ 5%; alert if < 3%)
   - t0_reject_rate (alert if > 5%)
   - plugin_self_check pass count (target == total)

3. Write audit doc to ~/.claude/plans/YYYY-MM-DD-weekly-substrate-audit.md (today's date) with:
   - § Snapshot — totals, distributions, week-over-week deltas (compare with last week's audit doc if present)
   - § Alerts — fire when threshold breached
   - § Recommendations — auto-route to /palantir-mini:pm-three-questions, /palantir-mini:pm-memory-map, or /palantir-mini:pm-rule-memory-prune as appropriate

4. Emit a phase_completed envelope:
   - type: "phase_completed"
   - payload: { phaseTag: "weekly-substrate-audit", verdicts: { orphan_ratio, t2_plus_ratio, t0_reject_rate, alerts: [...] } }
   - via mcp__plugin_palantir-mini_palantir-mini__emit_event

5. If any alert fired: surface in user response with "ATTENTION: weekly substrate audit caught <N> alert(s)" prefix. Else: terse one-line summary.

Reference: ~/.claude/rules/26-valuable-data-standard.md §Substrate routing + sprint-055 W1.D §G.`;

/** Marker text that identifies an already-registered weekly audit cron. */
const WEEKLY_AUDIT_MARKER = "weekly substrate health audit";

/** CronList entry shape (best-effort — CC API may vary). */
interface CronEntry {
  prompt?: string;
  cron?:   string;
  id?:     string;
}

/**
 * Try to call Claude Code's native CronList() API.
 * Returns an array of cron entries, or null if the API is unavailable.
 */
async function tryCronList(): Promise<CronEntry[] | null> {
  try {
    // CC exposes CronList via the global `claude` object in hook subprocess context.
    // Access via dynamic require — avoids TypeScript errors on unknown global.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cc = (globalThis as any).claude;
    if (!cc || typeof cc.CronList !== "function") {
      return null;
    }
    const result = await cc.CronList();
    if (Array.isArray(result)) return result as CronEntry[];
    if (result && Array.isArray(result.crons)) return result.crons as CronEntry[];
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to call Claude Code's native CronCreate() API.
 * Returns true on success, false if the API is unavailable or fails.
 */
async function tryCronCreate(cron: string, prompt: string, recurring: boolean): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cc = (globalThis as any).claude;
    if (!cc || typeof cc.CronCreate !== "function") {
      return false;
    }
    await cc.CronCreate({ cron, prompt, recurring });
    return true;
  } catch {
    return false;
  }
}

export default async function harnesscronAutoRegister(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  // ── Collect outcome across all checks; emit ONCE at the end (mutex hygiene) ──
  // sprint-062 W0-α: consolidated 3 separate emit() calls into 1 to eliminate
  // thundering-herd lock contention on SessionStart (was: ~3 acquisitions/hook).

  // Bypass: PALANTIR_MINI_AUTO_CRON_DISABLE=1 (audited)
  if (process.env.PALANTIR_MINI_AUTO_CRON_DISABLE === "1") {
    // Single emit at bypass path
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     true,
          errorClass: "auto_cron_bypass_invoked",
        },
        toolName:  "SessionStart",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        memoryLayers: ["working"],
        reasoning: "harness-cron-auto-register: bypass via PALANTIR_MINI_AUTO_CRON_DISABLE=1; weekly substrate audit cron NOT auto-registered this session.",
      });
    } catch { /* best-effort */ }
    return { message: "palantir-mini: harness-cron-auto-register BYPASS (env)" };
  }

  // Step 1: Attempt CronList to check for existing registration
  const entries = await tryCronList();
  if (entries === null) {
    // CronList API unavailable — log advisory + return gracefully (no emit; not an error worth auditing)
    try {
      process.stderr.write(
        "[harness-cron-auto-register] CronList() API unavailable in this CC version — " +
        "skipping cron durability check. Known limitation: CC v2.1.132 silently ignores " +
        "CronCreate({durable:true}). See palantir-mini hook + BROWSE.md §Known limitation 2026-05-08.\n",
      );
    } catch { /* best-effort */ }
    return {
      message: "palantir-mini: harness-cron-auto-register SKIPPED (CronList API unavailable)",
      additionalContext:
        "CronList() API absent — weekly substrate audit cron not verified. " +
        "Manually run /palantir-mini:pm-substrate-audit-cron-register if needed.",
    };
  }

  // Step 2: Check if already registered
  for (const entry of entries) {
    if (typeof entry.prompt === "string" && entry.prompt.includes(WEEKLY_AUDIT_MARKER)) {
      // Already registered — skip silently (no emit needed; not an auditable event)
      return {
        message: "palantir-mini: harness-cron-auto-register SKIPPED (already registered)",
      };
    }
  }

  // Step 3: Not registered — attempt CronCreate
  const created = await tryCronCreate("7 9 * * 1", WEEKLY_AUDIT_PROMPT, true);

  if (!created) {
    // CronCreate failed or unavailable — advisory stderr + single emit
    try {
      process.stderr.write(
        "[harness-cron-auto-register] CronCreate() failed or unavailable — " +
        "weekly substrate audit cron NOT registered. " +
        "Manually run /palantir-mini:pm-substrate-audit-cron-register to recover.\n",
      );
    } catch { /* best-effort */ }

    // Single emit for failure path (was previously one of 3 scattered emits)
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     false,
          errorClass: "cron_create_failed",
        },
        toolName:  "SessionStart",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        memoryLayers: ["working", "procedural"],
        reasoning: "harness-cron-auto-register: CronCreate() failed or returned false; weekly substrate audit cron not registered. Durability workaround incomplete for this session. CronList was available.",
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   "hooks/harness-cron-auto-register.ts",
          description:     "CronCreate failed — investigate CC API availability or cron quota.",
          confidenceLevel: "medium",
        },
      });
    } catch { /* best-effort */ }

    return {
      message: "palantir-mini: harness-cron-auto-register FAILED (CronCreate unavailable)",
      additionalContext:
        "CronCreate() failed — weekly substrate audit cron not registered. " +
        "Run /palantir-mini:pm-substrate-audit-cron-register manually.",
    };
  }

  // Step 4: Successfully registered — single emit for success path
  // (was previously one of 3 scattered emits)
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase:      "design",
        passed:     true,
        errorClass: "weekly_substrate_audit_auto_registered",
      },
      toolName:  "SessionStart",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      memoryLayers: ["working", "procedural"],
      reasoning: `harness-cron-auto-register: CronCreate succeeded; weekly substrate audit cron registered at '7 9 * * 1' (every Monday 09:07). CronList was available (${entries.length} existing entries). Durability workaround active for CC v2.1.132+.`,
    });
  } catch { /* best-effort */ }

  return {
    message: "palantir-mini: harness-cron-auto-register OK (weekly audit cron registered)",
    additionalContext:
      "Weekly substrate audit cron registered: every Monday at 09:07. " +
      "Note: CC v2.1.132 silently ignores durable:true — this hook re-registers on every session start. " +
      "See ~/.claude/research/claude-code/BROWSE.md §Known limitation 2026-05-08.",
  };
}
