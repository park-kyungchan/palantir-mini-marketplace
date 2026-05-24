// palantir-mini — lead-model-availability-check hook (sprint-060 W1.7)
// Fires on: SessionStart
//
// SessionStart advisory only, not prompt-front-door evidence. Probes the
// configured Lead model for availability at session start. When the probe fails (exit code ≠ 0 or
// stderr contains "model not found" / "deprecated" / "unavailable"), emits
// a `lead_model_deprecation_warning` event with T3-eligible refinementTarget
// so the BackPropagation circuit can surface a fallback-chain recommendation.
//
// Logic:
//   1. Check if probe is already cached for this session → skip if fresh.
//   2. Read ~/.claude/settings.json to resolve the configured Lead model.
//   3. Honor LEAD_MODEL_OVERRIDE env var (emergency continuity).
//   4. Spawn `claude -p --model "<model>" --print "ping"` with 8s timeout.
//   5. If probe fails → emit `lead_model_deprecation_warning` + write cache.
//   6. If probe succeeds → write cache; no event emitted.
//   7. Best-effort: missing CLI / network failure → silent skip; never block.
//
// Fallback chain (rule 12 v3.9.0 §3-tier fallback, authored by parallel W1.11):
//   opus[1m] → opus → sonnet[1m] → sonnet
//
// Authority:
//   rule 12 (lead-protocol) — §Model policy + §3-tier fallback (v3.9.0)
//   rule 26 §R5 — validation_phase_completed.passed=false requires refinementTarget
//   rule 26 §Axis E — memoryLayers procedural + semantic
//   Architecture review: ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md §5.J.3 (M21)

import { emit } from "../scripts/log";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync } from "child_process";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Probe cache file (relative to the session dir). Refreshed each session. */
const PROBE_CACHE_FILENAME = ".lead-model-probe.json";

/** Seconds to wait for the claude CLI to respond to a ping. */
const PROBE_TIMEOUT_MS = 8_000;

/** Failure keywords in stderr output that indicate a deprecated / unavailable model. */
const FAILURE_KEYWORDS: readonly string[] = [
  "model not found",
  "deprecated",
  "unavailable",
];

/**
 * Fallback chain per rule 12 v3.9.0 §3-tier fallback.
 * Index 0 = primary Lead model; each subsequent entry is the next fallback tier.
 */
const FALLBACK_CHAIN: readonly string[] = [
  "opus[1m]",
  "opus",
  "sonnet[1m]",
  "sonnet",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
}

interface HookResult {
  message:          string;
  decision:         "continue";
  additionalContext?: string;
}

interface ProbeCache {
  modelId:   string;
  probeTime: string; // ISO8601
  available: boolean;
  sessionId?: string;
}

// ─── Settings resolution ─────────────────────────────────────────────────────

/** Reads the Lead model from ~/.claude/settings.json `model` field. Returns null on error. */
function readConfiguredModel(): string | null {
  const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
  try {
    if (!fs.existsSync(settingsPath)) return null;
    const raw = fs.readFileSync(settingsPath, "utf8");
    const cfg = JSON.parse(raw) as Record<string, unknown>;
    const model = cfg["model"];
    if (typeof model === "string" && model.trim().length > 0) return model.trim();
    return null;
  } catch {
    return null;
  }
}

/** Resolves the model to probe: LEAD_MODEL_OVERRIDE → settings.json → "opus[1m]" default. */
export function resolveProbeModel(): string {
  const override = process.env.LEAD_MODEL_OVERRIDE;
  if (typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }
  return readConfiguredModel() ?? "opus[1m]";
}

/** Resolves the next fallback tier for a given model ID. Returns null if already at the last tier. */
export function suggestFallback(modelId: string): string | null {
  const idx = FALLBACK_CHAIN.indexOf(modelId);
  if (idx < 0) {
    // Unknown model: suggest the first known-good fallback
    return FALLBACK_CHAIN[1] ?? null;
  }
  return FALLBACK_CHAIN[idx + 1] ?? null;
}

// ─── Probe cache ─────────────────────────────────────────────────────────────

/** Returns the path to the session-scoped probe cache file. */
function probeCachePath(sessionDir: string): string {
  return path.join(sessionDir, PROBE_CACHE_FILENAME);
}

/** Returns a cached probe result if it exists for this session + model. Null otherwise. */
export function readProbeCache(sessionDir: string, modelId: string, sessionId: string | undefined): ProbeCache | null {
  try {
    const cachePath = probeCachePath(sessionDir);
    if (!fs.existsSync(cachePath)) return null;
    const raw = fs.readFileSync(cachePath, "utf8");
    const cache = JSON.parse(raw) as ProbeCache;
    // Cache is valid only when it was for the same session and model
    if (cache.modelId === modelId && (sessionId === undefined || cache.sessionId === sessionId)) {
      return cache;
    }
    return null;
  } catch {
    return null;
  }
}

/** Writes probe result to cache. Best-effort. */
export function writeProbeCache(sessionDir: string, cache: ProbeCache): void {
  try {
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(probeCachePath(sessionDir), JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // best-effort — cache miss on next call is acceptable
  }
}

// ─── Probe ────────────────────────────────────────────────────────────────────

export interface ProbeResult {
  available:    boolean;
  failureReason?: string;
}

/**
 * Spawns `claude -p --model "<modelId>" --print "ping"` with a timeout.
 * PALANTIR_MINI_CLAUDE_BIN may override the binary path for deterministic tests.
 * Returns { available: true } on exit code 0 + no failure keywords in stderr.
 * Returns { available: false, failureReason } otherwise.
 *
 * Best-effort: if the `claude` binary is not found or any spawn error occurs,
 * returns { available: true } (silent skip — we cannot determine state).
 */
export function probeModel(modelId: string): ProbeResult {
  try {
    const claudeBin = process.env.PALANTIR_MINI_CLAUDE_BIN ?? "claude";
    const result = spawnSync(
      claudeBin,
      ["-p", "--model", modelId, "--print", "ping"],
      {
        encoding: "utf8",
        timeout:  PROBE_TIMEOUT_MS,
      },
    );

    // Spawn error (e.g. ENOENT — claude binary not found) → silent skip
    if (result.error) {
      return { available: true };
    }

    // Check exit code
    if (result.status !== 0) {
      const stderrLower = (result.stderr ?? "").toLowerCase();
      const keyword = FAILURE_KEYWORDS.find(kw => stderrLower.includes(kw));
      if (keyword !== undefined) {
        return {
          available:     false,
          failureReason: `exit ${result.status}; stderr contains "${keyword}": ${(result.stderr ?? "").trim().slice(0, 200)}`,
        };
      }
      return {
        available:     false,
        failureReason: `exit ${result.status}; stderr: ${(result.stderr ?? "").trim().slice(0, 200)}`,
      };
    }

    // Exit 0 — also check stderr for soft-deprecated keywords
    const stderrLower = (result.stderr ?? "").toLowerCase();
    const softKeyword = FAILURE_KEYWORDS.find(kw => stderrLower.includes(kw));
    if (softKeyword !== undefined) {
      return {
        available:     false,
        failureReason: `exit 0 but stderr contains "${softKeyword}": ${(result.stderr ?? "").trim().slice(0, 200)}`,
      };
    }

    return { available: true };
  } catch {
    // Any unexpected exception → silent skip (best-effort)
    return { available: true };
  }
}

// ─── Session dir resolution ───────────────────────────────────────────────────

/** Resolves the .palantir-mini/session dir for the given cwd. */
function sessionDir(cwd: string): string {
  const override = process.env.PALANTIR_MINI_EVENTS_FILE;
  if (override && path.isAbsolute(override)) {
    return path.dirname(override);
  }
  return path.join(cwd, ".palantir-mini", "session");
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // 1. Parse stdin
  let payload: HookPayload = {};
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of process.stdin) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.trim().length > 0) {
        payload = JSON.parse(raw) as HookPayload;
      }
    } catch {
      // Parse failure → treat as empty payload; still run probe
    }
  }

  const cwd       = payload.cwd ?? process.cwd();
  const sessionId = payload.session_id;
  const toolName  = payload.tool_name ?? "SessionStart";

  const sDir    = sessionDir(cwd);
  const modelId = resolveProbeModel();

  // 2. Check cache — skip probe if we already ran it this session
  const cached = readProbeCache(sDir, modelId, sessionId);
  if (cached !== null) {
    const result: HookResult = {
      message:  `palantir-mini: lead-model-availability-check — cached (model=${modelId} available=${cached.available})`,
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 3. Probe
  const probeResult = probeModel(modelId);

  // 4. Write cache regardless of outcome
  writeProbeCache(sDir, {
    modelId,
    probeTime: new Date().toISOString(),
    available: probeResult.available,
    sessionId,
  });

  // 5. Handle probe failure
  if (!probeResult.available) {
    const fallback = suggestFallback(modelId);

    // Emit T3-eligible event (validation_phase_completed with errorClass="lead_model_deprecation_warning")
    // Payload uses Record<string, unknown> to carry extra fields beyond the strict schema shape
    // while remaining JSON-serializable — same pattern as harness-worktree-advisory.ts
    try {
      const eventPayload: Record<string, unknown> = {
        phase:             "runtime",
        passed:            false,
        errorClass:        "lead_model_deprecation_warning",
        modelId,
        failureReason:     probeResult.failureReason ?? "probe returned unavailable",
        suggestedFallback: fallback,
        fallbackChain:     [...FALLBACK_CHAIN],
        settingsPath:      path.join(os.homedir(), ".claude", "settings.json"),
        leadModelOverride: process.env.LEAD_MODEL_OVERRIDE ?? null,
      };
      await emit({
        type: "validation_phase_completed",
        payload: eventPayload,
        toolName,
        cwd,
        sessionId,
        identity:  "monitor",
        reasoning: `Lead model probe failed for ${modelId}: ${probeResult.failureReason ?? "probe returned unavailable"}`,
        memoryLayers: ["procedural", "semantic"],
        refinementTarget: {
          kind:            "event-type-add",
          filePathOrRid:   path.join(os.homedir(), ".claude", "settings.json"),
          description:     `Lead model '${modelId}' probe failed — update settings.json to '${fallback ?? "sonnet"}' or set LEAD_MODEL_OVERRIDE. rule 12 §Model policy + §3-tier fallback.`,
          confidenceLevel: "high",
        },
      });
    } catch {
      // Best-effort — emit failure must never break SessionStart
    }

    const advisory = [
      `palantir-mini: lead-model-availability-check WARNING`,
      `  Lead model '${modelId}' probe failed: ${probeResult.failureReason ?? "unavailable"}`,
      fallback !== null
        ? `  Suggested fallback: '${fallback}' (rule 12 §3-tier fallback chain: ${FALLBACK_CHAIN.join(" → ")})`
        : `  No further fallback available (already at end of chain).`,
      `  Update ~/.claude/settings.json or set LEAD_MODEL_OVERRIDE=<model> (emergency).`,
    ].join("\n");

    process.stderr.write(advisory + "\n");

    const result: HookResult = {
      message:          `palantir-mini: lead-model-availability-check — WARN model='${modelId}' unavailable (fallback=${fallback ?? "none"})`,
      decision:         "continue",
      additionalContext: advisory,
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 6. Probe succeeded — intentionally NO emit on success path.
  // Emit only on failure or tier-fallback per rule 12 v3.9.0 §3-tier model fallback chain.
  // sprint-062 W0-α: success path silence is correct; this comment documents the intent
  // to distinguish it from "forgot to emit" (kind-1 description vs implementation drift fix).
  const result: HookResult = {
    message:  `palantir-mini: lead-model-availability-check — OK (model='${modelId}')`,
    decision: "continue",
  };
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

// Sprint-062 W0-α: guard top-level execution so test imports don't trigger main()
// Without this guard, importing exports (resolveProbeModel, suggestFallback, etc.) auto-fires main()
// which causes bun:test to receive hook stdout JSON and exit before running tests.
if (import.meta.main) {
void main().catch((e) => {
  // Last-resort: never crash SessionStart
  process.stderr.write(`[lead-model-availability-check] unhandled error: ${(e as Error).message}\n`);
  const fallback: HookResult = {
    message:  "palantir-mini: lead-model-availability-check — unhandled error; continuing",
    decision: "continue",
  };
  process.stdout.write(JSON.stringify(fallback) + "\n");
  process.exit(0);
});
}
