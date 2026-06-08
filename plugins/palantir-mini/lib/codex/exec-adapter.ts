/**
 * Codex Hands exec-adapter (full) — W3e-3b.
 *
 * GROUNDING (LIVE-verified 2026-06-08): `lib/codex/codex-hook-adapter.ts` is a
 * hook-ROUTING adapter — it RENAMES Codex payloads for hook matching and spawns
 * hook SCRIPTS (`bash -lc`); it never runs an exec itself. So the exec/write
 * DISPATCH here is NEW work; only `collectPatchPaths` (pure) is reused verbatim.
 *
 * v1 maps Codex's native exec vocabulary onto neutral ExecStep[]:
 *   - functions.exec_command / functions.write_stdin → "shell" (argv-safe; run via
 *     Session.run by the executor — NOT `bash -lc`, unlike the hook adapter).
 *   - apply_patch → classified via collectPatchPaths as a general FILE edit, which
 *     is OUT of v1 scope (ontology-source edits arrive as OntologyEdit[] on an
 *     "edit" step, not as text patches) → returns null. The patch-target reuse
 *     seam (`codexPatchTargets`) is retained for W4+ general-file-edit dispatch.
 * Match strings are FULLY-QUALIFIED ("functions.exec_command"/"functions.write_stdin"),
 * matching the hook adapter's own discrimination.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Codex Hands exec-adapter for the neutral Executor (W3e-3b)
 */

import type { RuntimeDecision } from "../../core/contracts/aip-fde-local-surface";
import type { ExecAdapter, RuntimeDecisionProjectionInput } from "../sandbox/adapter";
import type { ExecStep, ExecStepKind } from "../sandbox/contract";
import { collectPatchPaths } from "./codex-hook-adapter";

const CODEX_SUPPORTED_STEP_KINDS: ReadonlySet<ExecStepKind> = new Set(["shell", "edit"]);

/** Reuse of the pure codex-hook-adapter helper: the file paths an apply_patch
 *  envelope touches (Add/Update/Delete/Move). Used to classify apply_patch as a
 *  general file edit (out of v1) and as the W4+ dispatch seam. */
export function codexPatchTargets(command: string | undefined): string[] {
  return collectPatchPaths(command);
}

function commandFromInput(toolInput: Readonly<Record<string, unknown>>): string {
  const command = toolInput.command;
  if (typeof command === "string") return command;
  if (Array.isArray(command)) return command.filter((c) => typeof c === "string").join(" ");
  return "";
}

export const CODEX_EXEC_ADAPTER: ExecAdapter = {
  runtimeId: "codex",
  supportedStepKinds: CODEX_SUPPORTED_STEP_KINDS,

  projectRuntimeDecision({ neutral }: RuntimeDecisionProjectionInput): RuntimeDecision {
    // Semantic fields preserved verbatim; only runtime-specific fields vary.
    return { ...neutral, runtime: "codex" };
  },

  normalizeNativeStep(nativeToolName, toolInput): ExecStep[] | null {
    if (nativeToolName === "functions.exec_command" || nativeToolName === "functions.write_stdin") {
      const command = commandFromInput(toolInput);
      return command ? [{ kind: "shell", command }] : null;
    }
    if (nativeToolName === "apply_patch") {
      // apply_patch = general file edit; classify (reuse) but reject in v1.
      void codexPatchTargets(commandFromInput(toolInput));
      return null;
    }
    return null;
  },
};
