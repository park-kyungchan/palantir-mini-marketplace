// G-ADV-N (pm auth-friction closure, slice 2) — advisory boilerplate token diet.
//
// Session+class-keyed dedup store for the prompt-DTC enforcement gate's fixed
// boilerplate lines (see hooks/gates/prompt-dtc-enforcement-gate.impl.ts's
// collapsibleBoilerplateLines helper). Mirrors delivery-grant-store.ts's proven
// shape (GLOBAL home-level path, keyed (runtime, sessionId), atomic write)
// SPECIFICALLY because that keying is what makes the dedup benefit reach
// subagents sharing the parent session's session_id (confirmed live: PreToolUse
// session_id sharing across a dispatched subagent). Path is overridable via
// PALANTIR_MINI_GLOBAL_STATE_DIR (same override as delivery-grant-store.ts /
// global-session-index.ts) so tests never read or write the real user home
// directory.
//
// This store is a TOKEN-COST OPTIMIZATION, not a security control: every
// function fails OPEN (never throws, treats any read/parse error as "not shown
// yet") so uncertainty never suppresses actionable gate text.
import { readFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { atomicWriteJson } from "../fs-atomic";
import { safeSegment } from "../id-segment";
import type { PromptRuntime } from "./envelope";

export type AdvisoryBoilerplateClass =
  | "scoped-advisory"
  | "sic-miss"
  | "generic-blocking"
  | "delivery-blocking";

const SEGMENT_OPTS = { fallback: "unknown", maxLen: Infinity, allowColon: false } as const;

/**
 * Defensive input validation (W4 CI fallout hardening): hook payloads are
 * untyped JSON at runtime, so despite the TypeScript signatures a caller-
 * supplied runtime/sessionId can be a non-string (object/undefined) shape.
 * Path resolution below must only ever see non-empty strings — anything else
 * is treated as "no usable session key" and the public functions fail OPEN
 * (boilerplate shows in full) rather than letting a TypeError (e.g.
 * path.join's `The "paths[0]" property must be of type string`) escape into
 * the gate's fail-closed catch-all.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Root directory for the global advisory-shown store. Default:
 * `<os.homedir()>/.palantir-mini/session/prompt-dtc-advisory-shown`. Honors the
 * SAME PALANTIR_MINI_GLOBAL_STATE_DIR override as delivery-grant-store.ts.
 * Strings-only: a non-string homedir()/override (hostile or broken environment)
 * throws here and is caught by the public functions' fail-open wrappers.
 */
export function advisoryShownStoreRootDir(): string {
  const override = process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  const base = isNonEmptyString(override) && override.trim().length > 0 ? override : os.homedir();
  if (!isNonEmptyString(base)) {
    throw new TypeError("advisory-shown-store: resolved base dir is not a non-empty string");
  }
  return path.join(base, ".palantir-mini", "session", "prompt-dtc-advisory-shown");
}

function advisoryShownPath(runtime: PromptRuntime, sessionId: string): string {
  if (!isNonEmptyString(runtime) || !isNonEmptyString(sessionId)) {
    throw new TypeError("advisory-shown-store: runtime/sessionId must be non-empty strings");
  }
  return path.join(
    advisoryShownStoreRootDir(),
    `${safeSegment(runtime, SEGMENT_OPTS)}-${safeSegment(sessionId, SEGMENT_OPTS)}.json`,
  );
}

interface AdvisoryShownRecord {
  readonly schemaVersion: "prompt-front-door/advisory-shown/v1";
  readonly shownClasses: readonly AdvisoryBoilerplateClass[];
}

/**
 * True iff the boilerplate for `cls` has already been shown once this
 * session. FAIL-OPEN on any read error (ENOENT or otherwise) → false (show
 * the full block) — this is a token-cost optimization, not a security
 * control, so uncertainty must never suppress actionable text.
 */
export async function hasAdvisoryBoilerplateBeenShown(
  runtime: PromptRuntime,
  sessionId: string,
  cls: AdvisoryBoilerplateClass,
): Promise<boolean> {
  try {
    const raw = await readFile(advisoryShownPath(runtime, sessionId), "utf8");
    const record = JSON.parse(raw) as AdvisoryShownRecord;
    return record.shownClasses.includes(cls);
  } catch {
    return false;
  }
}

/** Best-effort; never throws. A write failure just means the block repeats — safe. */
export async function markAdvisoryBoilerplateShown(
  runtime: PromptRuntime,
  sessionId: string,
  cls: AdvisoryBoilerplateClass,
): Promise<void> {
  try {
    const filePath = advisoryShownPath(runtime, sessionId);
    let existing: readonly AdvisoryBoilerplateClass[] = [];
    try {
      const raw = await readFile(filePath, "utf8");
      existing = (JSON.parse(raw) as AdvisoryShownRecord).shownClasses;
    } catch {
      // first write for this session; ignore.
    }
    if (existing.includes(cls)) return;
    await atomicWriteJson(filePath, {
      schemaVersion: "prompt-front-door/advisory-shown/v1",
      shownClasses: [...existing, cls],
    } satisfies AdvisoryShownRecord);
  } catch {
    // best-effort only.
  }
}
