// palantir-mini — live `claude --version` capability gate (P2-9/F9)
//
// The native second-brain fold path dispatches the palantir-mini:second-brain-fold
// subagent via the Agent tool (native/background subagent) and routes its governed
// emit through the SubagentStart/SubagentStop lifecycle. That lifecycle (and the
// `agent_name` / `subagent_type` payload the fold round-trip relies on) only lands
// in Claude Code v2.1.110+ (see hooks/subagent-start.ts). On an older — or absent —
// CLI, the native dispatch cannot complete the gated round-trip, so the caller must
// fall back to the CLI engine-direct path (run second-brain/scripts/fold.ts in
// model-fed/CLI mode + forwardFoldOutput, the Path-B helper in second-brain-fold.ts).
//
// This module performs the LIVE check: it runs `claude --version`, parses the
// semver, and compares it to the minimum that supports native/background subagents.
// The exec is injectable so tests never spawn a real binary.

import * as childProcess from "child_process";

/** Minimum Claude Code version that natively supports the background/native
 *  subagent lifecycle the fold round-trip depends on (SubagentStart/SubagentStop
 *  + agent_name). Grounded in hooks/subagent-start.ts (v2.1.110+). */
export const MIN_NATIVE_SUBAGENT_VERSION = "2.1.110" as const;

/** Injectable version probe (tests pass a stub; CI never spawns a real binary).
 *  Returns the raw `claude --version` stdout, or null when the CLI is absent/errors. */
export type VersionProbe = () => string | null;

/** Default probe — runs `claude --version` via execFileSync (no shell, no injection).
 *  Returns null on any failure (binary missing, non-zero exit, timeout). */
export const defaultVersionProbe: VersionProbe = () => {
  try {
    return childProcess.execFileSync("claude", ["--version"], {
      encoding: "utf8",
      timeout: 5_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
};

/** Parse a semver `major.minor.patch` triple out of `claude --version` output
 *  (e.g. "2.1.186 (Claude Code)"). Returns null when no triple is present. */
export function parseClaudeVersion(
  raw: string | null | undefined,
): { major: number; minor: number; patch: number } | null {
  if (!raw) return null;
  const m = raw.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/** True iff `version` >= `min` (both are `major.minor.patch` strings/triples). */
function gte(
  version: { major: number; minor: number; patch: number },
  min: string,
): boolean {
  const parsed = parseClaudeVersion(min);
  if (!parsed) return false;
  if (version.major !== parsed.major) return version.major > parsed.major;
  if (version.minor !== parsed.minor) return version.minor > parsed.minor;
  return version.patch >= parsed.patch;
}

export interface NativeSubagentCapability {
  /** True → the live CLI supports native/background subagents → use the native
   *  Agent-tool dispatch path. False → fall back to the CLI engine-direct path. */
  readonly supported: boolean;
  /** Parsed live version, or null when the CLI was unavailable/unparseable. */
  readonly version: string | null;
  /** Why the gate decided as it did (for the fallback advisory line). */
  readonly reason: "ok" | "cli-unavailable" | "too-old";
}

/** Live capability gate: run `claude --version`, parse, compare to
 *  MIN_NATIVE_SUBAGENT_VERSION. When the CLI is unavailable or too old, returns
 *  `supported: false` so the caller routes to the CliLlmClient / engine-direct
 *  fallback. The probe is injectable (default spawns `claude --version`). */
export function detectNativeSubagentCapability(
  probe: VersionProbe = defaultVersionProbe,
): NativeSubagentCapability {
  const parsed = parseClaudeVersion(probe());
  if (!parsed) {
    return { supported: false, version: null, reason: "cli-unavailable" };
  }
  const version = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  if (!gte(parsed, MIN_NATIVE_SUBAGENT_VERSION)) {
    return { supported: false, version, reason: "too-old" };
  }
  return { supported: true, version, reason: "ok" };
}
