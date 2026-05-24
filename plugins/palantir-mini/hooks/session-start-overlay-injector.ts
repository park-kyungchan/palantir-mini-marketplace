// palantir-mini v4.13.0 — session-start-overlay-injector hook (sprint-061 A.W2.b)
// Fires on: SessionStart (advisory, async)
//
// Builds a compact capsule from the plugin-resident rules overlay on demand.
// Default SessionStart behavior stays token-thin; set
// PALANTIR_MINI_OVERLAY_INJECTOR_EAGER=1 or
// PALANTIR_MINI_SESSION_CONTEXT_MODE=eager to inject the capsule.
//
// Drift detection: compares sha256 of plugin overlay (CORE + BROWSE) against
// the external ~/.claude/rules/ copies.  Hash mismatch → emits advisory event
// runtime_overlay_drift_detected (T2).
//
// Bypass: env PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE=1 (audited).
//
// Authority: sprint-061 A.W2.b; rule 12 §Hook v2 conventions.
// Plan: ~/.claude/plans/inherited-discovering-quill.md §4.A.W2.

import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";
import { emit } from "../scripts/log";
import { buildContextCapsule } from "../lib/runtime-overlay/build-context-capsule";
import { OVERLAY_RULES_DIR, EXTERNAL_RULES_DIR } from "../lib/runtime-overlay/resolve-rule";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:            string;
  decision?:          "continue";
  additionalContext?: string;
}

/** Files to hash for drift detection (CORE + BROWSE). */
const DRIFT_CHECK_FILES = ["CORE.md", "BROWSE.md"] as const;

function eagerContextEnabled(): boolean {
  return (
    process.env["PALANTIR_MINI_OVERLAY_INJECTOR_EAGER"] === "1" ||
    process.env["PALANTIR_MINI_SESSION_CONTEXT_MODE"] === "eager"
  );
}

function fileSha256(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

/**
 * Compare the plugin overlay and external copies of CORE.md + BROWSE.md.
 * Returns an array of file basenames where the hashes differ or one side is
 * missing.  Empty array = no drift.
 */
function detectOverlayDrift(): string[] {
  const driftFiles: string[] = [];
  for (const filename of DRIFT_CHECK_FILES) {
    const overlayHash   = fileSha256(path.join(OVERLAY_RULES_DIR, filename));
    const externalHash  = fileSha256(path.join(EXTERNAL_RULES_DIR, filename));
    // If either is null (missing), that itself is a drift condition.
    if (overlayHash !== externalHash) {
      driftFiles.push(filename);
    }
  }
  return driftFiles;
}

export default async function sessionStartOverlayInjector(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  // ── Bypass ──────────────────────────────────────────────────────────────────
  // sprint-062 W0-α: consolidated 3 fire-and-forget void emit() calls into 1
  // await emit() at the end of each code path, eliminating thundering-herd lock
  // contention on SessionStart (was: ~3 concurrent lock acquisitions).
  if (process.env["PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE"] === "1") {
    // Single awaited emit on bypass path (was previously fire-and-forget)
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     true,
          errorClass: "overlay_injector_bypassed",
        },
        toolName:  "SessionStart",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: "session-start-overlay-injector bypassed via PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE=1 env var (bypassType=PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE, hookName=session-start-overlay-injector, sprint-061 A.W2.b audit trail).",
        memoryLayers: ["procedural"],
      });
    } catch { /* best-effort */ }

    return {
      message:  "palantir-mini: session-start-overlay-injector — disabled (PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE=1)",
      decision: "continue",
    };
  }

  if (!eagerContextEnabled()) {
    return {
      message: "palantir-mini: session-start-overlay-injector — lazy mode (no SessionStart rules capsule injection; read CORE/BROWSE on demand)",
      decision: "continue",
    };
  }

  // ── Drift detection ─────────────────────────────────────────────────────────
  const driftFiles = detectOverlayDrift();
  if (driftFiles.length > 0) {
    // Drift advisory goes to stderr; drift emit is deferred to the single end-of-hook emit
    // to avoid N+1 lock acquisitions (was previously a separate fire-and-forget emit here).
    try {
      process.stderr.write(
        `palantir-mini: session-start-overlay-injector — drift detected in [${driftFiles.join(", ")}]; overlay may be stale.\n`,
      );
    } catch { /* best-effort */ }
  }

  // ── Build capsule ───────────────────────────────────────────────────────────
  let additionalContext: string | undefined;
  let capsuleBuilt = false;

  try {
    const capsule = await buildContextCapsule();
    if (capsule.trim().length > 0) {
      additionalContext = capsule;
      capsuleBuilt = true;
    }
  } catch {
    // best-effort — capsule build failure must not crash SessionStart
  }

  // ── Single consolidated emit at end (mutex hygiene — sprint-062 W0-α) ───────
  // Carries both capsule outcome and drift info in one lock acquisition.
  // Drift detail encoded in errorClass suffix when drift detected.
  const hasDrift = driftFiles.length > 0;
  const errorClass = hasDrift ? "runtime_overlay_drift_detected" : "runtime_overlay_capsule_injected";
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase:      "design",
        passed:     capsuleBuilt && !hasDrift,
        errorClass,
        ...(hasDrift ? { driftFiles } : {}),
      },
      toolName:  "SessionStart",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      reasoning: hasDrift
        ? `runtime_overlay_drift_detected: plugin overlay ${JSON.stringify(driftFiles)} differ from external ~/.claude/rules/; advisory only — runtime still functions via external fallback. capsuleBuilt=${capsuleBuilt}. Ontology-steward should resync runtime-overlay/rules/.`
        : `sprint-061 A.W2.b — SessionStart hook injected plugin-resident rules overlay capsule as additionalContext (capsuleBuilt=${capsuleBuilt}); no drift detected; enables cross-runtime rule resolution without reading external ~/.claude/rules/ at session start.`,
      hypothesis: hasDrift
        ? "Drift occurs when external rules are updated but the plugin overlay copy is not resynced by ontology-steward."
        : "Plugin-resident rule overlay capsule eliminates per-session cold-start rule lookup cost for Lead's first turn.",
      memoryLayers: hasDrift ? ["semantic", "episodic"] : ["procedural", "semantic"],
      ...(hasDrift ? {
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   "runtime-overlay/rules/",
          description:     "plugin overlay rules copy is stale vs external ~/.claude/rules/ source — resync required",
          confidenceLevel: "high",
        },
      } : {}),
    });
  } catch { /* best-effort — never crash SessionStart */ }

  if (!capsuleBuilt) {
    return {
      message:  "palantir-mini: session-start-overlay-injector — capsule build failed (advisory)",
      decision: "continue",
    };
  }

  const driftNote = hasDrift
    ? ` [drift: ${driftFiles.join(", ")} stale]`
    : "";

  return {
    message: `palantir-mini: session-start-overlay-injector — rules overlay capsule injected${driftNote}`,
    decision: "continue",
    additionalContext,
  };
}
