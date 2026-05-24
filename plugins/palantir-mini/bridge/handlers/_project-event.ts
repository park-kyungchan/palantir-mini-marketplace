// palantir-mini v2.4.0 — handler helper: emit_for_project
// Domain: LEARN (AppendOnlyEventLog routing helper)
//
// Normalises "which project owns this event" for handlers that can operate on
// a consumer project while executing from the plugin repo.

import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";
import type { LogEnvelope } from "../../scripts/log";

export function resolveProjectPath(projectPath?: string): string {
  if (typeof projectPath === "string" && projectPath.trim().length > 0) {
    return projectPath.trim();
  }
  return resolveProjectRoot();
}

export async function emitForProject(
  projectPath: string | undefined,
  envelope: LogEnvelope,
): Promise<number> {
  const previous = process.env.PALANTIR_MINI_PROJECT;
  process.env.PALANTIR_MINI_PROJECT = resolveProjectPath(projectPath);
  try {
    return await emit(envelope);
  } finally {
    if (previous === undefined) delete process.env.PALANTIR_MINI_PROJECT;
    else process.env.PALANTIR_MINI_PROJECT = previous;
  }
}
