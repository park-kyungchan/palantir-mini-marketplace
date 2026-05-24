// palantir-mini PR-13 — Hook enforcement level
//   enforcement: advisory
//   rationale:   async:true in hooks.json; emits advisory impact context; never blocks tool execution.
// palantir-mini v1.4 — pre-edit-impact-check hook handler
// v1.4 (sprint-053 W3A): + CC v2.1.85+ hookSpecificOutput.updatedInput.file_path when input is a symlink (canonical path → impact graph).
// Fires on: PreToolUse matcher Edit|Write|MultiEdit (async: true)
//
// Phase A-3 A4.5 CRITICAL — Context Engineering substrate.
// Injects downstream impact context BEFORE every edit executes.
// Never blocks (exit 2) — advisory only, user/AI decides.
// Must complete in <500ms; degrades gracefully if bridge not ready.

import * as fs from "fs";
import * as path from "path";
import { emitSkillSuggestion } from "../lib/skill-suggestion-emit";

interface HookPayload {
  tool_name?:  string;
  tool_input?: { file_path?: string; path?: string; paths?: string[] };
  cwd?:        string;
  session_id?: string;
}

const IMPACT_CACHE = new Map<string, { result: string; cachedAt: number }>();
const CACHE_TTL_MS = 30_000;

async function preEditImpact(proposedFiles: string[], project: string): Promise<string> {
  const cacheKey = proposedFiles.sort().join("|");
  const cached = IMPACT_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
    return cached.result;
  }

  const handlerPath = path.resolve(
    import.meta.dirname!,
    "..",
    "bridge",
    "handlers",
    "pre-edit-impact.ts",
  );

  let result: string;
  try {
    const mod = await import(handlerPath) as { default?: (a: unknown) => Promise<unknown> };
    if (typeof mod.default !== "function") {
      result = "Impact analysis: handler not yet available (A2 pending).";
    } else {
      const raw = (await mod.default({ proposedFiles, project })) as { impacts?: unknown[]; summary?: string } | null;
      if (!raw) {
        result = "Impact analysis: no data.";
      } else if (raw.summary) {
        result = `Impact analysis: ${raw.summary}`;
      } else if (raw.impacts && Array.isArray(raw.impacts) && raw.impacts.length > 0) {
        result = `Impact analysis: ${raw.impacts.length} downstream edge(s) detected for ${proposedFiles.map(p => path.basename(p)).join(", ")}.`;
      } else {
        result = `Impact analysis: no downstream edges detected for ${proposedFiles.map(p => path.basename(p)).join(", ")}.`;
      }
    }
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (msg.includes("Cannot find module") || msg.includes("No such file")) {
      result = "Impact analysis: handler not yet available (A2 pending).";
    } else {
      result = `Impact analysis: error — ${msg.slice(0, 80)}.`;
    }
  }

  IMPACT_CACHE.set(cacheKey, { result, cachedAt: Date.now() });
  return result;
}

export default async function preEditImpactCheck(payload: unknown): Promise<{
  message: string;
  additionalContext?: string;
  hookSpecificOutput?: { updatedInput?: { file_path?: string } };
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  const singleFile = p.tool_input?.file_path ?? p.tool_input?.path;
  const multiFiles = p.tool_input?.paths ?? [];
  const proposedFiles = singleFile ? [singleFile] : multiFiles;

  // CC v2.1.85+ — when single file is a symlink, surface canonical path via updatedInput
  // so downstream impact queries hit the real path. No-op for multi-file or non-symlinks.
  let canonicalFilePath: string | undefined;
  if (singleFile) {
    try {
      const stat = fs.lstatSync(singleFile);
      if (stat.isSymbolicLink()) {
        canonicalFilePath = fs.realpathSync(singleFile);
      }
    } catch {
      // best-effort — file may not exist yet (Write tool); skip canonicalization
    }
  }

  if (proposedFiles.length === 0) {
    return { message: "palantir-mini: pre-edit-impact-check skipped (no file path in payload)" };
  }

  const impact = await preEditImpact(proposedFiles, cwd);

  // W1.8 — persist suggestion when blast radius is large enough to warrant decision-replay review
  // (rule 26 §Definition closure; Agent #3 audit gap). Heuristic: count "→" arrow chars in
  // the impact summary as a proxy for downstream RID count; ≥5 triggers suggestion.
  const arrowMatches = impact.match(/→|->/g);
  const arrowCount = arrowMatches ? arrowMatches.length : 0;
  if (arrowCount >= 5) {
    await emitSkillSuggestion({
      suggestedSkillSlug: "pm-decision-replay",
      suggestedByHook:    "pre-edit-impact-check",
      triggerCondition:   `pre-edit blastRadius ≥ 5 (arrow proxy=${arrowCount}, files=${proposedFiles.length})`,
      suggestionContext:  proposedFiles.join(","),
      memoryLayers:       ["procedural", "episodic"],
      cwd,
    });
  }

  return {
    message:           `palantir-mini: pre-edit-impact-check (files=${proposedFiles.length})`,
    additionalContext: impact,
    ...(canonicalFilePath ? { hookSpecificOutput: { updatedInput: { file_path: canonicalFilePath } } } : {}),
  };
}
