// palantir-mini v3.7.0 — hooks/session-start.ts (orchestrator)
// SessionStart hook: emits session_started + auto-resume + research drift + state cleanup.
// Decomposed in v3.7.0 A.1: state-files / branch helpers extracted to ./session-start/*.
//
// Authority: rule 0 (context-meta) §3 every-turn T1 load — SessionStart bootstraps
//            the rules-overlay layer for the session.
//            rule 10 (events-jsonl) §Substrate invariant — emits session_started
//            5-dim envelope; CLEAN_STATE never truncates events.jsonl.
//            rule 02 (research-retrieval-and-memory) — SessionStart loads MEMORY.md
//            top-200 lines + may load research drift advisory.
//            rule 26 (valuable-data-standard) §Auto-grade — value-grade-assigner
//            tags every emit; SessionStart's session_started event T1+ graded.
//
// v1.1 upgrades (Phase A-2 W2-2 defect #5):
//   - CLEAN_STATE=1 env flag resets ontology-state/*.json to empty template and
//     truncates inbox-*.json. events.jsonl is NEVER touched (rule 10).
//   - When CLEAN_STATE unset and prior-session state detected, emit
//     stale_state_warning event listing files and preserve them.
//
// v1.7 upgrades (Phase B3 Task A8):
//   - After sessionResume, call researchLibraryDiff to detect research library
//     drift. Advisory only — silent on error. Pushes a line to additionalContext
//     only when totalChanges > 0.

import * as fs from "fs";
import * as path from "path";
import { emit, projectRoot, eventsPathFor } from "../scripts/log";
import { readEvents, foldToSnapshot } from "../lib/event-log/read";
import { sessionResume } from "../bridge/handlers/session_resume";
import { researchLibraryDiff } from "../bridge/handlers/research_library_diff";
import {
  listOntologyStateFiles,
  listInboxFiles,
  resetOntologyStateFile,
  resetInboxFile,
  detectStaleState,
} from "./session-start/state-files";
import { liveBranch } from "./session-start/branch";
import type { HookPayload, HookResult } from "./session-start/types";

// Backward-compat re-exports for tests + external callers
export { liveBranch } from "./session-start/branch";
export {
  listOntologyStateFiles,
  listInboxFiles,
  resetOntologyStateFile,
  resetInboxFile,
  detectStaleState,
  EMPTY_ONTOLOGY_STATE_TEMPLATE,
  EMPTY_INBOX_TEMPLATE,
} from "./session-start/state-files";
export type { HookPayload, HookResult } from "./session-start/types";

function eagerSessionStartContextEnabled(): boolean {
  return (
    process.env["PALANTIR_MINI_SESSION_START_EAGER"] === "1" ||
    process.env["PALANTIR_MINI_SESSION_CONTEXT_MODE"] === "eager"
  );
}

export default async function sessionStart(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const root = projectRoot();
  const epath = eventsPathFor(root);

  fs.mkdirSync(path.dirname(epath), { recursive: true });

  try {
    await emit({
      type: "session_started",
      payload: {
        model:  p.model,
        effort: p.effort ?? "max",
      },
      toolName:  "SessionStart",
      cwd,
      sessionId: p.session_id,
      identity:  "claude-code",
    });
  } catch { /* best-effort */ }

  // Defect #5: CLEAN_STATE cleanup vs stale-state warning
  const cleanRequested = process.env.CLEAN_STATE === "1";
  const contextLines: string[] = [];
  const eagerContext = eagerSessionStartContextEnabled();

  if (eagerContext) {
    // Phase B2-2: auto-invoke sessionResume after session_started
    try {
      const resume = await sessionResume({ project: root, emit_resume_event: true });
      if (resume.last_session_rid && resume.last_sequence > 0) {
        contextLines.push(
          `[session resume] last_seq=${resume.last_sequence} active=${resume.active_teammates.length} pending=${resume.pending_tasks.length}`,
        );
      }
    } catch (err) {
      process.stderr.write(`[session-start] session_resume skipped: ${(err as Error).message}\n`);
    }

    // Phase B3-A8: advisory research library drift check — non-blocking, silent on error.
    // Pushes a line to additionalContext only when totalChanges > 0.
    try {
      const diff = await researchLibraryDiff({});
      const totalChanges = diff.sections.reduce(
        (sum, s) => sum + s.changelogEntries.length,
        0,
      );
      if (totalChanges > 0) {
        const sectionSummary = diff.sections
          .filter((s) => s.changelogEntries.length > 0)
          .map((s) => `${s.section}(${s.changelogEntries.length})`)
          .join(", ");
        contextLines.push(
          `[research-drift] ${totalChanges} changelog entries across ${diff.sectionsWithChangelog} section(s): ${sectionSummary}`,
        );
      }
    } catch {
      // advisory only — never surface errors to the hook output
    }
  }

  if (cleanRequested) {
    const stateFiles = listOntologyStateFiles(root);
    const inboxFiles = listInboxFiles(root);
    for (const f of stateFiles) {
      try { resetOntologyStateFile(f); } catch { /* best-effort */ }
    }
    for (const f of inboxFiles) {
      try { resetInboxFile(f); } catch { /* best-effort */ }
    }
    contextLines.push(
      `CLEAN_STATE=1 applied: reset ${stateFiles.length} ontology-state file(s), truncated ${inboxFiles.length} inbox file(s). events.jsonl preserved.`,
    );
  } else {
    const stale = detectStaleState(root);
    if (stale.length > 0) {
      try {
        await emit({
          type: "stale_state_warning",
          payload: {
            staleFiles: stale.map((f) => path.relative(root, f)),
            preserved:  true,
          },
          toolName:  "SessionStart",
          cwd,
          sessionId: p.session_id,
          identity:  "monitor",
        });
      } catch { /* best-effort */ }
      const rel = stale.slice(0, 5).map((f) => path.relative(root, f)).join(", ");
      const more = stale.length > 5 ? ` (+${stale.length - 5} more)` : "";
      contextLines.push(
        `stale prior-session state detected (${stale.length} file(s), preserved): ${rel}${more}. Set CLEAN_STATE=1 to reset.`,
      );
    }
  }

  // Preserved v1.0 behavior, now eager-only: recap from events.jsonl snapshot.
  if (eagerContext && fs.existsSync(epath)) {
    try {
      const events = readEvents(epath);
      const snap = foldToSnapshot(events);
      contextLines.push(
        `palantir-mini session started. Prior events.jsonl snapshot: ` +
        `total=${snap.totalEvents}, committed=${snap.edit_committed}, ` +
        `proposed=${snap.edit_proposed}, lastSequence=${snap.lastSequence}.`,
      );

      // W2.1 (sprint-027) — proactive /palantir-mini:pm-recap suggestion when
      // events.jsonl has accumulated meaningful state since prior session.
      // Threshold: ≥10 events total. Closes Agent #3 audit gap (read-side
      // skills entirely dormant — pm-recap had only 2 invocations across 1533
      // events). Per rule 02 §Memory + features.md /recap integration.
      if (snap.totalEvents >= 10) {
        contextLines.push(
          `[skill] Run /palantir-mini:pm-recap for cold-start summary (${snap.totalEvents} prior events; T2+ events fold into BackProp circuit per rule 26).`,
        );
        try {
          const { emitSkillSuggestion } = await import("../lib/skill-suggestion-emit");
          await emitSkillSuggestion({
            suggestedSkillSlug: "pm-recap",
            suggestedByHook:    "session-start",
            triggerCondition:   `events.jsonl has ${snap.totalEvents} prior events (>= 10 threshold)`,
            suggestionContext:  epath,
            memoryLayers:       ["working", "episodic"],
            cwd,
          });
        } catch { /* best-effort */ }
      }
    } catch { /* best-effort */ }
  }

  if (eagerContext) {
    // v3.2.0 G6: live branch resolution. SessionStart now reflects the actual
    // current branch instead of any cached/stale state.
    const branch = liveBranch(cwd);
    if (branch !== null) {
      contextLines.push(`[branch] ${branch}`);
    }
  }

  // v4.3.0 — rule 26 valuable-data substrate advisory. Surfaced at session
  // start when the project has a tracked .palantir-mini/ AND no recent
  // value_grade_metrics audit (>7d). Silent when bypass envvar set.
  if (
    eagerContext &&
    process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS !== "1" &&
    fs.existsSync(path.join(cwd, ".palantir-mini"))
  ) {
    contextLines.push(
      "[rule 26] valuable-data substrate active. T0 envelopes auto-rejected at emit; T2+ feeds outcome-pairing; T3+ feeds BackPropagation circuit. Run /palantir-mini:pm-value-audit for T0-T4 distribution. Bypass: PALANTIR_MINI_VALUE_GRADE_BYPASS=1 (audited).",
    );
  }

  return {
    message: `palantir-mini: session_started event appended at ${epath}`,
    ...(contextLines.length > 0 ? { additionalContext: contextLines.join(" ") } : {}),
  };
}
