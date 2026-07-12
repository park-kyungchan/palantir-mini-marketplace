// palantir-mini PR-13 — Hook enforcement level
//   enforcement: blocking
//   rationale:   decision=block in hooks.json; denies Edit|Write on ontology primitives/contracts/codegen files missing semantic frontmatter block.
// palantir-mini v3.7.0 — hooks/semantic-frontmatter-validate.ts (orchestrator)
// PreToolUse (blocking) + PostToolUse (advisory) hook for ontology .ts files.
// Decomposed in v3.7.0 A.1: types/formatters/validator extracted to ./semantic-frontmatter-validate/*.
//
// Enforces that hand-written ontology files carry a semantic frontmatter block:
//
//   Form A — JSDoc at file top:
//     /**
//      * ...
//      * @owner <slug>
//      * @purpose <one-line description>
//      */
//
//   Form B — YAML-in-comment block:
//     // @semantic-frontmatter
//     // owner: <slug>
//     // purpose: <one-line description>
//
// PreToolUse: exit 2 (block) when frontmatter is missing.
// PostToolUse: exit 1 (warn, non-blocking) when frontmatter is missing.

import * as path from "path";
import { emit } from "../scripts/log";
import { isPathRequiringFrontmatter } from "./semantic-frontmatter-validate/types";
import { validateSemanticFrontmatter, resolveContent } from "./semantic-frontmatter-validate/validator";
import type { HookPayload, HookResult } from "./semantic-frontmatter-validate/types";

// Backward-compat re-exports for tests + external callers
export type { HookPayload, FrontmatterValidationResult, HookResult } from "./semantic-frontmatter-validate/types";
export { isPathRequiringFrontmatter, REQUIRED_PATHS } from "./semantic-frontmatter-validate/types";
export { checkJsDocForm, checkYamlCommentForm } from "./semantic-frontmatter-validate/formatters";
export { validateSemanticFrontmatter, resolveContent } from "./semantic-frontmatter-validate/validator";

export default async function semanticFrontmatterValidate(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const hookEvent = p.hook_event_name ?? "PreToolUse";
  const isPost = hookEvent === "PostToolUse";

  const filePath = p.tool_input?.file_path ?? p.tool_input?.path ?? "";
  if (!filePath) {
    return { message: "palantir-mini: semantic-frontmatter-validate skipped (no file_path)" };
  }

  // Only enforce on .ts files under required paths
  if (!filePath.endsWith(".ts") || !isPathRequiringFrontmatter(filePath)) {
    return { message: `palantir-mini: semantic-frontmatter-validate skipped (${path.basename(filePath)} not in scope)` };
  }

  // For PostToolUse, read from disk; for PreToolUse, use tool_input content (pre-write)
  const toolContent = p.tool_input?.content ?? p.tool_input?.new_string ?? "";
  const content = isPost
    ? resolveContent(filePath, toolContent)
    : toolContent;

  if (!content) {
    return { message: "palantir-mini: semantic-frontmatter-validate skipped (no content available)" };
  }

  const result = validateSemanticFrontmatter(content);

  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase:      "post_write",
        passed:     result.valid,
        errorClass: result.valid ? undefined : `missing_semantic_frontmatter:${result.missingFields.join(",")}`,
      },
      toolName:  p.tool_name ?? hookEvent,
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
    });
  } catch { /* best-effort */ }

  if (!result.valid) {
    const missing = result.missingFields.join(", ");
    const guidance = result.form === "none"
      ? `Add a JSDoc block with @owner + @purpose at the file top, or a // @semantic-frontmatter YAML block.`
      : `Frontmatter block detected (form: ${result.form}) but missing: ${missing}.`;
    const reason = `palantir-mini semantic-frontmatter-validate: ${path.basename(filePath)} is missing semantic frontmatter.\n${guidance}\nRequired for files under schemas/ontology/(primitives|contracts|codegen)/.`;

    process.stderr.write(`[palantir-mini/semantic-frontmatter-validate] ${reason}\n`);

    if (isPost) {
      // Advisory only — do not block
      return {
        message:           `palantir-mini: semantic-frontmatter-validate (valid=false, advisory)`,
        additionalContext: reason,
      };
    }

    // PreToolUse — block
    return {
      message:  `palantir-mini: semantic-frontmatter-validate (valid=false, blocking)`,
      decision: "block",
      reason,
    };
  }

  return {
    message:  `palantir-mini: semantic-frontmatter-validate (valid=true, form=${result.form})`,
  };
}
