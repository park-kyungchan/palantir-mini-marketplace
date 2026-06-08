/**
 * Neutral Executor/Sandbox contract (Hands layer) — palantir-mini harness
 * redesign W3e-3b.
 *
 * The runtime impl of the `Executor` Tier-2 ActionType modeled in
 * runtime-overlay/schemas-snapshot/ontology/self/executor.actiontype.ts (W3e-3a,
 * M-SELF #2). This file is the DATA contract only — no behavior, no I/O.
 *
 * v1 scope (DESIGN APPROVED, user 2026-06-08): argv-safe shell (via the shipped
 * Session.run) + ontology-source edits (returned as OntologyEdit[] and persisted
 * ONLY through lib/actions/commit.ts:commitEdits). codex full + claude thin
 * adapters; gemini deferred to W4+; pipes/redirects + general-file-edits out of v1.
 *
 * Structural invariant: the Executor CANNOT write the ontology except by returning
 * OntologyEdit[] through commitEdits — NO fs.write* anywhere in the executor. On a
 * failed submission criterion the worktree diff is DISCARDED (cattle, not pets).
 *
 * @owner palantirkc-plugin-actions
 * @purpose Neutral Executor/Sandbox data contract (W3e-3b)
 */

import type { OntologyEdit, EventEnvelope } from "../event-log/types";
import type { SubmissionCriterion, CriterionResult } from "../actions/submission-criteria";
import type { CommitResult } from "../actions/commit";
import type { RuntimeDecisionParityResult } from "../../core/contracts/aip-fde-local-surface";

/**
 * v1 exec-step vocabulary — MUST stay in sync with `EXEC_STEP_KINDS` in the
 * self-model snapshot (…/ontology/self/executor.actiontype.ts). Re-declared
 * locally so the lib never imports the snapshot for a side-effect-free literal;
 * reconciliation with the self-model is enforced by
 * tests/sandbox/executor-write-path.test.ts.
 */
export const EXEC_STEP_KINDS = ["shell", "edit"] as const;
export type ExecStepKind = (typeof EXEC_STEP_KINDS)[number];

/**
 * Hands adapter backing exec dispatch. Mirrors the `runtimeAdapter` parameter of
 * the Executor ActionType ('"codex" | "claude"'); gemini deferred to W4+.
 */
export const RUNTIME_ADAPTER_IDS = ["codex", "claude"] as const;
export type RuntimeAdapterId = (typeof RUNTIME_ADAPTER_IDS)[number];

/**
 * A single step the Executor runs inside the sandbox.
 *  - "shell": an argv-safe command run via Session.run (no pipes/redirects in v1).
 *  - "edit":  ontology-source edits, carried as pre-proposed OntologyEdit[] and
 *             routed through applyEditFunction → commitEdits ONLY.
 */
export type ExecStep =
  | { readonly kind: "shell"; readonly command: string }
  | { readonly kind: "edit"; readonly proposedEdits: readonly OntologyEdit[] };

/** Result of one "shell" step. Mirrors the shipped Session.run return shape. */
export interface ShellStepResult {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
  /** Session.run swallows timeout-kill into exitCode (cannot distinguish a
   *  timeout from a non-zero exit at this layer). */
  readonly exitCode: number;
}

/** Neutral exec request — the Executor's input. */
export interface ExecRequest {
  /** Absolute project root (the commitEdits target + worktree repo root). */
  readonly project: string;
  /** Which Hands adapter backs dispatch (codex full / claude thin). */
  readonly runtimeAdapter: RuntimeAdapterId;
  /** Ordered exec sequence. */
  readonly steps: readonly ExecStep[];
  /** Submission criteria pre-flight; any failure ⇒ REJECTED ⇒ worktree discarded. */
  readonly submissionCriteria?: readonly SubmissionCriterion[];
  /** Defaults to the self-model Executor ActionType RID. */
  readonly actionTypeRid?: string;
  /** Compute the verdict without persisting (mirrors OSDK $validateOnly). */
  readonly validateOnly?: boolean;
  /** Per-shell-step timeout (ms) forwarded to Session.run (default 30_000). */
  readonly shellTimeoutMs?: number;
  /** Optional Decision Lineage overrides forwarded to commitEdits. */
  readonly byWhom?: EventEnvelope["byWhom"];
  readonly throughWhich?: { sessionId?: string; toolName?: string; cwd?: string };
  readonly reasoning?: string;
}

/**
 * Terminal status of an exec run.
 *  - COMMITTED      : all criteria passed, edits persisted via commitEdits.
 *  - REJECTED       : a submission criterion failed; edits NOT persisted; worktree discarded.
 *  - VALIDATE_ONLY  : validateOnly=true; verdict computed, nothing persisted.
 *  - PARITY_BLOCKED : pre-spawn parity gate failed; NO sandbox spawned.
 *  - CAPABILITY_GAP : the chosen adapter cannot serve a requested step kind; NO sandbox spawned.
 */
export type ExecStatus =
  | "COMMITTED"
  | "REJECTED"
  | "VALIDATE_ONLY"
  | "PARITY_BLOCKED"
  | "CAPABILITY_GAP";

/**
 * Minimal structural port over the shipped Hands-layer SandboxClient
 * (runtime-overlay/ontology-shared-core/sandbox-client.ts). The production
 * provider `UnixLocalSandboxClient` satisfies this shape structurally. Declared
 * locally — NOT imported from #shared-core — so the Executor lib stays decoupled
 * from the shared-core compilation graph (Q1a: "contract in lib/sandbox wrapping
 * the shipped SandboxClient"). The concrete provider is INJECTED at the wiring
 * boundary; tests inject a fake.
 */
export interface SandboxManifest {
  readonly manifestId: string;
  readonly entries: readonly unknown[];
  readonly workspaceBase: string;
}

/** Mirrors the shipped `Session` shape (returns ONLY {stdout,stderr,exitCode}). */
export interface SandboxSession {
  readonly id: string;
  readonly worktreePath: string;
  readonly branch: string;
  run(
    command: string,
    options?: { timeoutMs?: number; env?: Record<string, string> },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

/** Mirrors the shipped `SandboxClient.create`/`close` surface the Executor uses. */
export interface SandboxClientPort {
  create(manifest: SandboxManifest): Promise<SandboxSession>;
  close(session: SandboxSession): Promise<void>;
}

/** Executor result. */
export interface ExecResult {
  readonly status: ExecStatus;
  readonly committed: boolean;
  readonly shellResults: readonly ShellStepResult[];
  /** Present once the run reached the commit stage. */
  readonly commit?: CommitResult;
  /** Per-criterion verdicts (mirrors commit when present). */
  readonly perCriterionResult?: readonly CriterionResult[];
  /** Present when the pre-spawn parity gate ran. */
  readonly parity?: RuntimeDecisionParityResult;
  /** Step kinds the chosen adapter could not serve (CAPABILITY_GAP). */
  readonly unsupportedStepKinds?: readonly ExecStepKind[];
  /** True once the worktree/session was discarded (cattle, not pets). */
  readonly worktreeDiscarded: boolean;
}
