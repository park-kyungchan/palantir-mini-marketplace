/**
 * Neutral Executor (Hands layer) — W3e-3b.
 *
 * The runtime impl of the `Executor` Tier-2 ActionType (W3e-3a self-model). It
 * COMPOSES three shipped primitives — it does NOT invent a write engine:
 *   1. SandboxSession.run     (SandboxClientPort over the shipped SandboxClient) — argv-safe shell.
 *   2. applyEditFunction      (lib/actions/tier2-function)  — pure edit compute.
 *   3. commitEdits            (lib/actions/commit)          — the SOLE persist path.
 *
 * Flow: build neutral decision → compareRuntimeDecisionParity pre-spawn gate →
 * capability fallback (chosen adapter must serve every step kind) → materialize
 * the worktree → run shell via Session.run + route every edit step through
 * applyEditFunction → commitEdits ONLY → ALWAYS discard the worktree (cattle, not
 * pets). On a failed submission criterion the result is REJECTED and the edits are
 * never persisted. There is NO fs.write* anywhere in this module.
 *
 * The SandboxClientPort (lib/sandbox/contract.ts) is a local structural mirror of
 * the shipped runtime-overlay/ontology-shared-core/sandbox-client.ts SandboxClient;
 * the production `UnixLocalSandboxClient` is INJECTED at the wiring boundary so the
 * lib stays decoupled from the shared-core compilation graph.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Neutral Executor runtime — composes Session.run + EditFunction + commitEdits (W3e-3b)
 */

import type { OntologyEdit } from "../event-log/types";
import { applyEditFunction } from "../actions/tier2-function";
import { commitEdits, type CommitRequest } from "../actions/commit";
import { compareRuntimeDecisionParity } from "../runtime/surface-decision-parity";
import { CLAUDE_EXEC_ADAPTER } from "../claude/exec-adapter";
import { CODEX_EXEC_ADAPTER } from "../codex/exec-adapter";
import type { ExecAdapter } from "./adapter";
import { neutralExecDecision } from "./adapter";
// Side-effect import: registers the "pm.sandbox.executor.applyEditSteps" function.
import { EXECUTOR_EDIT_FUNCTION_NAME, type ApplyEditStepsParams } from "./edit-functions";
import type {
  ExecRequest,
  ExecResult,
  ExecStatus,
  ExecStepKind,
  SandboxClientPort,
  SandboxManifest,
  ShellStepResult,
} from "./contract";

/**
 * Runtime-side RID for the Executor ActionType. This is the SAME stable string the
 * self-model snapshot computes via `actionTypeRid("pm.self.ontology/action-type/executor")`;
 * pinned here (a stable identifier, not a volatile fact) to keep the lib decoupled
 * from the snapshot's register side-effect. Equality with the snapshot's
 * EXECUTOR_ACTION_TYPE_RID is asserted in tests/sandbox/executor-write-path.test.ts.
 */
export const EXECUTOR_ACTION_TYPE_RID = "pm.self.ontology/action-type/executor";

/** Injectable dependencies. `sandboxClient` is the only one without a default
 *  (the concrete provider is wired at the boundary); the rest default to the
 *  shipped primitives and are overridden in tests. */
export interface ExecutorDeps {
  readonly sandboxClient: SandboxClientPort;
  readonly commit?: typeof commitEdits;
  readonly applyEdit?: typeof applyEditFunction;
  readonly adapters?: { readonly claude: ExecAdapter; readonly codex: ExecAdapter };
}

/** Minimal worktree manifest — no materialization entries in v1. */
function buildManifest(): SandboxManifest {
  return {
    manifestId: "pm.sandbox.executor",
    entries: [],
    workspaceBase: "/workspace",
  };
}

/**
 * Run a neutral exec sequence. See module header for the flow + invariants.
 */
export async function runExecutor(request: ExecRequest, deps: ExecutorDeps): Promise<ExecResult> {
  const adapters = deps.adapters ?? { claude: CLAUDE_EXEC_ADAPTER, codex: CODEX_EXEC_ADAPTER };
  const chosen = request.runtimeAdapter === "codex" ? adapters.codex : adapters.claude;
  const commitFn = deps.commit ?? commitEdits;
  const applyEditFn = deps.applyEdit ?? applyEditFunction;

  // 1. Pre-spawn parity gate — block if any runtime diverges on a compared field.
  const neutral = neutralExecDecision(request);
  const parity = compareRuntimeDecisionParity({
    neutral,
    claude: adapters.claude.projectRuntimeDecision({ request, neutral }),
    codex: adapters.codex.projectRuntimeDecision({ request, neutral }),
  });
  if (parity.status === "fail") {
    return { status: "PARITY_BLOCKED", committed: false, shellResults: [], parity, worktreeDiscarded: false };
  }

  // 2. Capability fallback — the chosen adapter must serve every requested step kind.
  const requestedKinds = [...new Set(request.steps.map((step) => step.kind))];
  const unsupportedStepKinds: ExecStepKind[] = requestedKinds.filter(
    (kind) => !chosen.supportedStepKinds.has(kind),
  );
  if (unsupportedStepKinds.length > 0) {
    return {
      status: "CAPABILITY_GAP",
      committed: false,
      shellResults: [],
      parity,
      unsupportedStepKinds,
      worktreeDiscarded: false,
    };
  }

  // 3. Materialize the sandbox worktree (branch-required isolation).
  const session = await deps.sandboxClient.create(buildManifest());
  const shellResults: ShellStepResult[] = [];
  const edits: OntologyEdit[] = [];
  try {
    // 4. Run steps: shell via Session.run; edit via applyEditFunction (NO fs.write*).
    for (const step of request.steps) {
      if (step.kind === "shell") {
        const runOptions = request.shellTimeoutMs !== undefined ? { timeoutMs: request.shellTimeoutMs } : undefined;
        const r = await session.run(step.command, runOptions);
        shellResults.push({ command: step.command, stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode });
      } else {
        const params: ApplyEditStepsParams = { proposedEdits: step.proposedEdits };
        const applied = await applyEditFn(EXECUTOR_EDIT_FUNCTION_NAME, params);
        edits.push(...applied.edits);
      }
    }

    // 5. Commit ATOMICALLY — the ONLY ontology persist path (criteria pre-flight).
    const commitReq: CommitRequest = {
      project: request.project,
      actionTypeRid: request.actionTypeRid ?? EXECUTOR_ACTION_TYPE_RID,
      edits,
      submissionCriteria: request.submissionCriteria ? [...request.submissionCriteria] : undefined,
      validateOnly: request.validateOnly,
      byWhom: request.byWhom,
      throughWhich: request.throughWhich ?? { toolName: "pm.sandbox.executor" },
      reasoning: request.reasoning,
    };
    const commit = await commitFn(commitReq);

    const status: ExecStatus = commit.committed
      ? "COMMITTED"
      : commit.eventType === "none"
        ? "VALIDATE_ONLY"
        : "REJECTED";
    return {
      status,
      committed: commit.committed,
      shellResults,
      commit,
      perCriterionResult: commit.perCriterionResult,
      parity,
      worktreeDiscarded: true,
    };
  } finally {
    // 6. Cattle, not pets — ALWAYS discard the worktree. The ontology persists
    //    only as the commitEdits event, never as worktree files.
    await deps.sandboxClient.close(session);
  }
}
