// palantir-mini — bd-015 variant-(i): pm-self-engineering exemption predicate.
//
// PURPOSE. When pm is being engineered ON ITS OWN SOURCE with pm OFF (the
// mutation-auth gate is not loaded in that session), an operator still wants the
// enforcement gate — when it IS loaded — to let NON-ONTOLOGY pm-plugin-source edits
// through WITHOUT inventing a full FDE/SIC/DTC workflow for a hooks/lib refactor.
// This module is the ALLOW-ONLY, FAILS-CLOSED predicate that decides that.
//
// SECURITY POSTURE (ssot/palantir/ontology/approval-and-lineage.md — two-layer
// Security WHO-vs-WHEN; ActionType = the SOLE write-back commit gate). This is a
// WHEN-layer relaxation that NEVER touches the ontology write-back boundary:
//   - It exempts ONLY pm-plugin SOURCE files that are NOT ontology surfaces.
//   - Any /ontology/ path-class target, or any target under a `.palantir-mini/`
//     ontology-state directory, is EXCLUDED — those keep going through the
//     mutationAuthorized (DTC) gate. Genuine ontology mutations stay blocked.
//   - It additionally requires an EXPLICIT, per-session, STRUCTURED opt-in
//     (NOT a prompt substring — that is the bd-004 anti-pattern). Absent the
//     opt-in the predicate is false and the original deny stands.
// Every read/walk error ⇒ predicate false ⇒ original deny (fail-closed).

import * as fs from "node:fs";
import * as path from "node:path";
import { pathIsProjectOntologyClass } from "../project/ontology-path-class";

/** JSON `kind` that identifies the canonical pm-plugin-source `.ssot-authority.json`. */
const PM_WORKFLOW_AUTHORITY_KIND = "palantir-mini-workflow-authority";

/** Per-session opt-in marker directory, relative to the resolved pm-plugin ROOT. */
const OPTIN_DIR_SEGMENTS = [
  ".palantir-mini",
  "session",
  "pm-self-engineering-optin",
] as const;

/** Structured opt-in marker `kind` discriminator (auditable, not prompt-derived). */
export const PM_SELF_ENGINEERING_OPTIN_KIND = "pm-self-engineering-optin";

export interface PmSelfEngineeringExemptDecision {
  /** True ONLY when every clause (A,B,C,D) holds. */
  readonly exempt: boolean;
  /** First-checked human-readable cause (grant rationale, or why it failed). */
  readonly reason: string;
  /** The resolved pm-plugin-source ROOT (the `.ssot-authority.json` dir), when found. */
  readonly pmRoot?: string;
  /** The resolved write-target set the decision was made on (audit surface). */
  readonly targets: readonly string[];
}

/**
 * Walk UP from `start` to the nearest ancestor dir whose `.ssot-authority.json`
 * exists AND parses AND has `kind === "palantir-mini-workflow-authority"`.
 * CONTENT-anchored — never a "palantir-mini" path-substring match. Returns the
 * absolute ROOT dir with separators normalized to forward-slash but the ON-DISK
 * CASE PRESERVED (callers pass case-preserving abs targets so filesystem reads
 * resolve on a case-sensitive filesystem; the returned root is compared against
 * those same case-preserving targets), or null. Never throws: a malformed /
 * unreadable `.ssot-authority.json` at an ancestor STOPS the walk and yields null
 * for that candidate (T-FC fail-closed) — it does not silently skip to a parent.
 *
 * Mirrors hooks/...gate.ts#walkProjectRoot but anchored on the authority FILE +
 * its `kind`, not on the `.palantir-mini` dir.
 */
export function resolvePmPluginSourceRoot(start: string): string | null {
  let cur = path.resolve(start);
  const fsRoot = path.parse(cur).root;
  while (cur !== fsRoot) {
    const authority = path.join(cur, ".ssot-authority.json");
    if (fs.existsSync(authority)) {
      let raw: string;
      try {
        raw = fs.readFileSync(authority, "utf8");
      } catch {
        return null; // unreadable authority at this candidate ⇒ fail-closed
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null; // malformed authority ⇒ fail-closed (T-FC)
      }
      const kind = (parsed as { kind?: unknown } | null)?.kind;
      if (kind === PM_WORKFLOW_AUTHORITY_KIND) {
        // Separator-normalize only; preserve on-disk case for descendant comparison.
        return cur.replace(/\\/g, "/");
      }
      // An authority file with a DIFFERENT kind is not the pm-plugin root: keep
      // walking up (a parent may still carry the pm authority). This is the only
      // "skip", and it skips a WRONG-kind authority, never a malformed one.
    }
    cur = path.dirname(cur);
  }
  return null;
}

/**
 * True if `target` (a case-preserving, forward-slash abs path) lives under a
 * `.palantir-mini/` ontology-STATE directory — the live PROJECT ONTOLOGY STATE
 * substrate. Excluded from the exemption (clause B) so a write into ontology state
 * always keeps going through the DTC gate. Lowercases internally for the segment
 * check (the `.palantir-mini` dir name is fixed-case, but be case-insensitive to be
 * safe). Matches the `/.palantir-mini/` segment anywhere in the path.
 */
function targetUnderPalantirMiniState(target: string): boolean {
  const lower = target.toLowerCase();
  return lower.includes("/.palantir-mini/") || lower.endsWith("/.palantir-mini");
}

/**
 * Clause (D) — read the EXPLICIT, per-session, STRUCTURED opt-in.
 *
 * The opt-in is a marker file an OPERATOR creates BEFORE the session does
 * pm-self-engineering edits:
 *   <pmRoot>/.palantir-mini/session/pm-self-engineering-optin/<sessionId>.json
 *   { "kind": "pm-self-engineering-optin", "sessionId": "<id>", "enabledAt": "<iso>", "enabledBy": "<who>" }
 *
 * It is per-session (keyed by the hook payload's `session_id`), explicit (a file
 * the operator must create; NOT inferred from any prompt text — bd-004 avoided),
 * structured (a `kind`-discriminated JSON record), and auditable (it persists with
 * who/when). A missing sessionId, missing file, malformed JSON, or wrong `kind`
 * ⇒ false ⇒ no exemption (fail-closed).
 */
export function readPmSelfEngineeringOptIn(
  pmRoot: string,
  sessionId: string | undefined,
): boolean {
  if (typeof sessionId !== "string" || sessionId.trim().length === 0) return false;
  // pmRoot is already normalized lowercase; the marker path lives under it.
  const file = path.join(pmRoot, ...OPTIN_DIR_SEGMENTS, `${sessionId}.json`);
  let raw: string;
  try {
    if (!fs.existsSync(file)) return false;
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return false;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }
  const obj = parsed as { kind?: unknown; sessionId?: unknown } | null;
  if (obj?.kind !== PM_SELF_ENGINEERING_OPTIN_KIND) return false;
  // Bind the record to THIS session: a marker whose sessionId field disagrees with
  // the filename / payload session is rejected (defends against a stale copy).
  if (typeof obj.sessionId === "string" && obj.sessionId !== sessionId) return false;
  return true;
}

/**
 * The bd-015 variant-(i) exemption predicate. Exempt IFF ALL hold:
 *   (A) WHERE   — every target resolves under the SAME pm-plugin-source ROOT
 *                 (content-anchored `.ssot-authority.json` kind walk).
 *   (B) WHAT-NOT— NO target is an ontology surface: for ALL targets,
 *                 !pathIsProjectOntologyClass(t) AND not under any `.palantir-mini/`.
 *   (C)         — targets is non-empty.
 *   (D)         — the explicit per-session structured opt-in is active.
 *
 * `targets` are the gate's already-resolved, normalized abs write-target paths.
 * Never throws; any failure path returns { exempt:false } (fail-closed).
 */
export function assessPmSelfEngineeringExempt(
  targets: readonly string[],
  sessionId: string | undefined,
): PmSelfEngineeringExemptDecision {
  // (C) non-empty.
  if (targets.length === 0) {
    return { exempt: false, reason: "no resolved write targets", targets };
  }

  // (B) WHAT-NOT — reject if ANY target is an ontology surface.
  for (const t of targets) {
    if (pathIsProjectOntologyClass(t)) {
      return { exempt: false, reason: `target is a project-ontology class surface: ${t}`, targets };
    }
    if (targetUnderPalantirMiniState(t)) {
      return { exempt: false, reason: `target is under a .palantir-mini ontology-state dir: ${t}`, targets };
    }
  }

  // (A) WHERE — every target must resolve under the SAME pm-plugin-source ROOT.
  // The ROOT is found by walking up from each target's own directory; ALL targets
  // must agree on ONE non-null ROOT and each must be a descendant of it.
  let pmRoot: string | null = null;
  for (const t of targets) {
    const root = resolvePmPluginSourceRoot(path.dirname(t));
    if (root === null) {
      return { exempt: false, reason: `target has no palantir-mini-workflow-authority ancestor: ${t}`, targets };
    }
    if (pmRoot === null) {
      pmRoot = root;
    } else if (pmRoot !== root) {
      return { exempt: false, reason: `targets span >1 pm root (${pmRoot} vs ${root})`, targets };
    }
    // Defense-in-depth: confirm the target is actually UNDER the resolved root.
    if (!(t === pmRoot || t.startsWith(`${pmRoot}/`))) {
      return { exempt: false, reason: `target is not under its resolved pm root: ${t}`, targets };
    }
  }
  if (pmRoot === null) {
    return { exempt: false, reason: "no pm root resolved", targets };
  }

  // (D) explicit per-session structured opt-in.
  if (!readPmSelfEngineeringOptIn(pmRoot, sessionId)) {
    return {
      exempt: false,
      reason: "pm-self-engineering opt-in is not active for this session",
      pmRoot,
      targets,
    };
  }

  return {
    exempt: true,
    reason: "all pm-source non-ontology targets under one pm root with active per-session opt-in",
    pmRoot,
    targets,
  };
}
