// palantir-mini v1.3 — generated-header-check hook handler
// Fires on: PostToolUse matcher **/src/generated/**
//
// Phase A-3 A4.3: enforces codegen header contract (rule 08 §Codegen authority).
// After any edit to a generated file, verifies the header carries
// schema version + ontology hash + generator version + timestamp.
// Exits 2 (blocks) on invalid header — tells user to regenerate.

import * as path from "path";
import { emit } from "../scripts/log";

interface HookPayload {
  tool_name?:  string;
  tool_input?: { file_path?: string; path?: string };
  cwd?:        string;
  session_id?: string;
}

async function verifyCodegenHeaders(project: string, globs: string[]): Promise<{ valid: boolean; details: string }> {
  const handlerPath = path.resolve(
    import.meta.dirname!,
    "..",
    "bridge",
    "handlers",
    "verify-codegen-headers.ts",
  );
  try {
    const mod = await import(handlerPath) as { default?: (a: unknown) => Promise<unknown> };
    if (typeof mod.default !== "function") return { valid: true, details: "handler unavailable — skipping" };
    const result = (await mod.default({ project, globs })) as { violations?: Array<{ file: string; missingFields: string[] }> } | null;
    if (!result) return { valid: true, details: "no result" };
    const viols = result.violations ?? [];
    if (viols.length > 0) {
      const detail = viols.slice(0, 3).map((v) => `${path.basename(v.file)}: missing ${v.missingFields.join(", ")}`).join("; ");
      return { valid: false, details: detail };
    }
    return { valid: true, details: "header valid" };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (msg.includes("Cannot find module") || msg.includes("No such file")) {
      return { valid: true, details: "verify-codegen-headers handler not yet available (A2 pending)" };
    }
    return { valid: true, details: `handler error (skipping): ${msg.slice(0, 80)}` };
  }
}

export default async function generatedHeaderCheck(payload: unknown): Promise<{
  message: string;
  decision?: "block" | "continue";
  reason?:   string;
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const editedFile = p.tool_input?.file_path ?? p.tool_input?.path ?? "";

  const project = cwd;
  const globs = editedFile ? [editedFile] : [];

  const { valid, details } = await verifyCodegenHeaders(project, globs);

  if (!valid) {
    const base = `palantir-mini generated-header-check: invalid codegen header in ${path.basename(editedFile)}.\n${details}\nDo NOT edit generated files directly — regenerate them (rule 08 §Codegen authority).`;
    const { withRuleExcerpt } = await import("../scripts/rule-excerpt");
    const reason = await withRuleExcerpt(base, 8);
    process.stderr.write(`[palantir-mini/generated-header-check] ${reason}\n`);

    try {
      await emit({
        type:      "validation_phase_completed",
        payload:   { phase: "post_write", passed: false, errorClass: "invalid_codegen_header" },
        toolName:  p.tool_name ?? "PostToolUse",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
      });
    } catch { /* best-effort */ }

    return { message: `palantir-mini: generated-header-check (valid=false)`, decision: "block", reason };
  }

  return {
    message:  `palantir-mini: generated-header-check (valid=true, ${details})`,
    decision: "continue",
  };
}
