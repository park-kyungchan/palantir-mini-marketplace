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
import * as os from "os";
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
import { markPending, listPending, isQueueOperationTranscript, type PendingFoldEntry } from "../lib/second-brain/pending-fold";
import { a2PriorContextLine } from "../lib/runtime-overlay/a2-prior";
import {
  detectNativeSubagentCapability,
  type NativeSubagentCapability,
} from "../lib/runtime/claude-version-capability";
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

/**
 * Build the second-brain fold-trigger additionalContext line (P1-2). Returns a
 * single self-contained instruction the model acts on by dispatching the
 * palantir-mini:second-brain-fold subagent ONCE PER pending session. The id list
 * and the structured Transcripts tail are each capped at 5 (rest via the CLI).
 * Caller injects ONLY when pend.length > 0.
 *
 * The NATIVE variant (default) dispatches the subagent via the Agent tool; that
 * native/background-subagent dispatch needs Claude Code >= MIN_NATIVE_SUBAGENT_VERSION
 * (SubagentStart/SubagentStop lifecycle). When a live `claude --version` gate reports
 * the CLI is unavailable/too-old, callers pass mode "cli-fallback" to emit the
 * engine-direct (CliLlmClient) fold instruction instead — same engine, no subagent
 * round-trip. Selection is centralized in selectFoldTriggerContext().
 */
export function buildFoldTriggerContext(
  pend: PendingFoldEntry[],
  root: string,
  mode: "native" | "cli-fallback" = "native",
): string {
  const CAP = 5;
  const ids = pend.map((e) => e.sessionId);
  const shownIds = ids.slice(0, CAP).join(", ");
  const moreIds = ids.length > CAP ? ` (+${ids.length - CAP} more)` : "";
  const transcripts = pend
    .slice(0, CAP)
    .map((e) => `${e.sessionId}=${e.transcriptPath}`)
    .join("; ");
  const moreTr = pend.length > CAP ? ` (+${pend.length - CAP} more)` : "";
  const detected =
    `[second-brain] ${pend.length} unfolded session transcript(s) detected (${shownIds}${moreIds}). `;
  const tail =
    `Transcripts: ${transcripts}${moreTr} (full list: bun run ${root}/<plugin>/lib/second-brain/pending-fold-cli.ts list ${root}).`;

  if (mode === "cli-fallback") {
    return (
      detected +
      `Your Claude CLI does not support native/background subagent dispatch, so fold via the CLI engine-direct path INSTEAD of the Agent tool: ` +
      `run \`bun run ${root}/second-brain/scripts/fold.ts --transcript <transcriptPath> --session <sessionId> --project ${root}\` ONCE PER session, ` +
      `serving the engine's file-backed LLM requests yourself, then forward the engine's { verdicts, summary } stdout through ` +
      `mcp__palantir-mini__emit_event (one event per verdict + the summary). After each succeeds, the pending bookmark auto-clears; if you skip this, the next ` +
      `session start will re-detect. ` +
      tail
    );
  }

  return (
    detected +
    `To fold them into this project's knowledge graph, dispatch the palantir-mini:second-brain-fold subagent (Agent tool) ` +
    `ONCE PER session, passing { sessionId, transcriptPath, projectRoot:"${root}" } in the delegation message. ` +
    `The subagent runs second-brain/scripts/fold.ts in model-fed mode and emits resolution_verdict + memory_fold_committed ` +
    `via mcp__palantir-mini__emit_event. After each succeeds, the pending bookmark auto-clears; if you skip this, the next ` +
    `session start will re-detect. On Codex, instead use the file-backed spawn-prompt orchestration to run the same fold command. ` +
    tail
  );
}

/**
 * Live capability-gated selector (P2-9/F9). Runs the `claude --version` gate and
 * returns the native fold-trigger when the CLI supports background/native subagents,
 * or the CLI engine-direct (CliLlmClient) fallback trigger otherwise. The capability
 * probe is injectable so tests pin the version path without spawning a binary.
 */
export function selectFoldTriggerContext(
  pend: PendingFoldEntry[],
  root: string,
  capability: NativeSubagentCapability = detectNativeSubagentCapability(),
): string {
  return buildFoldTriggerContext(pend, root, capability.supported ? "native" : "cli-fallback");
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

  // P1 fix (eager-gate defect): the second-brain fold DETECT+INJECT runs on EVERY
  // SessionStart (lightweight fs-only), independent of eagerContext. Only the heavy
  // cold-start/eager context injection above stays eager-gated (finding D-7).
  // Second-brain DETECT + INJECT (P1-2) — additive, best-effort, NO LLM here.
  // The LLM fold runs on the MODEL turn: this block detects unfolded transcripts
  // and injects a fold-trigger into additionalContext that tells the model to
  // dispatch the palantir-mini:second-brain-fold subagent (which runs the engine
  // model-fed + emits via the gated MCP emit_event path). We also back-fill the
  // pending bookmark for any transcript whose Stop hook never ran (crash-before-
  // Stop) — still deterministic, no engine spawn. A detect error MUST NOT break
  // session-start — the whole block is its own try/catch.
  try {
    const enginePath = path.join(root, "second-brain", "scripts", "fold.ts");
    if (fs.existsSync(enginePath)) {
      const slug = path.resolve(root).split(path.sep).join("-");
      const projectsDir = path.join(os.homedir(), ".claude", "projects", slug);
      if (fs.existsSync(projectsDir)) {
        let folded: Record<string, unknown> = {};
        try {
          const manifestPath = path.join(root, "second-brain", "manifest.json");
          if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
              foldedSessions?: Record<string, unknown>;
            };
            folded = manifest.foldedSessions ?? {};
          }
        } catch { /* best-effort — treat as nothing folded */ }

        // Back-fill: bookmark any unfolded transcript not already pending (covers
        // crash-before-Stop). Deterministic — no engine, no LLM.
        let alreadyPending: Record<string, PendingFoldEntry> = {};
        try {
          const { readPendingFold, pendingFoldPath } = await import("../lib/second-brain/pending-fold");
          alreadyPending = readPendingFold(pendingFoldPath(root)).pending;
        } catch { /* best-effort */ }

        const transcripts = fs
          .readdirSync(projectsDir)
          .filter((f) => f.endsWith(".jsonl"))
          .map((f) => ({ sessionId: f.slice(0, -".jsonl".length), file: path.join(projectsDir, f) }))
          .filter((t) => !(t.sessionId in folded))
          // Exclude the fold engine's own CLI-extraction byproducts (first line
          // {type:"queue-operation"}) so detect never self-feeds. Best-effort: a
          // read/parse error returns false → a real session is never dropped.
          .filter((t) => !isQueueOperationTranscript(t.file));

        for (const t of transcripts) {
          if (t.sessionId in alreadyPending) continue;
          try {
            markPending(root, {
              sessionId:      t.sessionId,
              transcriptPath: t.file,
              bookmarkedAt:   new Date().toISOString(),
              runtime:        "monitor", // back-filled at session-start, not the Stop runtime
            });
          } catch { /* per-transcript best-effort */ }
        }

        // Actionable set: pending entries whose sessionId is NOT already folded.
        const pend = listPending(root);
        if (pend.length > 0) {
          // P2-9/F9: live `claude --version` gate selects native subagent dispatch
          // vs the CLI engine-direct (CliLlmClient) fallback. A gate failure must
          // NOT break detect — selectFoldTriggerContext defaults to a best-effort
          // probe that returns the CLI-fallback trigger when the CLI is unavailable.
          contextLines.push(selectFoldTriggerContext(pend, root));
        }
      }
    }
  } catch (err) {
    process.stderr.write(`[session-start] second-brain detect skipped: ${(err as Error).message}\n`);
  }

  // Sink-1 READ (A2-prior): surface the prior session's high-signal verdicts as ONE
  // compact additionalContext line. Pushed UNCONDITIONALLY (independent of eagerContext),
  // mirroring the second-brain fold-detect push above — the A2 consumption point must
  // fire every SessionStart so a fresh T2 lead_decision surfaces NEXT session BY TYPE
  // before any promotion grades it. Tail-only + read-only + best-effort: an empty/missing
  // log yields "" (not pushed) and a read error never breaks session-start.
  try {
    const a2line = a2PriorContextLine(epath);
    if (a2line.length > 0) {
      contextLines.push(a2line);
    }
  } catch (err) {
    process.stderr.write(`[session-start] a2-prior skipped: ${(err as Error).message}\n`);
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

  // FIX-FOLD-WIRING: Claude honors SessionStart additionalContext ONLY at
  // hookSpecificOutput.additionalContext (nested, hookEventName "SessionStart").
  // The generic dispatcher (scripts/run.ts) serializes this return verbatim, so a
  // TOP-LEVEL additionalContext field is silently dropped and the second-brain
  // fold loop never closes. Mirror the WORKING UserPromptSubmit shape from
  // prompt-front-door-capture.ts and ride contextLines via the nested object.
  return {
    message: `palantir-mini: session_started event appended at ${epath}`,
    ...(contextLines.length > 0
      ? {
          hookSpecificOutput: {
            hookEventName: "SessionStart" as const,
            additionalContext: contextLines.join(" "),
          },
        }
      : {}),
  };
}
