// palantir-mini v4.8.0 — grade-outcome model-domain agent dispatcher (B.1; sprint-054 W1.A1 tier effort wire-up)
// Extracted from grade-outcome-with-rubric.ts. Phase H3 — `claude -p` spawn.
// v4.8.0 W1.A1: optional `effort` param forwards to Claude Code CLI `--effort`
// flag. Mapped from GraderEffortLevel via mapTierToClaudeCodeEffort. Backwards-
// compat: undefined → no flag (Sonnet 4.6 default thinking).

import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";
import type { GradingCriterionLite, CriterionScore } from "./types";

export interface GraderModelResponse {
  role?: "grader_model";
  criterionId?: string;
  score?: number;
  scale?: "0-10" | "0-1" | "pass-fail";
  passFail?: "pass" | "fail";
  reasoning?: string;
  evidenceCited?: string[];
}

/** B-26 (harness-h4 canary, W0 2026-04-24): nested `claude -p` subprocess
 *  spawnSync ETIMEDOUT on all 3 model-domain criteria. Root cause — MCP
 *  subprocess inherits process.env via spread but does NOT get
 *  CLAUDE_CONFIG_DIR explicitly, so the spawned CLI cannot locate the
 *  user's ~/.claude/ config within the 120s timeout (auth bootstrap fails).
 *  Fix: forward CLAUDE_CONFIG_DIR + HOME explicitly. Exported for unit test
 *  so env construction is verifiable without an actual subprocess spawn. */
export function buildGraderModelEnv(): NodeJS.ProcessEnv {
  const claudeConfigDir =
    process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
  return {
    ...process.env,
    PALANTIR_MINI_GRADER: "model",
    CLAUDE_CONFIG_DIR: claudeConfigDir,
    HOME: process.env.HOME ?? os.homedir(),
    // W1.B (Claude Code v2.1.89+): skip synchronous MCP server registration wait.
    // Grader subprocess does not use MCP, so the wait is pure overhead.
    // Max X20 constraint: --bare flag MUST NOT be used (requires ANTHROPIC_API_KEY).
    MCP_CONNECTION_NONBLOCKING: "true",
  };
}

export function gradeModel(
  criterion: GradingCriterionLite,
  artifactPath: string,
  evidenceDir?: string,
  specPath?: string,
  /**
   * v4.8.0 W1.A1 — Claude Code CLI `--effort` flag value. Pass `undefined`
   * to use the Sonnet 4.6 default thinking budget. Map from `GradingCriterion.tier`
   * via `mapTierToClaudeCodeEffort` from schemas v1.42.0 grader-effort.ts.
   * Caller contract: only "high" or "xhigh" are valid; all other tier levels
   * resolve to `undefined` and MUST NOT pass an `--effort` arg (literal
   * "undefined" surfaces as a CLI parse error).
   */
  effort?: "high" | "xhigh",
): CriterionScore {
  if (!criterion.scoringPrompt) {
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "model",
      score: 0,
      weightedScore: 0,
      passFail: "needs_human_review",
      reasoning: `criterion ${criterion.criterionId} has no scoringPrompt — model-domain criteria require LLM judge prompt.`,
    };
  }

  // v2.1.0: Lead-direct dispatch — grader-model.md agent retired; scoringPrompt
  // passed inline to `claude -p` against the session's default Lead model
  // (Opus 4.7 + 1M context). Output contract unchanged: last JSON line wins.
  const payload = JSON.stringify({
    criterionId: criterion.criterionId,
    rubricDomain: "model",
    passFailLogic: criterion.passFailLogic,
    artifactPaths: [artifactPath],
    evidenceBundlePath: evidenceDir,
    specPath,
    contextDir: path.dirname(
      path.isAbsolute(artifactPath) ? artifactPath : path.resolve(artifactPath),
    ),
  });

  const instruction = [
    criterion.scoringPrompt,
    "",
    "Return a single JSON object on the last line with shape:",
    '{"criterionId": "...", "score": <number>, "scale": "0-10"|"0-1"|"pass-fail", "passFail": "pass"|"fail", "reasoning": "...", "evidenceCited": [...]}',
    "",
    `Grading context: ${payload}`,
  ].join("\n");

  const enhancedEnv = buildGraderModelEnv();

  // v4.8.0 W1.A1 — append `--effort <value>` only when caller passed effort.
  // Conservative: never emit an empty or literal "undefined" arg to claude -p.
  const effortArg = effort ? ` --effort ${effort}` : "";

  try {
    const raw = execSync(
      `claude -p ${JSON.stringify(instruction)} --output-format json${effortArg}`,
      {
        timeout: 120_000,
        encoding: "utf8",
        env: enhancedEnv,
        maxBuffer: 4 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    // grader-model.md output contract returns last JSON line — find + parse
    const lines = raw.trim().split("\n");
    let parsed: GraderModelResponse | null = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const ln = lines[i];
      if (!ln) continue;
      const t = ln.trim();
      if (t.startsWith("{")) {
        try {
          parsed = JSON.parse(t) as GraderModelResponse;
          if (typeof parsed.score === "number") break;
        } catch {
          continue;
        }
      }
    }

    if (!parsed || typeof parsed.score !== "number") {
      return {
        criterionId: criterion.criterionId,
        rubricDomain: "model",
        score: 0,
        weightedScore: 0,
        passFail: "needs_human_review",
        reasoning: `grader-model returned no parseable JSON; raw tail=${raw.slice(-200)}`,
      };
    }

    const score = parsed.score;
    // Compute weighted contribution at native scale (avg over 0-10 etc.)
    const scale = parsed.scale ?? criterion.passFailLogic.scale;
    const normalizedForWeight = scale === "0-10" ? score : scale === "0-1" ? score : score; // pass-fail already 0/1
    const passFail =
      parsed.passFail ?? (score >= criterion.passFailLogic.threshold ? "pass" : "fail");

    return {
      criterionId: criterion.criterionId,
      rubricDomain: "model",
      score,
      weightedScore: normalizedForWeight * criterion.weightInRubric,
      passFail,
      reasoning: parsed.reasoning ?? "(grader-model returned no reasoning)",
      evidenceCited: parsed.evidenceCited,
    };
  } catch (e) {
    // B-26 diagnostic: surface stderr + exit code when PALANTIR_MINI_DEBUG set.
    // Helps Lead distinguish env-bootstrap timeout (recoverable via
    // CLAUDE_CONFIG_DIR forwarding) from auth failure (requires SDK pivot).
    const err = e as Error & { code?: string; status?: number; signal?: string; stderr?: Buffer | string };
    if (process.env.PALANTIR_MINI_DEBUG === "1") {
      const diag = {
        code: err.code,
        status: err.status,
        signal: err.signal,
        stderrHead: typeof err.stderr === "string" ? err.stderr.slice(0, 500) : err.stderr?.toString?.().slice(0, 500),
        claudeConfigDir: enhancedEnv.CLAUDE_CONFIG_DIR,
      };
      // eslint-disable-next-line no-console
      console.error("[grade-outcome B-26 diag]", JSON.stringify(diag));
    }
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "model",
      score: 0,
      weightedScore: 0,
      passFail: "needs_human_review",
      reasoning: `grader-model spawn failed: ${err.message.slice(0, 200)} (code=${err.code ?? "n/a"}, signal=${err.signal ?? "n/a"})`,
    };
  }
}
