// palantir-mini PR-13 — Hook enforcement level
//   enforcement: blocking
//   rationale:   permissionDecision=defer + returns deny on post-W5 import violation; blocks Edit|Write|MultiEdit that introduce direct ~/.claude/schemas/ imports in per-project code.
// palantir-mini v2.25.0 — ontology-import-guard hook (sprint-053 W3B)
// v2.25.0 (sprint-053 W3B): + CC v2.1.85+ hookSpecificOutput.updatedInput.file_path when input uses ~/ tilde prefix (single-truth absolute home-rel path).
// Fires on: PreToolUse with matcher Edit|Write|MultiEdit (Blocking)
//
// Enforces the post-W5 import discipline: per-project code (under projects/)
// must NOT import from `~/.claude/schemas/` directly. The only allowed surface
// is `~/ontology/shared-core/`. Without this hook, drift would be discovered
// only at audit time.
//
// Reconnaissance (2026-04-25): zero existing violations across palantir-math,
// mathcrew, kosmos. Ships pure-block with no grandfather list.
//
// Authority: ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §8.1
//            ~/.claude/CLAUDE.md §Authority Chain
//            ~/.claude/plans/deep-wiggling-mccarthy.md T2

import * as os from "os";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot, isExcludedProjectRoot } from "../lib/project/find-root";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    file_path?:  string;
    content?:    string;        // Write tool
    new_string?: string;        // Edit tool (replacement text)
    edits?:      Array<{ old_string?: string; new_string?: string }>; // MultiEdit
  };
}

const FORBIDDEN_PATTERNS = [
  /from\s+["']~\/\.claude\/schemas\b/,
  /from\s+["']@palantirKC\/claude-schemas["']/,
  /import\s+["']~\/\.claude\/schemas\b/,
];

const TS_EXT_RE = /\.(ts|tsx|mts|cts)$/;

/**
 * Determines whether the file path is in scope for the guard.
 * STRUCTURAL membership (de-hardcoded, bd-005): a TS file is in scope iff it
 * lives under a project whose root contains `.palantir-mini/` (the cross-runtime
 * per-project marker, rule 27). Replaces the former hardcoded 3-name allowlist
 * so pm guards the schema-import discipline for ANY governed project.
 */
export function isTargetedFile(filePath: string): boolean {
  if (!filePath) return false;
  if (!TS_EXT_RE.test(filePath)) return false;
  const root = findProjectRoot(filePath);
  if (root === null) return false;
  // FIX 2: a stray `.palantir-mini` marker at $HOME or a temp dir must not make a
  // file sitting directly there "in a project" (would over-match pm's own source).
  if (isExcludedProjectRoot(root)) return false;
  return true;
}

/** Returns matched forbidden import patterns from the new content. */
export function detectForbiddenImports(content: string): string[] {
  const violations: string[] = [];
  for (const pat of FORBIDDEN_PATTERNS) {
    const m = content.match(pat);
    if (m) violations.push(m[0]);
  }
  return violations;
}

/** Aggregate new content from tool_input regardless of which Edit-class tool was used. */
export function collectNewContent(input: HookPayload["tool_input"]): string {
  if (!input) return "";
  const parts: string[] = [];
  if (typeof input.content === "string") parts.push(input.content);
  if (typeof input.new_string === "string") parts.push(input.new_string);
  if (Array.isArray(input.edits)) {
    for (const e of input.edits) {
      if (typeof e.new_string === "string") parts.push(e.new_string);
    }
  }
  return parts.join("\n");
}

export default async function ontologyImportGuard(payload: unknown): Promise<{
  message:   string;
  decision?: "block" | "continue";
  reason?:   string;
  hookSpecificOutput?: { updatedInput?: { file_path?: string } };
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  // Only intercept Edit-class tools.
  const toolName = p.tool_name;
  const filePath = p.tool_input?.file_path ?? "";

  // CC v2.1.85+ — when input uses ~/ home-rel prefix, surface absolute path via updatedInput
  // so isTargetedFile + downstream tooling all see the canonical absolute path.
  let canonicalFilePath: string | undefined;
  if (filePath.startsWith("~/")) {
    canonicalFilePath = path.resolve(os.homedir(), filePath.slice(2));
  }
  const effectiveFilePath = canonicalFilePath ?? filePath;

  if (toolName !== "Edit" && toolName !== "Write" && toolName !== "MultiEdit") {
    return {
      message: `palantir-mini: ontology-import-guard skipped (tool=${toolName ?? "unknown"})`,
      decision: "continue",
      ...(canonicalFilePath ? { hookSpecificOutput: { updatedInput: { file_path: canonicalFilePath } } } : {}),
    };
  }

  if (!isTargetedFile(effectiveFilePath)) {
    return {
      message: "palantir-mini: ontology-import-guard skipped (out-of-scope file)",
      decision: "continue",
      ...(canonicalFilePath ? { hookSpecificOutput: { updatedInput: { file_path: canonicalFilePath } } } : {}),
    };
  }

  const newContent = collectNewContent(p.tool_input);
  const violations = detectForbiddenImports(newContent);

  if (violations.length === 0) {
    return {
      message: "palantir-mini: ontology-import-guard OK (no forbidden schema imports)",
      decision: "continue",
      ...(canonicalFilePath ? { hookSpecificOutput: { updatedInput: { file_path: canonicalFilePath } } } : {}),
    };
  }

  const reason = [
    `palantir-mini ontology-import-guard BLOCK in ${effectiveFilePath}`,
    `Forbidden import(s) detected:`,
    ...violations.map((v) => `  - ${v}`),
    ``,
    `Per-project code MUST NOT import from "~/.claude/schemas/" directly.`,
    `Use "~/ontology/shared-core/" — the only allowed consumer surface post-W5.`,
    `See: ~/.claude/CLAUDE.md §Authority Chain.`,
  ].join("\n");

  process.stderr.write(`[palantir-mini/ontology-import-guard] ${reason}\n`);

  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: false,
        errorClass: "forbidden_schema_import",
      },
      toolName: "PreToolUse",
      cwd,
      sessionId: p.session_id,
      identity: "monitor",
      reasoning: `ontology-import-guard: ${violations.length} forbidden import(s) in ${effectiveFilePath}`,
    });
  } catch {
    // best-effort
  }

  return {
    message: `palantir-mini: ontology-import-guard BLOCK (${violations.length} forbidden import(s) in ${effectiveFilePath})`,
    decision: "block",
    reason,
    ...(canonicalFilePath ? { hookSpecificOutput: { updatedInput: { file_path: canonicalFilePath } } } : {}),
  };
}
