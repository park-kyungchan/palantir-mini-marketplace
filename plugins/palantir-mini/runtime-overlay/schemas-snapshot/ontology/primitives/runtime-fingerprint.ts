/**
 * @stable — RuntimeFingerprint primitive (prim-data-NN, v1.63.0)
 *
 * Structured runtime attribution carried in byWhom.runtimeFingerprint
 * of the 5-dim event envelope (optional/additive; backward-compat preserved).
 * Per canonical plan v2 §4 row 6.6 + rule 27 §Cross-runtime substrate.
 *
 * Motivation: today `byWhom.identity` self-attributes runtime ("claude-code" /
 * "codex-cli" etc.) as a bare string. RuntimeFingerprint promotes this to a
 * typed struct carrying: runtime kind + runtime version + harness species +
 * os/platform + process kind. Embedding as an OPTIONAL companion under
 * `byWhom.runtimeFingerprint` is strictly additive — no existing field changes.
 *
 * D/L/A domain: DATA (attribution metadata — immutable per event row).
 * @owner palantirkc-ontology
 */

// ─── RuntimeKind ─────────────────────────────────────────────────────────────

/** Top-level runtime identity tag. Matches byWhom.identity values. */
export type RuntimeKind =
  | "claude-code"
  | "codex-cli"
  | "gemini-cli"
  | "cursor"
  | "unknown";

export const RUNTIME_KINDS: readonly RuntimeKind[] = [
  "claude-code",
  "codex-cli",
  "gemini-cli",
  "cursor",
  "unknown",
];

export function isRuntimeKind(v: unknown): v is RuntimeKind {
  return typeof v === "string" && (RUNTIME_KINDS as readonly string[]).includes(v);
}

// ─── HarnessSpeciesId ─────────────────────────────────────────────────────────

/**
 * 7-species identifier per CONTEXT.md §15 Glossary.
 * Internally re-uses the canonical `HarnessSpeciesId` from
 * `./harness-species-enum.ts` — that file is the single source of truth for
 * the union, the const array, and the type guard. We import for our local
 * `RuntimeFingerprint` shape below but DO NOT re-export, so the primitives
 * `index.ts` barrel sees the symbol from `./harness-species-enum` only.
 *
 * Consumers needing the union directly should import from
 * `./harness-species-enum` or the primitives barrel.
 */
import { isHarnessSpeciesId, type HarnessSpeciesId } from "./harness-species-enum";

// ─── ProcessKind ──────────────────────────────────────────────────────────────

/** Role of the running process within the harness species. */
export type ProcessKind =
  | "lead"
  | "subagent"
  | "hook"
  | "script"
  | "mcp-server"
  | "unknown";

export const PROCESS_KINDS: readonly ProcessKind[] = [
  "lead",
  "subagent",
  "hook",
  "script",
  "mcp-server",
  "unknown",
];

export function isProcessKind(v: unknown): v is ProcessKind {
  return typeof v === "string" && (PROCESS_KINDS as readonly string[]).includes(v);
}

// ─── RuntimeFingerprint ───────────────────────────────────────────────────────

/**
 * Structured byWhom companion.
 *
 * Embedded as byWhom.runtimeFingerprint in the 5-dim event envelope.
 * All fields except `runtime`, `harnessSpecies`, and `processKind` are optional
 * to preserve backward compatibility and allow partial auto-detection.
 */
export interface RuntimeFingerprint {
  /** Top-level runtime kind. Mirrors byWhom.identity. */
  readonly runtime: RuntimeKind;
  /** Version string of the runtime (e.g. "2.1.140" for Claude Code). */
  readonly runtimeVersion?: string;
  /**
   * Harness species under which this event was emitted (optional — absent
   * when the runtime cannot be resolved to a canonical 7-species id).
   */
  readonly harnessSpecies?: HarnessSpeciesId;
  /** OS platform (Node.js process.platform or "wsl" override). */
  readonly platform?: string;
  /** Process role in the harness execution model. */
  readonly processKind: ProcessKind;
  /** Session identifier from the runtime (e.g. CLAUDE_CODE_SESSION_ID). */
  readonly sessionId?: string;
  /** Sub-agent identifier when emitted inside a spawned subagent. */
  readonly subagentId?: string;
  /** OS version string (best-effort, optional). */
  readonly osVersion?: string;
}

// ─── Type guard ───────────────────────────────────────────────────────────────

export function isRuntimeFingerprint(value: unknown): value is RuntimeFingerprint {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!isRuntimeKind(v.runtime) || !isProcessKind(v.processKind)) return false;
  // harnessSpecies is optional; when present must satisfy the canonical guard.
  if (v.harnessSpecies !== undefined) {
    if (typeof v.harnessSpecies !== "string") return false;
    if (!isHarnessSpeciesId(v.harnessSpecies)) return false;
  }
  return true;
}

// ─── Auto-detect factory ──────────────────────────────────────────────────────

/**
 * Best-effort auto-detection from process environment.
 *
 * Checks well-known env vars to infer runtime kind, version, session ID,
 * platform, and process kind. Falls back to "unknown" for any unrecognized
 * environment. Never throws — always returns a valid RuntimeFingerprint.
 *
 * @param env Process environment to read from (defaults to process.env).
 */
export function detectRuntimeFingerprint(
  env?: Record<string, string | undefined>,
): RuntimeFingerprint {
  const e = env ?? (typeof process !== "undefined" ? process.env : {});

  // Detect runtime kind from well-known session env vars.
  let runtime: RuntimeKind = "unknown";
  let runtimeVersion: string | undefined;
  let sessionId: string | undefined;

  if (e.CLAUDE_CODE_SESSION_ID) {
    runtime = "claude-code";
    runtimeVersion = e.CLAUDE_CODE_VERSION ?? e.ANTHROPIC_CLAUDE_CODE_VERSION;
    sessionId = e.CLAUDE_CODE_SESSION_ID;
  } else if (e.CODEX_SESSION_ID) {
    runtime = "codex-cli";
    runtimeVersion = e.CODEX_VERSION;
    sessionId = e.CODEX_SESSION_ID;
  } else if (e.GEMINI_SESSION_ID) {
    runtime = "gemini-cli";
    runtimeVersion = e.GEMINI_VERSION;
    sessionId = e.GEMINI_SESSION_ID;
  } else if (e.CURSOR_SESSION_ID) {
    runtime = "cursor";
    runtimeVersion = e.CURSOR_VERSION;
    sessionId = e.CURSOR_SESSION_ID;
  }

  // Detect harness species from runtime kind (default mapping).
  // Optional — left undefined when runtime is "unknown" / "gemini-cli" / "cursor"
  // (no canonical species id mapping yet).
  let harnessSpecies: HarnessSpeciesId | undefined;
  if (runtime === "claude-code") {
    harnessSpecies = "claude-code-cli";
  } else if (runtime === "codex-cli") {
    // Codex CLI is a Claude Code CLI sibling — maps to claude-code-cli species
    // for harness purposes; future species refinement may warrant a distinct ID.
    harnessSpecies = "claude-code-cli";
  }

  // Detect platform (Node.js process.platform or WSL heuristic).
  let platform: string | undefined;
  if (typeof process !== "undefined" && typeof process.platform === "string") {
    // WSL detection: Linux platform + WSL_DISTRO_NAME or /proc/version containing 'microsoft'.
    if (process.platform === "linux" && (e.WSL_DISTRO_NAME || e.WSLENV)) {
      platform = "wsl";
    } else {
      platform = process.platform;
    }
  }

  // Detect process kind from env vars.
  let processKind: ProcessKind = "lead";
  if (e.PALANTIR_MINI_SUBAGENT_ID) {
    processKind = "subagent";
  } else if (e.PALANTIR_MINI_HOOK_MODE === "1") {
    processKind = "hook";
  } else if (e.PALANTIR_MINI_SCRIPT_MODE === "1") {
    processKind = "script";
  } else if (e.PALANTIR_MINI_MCP_SERVER === "1") {
    processKind = "mcp-server";
  }

  return {
    runtime,
    ...(runtimeVersion !== undefined ? { runtimeVersion } : {}),
    harnessSpecies,
    ...(platform !== undefined ? { platform } : {}),
    processKind,
    ...(sessionId !== undefined ? { sessionId } : {}),
    ...(e.PALANTIR_MINI_SUBAGENT_ID !== undefined
      ? { subagentId: e.PALANTIR_MINI_SUBAGENT_ID }
      : {}),
  };
}

// ─── Foundry equivalence ──────────────────────────────────────────────────────

import type { FoundryEquivalence } from "./category-foundry-equivalent";

const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "RuntimeFingerprint is a palantir-mini-originated cross-runtime attribution layer; " +
    "no direct Palantir Foundry counterpart. Provides structured byWhom companion " +
    "per rule 27 §Cross-runtime substrate + canonical plan v2 §4 row 6.6.",
};

export { categoryFoundryEquivalent as runtimeFingerprintFoundryEquivalent };
