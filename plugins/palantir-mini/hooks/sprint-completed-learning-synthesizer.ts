// palantir-mini v3.13.0 — sprint-completed-learning-synthesizer hook (BackProp P1)
// Fires on: PostToolUse with matcher mcp__plugin_palantir-mini_palantir-mini__commit_edits
//
// Per sprint-006 BackProp loop closure plan §T4:
// After T3 (sprint-terminal-detector) emits `sprint_completed`, this hook walks every
// analysis-NNN.md produced by harness-analyzer across all iterations and emits one
// `learning_captured` event per unique failure category found.
//
// Topic naming: sprint-${pad3(sprintNumber)}-${failureCategoryRaw}  (prefix enforced here)
// Confidence:   0.85 (parsed) or 0.5 (malformed/fallback)
// Deduplication: skips if same topic already exists in events.jsonl
//
// Authority: ~/.claude/plans/tidy-stargazing-papert.md §T4
//            ~/.claude/rules/16-3-agent-harness.md §Loop
//            ~/.claude/rules/10-events-jsonl.md     5-dim envelope

import * as fs from "fs";
import * as path from "path";
import { emit, eventsPathFor } from "../scripts/log";
import { readEvents } from "../lib/event-log/read";
import { findProjectRoot } from "./harness-base-mode-advisory";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";

const TARGET_TOOL = "commit_edits";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
}

interface HookResult {
  message:            string;
  decision?:          "continue";
  reason?:            string;
  additionalContext?: string;
}

interface AnalysisEntry {
  sprintDir:    string;
  sprintNumber: number;
  iteration:    number;
  analysisPath: string;
}

/** Pad a number to 3 digits: 6 → "006". */
function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/** Parse sprint number from sprint dir basename. Returns NaN if malformed. */
function parseSprintNum(sprintDir: string): number {
  const m = /^sprint-(\d+)/.exec(path.basename(sprintDir));
  return m ? Number.parseInt(m[1]!, 10) : NaN;
}

/**
 * Walk all sprint dirs for the given sprint number and collect analysis-NNN.md files.
 * Returns entries sorted by iteration ASC.
 */
function walkAnalysisFiles(projectRoot: string, sprintNumber: number): AnalysisEntry[] {
  const sprintsDir = path.join(projectRoot, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return [];

  const entries: AnalysisEntry[] = [];
  let sprintDirs: fs.Dirent[];
  try {
    sprintDirs = fs.readdirSync(sprintsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const sprintEnt of sprintDirs) {
    if (!sprintEnt.isDirectory()) continue;
    const sprintDir = path.join(sprintsDir, sprintEnt.name);
    const num = parseSprintNum(sprintDir);
    if (num !== sprintNumber) continue;

    const itersDir = path.join(sprintDir, "iterations");
    if (!fs.existsSync(itersDir)) continue;

    let iterDirs: fs.Dirent[];
    try {
      iterDirs = fs.readdirSync(itersDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const iterEnt of iterDirs) {
      if (!iterEnt.isDirectory()) continue;
      const mIter = /^iteration-(\d+)$/.exec(iterEnt.name);
      if (!mIter) continue;
      const iteration = Number.parseInt(mIter[1]!, 10);
      const iterDir = path.join(itersDir, iterEnt.name);

      let files: string[];
      try {
        files = fs.readdirSync(iterDir);
      } catch {
        continue;
      }
      for (const f of files) {
        if (!/^analysis-\d+\.md$/.test(f)) continue;
        entries.push({
          sprintDir,
          sprintNumber,
          iteration,
          analysisPath: path.join(iterDir, f),
        });
      }
    }
  }

  entries.sort((a, b) => a.iteration - b.iteration);
  return entries;
}

/**
 * Extract failure category and root-cause hypothesis from analysis body.
 * Returns { failureCategoryRaw, rootCauseHypothesis, isWellFormed }.
 */
function parseAnalysis(body: string): {
  failureCategoryRaw:   string;
  rootCauseHypothesis:  string;
  isWellFormed:         boolean;
} {
  const categoryMatch = /^§ ?Failure category:\s*(\S+)/m.exec(body);
  const hypothesisMatch = /^§ ?Root-cause hypothesis:\s*([\s\S]+?)(?=\n§|\n##|$)/m.exec(body);

  const failureCategoryRaw = categoryMatch ? categoryMatch[1]!.trim() : "unknown";
  const rootCauseHypothesis = hypothesisMatch ? hypothesisMatch[1]!.trim() : "";
  const isWellFormed = !!categoryMatch && !!hypothesisMatch && rootCauseHypothesis.length > 0;

  return { failureCategoryRaw, rootCauseHypothesis, isWellFormed };
}

/**
 * Build topic string with sprint-NNN- prefix enforced.
 * Decision §T4 Q4: topic naming prefix only enforced here.
 */
function buildTopic(sprintNumber: number, failureCategoryRaw: string): string {
  return `sprint-${pad3(sprintNumber)}-${failureCategoryRaw}`;
}

/**
 * Check whether a learning_captured event with the given topic already exists.
 * Deduplication per §T4 step 7.
 */
function topicAlreadyEmitted(eventsPath: string, topic: string): boolean {
  const events = readEvents(eventsPath);
  return events.some(
    (e) =>
      e.type === "learning_captured" &&
      (e as { payload?: { topic?: string } }).payload?.topic === topic,
  );
}

export default async function sprintCompletedLearningSynthesizer(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const toolName = p.tool_name ?? "";

  // Only process commit_edits PostToolUse
  if (normalizePalantirMiniMcpToolName(toolName) !== TARGET_TOOL) {
    return {
      message: `palantir-mini: sprint-completed-learning-synthesizer skipped (tool=${toolName})`,
      decision: "continue",
    };
  }

  const cwd = p.cwd ?? process.cwd();
  const sessionId = p.session_id ?? "no-session";

  // Resolve project root
  const projectRoot = findProjectRoot(cwd) ?? cwd;
  const eventsPath = eventsPathFor(projectRoot);

  // Find most recent sprint_completed event
  const events = readEvents(eventsPath);
  const completedEvent = [...events].reverse().find((e) => e.type === "sprint_completed");

  if (!completedEvent) {
    return {
      message: "palantir-mini: sprint-completed-learning-synthesizer skipped (no sprint_completed event found)",
      decision: "continue",
    };
  }

  const payload_ = (completedEvent as { payload?: { sprintNumber?: number } }).payload;
  const sprintNumber: number | undefined = payload_?.sprintNumber;

  if (typeof sprintNumber !== "number" || !Number.isFinite(sprintNumber)) {
    return {
      message: "palantir-mini: sprint-completed-learning-synthesizer skipped (sprint_completed missing sprintNumber)",
      decision: "continue",
    };
  }

  // Walk analysis files for this sprint
  const analysisEntries = walkAnalysisFiles(projectRoot, sprintNumber);
  if (analysisEntries.length === 0) {
    return {
      message: `palantir-mini: sprint-completed-learning-synthesizer skipped (no analysis files for sprint-${pad3(sprintNumber)})`,
      decision: "continue",
    };
  }

  let emittedCount = 0;
  let skippedCount = 0;
  const emittedTopics: string[] = [];

  for (const entry of analysisEntries) {
    let body: string;
    try {
      body = fs.readFileSync(entry.analysisPath, "utf8");
    } catch {
      skippedCount++;
      continue;
    }

    const { failureCategoryRaw, rootCauseHypothesis, isWellFormed } = parseAnalysis(body);
    const topic = buildTopic(sprintNumber, failureCategoryRaw);
    const confidence = isWellFormed ? 0.85 : 0.5;
    const content = rootCauseHypothesis || `failure category: ${failureCategoryRaw} (no hypothesis extracted)`;
    const iterPad = pad3(entry.iteration);
    const source = `analysis-${iterPad}.md`;

    // Deduplicate — skip if already emitted
    if (topicAlreadyEmitted(eventsPath, topic)) {
      skippedCount++;
      continue;
    }

    try {
      await emit({
        type: "learning_captured",
        payload: { topic, content, confidence, source },
        toolName: "sprint-completed-learning-synthesizer",
        cwd: projectRoot,
        sessionId,
        identity: "monitor",
        reasoning: `BackProp P1: sprint-${pad3(sprintNumber)} iter ${entry.iteration} — ${failureCategoryRaw} (${isWellFormed ? "well-formed" : "fallback"})`,
      });
      emittedCount++;
      emittedTopics.push(topic);
    } catch {
      skippedCount++;
    }
  }

  const summary = emittedTopics.length > 0
    ? `emitted ${emittedCount}: ${emittedTopics.join(", ")}`
    : "nothing new to emit";

  return {
    message: `palantir-mini: sprint-completed-learning-synthesizer completed (sprint-${pad3(sprintNumber)}, ${summary})`,
    decision: "continue",
    additionalContext: [
      `=== SPRINT LEARNING SYNTHESIZER (BackProp P1) ===`,
      `Sprint: ${pad3(sprintNumber)}`,
      `Analysis files processed: ${analysisEntries.length}`,
      `Learnings emitted: ${emittedCount}`,
      `Skipped (dup or error): ${skippedCount}`,
      ...(emittedTopics.length > 0 ? [`Topics: ${emittedTopics.join(", ")}`] : []),
    ].join("\n"),
  };
}
