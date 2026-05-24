// palantir-mini v4.12.0 — pm-preamble effort-probe (sprint-060 W1.6)
// Domain: LEARN (session-boundary procedural) + episodic cache
//
// Probes the `claude --effort` flag once per session to detect deprecation early.
// Closes P1.SP3 / architecture review F.4 (§5.F.4 + §5.J.3 M21).
//
// Probe contract:
//   - Spawns `claude -p --effort high --print 'echo --effort probe'` with 5 s timeout.
//   - On success (exit 0 + no deprecation keywords in stderr): caches { ok: true }.
//   - On failure (exit ≠ 0 OR stderr contains deprecation keywords): caches { ok: false, stderr }
//     and returns a deprecation warning payload for the caller to emit.
//   - If `claude` binary is unavailable (ENOENT / EACCES): caches { ok: true, skipped: true } —
//     best-effort, do NOT fail pm_preamble.
//   - Result cached in <sessionDir>/.effort-probe.json — re-probe skipped within same session.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";

/** Deprecation signal keywords scanned in stderr/message. Case-insensitive. */
const DEPRECATION_SIGNALS = ["deprecated", "unknown flag", "unrecognized option"] as const;

export interface EffortProbeResult {
  /** True when probe passed (or was skipped due to missing CLI). */
  ok: boolean;
  /** True when the probe was skipped because the `claude` binary was not found. */
  skipped?: boolean;
  /** Captured stderr when a deprecation signal was detected. */
  deprecatedStderr?: string;
  /** ISO timestamp of probe. */
  probedAt: string;
}

/** Path for the per-session cache file. */
export function effortProbeCachePath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", ".effort-probe.json");
}

/**
 * Read an existing cached probe result. Returns null when no cache exists or
 * the cache file is malformed.
 */
export function readProbeCache(projectRoot: string): EffortProbeResult | null {
  const cachePath = effortProbeCachePath(projectRoot);
  if (!fs.existsSync(cachePath)) return null;
  try {
    const raw = fs.readFileSync(cachePath, "utf8");
    const parsed = JSON.parse(raw) as EffortProbeResult;
    if (typeof parsed.ok !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Write probe result to cache. Best-effort — swallows write errors. */
function writeProbeCache(projectRoot: string, result: EffortProbeResult): void {
  try {
    const dir = path.join(projectRoot, ".palantir-mini", "session");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(effortProbeCachePath(projectRoot), JSON.stringify(result, null, 2), "utf8");
  } catch {
    // best-effort; never blocks pm_preamble
  }
}

function containsDeprecationSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return DEPRECATION_SIGNALS.some((s) => lower.includes(s));
}

/**
 * Build the env for the probe subprocess. Forwards CLAUDE_CONFIG_DIR + HOME
 * (same pattern as grade-outcome/model.ts buildGraderModelEnv — B-26 fix).
 */
function buildProbeEnv(): NodeJS.ProcessEnv {
  const claudeConfigDir =
    process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
  return {
    ...process.env,
    CLAUDE_CONFIG_DIR: claudeConfigDir,
    HOME: process.env.HOME ?? os.homedir(),
    MCP_CONNECTION_NONBLOCKING: "true",
  };
}

/** Injectable exec function type — allows test injection without spyOn overload issues. */
export type ExecFn = (cmd: string, opts: { timeout: number; encoding: string; env: NodeJS.ProcessEnv; stdio: readonly string[] }) => void;

/** Default exec function wrapping execSync. */
function defaultExecFn(cmd: string, opts: { timeout: number; encoding: string; env: NodeJS.ProcessEnv; stdio: readonly string[] }): void {
  execSync(cmd, opts as Parameters<typeof execSync>[1]);
}

/**
 * Run the --effort flag probe.
 *
 * Always returns an EffortProbeResult — never throws. Callers should treat
 * `ok: false` (and non-skipped) as a deprecation signal worth emitting.
 *
 * @param projectRoot - Project root for cache write.
 * @param execFn - Optional injectable exec fn for testing (defaults to execSync wrapper).
 */
export function runEffortProbe(projectRoot: string, execFn: ExecFn = defaultExecFn): EffortProbeResult {
  const probedAt = new Date().toISOString();

  try {
    // spawnSync-equivalent via execSync; capture stderr for signal detection.
    execFn("claude -p 'echo --effort probe' --effort high --output-format text", {
      timeout: 5_000,
      encoding: "utf8",
      env: buildProbeEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Exit 0 with no exception → flag was accepted
    const result: EffortProbeResult = { ok: true, probedAt };
    writeProbeCache(projectRoot, result);
    return result;
  } catch (e) {
    const err = e as Error & {
      code?: string;
      status?: number;
      signal?: string;
      stderr?: Buffer | string;
    };

    // Binary not found or permission error → skip silently
    if (err.code === "ENOENT" || err.code === "EACCES") {
      const result: EffortProbeResult = { ok: true, skipped: true, probedAt };
      writeProbeCache(projectRoot, result);
      return result;
    }

    // Timeout → also treat as skip (CLI present but unresponsive; not a flag deprecation)
    if (err.code === "ETIMEDOUT" || err.signal === "SIGTERM") {
      const result: EffortProbeResult = { ok: true, skipped: true, probedAt };
      writeProbeCache(projectRoot, result);
      return result;
    }

    // Non-zero exit: capture stderr and check for deprecation signal
    const stderrText =
      typeof err.stderr === "string"
        ? err.stderr
        : err.stderr?.toString?.() ?? "";

    const messageText = err.message ?? "";
    const combinedText = `${stderrText} ${messageText}`;

    const result: EffortProbeResult = {
      ok: !containsDeprecationSignal(combinedText),
      deprecatedStderr: containsDeprecationSignal(combinedText) ? combinedText.slice(0, 1000) : undefined,
      probedAt,
    };
    writeProbeCache(projectRoot, result);
    return result;
  }
}

/**
 * Session-bounded effort probe: reads cache first, runs probe on cache miss.
 *
 * Returns null when probe passed / was skipped (no action needed by caller).
 * Returns the deprecation payload when a deprecation signal was detected.
 *
 * @param projectRoot - Project root for cache lookup + write.
 * @param execFn - Optional injectable exec fn for testing.
 */
export function sessionEffortProbe(
  projectRoot: string,
  execFn?: ExecFn,
): {
  deprecatedStderr: string;
  probedAt: string;
} | null {
  const cached = readProbeCache(projectRoot);
  if (cached !== null) {
    // Cache hit — only surface warning if cached result was bad
    if (!cached.ok && cached.deprecatedStderr) {
      return { deprecatedStderr: cached.deprecatedStderr, probedAt: cached.probedAt };
    }
    return null;
  }

  // Cache miss — run fresh probe
  const result = runEffortProbe(projectRoot, execFn);
  if (!result.ok && result.deprecatedStderr) {
    return { deprecatedStderr: result.deprecatedStderr, probedAt: result.probedAt };
  }
  return null;
}
