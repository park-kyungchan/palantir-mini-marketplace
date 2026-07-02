// palantir-mini v6.26.0 — PreToolUse hook: write-scope-runtime-enforce
// Verifies Edit/Write/MultiEdit target paths against the calling subagent's
// declared writable root.
//
// Per canonical plan v2 §4 row 5.7 + the former sprint-harness policy v4.1.0 §Roles worktree isolation.
//
// Resolution order for writable root:
//   1. If CLAUDE_WORKTREE_PATH env var is set → use that path as writable root.
//   2. Else read <projectRoot>/.palantir-mini/project-scope.json#writableRoot.
//   3. Else (no scope file or Lead-direct) → no restriction (return early).
//
// Enforcement:
//   - Advisory on first 1-3 violations in this session.
//   - Blocking (permissionDecision="deny") on 4th+ violation.
//   - Strike counter stored at <projectRoot>/.palantir-mini/session/write-scope-strikes.json.
//   - Bypass envvar: PALANTIR_MINI_WRITE_SCOPE_BYPASS=1 (audited).
//
// Lead-direct (agentName="claude-code" or no subagent_type) is always exempt.
//
// Authority:
//   canonical plan v2 §4 row 5.7
//   the former sprint-harness policy v4.1.0 §Roles (isolation: "worktree" on generator-tier agents)
//   Lance Martin "Scaling Managed Agents" 2026-04-08 (cattle-not-pets principle)

import * as fs   from "fs";
import * as os   from "os";
import * as path from "path";
import { emit }           from "../scripts/log";
import { loadProjectScope } from "../lib/project-scope/loader";
import { findProjectRoot, isExcludedProjectRoot } from "../lib/project/find-root";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:           string;
  session_id?:    string;
  tool_name?:     string;
  tool_input?:    {
    file_path?:   string;
    edits?:       Array<{ file_path?: string }>;
    [key: string]: unknown;
  };
  byWhom?: {
    agentName?: string;
    identity?:  string;
  };
  agent_name?:    string;
  subagent_type?: string;
}

interface StrikeState {
  count:      number;
  sessionId:  string;
  lastViolation: string;
}

interface HookResult {
  message:  string;
  decision?: "continue" | "block";
  reason?:   string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
    additionalContext?:        string;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Violations before escalating to blocking (4th attempt blocks). */
const ADVISORY_THRESHOLD = 3;

/** Lead-direct identification: claude-code or unqualified no-subagent context. */
const LEAD_AGENT_NAMES = new Set(["claude-code"]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true when the edit originates from Lead-direct context (not a subagent). */
function isLeadDirect(p: HookPayload): boolean {
  const agentName    = p.byWhom?.agentName ?? p.agent_name;
  const subagentType = p.subagent_type;

  if (agentName && LEAD_AGENT_NAMES.has(agentName)) return true;
  // No agent name and no subagent_type → infer Lead-direct
  if (!agentName && !subagentType) return true;
  return false;
}

/**
 * Normalize a file path: expand ~ prefix, make absolute relative to cwd.
 */
function resolveAbsPath(filePath: string, cwd: string): string {
  const home = process.env.HOME ?? os.homedir();
  if (filePath.startsWith("~/")) {
    return path.resolve(home, filePath.slice(2));
  }
  if (!path.isAbsolute(filePath)) {
    return path.resolve(cwd, filePath);
  }
  return filePath;
}

/**
 * Extract all target file paths from the tool_input, supporting
 * Edit/Write (file_path) and MultiEdit (edits[].file_path).
 */
function extractTargetPaths(p: HookPayload): string[] {
  const inp = p.tool_input ?? {};
  const paths: string[] = [];

  // Edit / Write: single file_path
  if (typeof inp.file_path === "string" && inp.file_path.length > 0) {
    paths.push(inp.file_path);
  }

  // MultiEdit: array of edits each with file_path
  if (Array.isArray(inp.edits)) {
    for (const edit of inp.edits) {
      if (edit && typeof edit.file_path === "string" && edit.file_path.length > 0) {
        paths.push(edit.file_path);
      }
    }
  }

  return paths;
}

/**
 * Resolve the writable root for the current subagent.
 *
 * Resolution order:
 *   1. CLAUDE_WORKTREE_PATH env var (set by Claude Code's worktree isolation).
 *   2. project-scope.json#writableRoot (project-declared boundary).
 *   3. null → caller should skip enforcement.
 */
function resolveWritableRoot(projectRoot: string): string | null {
  // 1. Worktree path from env (Claude Code native worktree isolation)
  const worktreePath = process.env["CLAUDE_WORKTREE_PATH"];
  if (worktreePath && worktreePath.length > 0) {
    return path.resolve(worktreePath);
  }

  // 2. project-scope.json writableRoot
  try {
    const scope = loadProjectScope(projectRoot);
    if (scope.writableRoot && scope.writableRoot !== ".") {
      // Resolve relative to projectRoot
      const resolved = path.isAbsolute(scope.writableRoot)
        ? scope.writableRoot
        : path.resolve(projectRoot, scope.writableRoot);
      return resolved;
    }
  } catch { /* best-effort */ }

  // 3. No restriction determinable
  return null;
}

// ─── Strike file helpers ──────────────────────────────────────────────────────

function strikeFilePath(projectRoot: string): string {
  const dir = path.join(projectRoot, ".palantir-mini", "session");
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* best-effort */ }
  return path.join(dir, "write-scope-strikes.json");
}

function readStrikes(projectRoot: string, sessionId: string): StrikeState {
  const fp = strikeFilePath(projectRoot);
  try {
    if (fs.existsSync(fp)) {
      const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as StrikeState;
      // Reset if a different session
      if (raw.sessionId === sessionId) return raw;
    }
  } catch { /* best-effort */ }
  return { count: 0, sessionId, lastViolation: new Date().toISOString() };
}

function writeStrikes(projectRoot: string, state: StrikeState): void {
  const fp  = strikeFilePath(projectRoot);
  const tmp = fp + ".tmp";
  try {
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(tmp, fp);
  } catch { /* best-effort */ }
}

function incrementStrikes(projectRoot: string, sessionId: string): number {
  const current = readStrikes(projectRoot, sessionId);
  const updated: StrikeState = {
    count:         current.count + 1,
    sessionId,
    lastViolation: new Date().toISOString(),
  };
  writeStrikes(projectRoot, updated);
  return updated.count;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Read stdin ─────────────────────────────────────────────────────────────
  async function readStdin(): Promise<string> {
    if (process.stdin.isTTY) return "";
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  const raw = await readStdin();
  let p: HookPayload = {};
  if (raw.trim().length > 0) {
    try {
      p = JSON.parse(raw) as HookPayload;
    } catch {
      process.stderr.write("[write-scope-runtime-enforce] stdin not valid JSON — skipping\n");
      process.stdout.write(JSON.stringify({ message: "write-scope-runtime-enforce: parse error — skipping", decision: "continue" }) + "\n");
      process.exit(0);
      return;
    }
  }

  let result: HookResult;
  try {
    result = await handlePreToolUse(p);
  } catch (err) {
    process.stderr.write(`[write-scope-runtime-enforce] unhandled error: ${(err as Error).message}\n`);
    result = { message: "write-scope-runtime-enforce: unhandled error — continuing", decision: "continue" };
  }

  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

async function handlePreToolUse(p: HookPayload): Promise<HookResult> {
  const toolName  = p.tool_name ?? "";
  const cwd       = p.cwd ?? process.cwd();
  const sessionId = p.session_id ?? "unknown";

  // ── 1. Bypass via env var (audited) ──────────────────────────────────────
  if (process.env.PALANTIR_MINI_WRITE_SCOPE_BYPASS === "1") {
    const agentName = p.byWhom?.agentName ?? p.agent_name ?? "unknown";
    void emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "design",
        passed:     true,
        errorClass: "write_scope_bypass_invoked",
        agentName,
        toolName,
      },
      toolName: "PreToolUse",
      cwd,
      sessionId,
      identity:     "monitor",
      agentName,
      memoryLayers: ["procedural"],
      reasoning:
        `write-scope-runtime-enforce: bypass via PALANTIR_MINI_WRITE_SCOPE_BYPASS=1 (agent=${agentName}, tool=${toolName}). ` +
        `Audited per canonical plan v2 §4 row 5.7 + the former sprint-harness policy v4.1.0 §Roles worktree isolation.`,
    }).catch(() => {});
    return {
      message:  `write-scope-runtime-enforce: BYPASS (env, agent=${agentName})`,
      decision: "continue",
    };
  }

  // ── 2. Lead-direct is always exempt ──────────────────────────────────────
  if (isLeadDirect(p)) {
    const agentName = p.byWhom?.agentName ?? p.agent_name ?? "claude-code";
    return {
      message:  `write-scope-runtime-enforce: EXEMPT (Lead-direct, agent=${agentName})`,
      decision: "continue",
    };
  }

  const agentName = p.byWhom?.agentName ?? p.agent_name ?? "subagent-unnamed";

  // ── 3. Resolve project root ───────────────────────────────────────────────
  const projectRoot = findProjectRoot(cwd);
  if (!projectRoot) {
    // No project root → no writable-root constraint can be derived; pass-through.
    return {
      message:  `write-scope-runtime-enforce: SKIP (no project root from cwd=${cwd})`,
      decision: "continue",
    };
  }
  // A stray `.palantir-mini` marker at $HOME or a temp dir must not make HOME/tmp
  // the writable-root frame and falsely BLOCK writes (defense-in-depth, mirrors the
  // ontology-import-guard FIX 2 exclusion).
  if (isExcludedProjectRoot(projectRoot)) {
    return {
      message:  `write-scope-runtime-enforce: SKIP (excluded project root ${projectRoot})`,
      decision: "continue",
    };
  }

  // ── 4. Resolve writable root ──────────────────────────────────────────────
  const writableRoot = resolveWritableRoot(projectRoot);
  if (!writableRoot) {
    // No worktree path env and project-scope writableRoot is "." (unrestricted)
    return {
      message:  `write-scope-runtime-enforce: SKIP (no writable root constraint for agent=${agentName})`,
      decision: "continue",
    };
  }

  const writableRootNorm = writableRoot.endsWith("/") ? writableRoot : writableRoot + "/";

  // ── 5. Extract target file paths ──────────────────────────────────────────
  const rawPaths = extractTargetPaths(p);
  if (rawPaths.length === 0) {
    return {
      message:  `write-scope-runtime-enforce: SKIP (no target paths found in tool_input for ${toolName})`,
      decision: "continue",
    };
  }

  // ── 6. Check each path against writable root ──────────────────────────────
  const violations: string[] = [];
  for (const rawPath of rawPaths) {
    const absPath = resolveAbsPath(rawPath, cwd);
    // A path is within the writable root if it equals the root OR starts with root + /
    const isInside = absPath === writableRoot || absPath.startsWith(writableRootNorm);
    if (!isInside) {
      violations.push(absPath);
    }
  }

  if (violations.length === 0) {
    return {
      message:  `write-scope-runtime-enforce: OK (agent=${agentName}, writableRoot=${writableRoot})`,
      decision: "continue",
    };
  }

  // ── 7. Violation found — increment strike counter ─────────────────────────
  const strikeCount = incrementStrikes(projectRoot, sessionId);

  // Emit advisory event regardless of strike count
  void emit({
    type:    "validation_phase_completed",
    payload: {
      phase:         "design",
      passed:        false,
      errorClass:    "write_scope_violation",
      agentName,
      toolName,
      writableRoot,
      violations,
      strikeCount,
      advisory:
        `Subagent ${agentName} attempted to write ${violations.length} path(s) outside its declared writable root "${writableRoot}". ` +
        `Strike ${strikeCount}/${ADVISORY_THRESHOLD} — blocking starts at strike ${ADVISORY_THRESHOLD + 1}.`,
    } as Record<string, unknown>,
    toolName: "PreToolUse",
    cwd,
    sessionId,
    identity:     "monitor",
    agentName,
    memoryLayers: ["procedural", "episodic"],
    reasoning:
      `write-scope-runtime-enforce: subagent "${agentName}" attempted to write paths outside its writableRoot. ` +
      `writableRoot="${writableRoot}", violations=[${violations.join(", ")}], strikeCount=${strikeCount}. ` +
      `Canonical plan v2 §4 row 5.7 + the former sprint-harness policy v4.1.0 §Roles worktree isolation.`,
    refinementTarget: {
      kind:            "rule-conformance-policy",
      filePathOrRid:   "the former sprint-harness policy v4.1.0 §Roles worktree isolation",
      description:
        `Subagent "${agentName}" attempted to write outside writableRoot "${writableRoot}" ` +
        `(violation(s): ${violations.slice(0, 2).join("; ")}${violations.length > 2 ? ` +${violations.length - 2} more` : ""}; strike ${strikeCount})`,
      confidenceLevel: "high",
    },
  }).catch(() => {});

  // ── 8. Advisory if still within threshold ────────────────────────────────
  if (strikeCount <= ADVISORY_THRESHOLD) {
    return {
      message:
        `write-scope-runtime-enforce: advisory — write outside writableRoot ` +
        `(agent=${agentName}, strike=${strikeCount}/${ADVISORY_THRESHOLD})`,
      decision: "continue",
      hookSpecificOutput: {
        additionalContext: [
          `write-scope-runtime-enforce: subagent "${agentName}" attempted to write outside its declared writable root.`,
          ``,
          `Writable root: ${writableRoot}`,
          `Violations (${violations.length}):`,
          ...violations.map((v) => `  - ${v}`),
          ``,
          `Strike ${strikeCount} of ${ADVISORY_THRESHOLD} — after ${ADVISORY_THRESHOLD} advisory violations, ` +
          `the ${ADVISORY_THRESHOLD + 1}th write attempt outside the writable root will be blocked.`,
          ``,
          `If this is intentional (e.g. writing shared docs), ensure the subagent is spawned`,
          `with the correct worktree path or update project-scope.json#writableRoot.`,
          ``,
          `Bypass: PALANTIR_MINI_WRITE_SCOPE_BYPASS=1 (audited).`,
          `Cross-ref: canonical plan v2 §4 row 5.7 + the former sprint-harness policy v4.1.0 §Roles worktree isolation.`,
        ].join("\n"),
      },
    };
  }

  // ── 9. Strike count exceeds threshold → block ────────────────────────────
  const blockReason = [
    `palantir-mini write-scope-runtime-enforce BLOCK (agent=${agentName})`,
    ``,
    `Strike count = ${strikeCount} exceeds threshold of ${ADVISORY_THRESHOLD}.`,
    ``,
    `This subagent has attempted to write outside its declared writable root ${strikeCount} times this session.`,
    ``,
    `Writable root: ${writableRoot}`,
    `Latest violations (${violations.length}):`,
    ...violations.map((v) => `  - ${v}`),
    ``,
    `=== RULE ===`,
    `Canonical plan v2 §4 row 5.7 + the former sprint-harness policy v4.1.0 §Roles:`,
    `"harness-generator and implementer-tier subagents spawn with isolation: 'worktree'"`,
    `"A subagent running in an auto-created .claude/worktrees/<name>/ git worktree must not`,
    `write files outside its worktree (or declared writableRoot)."`,
    ``,
    `=== DIAGNOSIS ===`,
    `The subagent is either:`,
    `  - Using absolute paths that escape its worktree`,
    `  - Not spawned with worktree isolation (check spawning Lead's Agent() call)`,
    `  - Using ~ expansion that resolves to the home repo root`,
    ``,
    `=== REMEDIATION ===`,
    `1. Ensure Agent() spawns carry isolation: "worktree" (the former sprint-harness policy v4.1.0 §Roles).`,
    `2. Check that the subagent uses relative paths or paths relative to its CWD.`,
    `3. If out-of-tree writes are legitimately needed, update project-scope.json#writableRoot`,
    `   or spawn the subagent without worktree isolation with explicit Lead reasoning.`,
    ``,
    `Bypass for emergency only: PALANTIR_MINI_WRITE_SCOPE_BYPASS=1 (audited).`,
    ``,
    `Cross-ref: canonical plan v2 §4 row 5.7 + the former sprint-harness policy v4.1.0 §Roles worktree isolation`,
  ].join("\n");

  process.stderr.write(`[palantir-mini/write-scope-runtime-enforce] BLOCK\n${blockReason}\n`);

  void emit({
    type:    "validation_phase_completed",
    payload: {
      phase:         "design",
      passed:        false,
      errorClass:    "write_scope_blocked",
      agentName,
      toolName,
      writableRoot,
      violations,
      strikeCount,
    } as Record<string, unknown>,
    toolName: "PreToolUse",
    cwd,
    sessionId,
    identity:     "monitor",
    agentName,
    memoryLayers: ["procedural", "episodic"],
    reasoning:
      `write-scope-runtime-enforce BLOCK: strikeCount=${strikeCount} > threshold=${ADVISORY_THRESHOLD} ` +
      `for agent="${agentName}" attempting writes outside writableRoot="${writableRoot}". ` +
      `Violations=[${violations.join(", ")}]. ` +
      `Canonical plan v2 §4 row 5.7 + the former sprint-harness policy v4.1.0 §Roles worktree isolation.`,
    refinementTarget: {
      kind:            "rule-conformance-policy",
      filePathOrRid:   "the former sprint-harness policy v4.1.0 §Roles worktree isolation",
      description:
        `Blocking "${agentName}" after ${strikeCount} write-scope violations exceeding threshold ${ADVISORY_THRESHOLD}. ` +
        `writableRoot="${writableRoot}" — escalated from advisory to blocking.`,
      confidenceLevel: "high",
    },
  }).catch(() => {});

  return {
    message:  `write-scope-runtime-enforce: BLOCK (strikeCount=${strikeCount} > ${ADVISORY_THRESHOLD}, agent=${agentName})`,
    decision: "block",
    reason:   blockReason,
    hookSpecificOutput: {
      permissionDecision:       "deny",
      permissionDecisionReason: blockReason,
      additionalContext:
        `write-scope-runtime-enforce blocked: subagent "${agentName}" exceeded write-scope violation threshold. ` +
        `Bypass: PALANTIR_MINI_WRITE_SCOPE_BYPASS=1 (audited).`,
    },
  };
}

void main();
