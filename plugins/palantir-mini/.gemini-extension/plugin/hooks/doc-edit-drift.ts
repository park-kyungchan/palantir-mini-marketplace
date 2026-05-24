// palantir-mini v1.3 — doc-edit-drift hook handler
// Fires on: PostToolUse matcher **/MEMORY.md|**/BROWSE.md|**/INDEX.md|**/CLAUDE.md
//
// Phase A-3 A4.2: detects broken xrefs whenever a doc-navigation file is edited.
// Invokes detect_doc_drift(scope="all") on the containing project.
// Exits 2 (blocks) when broken xrefs are found, otherwise emits event + continue.

import * as path from "path";
import { emit } from "../scripts/log";
import type detectDocDriftFn from "../bridge/handlers/detect-doc-drift";

interface HookPayload {
  tool_name?: string;
  tool_input?: { file_path?: string; path?: string };
  cwd?:       string;
  session_id?: string;
}

interface DocDriftSignal {
  driftKind:    string;
  evidencePath: string;
  expected:     string;
  observed:     string;
}

interface DetectDocDriftResult {
  signals: DocDriftSignal[];
}

async function detectDocDrift(project: string): Promise<{ drifted: boolean; details: string; signals: DocDriftSignal[] }> {
  const handlerPath = path.resolve(
    import.meta.dirname!,
    "..",
    "bridge",
    "handlers",
    "detect-doc-drift.ts",
  );
  try {
    const mod = await import(handlerPath) as { default?: typeof detectDocDriftFn };
    if (typeof mod.default !== "function") return { drifted: false, details: "handler unavailable", signals: [] };
    const result = (await mod.default({ project, scope: "all" })) as DetectDocDriftResult | null;
    if (!result) return { drifted: false, details: "no result", signals: [] };
    const signals = result.signals ?? [];
    const broken = signals.filter((s) => s.driftKind === "broken_xref");
    if (broken.length > 0) {
      const paths = broken.slice(0, 5).map((s) => s.observed).join(", ");
      return { drifted: true, details: `${broken.length} broken xref(s): ${paths}`, signals };
    }
    return { drifted: false, details: `${signals.length} drift signal(s), no broken xrefs`, signals };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (msg.includes("Cannot find module") || msg.includes("No such file")) {
      return { drifted: false, details: "detect-doc-drift handler not yet available (A2 pending)", signals: [] };
    }
    return { drifted: false, details: `handler error: ${msg.slice(0, 80)}`, signals: [] };
  }
}

export default async function docEditDrift(payload: unknown): Promise<{
  message: string;
  decision?: "block" | "continue";
  reason?:   string;
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const editedFile = p.tool_input?.file_path ?? p.tool_input?.path ?? "";

  const project = editedFile ? path.dirname(editedFile) : cwd;

  const { drifted, details, signals } = await detectDocDrift(project);

  try {
    await emit({
      type:      "drift_detected",
      payload:   {
        driftType:          "orphan_reference",
        affectedObjectType: editedFile ? path.basename(editedFile) : "unknown",
      },
      toolName:  p.tool_name ?? "PostToolUse",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      reasoning: details,
    });
  } catch { /* best-effort */ }

  if (drifted) {
    const reason = `palantir-mini doc-edit-drift: broken xrefs detected after editing ${path.basename(editedFile)}.\n${details}\nFix broken cross-references before continuing.`;
    process.stderr.write(`[palantir-mini/doc-edit-drift] ${reason}\n`);
    return { message: `palantir-mini: drift_detected (drifted=true)`, decision: "block", reason };
  }

  return {
    message:  `palantir-mini: drift_detected (drifted=false, ${details})`,
    decision: "continue",
  };
}
