// palantir-mini v4.5.0 — cold-start-browse-index-loader hook (Wave 2.B)
// Fires on: SessionStart (advisory, async)
//
// Lazily reads the top-tier routing surfaces. Default SessionStart behavior
// stays token-thin; set PALANTIR_MINI_COLD_START_EAGER=1 or
// PALANTIR_MINI_SESSION_CONTEXT_MODE=eager to inject excerpts.
//
// Authority: rule 02 v3.1.0 §Research retrieval (BROWSE/INDEX-first).
// Plan:      ~/.claude/plans/vast-giggling-mccarthy.md §3 Wave 2 W2.B.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { resolveResearchAnchor } from "../lib/runtime-overlay/research-core-select";
import { resolveSchemaPath } from "../lib/runtime-overlay/schema-resolve";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:            string;
  decision?:          "continue";
  additionalContext?: string;
}

/** Max lines to include from each router file (budget-conscious). */
const MAX_LINES = 50;

function eagerContextEnabled(): boolean {
  return (
    process.env["PALANTIR_MINI_COLD_START_EAGER"] === "1" ||
    process.env["PALANTIR_MINI_SESSION_CONTEXT_MODE"] === "eager"
  );
}

async function resolveRouterFiles(): Promise<ReadonlyArray<{ label: string; filePath: string }>> {
  const researchRoot = await resolveResearchAnchor("cold-start root research routers", ".");
  const schemasRoot = await resolveSchemaPath();
  const rootDir = researchRoot.files[0]?.path
    ? path.dirname(researchRoot.files[0].path)
    : path.join(process.cwd(), "runtime-overlay", "research-library");
  return [
    {
      label: `research/BROWSE.md (${researchRoot.source})`,
      filePath: path.join(rootDir, "BROWSE.md"),
    },
    {
      label: `research/INDEX.md (${researchRoot.source})`,
      filePath: path.join(rootDir, "INDEX.md"),
    },
    {
      label: `schemas/CHANGELOG.md (${schemasRoot.source})`,
      filePath: path.join(schemasRoot.resolvedPath, "CHANGELOG.md"),
    },
  ];
}

/**
 * Read a file and return its first `maxLines` lines.
 * Returns null if the file does not exist or cannot be read.
 */
function readFirstLines(filePath: string, maxLines: number): string | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split("\n");
    const sliced = lines.slice(0, maxLines);
    // Indicate truncation when the file had more lines.
    if (lines.length > maxLines) {
      sliced.push(`… (truncated after ${maxLines} lines)`);
    }
    return sliced.join("\n");
  } catch {
    return null;
  }
}

export default async function coldStartBrowseIndexLoader(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  if (!eagerContextEnabled()) {
    return {
      message: "palantir-mini: cold-start-browse-index-loader — lazy mode (no SessionStart context injection; run /palantir-mini:pm-cold-start-orchestrate when needed)",
      decision: "continue",
    };
  }

  const sections: string[] = ["## Cold-start router excerpts\n"];
  let loadedCount = 0;
  const missingFiles: string[] = [];

  const routerFiles = await resolveRouterFiles();
  for (const { label, filePath } of routerFiles) {
    const content = readFirstLines(filePath, MAX_LINES);
    if (content === null) {
      missingFiles.push(label);
      sections.push(`### ${label}\n_(file not found: ${filePath})_\n`);
    } else {
      loadedCount++;
      sections.push(`### ${label}\n\`\`\`\n${content}\n\`\`\`\n`);
    }
  }

  const additionalContext = sections.join("\n");

  // Emit 5-dim event — best-effort (never blocks SessionStart).
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "design",
      passed:     loadedCount > 0,
      errorClass: "cold_start_browse_index_loaded",
    },
    toolName:  "SessionStart",
    cwd,
    sessionId: p.session_id,
    identity:  "monitor",
    reasoning: `Wave 2.B — SessionStart hook auto-loads BROWSE/INDEX routers as additionalContext per user directive #10b (cold-start automation); loaded ${loadedCount}/${routerFiles.length} router(s); missing=[${missingFiles.join(",")}]`,
    hypothesis: "Hook fires at SessionStart; Lead's first turn includes router excerpts; manual prompt for cold-start eliminated",
    memoryLayers: ["procedural", "episodic"],
    refinementTarget: {
      kind:            "other",
      filePathOrRid:   "hooks/cold-start-browse-index-loader.ts",
      description:     "SessionStart hook auto-injects BROWSE/INDEX/CHANGELOG router excerpts as additionalContext",
      confidenceLevel: "high",
    },
  }).catch(() => { /* best-effort — never crash SessionStart */ });

  if (loadedCount === 0) {
    return {
      message: "palantir-mini: cold-start-browse-index-loader — no router files found (advisory)",
      decision: "continue",
    };
  }

  return {
    message: `palantir-mini: cold-start-browse-index-loader — loaded ${loadedCount}/${routerFiles.length} router(s)`,
    decision: "continue",
    additionalContext,
  };
}
