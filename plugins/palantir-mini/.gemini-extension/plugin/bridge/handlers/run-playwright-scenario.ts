// palantir-mini v2.0 — MCP tool handler: run_playwright_scenario
// Domain: LEARN (prim-learn-04 PlaywrightScenario)
//
// Thin orchestration layer: loads a PlaywrightScenario declaration, records
// intent to execute (caller is expected to actually invoke the target browser
// MCP via their own tool chain — this handler does NOT itself control Chrome;
// it validates + tracks + emits events).
//
// The Evaluator agent reads the scenario, calls mcp__playwright__* or
// mcp__claude-in-chrome__* tools directly, and reports back by writing
// evidence to evidenceDir. This handler's job is contract + audit.
//
// Authority: ~/.claude/schemas/ontology/primitives/playwright-scenario.ts

import * as fs from "fs";
import * as path from "path";
import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";

export interface RunPlaywrightScenarioArgs {
  projectPath?: string;
  /** PlaywrightScenarioRid (string form) */
  scenarioId: string;
  /**
   * Inline scenario declaration (if the caller has not registered it in the
   * ontology registry). Should match PlaywrightScenarioDeclaration shape.
   */
  scenario?: {
    url: string;
    steps: Array<{ kind: string; selector?: string; value?: string; expected?: string | number; timeoutMs?: number; label?: string }>;
    evidenceCaptureSpec?: unknown;
    mcpToolBinding?: "mcp__playwright__*" | "mcp__claude-in-chrome__*";
    preconditions?: string[];
    postconditions?: string[];
    viewport?: { width: number; height: number };
  };
  /**
   * Sprint + iteration context (for evidence directory naming).
   * Optional; if omitted, evidence goes to ad-hoc directory.
   */
  sprintNumber?: number;
  iteration?: number;
  /** Optional FeedbackLoopRid for event cross-reference */
  loopId?: string;
}

export interface RunPlaywrightScenarioResult {
  scenarioId: string;
  evidenceDir: string;
  scenarioSpecPath: string;
  mcpToolBinding: string;
  instructionsForEvaluator: string;
  emittedEventId: string | null;
}

function evidenceDirFor(
  project: string,
  sprintNumber: number | undefined,
  iteration: number | undefined,
  scenarioId: string,
): string {
  if (sprintNumber !== undefined && iteration !== undefined) {
    return path.join(
      project,
      ".palantir-mini",
      "harness",
      "sprints",
      `sprint-${String(sprintNumber).padStart(3, "0")}`,
      "iterations",
      `iteration-${String(iteration).padStart(3, "0")}`,
      "evidence",
      scenarioId,
    );
  }
  return path.join(
    project,
    ".palantir-mini",
    "harness",
    "ad-hoc-scenarios",
    `${scenarioId}-${Date.now().toString(36)}`,
  );
}

export default async function runPlaywrightScenario(
  rawArgs: unknown,
): Promise<RunPlaywrightScenarioResult> {
  const args = (rawArgs ?? {}) as RunPlaywrightScenarioArgs;
  if (!args.scenarioId || typeof args.scenarioId !== "string") {
    throw new Error("run_playwright_scenario: `scenarioId` required");
  }
  if (!args.scenario || !args.scenario.url) {
    throw new Error(
      "run_playwright_scenario: `scenario.url` required (inline scenario spec)",
    );
  }

  const project = args.projectPath ?? resolveProjectRoot();
  const dir = evidenceDirFor(project, args.sprintNumber, args.iteration, args.scenarioId);
  fs.mkdirSync(dir, { recursive: true });

  // Persist scenario spec for audit
  const scenarioSpecPath = path.join(dir, "scenario.json");
  fs.writeFileSync(
    scenarioSpecPath,
    JSON.stringify(
      {
        scenarioId: args.scenarioId,
        ...args.scenario,
        runContext: {
          sprintNumber: args.sprintNumber,
          iteration: args.iteration,
          loopId: args.loopId,
          startedAt: new Date().toISOString(),
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const mcpBinding = args.scenario.mcpToolBinding ?? "mcp__playwright__*";

  // Build Evaluator instructions
  const stepLines = args.scenario.steps.map((s, i) => {
    const label = s.label ? ` — ${s.label}` : "";
    return `  ${i + 1}. ${s.kind}${label}${s.selector ? ` [${s.selector}]` : ""}${s.value ? ` = ${JSON.stringify(s.value)}` : ""}${s.expected !== undefined ? ` ≟ ${JSON.stringify(s.expected)}` : ""}`;
  });
  const instructions = `
Execute PlaywrightScenario ${args.scenarioId} via ${mcpBinding}:

Navigate to: ${args.scenario.url}
${args.scenario.viewport ? `Viewport: ${args.scenario.viewport.width}x${args.scenario.viewport.height}` : ""}

Preconditions (verify first):
${(args.scenario.preconditions ?? []).map((p) => `  - ${p}`).join("\n") || "  (none)"}

Steps:
${stepLines.join("\n")}

Postconditions (verify at end):
${(args.scenario.postconditions ?? []).map((p) => `  - ${p}`).join("\n") || "  (none)"}

Capture evidence to: ${dir}
  - Screenshots as shot-NNN.png
  - Console log as console.log
  - Network log as network.json
  - DOM snapshot as dom-snapshot.json (if evidenceCaptureSpec.domSnapshot=true)

After execution, write outcome.json to ${dir} with:
  { "passed": bool, "failedStep": "<step label or null>", "stepResults": [...] }
`;

  const eventId = `evt-pws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await emit({
    type: "playwright_scenario_executed",
    payload: {
      project,
      scenarioId: args.scenarioId,
      evidenceDir: dir,
      mcpToolBinding: mcpBinding,
      sprintNumber: args.sprintNumber,
      iteration: args.iteration,
      loopId: args.loopId,
      stepCount: args.scenario.steps.length,
      state: "instructions_issued",
    },
    toolName: "run_playwright_scenario",
    cwd: project,
    reasoning: `Scenario ${args.scenarioId} instructions issued to Evaluator. ${args.scenario.steps.length} steps via ${mcpBinding}.`,
  });

  return {
    scenarioId: args.scenarioId,
    evidenceDir: dir,
    scenarioSpecPath,
    mcpToolBinding: mcpBinding,
    instructionsForEvaluator: instructions.trim(),
    emittedEventId: eventId,
  };
}
