// palantir-mini v3.11.0 — analyzer-output-injector hook (W3.1b + W3.1d marker cleanup)
// Fires on: SubagentStop matcher harness-analyzer
//
// Per harness-base-mode blueprint §4-P2 step 3 + cold-start §1 W3.1b + plan
// §1 W3.1b: copies the latest analysis-NNN.md content into the next iteration's
// generator briefing path so harness-generator reads the analyzer's failure-mode
// synthesis before the next iteration starts.
//
// v3.11.0 W3.1d (CT-3 lifecycle closure): after successful lead-guidance.md
// write, deletes matching /tmp/palantir-mini-hooks/<sessionId>/analyzer-request-<sprint>-<iter>-*.json
// markers so analyzer-marker-pickup SessionStart hook doesn't re-surface them.
//
// Design (per Plan agent §7 — NEW canonical path, NOT spec.md mutation):
//   - Latest analysis-NNN.md = scan <project>/.palantir-mini/harness/sprints/sprint-*/iterations/iteration-*/analysis-*.md
//   - Pick newest by mtime, parse N from filename
//   - Write to <sprint>/iterations/iteration-(N+1)/lead-guidance.md
//   - Overwrite-safe (always replaces; Generator reads fresh each iter)
//   - Marker glob delete after write (best-effort; cosmetic when sessionId persists)
//
// Authority: ~/.claude/plans/glowing-frolicking-raven.md §1 W3.1b
//            ~/.claude/plans/2026-04-29-harness-base-mode-closing-tasks.md CT-3
//            ~/.claude/rules/16-3-agent-harness.md §Loop step 6 (post-W3.2 v3.2.0)

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot } from "./harness-base-mode-advisory";

const TARGET_AGENT = "harness-analyzer";

interface HookPayload {
  cwd?:           string;
  session_id?:    string;
  agent_name?:    string;
  subagent_type?: string;
  exit_code?:     number;
  reason?:        string;
}

interface HookResult {
  message:           string;
  decision?:         "continue";
  reason?:           string;
  additionalContext?: string;
}

interface AnalysisHit {
  sprintDir: string;
  iteration: number;
  analysisPath: string;
  mtimeMs: number;
}

/** Walk every sprints/sprint-NN/iterations/iteration-NN/analysis-NN.md, return newest by mtime. */
export function findLatestAnalysis(projectRoot: string): AnalysisHit | null {
  const sprintsDir = path.join(projectRoot, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return null;

  const hits: AnalysisHit[] = [];
  let sprintEntries: fs.Dirent[];
  try {
    sprintEntries = fs.readdirSync(sprintsDir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const sprintEnt of sprintEntries) {
    if (!sprintEnt.isDirectory()) continue;
    const sprintDir = path.join(sprintsDir, sprintEnt.name);
    const itersDir = path.join(sprintDir, "iterations");
    if (!fs.existsSync(itersDir)) continue;

    let iterEntries: fs.Dirent[];
    try {
      iterEntries = fs.readdirSync(itersDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const iterEnt of iterEntries) {
      if (!iterEnt.isDirectory()) continue;
      const m = /^iteration-(\d+)$/.exec(iterEnt.name);
      if (!m) continue;
      const iteration = Number.parseInt(m[1]!, 10);
      const iterDir = path.join(itersDir, iterEnt.name);

      let files: string[];
      try {
        files = fs.readdirSync(iterDir);
      } catch {
        continue;
      }
      for (const f of files) {
        if (!/^analysis-\d+\.md$/.test(f)) continue;
        const fullPath = path.join(iterDir, f);
        try {
          const stat = fs.statSync(fullPath);
          hits.push({ sprintDir, iteration, analysisPath: fullPath, mtimeMs: stat.mtimeMs });
        } catch {
          continue;
        }
      }
    }
  }

  if (hits.length === 0) return null;
  hits.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return hits[0]!;
}

/** Parse N from "sprint-NNN" directory basename. Returns NaN if malformed. */
export function parseSprintNumber(sprintDir: string): number {
  const m = /^sprint-(\d+)/.exec(path.basename(sprintDir));
  return m ? Number.parseInt(m[1]!, 10) : NaN;
}

/**
 * Cleanup consumed markers (CT-3 W3.1d lifecycle closure).
 * Deletes /tmp/palantir-mini-hooks/<sessionId>/analyzer-request-<sprintNumber>-<iteration>-*.json
 * after lead-guidance.md is written. Best-effort: missing dir/file is fine.
 * Returns number of markers actually deleted.
 */
export function cleanupConsumedMarkers(
  sessionId: string,
  sprintNumber: number,
  iteration: number,
): number {
  if (!sessionId || !Number.isFinite(sprintNumber) || !Number.isFinite(iteration)) return 0;
  const markerDir = path.join(os.tmpdir(), "palantir-mini-hooks", sessionId);
  if (!fs.existsSync(markerDir)) return 0;
  let files: string[];
  try {
    files = fs.readdirSync(markerDir);
  } catch {
    return 0;
  }
  const prefix = `analyzer-request-${sprintNumber}-${iteration}-`;
  let deleted = 0;
  for (const f of files) {
    if (!f.startsWith(prefix) || !f.endsWith(".json")) continue;
    try {
      fs.unlinkSync(path.join(markerDir, f));
      deleted++;
    } catch {
      // best-effort — skip
    }
  }
  return deleted;
}

/**
 * Build lead-guidance.md body verbatim-wrapping analysis content.
 * Generator reads this fresh each iteration; never appended to.
 */
export function buildLeadGuidance(
  hit: AnalysisHit,
  analysisBody: string,
  nextIteration: number,
): string {
  return [
    `# Lead Guidance — Iteration ${nextIteration}`,
    ``,
    `Source: analyzer synthesis from iteration ${hit.iteration} (${path.basename(hit.analysisPath)})`,
    `Generated: ${new Date().toISOString()}`,
    `Auto-injected by analyzer-output-injector hook (palantir-mini v3.9.0 W3.1b).`,
    ``,
    `## Analyzer Synthesis (verbatim)`,
    ``,
    analysisBody.trim(),
    ``,
    `---`,
    `Generator MUST read this file before iteration ${nextIteration} commits.`,
    `Address the analyzer's recommendation, then proceed with the next iteration's edits.`,
    `Rule 16 v3.2.0 §Loop step 6 (revise) — file-based IPC.`,
    ``,
  ].join("\n");
}

export default async function analyzerOutputInjector(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;

  // Match either agent_name OR subagent_type for cross-runtime compat
  const agentMatch =
    p.agent_name === TARGET_AGENT ||
    p.subagent_type === TARGET_AGENT ||
    p.subagent_type === `palantir-mini:${TARGET_AGENT}`;

  if (!agentMatch) {
    return {
      message: `palantir-mini: analyzer-output-injector skipped (agent=${p.agent_name ?? p.subagent_type ?? "unknown"})`,
      decision: "continue",
    };
  }

  const cwd = p.cwd ?? process.cwd();
  const projectRoot = findProjectRoot(cwd);
  if (!projectRoot) {
    return {
      message: "palantir-mini: analyzer-output-injector skipped (no project root)",
      decision: "continue",
    };
  }

  const hit = findLatestAnalysis(projectRoot);
  if (!hit) {
    return {
      message: "palantir-mini: analyzer-output-injector skipped (no analysis-NNN.md found)",
      decision: "continue",
    };
  }

  // Read analysis content
  let analysisBody: string;
  try {
    analysisBody = fs.readFileSync(hit.analysisPath, "utf8");
  } catch (e) {
    return {
      message: `palantir-mini: analyzer-output-injector failed to read ${hit.analysisPath}: ${(e as Error).message}`,
      decision: "continue",
    };
  }

  // Compute target path
  const nextIter = hit.iteration + 1;
  const targetDir = path.join(hit.sprintDir, "iterations", `iteration-${String(nextIter).padStart(3, "0")}`);
  const targetPath = path.join(targetDir, "lead-guidance.md");

  try {
    fs.mkdirSync(targetDir, { recursive: true });
  } catch (e) {
    return {
      message: `palantir-mini: analyzer-output-injector mkdir failed for ${targetDir}: ${(e as Error).message}`,
      decision: "continue",
    };
  }

  const guidance = buildLeadGuidance(hit, analysisBody, nextIter);
  try {
    fs.writeFileSync(targetPath, guidance, "utf8");
  } catch (e) {
    return {
      message: `palantir-mini: analyzer-output-injector write failed for ${targetPath}: ${(e as Error).message}`,
      decision: "continue",
    };
  }

  // CT-3 W3.1d lifecycle closure: delete consumed markers
  const sprintNumber = parseSprintNumber(hit.sprintDir);
  const markersDeleted = cleanupConsumedMarkers(p.session_id ?? "", sprintNumber, hit.iteration);

  // Emit phase_completed event
  try {
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag: "analyzer-output-injected",
        taskId: `iteration-${nextIter}-briefing`,
        validations: ["analysis-located", "lead-guidance-written"],
      },
      toolName: "analyzer-output-injector",
      cwd: projectRoot,
      sessionId: p.session_id,
      identity: "monitor",
      reasoning: `lead-guidance.md written for iter ${nextIter} from ${hit.analysisPath} → ${targetPath} (markers cleaned: ${markersDeleted})`,
    });
  } catch {
    // best-effort
  }

  // Emit failure_mode_synthesized event (T5 — BackProp loop closure)
  const failureCategoryMatch = analysisBody.match(/^§\s?Failure category:\s*(\S+)/m);
  const rawCategory = failureCategoryMatch?.[1] ?? "unknown";
  const validCategories = [
    "spec_misalignment",
    "scope_overreach",
    "threshold_too_strict",
    "regression",
    "rule_conformance_violation",
    "unknown",
  ] as const;
  const failureCategory: typeof validCategories[number] =
    (validCategories as readonly string[]).includes(rawCategory)
      ? (rawCategory as typeof validCategories[number])
      : "unknown";

  const rootCauseMatch = analysisBody.match(/^§\s?Root-cause hypothesis:\s*([\s\S]+?)(?=\n§|\n##|$)/m);
  const rootCauseHypothesis = (rootCauseMatch?.[1] ?? "").trim() || "(not specified in analysis)";

  try {
    await emit({
      type: "failure_mode_synthesized",
      payload: {
        sprintNumber,
        iteration: hit.iteration,
        failureCategory,
        rootCauseHypothesis,
      },
      toolName: "analyzer-output-injector",
      cwd: projectRoot,
      sessionId: p.session_id,
      identity: "monitor",
      reasoning: `failure_mode_synthesized: cat=${failureCategory} from ${path.basename(hit.analysisPath)}`,
    });
  } catch {
    // best-effort
  }

  const ctxLines = [
    "=== ANALYZER OUTPUT INJECTED (W3.1b) ===",
    `Source: ${hit.analysisPath}`,
    `Target: ${targetPath}`,
    `Next iteration ${nextIter} Generator: read lead-guidance.md before committing.`,
    `Failure synthesized: ${failureCategory}`,
  ];
  if (markersDeleted > 0) {
    ctxLines.push(`Cleaned up ${markersDeleted} consumed analyzer-request marker(s) (W3.1d).`);
  }

  return {
    message: `palantir-mini: analyzer-output-injector wrote lead-guidance.md for iteration ${nextIter} (markers cleaned: ${markersDeleted})`,
    decision: "continue",
    additionalContext: ctxLines.join("\n"),
  };
}
