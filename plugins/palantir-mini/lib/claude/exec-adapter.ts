/**
 * Claude Hands exec-adapter (thin) — W3e-3b.
 *
 * Claude's exec vocabulary is already the neutral vocabulary, so this adapter is
 * a thin stub: Bash → "shell"; Edit/Write/MultiEdit/NotebookEdit are general file
 * edits (out of v1 — ontology-source edits arrive as OntologyEdit[] on an "edit"
 * step). projectRuntimeDecision preserves all semantic fields and only stamps the
 * runtime tag, so the pre-spawn parity gate passes for a conforming Claude run.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Claude Hands exec-adapter for the neutral Executor (W3e-3b)
 */

import type { RuntimeDecision } from "../../core/contracts/aip-fde-local-surface";
import type { ExecAdapter, RuntimeDecisionProjectionInput } from "../sandbox/adapter";
import type { ExecStep, ExecStepKind } from "../sandbox/contract";

const CLAUDE_SUPPORTED_STEP_KINDS: ReadonlySet<ExecStepKind> = new Set(["shell", "edit"]);

export const CLAUDE_EXEC_ADAPTER: ExecAdapter = {
  runtimeId: "claude",
  supportedStepKinds: CLAUDE_SUPPORTED_STEP_KINDS,

  projectRuntimeDecision({ neutral }: RuntimeDecisionProjectionInput): RuntimeDecision {
    return { ...neutral, runtime: "claude" };
  },

  normalizeNativeStep(nativeToolName, toolInput): ExecStep[] | null {
    if (nativeToolName === "Bash") {
      const command = typeof toolInput.command === "string" ? toolInput.command : "";
      return command ? [{ kind: "shell", command }] : null;
    }
    // Edit/Write/MultiEdit/NotebookEdit are general file edits — out of v1.
    return null;
  },
};
