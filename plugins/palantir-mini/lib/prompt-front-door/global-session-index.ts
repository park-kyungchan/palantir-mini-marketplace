// palantir-mini pm authorization-flexibility slice 2 — G-ENV-A cross-lane resolution.
//
// GLOBAL (home-level) session index: a small pointer store keyed purely by
// (runtime, sessionId), NOT per-project. It never carries envelope/contract
// state itself — it is a REDIRECT to the project root whose LOCAL
// PromptFrontDoorStore (lib/prompt-front-door/store.ts) owns the authoritative
// PromptEnvelope. Envelope authority stays single-copy in the local per-project
// store (no cross-copy staleness); this global surface is only a cross-lane
// index consulted as a FALLBACK when a local per-project lookup misses (e.g. a
// dispatched subagent or a second repo whose cwd differs from the originating
// UserPromptSubmit's projectRoot, but which shares the same runtime/sessionId —
// confirmed by the pm-flex slice-2 spike, see
// _workspace/2026-07-12-pmflex/reports/spike-session-id.json).
//
// Path is overridable via PALANTIR_MINI_GLOBAL_STATE_DIR so tests never read or
// write the real user home directory (hard hermeticity requirement).
import { readFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { atomicWriteJson, atomicWriteJsonSync } from "../fs-atomic";
import { safeSegment } from "../id-segment";
import type { PromptRuntime } from "./envelope";

export const GLOBAL_SESSION_POINTER_SCHEMA_VERSION =
  "prompt-front-door/global-session-pointer/v1";

export interface GlobalSessionPointer {
  readonly schemaVersion: typeof GLOBAL_SESSION_POINTER_SCHEMA_VERSION;
  readonly runtime: PromptRuntime;
  readonly sessionId: string;
  readonly projectRoot: string;
  readonly capturedAt: string;
}

const SEGMENT_OPTS = { fallback: "unknown", maxLen: Infinity, allowColon: false } as const;

/**
 * Root directory for the global session index. Default:
 * `<os.homedir()>/.palantir-mini/session/prompt-front-door-global`. The
 * PALANTIR_MINI_GLOBAL_STATE_DIR override replaces the home-directory base
 * (not the trailing `.palantir-mini/session/prompt-front-door-global` suffix),
 * mirroring how PALANTIR_MINI_PROJECT overrides project-root resolution
 * elsewhere in prompt-front-door.
 */
export function globalSessionIndexRootDir(): string {
  const override = process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  const base = override && override.trim().length > 0 ? override : os.homedir();
  return path.join(base, ".palantir-mini", "session", "prompt-front-door-global");
}

function globalSessionPointerPath(runtime: PromptRuntime, sessionId: string): string {
  return path.join(
    globalSessionIndexRootDir(),
    `${safeSegment(runtime, SEGMENT_OPTS)}-${safeSegment(sessionId, SEGMENT_OPTS)}.json`,
  );
}

function pointerRecordFor(
  runtime: PromptRuntime,
  sessionId: string,
  projectRoot: string,
): GlobalSessionPointer {
  return {
    schemaVersion: GLOBAL_SESSION_POINTER_SCHEMA_VERSION,
    runtime,
    sessionId,
    projectRoot,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Synchronous upsert for the sync UserPromptSubmit capture hook. Callers are
 * expected to wrap this in try/catch — a global-index write failure must never
 * break or alter local capture behavior.
 */
export function writeGlobalSessionPointerSync(
  runtime: PromptRuntime,
  sessionId: string,
  projectRoot: string,
): void {
  atomicWriteJsonSync(
    globalSessionPointerPath(runtime, sessionId),
    pointerRecordFor(runtime, sessionId, projectRoot),
  );
}

/** Async upsert variant, for non-hook callers. */
export async function writeGlobalSessionPointer(
  runtime: PromptRuntime,
  sessionId: string,
  projectRoot: string,
): Promise<void> {
  await atomicWriteJson(
    globalSessionPointerPath(runtime, sessionId),
    pointerRecordFor(runtime, sessionId, projectRoot),
  );
}

export async function readGlobalSessionPointer(
  runtime: PromptRuntime,
  sessionId: string,
): Promise<GlobalSessionPointer | null> {
  try {
    return JSON.parse(
      await readFile(globalSessionPointerPath(runtime, sessionId), "utf8"),
    ) as GlobalSessionPointer;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
