// palantir-mini — plan-task-dag-validate hook
// Fires on: PostToolUse for Write/Edit on plan artifact .md files
//
// Per rule 12 v3.19.1 §Plan-mode authoring requirement + user directive 2026-05-13:
//   "파일 소유권 분리시켜서 EnterPlanMode 또는 평상시 계획서 작성하도록 프로토콜이 안되어있어?"
//
// Purpose:
//   When a plan file under <project>/.palantir-mini/plan/ or legacy
//   ~/.claude/plans/ contains a "## DAG" or "## Task DAG"
//   heading AND the file is > 20 LOC → verify the required DAG annotation fields
//   (id, runsAfter, parallelEligibleWith, preReservedVersionSlot,
//   worktreeIsolationRequired, riskTier, ownerAgent) are present.
//
//   Missing ownerAgent → emit advisory
//   validation_phase_completed(errorClass="plan_missing_owner_agent").
//   Non-canonical ownerAgent value → emit advisory
//   validation_phase_completed(errorClass="plan_non_canonical_owner_agent").
//   Missing other required fields → emit advisory
//   validation_phase_completed(errorClass="plan_missing_dag_annotation").
//
//   ADVISORY ONLY — never blocks.
//
// Required fields (in the DAG section):
//   id, runsAfter, parallelEligibleWith, worktreeIsolationRequired, riskTier, ownerAgent
//   (preReservedVersionSlot is optional — only required for version-bumping tasks)
//
// Canonical ownerAgent values (rule 07 §Agent file-ownership + rule 12 v3.19.1):
//   palantir-mini:hook-builder
//   palantir-mini:plugin-maintainer
//   palantir-mini:protocol-designer
//   palantir-mini:project-implementer
//   palantir-mini:implementer
//   task-owner  (for skills/** project-specific tasks)
//
// Bypass: PALANTIR_MINI_DAG_VALIDATE_BYPASS=1

import { emit } from "../scripts/log";
import * as fs from "fs";
import * as path from "path";
import {
  isPlanArtifactPath,
  resolveCanonicalPlanRoot,
  resolveLegacyClaudePlanRoot,
} from "../lib/plan-root/resolve-plan-root";

/** Required DAG annotation field names */
const REQUIRED_DAG_FIELDS = [
  "runsAfter",
  "parallelEligibleWith",
  "worktreeIsolationRequired",
  "riskTier",
  "ownerAgent",
];

/**
 * Canonical ownerAgent values per rule 07 §Agent file-ownership + rule 12 v3.19.1.
 * A DAG row whose ownerAgent is not in this list gets a plan_non_canonical_owner_agent advisory.
 */
const CANONICAL_OWNER_AGENTS = new Set([
  "palantir-mini:hook-builder",
  "palantir-mini:plugin-maintainer",
  "palantir-mini:protocol-designer",
  "palantir-mini:project-implementer",
  "palantir-mini:implementer",
  "task-owner",
]);

/** Headings that indicate a DAG section is present */
const DAG_HEADING_RE = /^##\s+(Task\s+DAG|DAG)\b/im;

interface ToolResult {
  output?: string;
  file_path?: string;
}

interface HookPayload {
  cwd?: string;
  session_id?: string;
  tool_name?: string;
  tool_input?: { file_path?: string };
  tool_result?: ToolResult;
}

interface HookResult {
  message: string;
  hookSpecificOutput?: {
    additionalContext?: string;
  };
}

export default async function planTaskDagValidate(
  payload: unknown
): Promise<HookResult> {
  // Bypass
  if (process.env.PALANTIR_MINI_DAG_VALIDATE_BYPASS === "1") {
    return {
      message: "palantir-mini: plan-task-dag-validate BYPASS (env)",
    };
  }

  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const sessionId = p.session_id;
  const toolName = p.tool_name ?? "Write";

  // Determine which file was written
  const filePath =
    p.tool_input?.file_path ?? p.tool_result?.file_path ?? "";

  // Only act on plugin-layer plan files plus legacy Claude plan files.
  if (!filePath || !isPlanArtifactPath(filePath, { projectRoot: cwd, cwd })) {
    return {
      message: [
        `palantir-mini: plan-task-dag-validate skipped (not a plan artifact file: ${filePath || "(none)"})`,
        `canonical=${resolveCanonicalPlanRoot({ projectRoot: cwd, cwd })}`,
        `legacy=${resolveLegacyClaudePlanRoot()}`,
      ].join("\n"),
    };
  }

  if (!filePath.endsWith(".md")) {
    return {
      message: `palantir-mini: plan-task-dag-validate skipped (not a .md file)`,
    };
  }

  // Read the file
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return {
      message: `palantir-mini: plan-task-dag-validate skipped (cannot read file: ${filePath})`,
    };
  }

  const lines = content.split("\n");

  // Only validate files > 20 LOC
  if (lines.length <= 20) {
    return {
      message: `palantir-mini: plan-task-dag-validate skipped (${lines.length} LOC ≤ 20 threshold)`,
    };
  }

  // Only validate if file contains a DAG heading
  if (!DAG_HEADING_RE.test(content)) {
    return {
      message: `palantir-mini: plan-task-dag-validate OK (no "## DAG" / "## Task DAG" heading; no annotation required)`,
    };
  }

  // Find the DAG section content (from heading to next ## heading)
  const dagMatch = content.match(/^##\s+(Task\s+DAG|DAG)\b.*$/im);
  if (!dagMatch || dagMatch.index === undefined) {
    return {
      message: `palantir-mini: plan-task-dag-validate OK (DAG heading not extractable)`,
    };
  }

  const dagSectionStart = dagMatch.index;
  // Find next ## heading after DAG section
  const afterDag = content.slice(dagSectionStart + dagMatch[0].length);
  const nextHeadingMatch = afterDag.match(/^##\s/m);
  const dagSection = nextHeadingMatch
    ? afterDag.slice(0, nextHeadingMatch.index)
    : afterDag;

  // Check for required fields in the DAG section (split ownerAgent for targeted advisories)
  const baseRequiredFields = REQUIRED_DAG_FIELDS.filter((f) => f !== "ownerAgent");
  const missingBaseFields = baseRequiredFields.filter(
    (field) => !dagSection.includes(field)
  );
  const missingOwnerAgent = !dagSection.includes("ownerAgent");

  // Extract ownerAgent values from data rows for canonical validation
  // DAG tables use Markdown pipe syntax; extract values from ownerAgent column
  const nonCanonicalOwnerAgents: string[] = [];
  if (!missingOwnerAgent) {
    const tableRows = dagSection.match(/^\|[^|]*\|[^|]*\|.*/gm) ?? [];
    // Find ownerAgent column index from header row
    const headerRow = tableRows.find((r) => r.includes("ownerAgent"));
    if (headerRow) {
      const headers = headerRow.split("|").map((h) => h.trim());
      const ownerAgentIdx = headers.findIndex((h) => h === "ownerAgent");
      if (ownerAgentIdx >= 0) {
        for (const row of tableRows) {
          if (row === headerRow) continue;
          if (/^[|\s-]+$/.test(row)) continue; // separator row
          const cols = row.split("|").map((c) => c.trim());
          const val = cols[ownerAgentIdx];
          if (val && val.length > 0 && !CANONICAL_OWNER_AGENTS.has(val)) {
            nonCanonicalOwnerAgents.push(val);
          }
        }
      }
    }
  }

  const allOk =
    missingBaseFields.length === 0 &&
    !missingOwnerAgent &&
    nonCanonicalOwnerAgents.length === 0;

  if (allOk) {
    return {
      message: `palantir-mini: plan-task-dag-validate OK (all required DAG annotation fields present in ${path.basename(filePath)})`,
    };
  }

  const advisoryLines: string[] = [];

  // Advisory: missing ownerAgent
  if (missingOwnerAgent) {
    const ownerAdvisory = [
      `palantir-mini: plan-task-dag-validate ADVISORY — ${path.basename(filePath)} DAG section is missing required "ownerAgent" column.`,
      ``,
      `Per rule 12 v3.19.1 §Plan-mode authoring requirement + rule 07 §Agent file-ownership:`,
      `Every task row MUST declare ownerAgent — the canonical palantir-mini agent that owns`,
      `those files. This prevents dispatching cross-ownership work to general-purpose agents`,
      `(root cause of the 30+ PR session where hook/rule/version-bump work was bundled).`,
      ``,
      `Canonical ownerAgent values:`,
      `  palantir-mini:hook-builder        (hooks/** monitors/** scripts/** bridge/handlers/**)`,
      `  palantir-mini:plugin-maintainer   (package.json CHANGELOG.md .codex-plugin/**)`,
      `  palantir-mini:protocol-designer   (agents/** ~/.claude/rules/**)`,
      `  palantir-mini:project-implementer OR palantir-mini:implementer  (lib/** project source)`,
      `  task-owner                        (skills/** project-specific)`,
      ``,
      `ADVISORY ONLY — file write proceeds. Add ownerAgent column to suppress.`,
      `Bypass: PALANTIR_MINI_DAG_VALIDATE_BYPASS=1`,
    ].join("\n");
    advisoryLines.push(ownerAdvisory);

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "plan_missing_owner_agent",
        },
        toolName,
        cwd,
        sessionId,
        identity: "monitor",
        memoryLayers: ["working"],
        reasoning: `plan-task-dag-validate: ${path.basename(filePath)} DAG section missing ownerAgent column per rule 12 v3.19.1 + rule 07 §Agent file-ownership. Without ownerAgent, Lead cannot enforce cross-ownership decomposition and may dispatch to general-purpose agents in violation of rule 07.`,
      });
    } catch {
      /* best-effort */
    }
  }

  // Advisory: non-canonical ownerAgent values
  if (nonCanonicalOwnerAgents.length > 0) {
    const nonCanonicalAdvisory = [
      `palantir-mini: plan-task-dag-validate ADVISORY — ${path.basename(filePath)} DAG has non-canonical ownerAgent value(s): [${nonCanonicalOwnerAgents.join(", ")}]`,
      ``,
      `Per rule 12 v3.19.1 + rule 07 §Agent file-ownership, ownerAgent MUST be one of:`,
      `  palantir-mini:hook-builder | palantir-mini:plugin-maintainer |`,
      `  palantir-mini:protocol-designer | palantir-mini:project-implementer |`,
      `  palantir-mini:implementer | task-owner`,
      ``,
      `Non-canonical values indicate a general-purpose or unlisted agent is being dispatched`,
      `to tasks that have a canonical owner — use the canonical agent instead.`,
      ``,
      `ADVISORY ONLY — file write proceeds. Correct ownerAgent values to suppress.`,
      `Bypass: PALANTIR_MINI_DAG_VALIDATE_BYPASS=1`,
    ].join("\n");
    advisoryLines.push(nonCanonicalAdvisory);

    try {
      await emit({
        type: "validation_phase_completed",
        payload: ({
          phase: "design",
          passed: true,
          errorClass: "plan_non_canonical_owner_agent",
          nonCanonicalValues: nonCanonicalOwnerAgents,
        }) as unknown as Parameters<typeof emit>[0]["payload"],
        toolName,
        cwd,
        sessionId,
        identity: "monitor",
        memoryLayers: ["working"],
        reasoning: `plan-task-dag-validate: ${path.basename(filePath)} DAG has non-canonical ownerAgent values [${nonCanonicalOwnerAgents.join(", ")}] per rule 12 v3.19.1 + rule 07 §Agent file-ownership. Canonical agents must be used to avoid rule 07 file-ownership violations.`,
      });
    } catch {
      /* best-effort */
    }
  }

  // Advisory: missing base (non-ownerAgent) fields
  if (missingBaseFields.length > 0) {
    const baseAdvisory = [
      `palantir-mini: plan-task-dag-validate ADVISORY — ${path.basename(filePath)} has a "## Task DAG" section but is missing required annotation fields.`,
      ``,
      `Missing fields: ${missingBaseFields.join(", ")}`,
      ``,
      `Required fields per rule 12 v3.19.1 §Plan-mode authoring requirement:`,
      `  id, runsAfter, parallelEligibleWith, worktreeIsolationRequired, riskTier, ownerAgent`,
      `  (preReservedVersionSlot: required only for version-bumping tasks)`,
      ``,
      `Without these fields, Lead cannot mechanically derive parallel/sequential dispatch order`,
      `and must re-compute dependencies at execution time, risking the corruption pattern`,
      `observed sprint-135 2026-05-13 (4 concurrent subagents without worktree isolation).`,
      ``,
      `Template: plugins/palantir-mini/docs/PARALLEL_SPAWN_DISPATCH.md §Plan-mode authoring template`,
      ``,
      `ADVISORY ONLY — file write proceeds. Add annotation fields to suppress.`,
      `Bypass: PALANTIR_MINI_DAG_VALIDATE_BYPASS=1`,
    ].join("\n");
    advisoryLines.push(baseAdvisory);

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "plan_missing_dag_annotation",
        },
        toolName,
        cwd,
        sessionId,
        identity: "monitor",
        memoryLayers: ["working"],
        reasoning: `plan-task-dag-validate: ${path.basename(filePath)} has DAG section missing fields: [${missingBaseFields.join(", ")}] — parallel dispatch cannot be mechanically derived without them.`,
      });
    } catch {
      /* best-effort */
    }
  }

  const combinedAdvisory = advisoryLines.join("\n\n---\n\n");

  return {
    message: combinedAdvisory,
    hookSpecificOutput: {
      additionalContext: combinedAdvisory,
    },
  };
}
