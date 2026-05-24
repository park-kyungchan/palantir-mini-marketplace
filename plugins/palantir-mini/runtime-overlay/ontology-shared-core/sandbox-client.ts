/**
 * @stable — SandboxClient + UnixLocalSandboxClient (hands-layer-01, v1.0.0)
 *
 * Hands layer abstraction — provider-neutral interface for sandbox session
 * lifecycle management. Mirrors the OpenAI Agents SDK Manifest + Session
 * model (April 2026 launch) adapted for the Claude Code CLI harness species.
 *
 * The Lance Martin Brain/Hands/Session model (2026-04-08):
 *   Brain  = model + harness species (thinking / deciding)
 *   Hands  = sandbox executor (action — *cattle, not pets*)
 *   Session = append-only events.jsonl (state — swappable independently)
 *
 * `UnixLocalSandboxClient` implements the Hands layer for the unix-local
 * provider: `git worktree add` / `git worktree remove`. This matches the
 * existing `Agent({isolation: "worktree"})` semantics from rule 16 v4.1.0
 * §Worktree isolation (W1.C precedent). Future adapters (E2B, Modal, Vercel,
 * Cloudflare) implement the same `SandboxClient` interface without changing
 * agent code.
 *
 * Hard constraints:
 *   - NO `@anthropic-ai/sdk` import.
 *   - NO `bash -c` shell-outs (execFileSync with argv array only).
 *   - `dst` path traversal rejected: no leading `/`, no `..` segment.
 *   - Cloud storage mounts (S3/GCS/R2) throw not-supported in unix-local.
 *
 * Authority chain:
 *   research/openai/sandbox-agents-developer-docs.md (Session + Manifest)
 *   research/anthropic/scaling-managed-agents-2026-04-08.md (Hands model)
 *     ↓
 *   plans/mellow-plotting-oasis.md §Wave 3 W3.C
 *     ↓
 *   schemas/ontology/primitives/hands-manifest.ts (HandsManifestDeclaration)
 *     ↓
 *   ontology/shared-core/sandbox-client.ts (this file)
 *
 * Rule cross-refs:
 *   rule 16 v4.1.0 §Worktree isolation (cattle-not-pets at Hands layer)
 *   rule 26 v1.0.0 §Axis D1 (provider-neutral; shareable)
 *   rule 10 v2.1.0 (append-only events.jsonl — no side-effects from close)
 *
 * @owner palantirkc-ontology
 * @purpose Provider-neutral Hands layer session lifecycle (W3.C sprint-049)
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type { HandsManifestDeclaration } from "@palantirKC/claude-schemas/ontology/primitives/hands-manifest";
import { validateHandsManifest } from "@palantirKC/claude-schemas/ontology/primitives/hands-manifest";

export type { HandsManifestDeclaration };

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Serialized snapshot of a sandbox session. Used by `resume` to reconstruct
 * a session from a prior run or after context compaction.
 */
export interface SerializedSessionState {
  /** ISO8601 — when serialize was called. */
  when: string;
  /** Worktree path on disk at serialize time. */
  worktreePath: string;
  /** Branch name in the worktree. */
  branch: string;
  /** Git commit SHA at serialize time (HEAD of branch). */
  commitSha: string;
  /** Manifest used to create the session (for reproducibility). */
  manifest: HandsManifestDeclaration;
}

/**
 * A running sandbox session. Thin wrapper over a worktree or container path.
 * Agents call `run()` to execute shell commands inside the session.
 */
export interface Session {
  readonly id: string;
  readonly worktreePath: string;
  readonly branch: string;
  /** Run a shell command in the worktree; returns { stdout, stderr, exitCode }. */
  run(
    command: string,
    options?: { timeoutMs?: number; env?: Record<string, string> },
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

/**
 * Provider-neutral sandbox client interface. Implementations: UnixLocalSandboxClient
 * (this file); future adapters: E2B, Modal, Vercel, Cloudflare (deferred W3.C+).
 *
 * Rule 26 §Axis D1: provider-neutral contract — agent code depends only on
 * this interface, not on the concrete adapter. Swap the provider by
 * swapping the SandboxClient instance.
 */
export interface SandboxClient {
  readonly providerName:
    | "unix-local"
    | "e2b"
    | "modal"
    | "vercel"
    | "cloudflare"
    | (string & {});

  /** Create a new sandbox session, materializing manifest entries. */
  create(manifest: HandsManifestDeclaration): Promise<Session>;

  /** Resume a previously serialized session. */
  resume(state: SerializedSessionState): Promise<Session>;

  /** Serialize the current state of a session for later `resume`. */
  serializeSessionState(session: Session): Promise<SerializedSessionState>;

  /** Destroy a session. Idempotent — second call on same session is graceful. */
  close(session: Session): Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal implementation types
// ---------------------------------------------------------------------------

/** Internal session record (extends public Session). */
interface InternalSession extends Session {
  readonly _manifest: HandsManifestDeclaration;
  readonly _sessionEnv: Record<string, string>;
  _closed: boolean;
}

// ---------------------------------------------------------------------------
// UnixLocalSandboxClient
// ---------------------------------------------------------------------------

/**
 * Unix-local sandbox client — wraps `git worktree add` / `git worktree remove`.
 * Matches existing `Agent({isolation: "worktree"})` semantics from
 * rule 16 v4.1.0 §Worktree isolation (W1.C precedent).
 *
 * Each `create()` call:
 *   1. Validates the manifest (no `..`, no absolute dst paths).
 *   2. Assigns a session ID via `crypto.randomUUID()`.
 *   3. Calls `git worktree add <path> -b agent/<sessionId-prefix>`.
 *   4. Materializes `LocalDir` entries (cp -r) + `GitRepo` entries (git clone).
 *   5. Collects `EnvVar` entries into the session env map.
 *   6. Returns a Session pointing at the worktree.
 *
 * Cloud storage mounts (S3/GCS/R2) are NOT supported in unix-local — throws
 * `Error("UnixLocalSandboxClient does not support cloud storage mounts")`.
 */
export class UnixLocalSandboxClient implements SandboxClient {
  readonly providerName = "unix-local" as const;

  private readonly repoRoot: string;
  private readonly worktreesParent: string;

  /** Track open sessions — maps session.id → InternalSession. */
  private readonly _sessions = new Map<string, InternalSession>();

  constructor(
    cfg: {
      /**
       * Repo root holding the .git directory.
       * Defaults to `process.cwd()`.
       */
      repoRoot?: string;
      /**
       * Parent directory under which worktrees are created.
       * Defaults to `<repoRoot>/.claude/worktrees/`.
       */
      worktreesParent?: string;
    } = {},
  ) {
    this.repoRoot = cfg.repoRoot ?? process.cwd();
    this.worktreesParent =
      cfg.worktreesParent ?? path.join(this.repoRoot, ".claude", "worktrees");
  }

  // -------------------------------------------------------------------------
  // SandboxClient implementation
  // -------------------------------------------------------------------------

  async create(manifest: HandsManifestDeclaration): Promise<Session> {
    // 1. Validate manifest
    const validation = validateHandsManifest(manifest);
    if (!validation.valid) {
      throw new Error(
        `HandsManifest validation failed:\n${validation.errors.join("\n")}`,
      );
    }

    // Reject cloud storage mounts early
    for (const entry of manifest.entries) {
      if (
        entry.kind === "s3-mount" ||
        entry.kind === "gcs-mount" ||
        entry.kind === "r2-mount"
      ) {
        throw new Error(
          "UnixLocalSandboxClient does not support cloud storage mounts",
        );
      }
    }

    // 2. Assign session ID
    const sessionId = crypto.randomUUID();
    const branchName = `agent/${sessionId.slice(0, 8)}`;

    // 3. Create worktree directory
    fs.mkdirSync(this.worktreesParent, { recursive: true });
    const worktreePath = path.join(this.worktreesParent, sessionId);

    // Add the worktree with a new branch
    gitExec(
      this.repoRoot,
      ["worktree", "add", worktreePath, "-b", branchName],
    );

    // 4. Materialize entries
    const sessionEnv: Record<string, string> = {};
    for (const entry of manifest.entries) {
      if (entry.kind === "local-dir") {
        const dstAbs = path.join(worktreePath, entry.dst);
        fs.mkdirSync(path.dirname(dstAbs), { recursive: true });
        cpRecursive(entry.src, dstAbs);
      } else if (entry.kind === "git-repo") {
        const dstAbs = path.join(worktreePath, entry.dst);
        fs.mkdirSync(path.dirname(dstAbs), { recursive: true });
        const cloneArgs: string[] = ["clone", entry.url, dstAbs];
        if (entry.ref) {
          cloneArgs.push("--branch", entry.ref);
        }
        gitExec(worktreePath, cloneArgs);
      } else if (entry.kind === "env-var") {
        sessionEnv[entry.name] = entry.value;
      }
      // s3/gcs/r2 rejected above
    }

    // 5. Build and return Session
    const session = buildSession(
      sessionId,
      branchName,
      worktreePath,
      manifest,
      sessionEnv,
    );
    this._sessions.set(sessionId, session);
    return session;
  }

  async resume(state: SerializedSessionState): Promise<Session> {
    // Re-use an already-open session if present
    for (const [, s] of this._sessions) {
      if (
        s.worktreePath === state.worktreePath &&
        s.branch === state.branch &&
        !s._closed
      ) {
        return s;
      }
    }

    // Check if the worktree path exists; if not, recreate it
    if (!fs.existsSync(state.worktreePath)) {
      fs.mkdirSync(this.worktreesParent, { recursive: true });
      gitExec(this.repoRoot, [
        "worktree",
        "add",
        state.worktreePath,
        state.branch,
      ]);
    }

    // Checkout the exact commit SHA from the serialized state
    gitExec(state.worktreePath, ["checkout", state.commitSha]);

    const sessionId = crypto.randomUUID();
    const sessionEnv: Record<string, string> = {};
    for (const entry of state.manifest.entries) {
      if (entry.kind === "env-var") {
        sessionEnv[entry.name] = entry.value;
      }
    }

    const session = buildSession(
      sessionId,
      state.branch,
      state.worktreePath,
      state.manifest,
      sessionEnv,
    );
    this._sessions.set(sessionId, session);
    return session;
  }

  async serializeSessionState(session: Session): Promise<SerializedSessionState> {
    const internal = session as InternalSession;

    // Read HEAD commit SHA from worktree
    const commitSha = gitExec(internal.worktreePath, [
      "rev-parse",
      "HEAD",
    ]).trim();

    return {
      when: new Date().toISOString(),
      worktreePath: internal.worktreePath,
      branch: internal.branch,
      commitSha,
      manifest: internal._manifest,
    };
  }

  async close(session: Session): Promise<void> {
    const internal = session as InternalSession;
    if (internal._closed) {
      // Idempotent — already closed
      return;
    }
    internal._closed = true;
    this._sessions.delete(internal.id);

    if (fs.existsSync(internal.worktreePath)) {
      const result = gitExecRaw(this.repoRoot, [
        "worktree",
        "remove",
        "--force",
        internal.worktreePath,
      ]);
      if (result.exitCode !== 0) {
        throw new Error(
          `git worktree remove failed: ${result.stderr}`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Execute a git command synchronously. Throws on non-zero exit code.
 * Uses execFileSync with an explicit argv array — never `bash -c`.
 */
function gitExec(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }) as string;
  } catch (err: unknown) {
    const e = err as { stderr?: unknown; status?: number };
    const stderr = typeof e.stderr === "string" ? e.stderr : String(err);
    throw new Error(`git ${args[0]} failed (exit ${e.status ?? "?"}): ${stderr}`);
  }
}

/**
 * Execute a git command synchronously. Returns { stdout, stderr, exitCode }.
 * Never throws — caller inspects exitCode.
 */
function gitExecRaw(
  cwd: string,
  args: string[],
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }) as string;
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stderr?: unknown; stdout?: unknown; status?: number };
    const stderr = typeof e.stderr === "string" ? e.stderr : "";
    const stdout = typeof e.stdout === "string" ? e.stdout : "";
    return { stdout, stderr, exitCode: e.status ?? 1 };
  }
}

/**
 * Recursively copy `src` directory to `dst`.
 * Uses fs.cpSync (Node 16.7+); falls back to execFileSync cp -r.
 */
function cpRecursive(src: string, dst: string): void {
  if (typeof (fs as { cpSync?: unknown }).cpSync === "function") {
    (fs as { cpSync: (a: string, b: string, opts: { recursive: boolean }) => void }).cpSync(
      src,
      dst,
      { recursive: true },
    );
  } else {
    execFileSync("cp", ["-r", src, dst], { stdio: "inherit" });
  }
}

/**
 * Build an InternalSession from constituent parts.
 */
function buildSession(
  id: string,
  branch: string,
  worktreePath: string,
  manifest: HandsManifestDeclaration,
  sessionEnv: Record<string, string>,
): InternalSession {
  const session: InternalSession = {
    id,
    branch,
    worktreePath,
    _manifest: manifest,
    _sessionEnv: sessionEnv,
    _closed: false,

    async run(
      command: string,
      options: { timeoutMs?: number; env?: Record<string, string> } = {},
    ) {
      if (session._closed) {
        throw new Error(`Session ${id} is closed`);
      }
      // Parse command into argv array (simple whitespace split — no shell interpolation)
      const argv = command.trim().split(/\s+/);
      if (argv.length === 0 || argv[0] === "") {
        throw new Error("run: command must not be empty");
      }
      const [prog, ...progArgs] = argv;

      // eslint-disable-next-line no-undef
      const procEnv = (typeof process !== "undefined" ? process.env : {}) as Record<string, string>;
      const mergedEnv: Record<string, string> = {
        ...procEnv,
        ...session._sessionEnv,
        ...(options.env ?? {}),
      };

      const timeout = options.timeoutMs ?? 30_000;

      try {
        const stdout = execFileSync(prog, progArgs, {
          cwd: worktreePath,
          encoding: "utf8",
          timeout,
          env: mergedEnv,
          stdio: ["ignore", "pipe", "pipe"],
        }) as string;
        return { stdout, stderr: "", exitCode: 0 };
      } catch (err: unknown) {
        const e = err as { stderr?: unknown; stdout?: unknown; status?: number };
        const stderr = typeof e.stderr === "string" ? e.stderr : "";
        const stdout = typeof e.stdout === "string" ? e.stdout : "";
        return { stdout, stderr, exitCode: e.status ?? 1 };
      }
    },
  };
  return session;
}
