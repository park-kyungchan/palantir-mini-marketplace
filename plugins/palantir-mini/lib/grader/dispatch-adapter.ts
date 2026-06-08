// palantir-mini — lib/grader/dispatch-adapter.ts (W3e-1)
//
// Runtime-NEUTRAL model-grader dispatch. The CONTRACT (effort routing, runtime
// selection, JSON parse, graceful degrade) is neutral; the actual spawn
// (`claude -p` / `codex exec`) is the ADAPTER binding selected at call time via
// PALANTIR_MINI_HOST_RUNTIME (lib/runtime/identity.resolveHostRuntimeIdentity).
//
// A FRESH subprocess per dispatch eliminates self-grading bias (rule 16 §Roles).
// Spawn idiom + graceful ENOENT/EACCES/timeout degrade mirror
// bridge/handlers/pm-preamble/effort-probe.ts. Adding gemini later = one branch.
//
// Backs the pm_grader_dispatch MCP handler + the default modelGrader of
// grade_outcome_with_rubric.

import { execSync } from "child_process";
import * as os from "os";
import * as path from "path";
import {
  mapTierToClaudeCodeEffort,
  tierRequiresModelCall,
  tierSelectsOpus,
  isGraderEffortLevel,
  type GraderEffortLevel,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/grader-effort";
import { resolveHostRuntimeIdentity, type RuntimeIdentity } from "../runtime/identity";

export interface GraderDispatchInput {
  readonly criterionId: string;
  readonly scoringPrompt: string;
  readonly tier?: GraderEffortLevel;
  readonly scale?: "0-1" | "0-10" | "pass-fail";
  readonly timeoutMs?: number;
  readonly projectPath?: string;
}

export interface GraderDispatchResult {
  readonly criterionId: string;
  /** raw score in the requested scale (clamped). */
  readonly score: number;
  readonly reasoning?: string;
  readonly evidence?: readonly string[];
  readonly runtime: RuntimeIdentity;
  readonly model?: string;
  readonly durationMs: number;
}

/** Injectable exec function (tests pass a stub; CI never spawns a real binary). */
export type GraderExecFn = (
  cmd: string,
  opts: {
    timeout: number;
    encoding: "utf8";
    env: NodeJS.ProcessEnv;
    stdio: readonly ["ignore", "pipe", "pipe"];
  },
) => string;

const DEFAULT_TIMEOUT_MS = 120_000;

function defaultExecFn(cmd: string, opts: Parameters<GraderExecFn>[1]): string {
  const out = execSync(cmd, opts as unknown as Parameters<typeof execSync>[1]);
  return typeof out === "string" ? out : out.toString("utf8");
}

/** Env for the grader subprocess (forwards CLAUDE_CONFIG_DIR + HOME; mirrors effort-probe.ts). */
function buildGraderEnv(): NodeJS.ProcessEnv {
  const claudeConfigDir =
    process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
  return {
    ...process.env,
    CLAUDE_CONFIG_DIR: claudeConfigDir,
    HOME: process.env.HOME ?? os.homedir(),
    MCP_CONNECTION_NONBLOCKING: "true",
  };
}

/** Single-quote a string for safe inclusion in a shell command. */
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

function maxForScale(scale: GraderDispatchInput["scale"]): number {
  return scale === "0-10" || scale === undefined ? 10 : 1;
}

/** Scan output bottom-up for the last JSON object carrying a numeric `score`. */
export function parseLastJsonScore(
  text: string,
): { score: number; reasoning?: string; evidence?: readonly string[] } | null {
  const lines = text.split(/\r?\n/).reverse();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) continue;
    try {
      const parsed = JSON.parse(trimmed) as {
        score?: unknown;
        reasoning?: unknown;
        evidence?: unknown;
      };
      if (typeof parsed.score === "number") {
        return {
          score: parsed.score,
          reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
          evidence: Array.isArray(parsed.evidence)
            ? (parsed.evidence.filter((e) => typeof e === "string") as string[])
            : undefined,
        };
      }
    } catch {
      // not JSON; keep scanning
    }
  }
  return null;
}

function buildCommand(
  runtime: RuntimeIdentity,
  scoringPrompt: string,
  effortFlag: "high" | "xhigh" | undefined,
): string {
  const quoted = shellQuote(scoringPrompt);
  if (runtime === "codex") {
    // Codex maps reasoning effort internally; pass the prompt to `codex exec`.
    return `codex exec ${quoted}`;
  }
  // Default to the Claude CLI for claude-code / unknown / others.
  const effort = effortFlag !== undefined ? ` --effort ${effortFlag}` : "";
  return `claude -p ${quoted} --output-format text${effort}`;
}

/**
 * Dispatch ONE model-domain criterion to a fresh grader subprocess.
 * Never throws — binary-unavailable / timeout / malformed output all degrade to
 * score=0 with a captured reason (preserves the modelGrader-absent default-0
 * invariant of rubric-grader.ts).
 */
export async function dispatchGrader(
  input: GraderDispatchInput,
  execFn: GraderExecFn = defaultExecFn,
  now: () => number = () => Date.now(),
): Promise<GraderDispatchResult> {
  const started = now();
  const runtime = resolveHostRuntimeIdentity(process.env.PALANTIR_MINI_HOST_RUNTIME, "claude-code");
  const tier: GraderEffortLevel =
    input.tier !== undefined && isGraderEffortLevel(input.tier) ? input.tier : "normal";
  const scale = input.scale ?? "0-10";
  const timeout = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const model = tierSelectsOpus(tier) ? "opus" : "sonnet";

  const base = { criterionId: input.criterionId, runtime, model } as const;

  if (!tierRequiresModelCall(tier)) {
    return {
      ...base,
      score: 0,
      reasoning: "tier=none has no model-dispatch path; evaluate validationExpression deterministically.",
      durationMs: now() - started,
    };
  }

  const effortFlag = mapTierToClaudeCodeEffort(tier);
  const cmd = buildCommand(runtime, input.scoringPrompt, effortFlag);

  try {
    const stdout = execFn(cmd, {
      timeout,
      encoding: "utf8",
      env: buildGraderEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    const parsed = parseLastJsonScore(stdout);
    if (parsed === null) {
      return {
        ...base,
        score: 0,
        reasoning: `grader output not parseable as JSON {score}; raw tail: ${stdout.slice(-200)}`,
        durationMs: now() - started,
      };
    }
    const max = maxForScale(scale);
    const score = Math.max(0, Math.min(max, parsed.score));
    return {
      ...base,
      score,
      reasoning: parsed.reasoning,
      evidence: parsed.evidence,
      durationMs: now() - started,
    };
  } catch (e) {
    const err = e as { code?: string; signal?: string; message?: string };
    const why =
      err.code === "ENOENT" || err.code === "EACCES"
        ? `${runtime} grader binary unavailable`
        : err.code === "ETIMEDOUT" || err.signal === "SIGTERM"
          ? `${runtime} grader timed out`
          : `${runtime} grader failed: ${err.message ?? "unknown error"}`;
    return {
      ...base,
      score: 0,
      reasoning: `${why}; criterion defaulted to score=0.`,
      durationMs: now() - started,
    };
  }
}
