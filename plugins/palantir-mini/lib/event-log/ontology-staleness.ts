/**
 * palantir-mini v7.13.0 — READ-ONLY ontology staleness detector (dynamic-ontology increment 1).
 * @owner palantirkc-plugin-events
 * @purpose Detect code↔ontology drift signal #1 (G2 §4): a registered primitive whose
 *          backing artifact has moved past the commit SHA it was elevated atop.
 *
 * Domain: LEARN (BackwardProp drift evidence) — strictly READ-ONLY.
 *
 * GROUNDING (DESIGN §7 / CRITIQUE Axis 4 steps 1-3 / G2 drift signal #1):
 *   The committing `edit_committed` event already carries `atopWhich` (the commit SHA the
 *   edit was registered atop); its `appliedEdits[].rid` are the primitives it registered;
 *   an object edit's projected declaration may carry `backingSourceRef` (the live-mapped
 *   backing artifact). This detector JOINS those THREE facts pm already stores — it adds
 *   NO field to the persisted event log, NO field to the snapshot bucket entry shape, and
 *   changes NO governance/commit/elevate path. It is a pure read-side fold.
 *
 * BOUNDARY (DESIGN §3, CRITIQUE Axis 2): this module DETECTS only. It emits NO re-elevation
 *   proposal, performs NO write, and never enters the DTC / approval gate. Pillar C's
 *   propose-step is deliberately NOT built here (it is the next increment).
 *
 * PER-FILE CALIBRATION (additive increment): the original raw-SHA comparator
 *   (`atopWhich !== headSha`) is ALL-OR-NOTHING — when many primitives share ONE committing
 *   `atopWhich`, the next HEAD commit flags ALL of them at once regardless of which backing
 *   file actually moved. The pure core now ALSO accepts an optional per-backingRef signal
 *   (`changedSinceAtop`) and decides staleness PER primitive: stale iff THIS primitive's
 *   own backing artifact changed in `(atopWhich, HEAD]`. The backing artifact is derived
 *   READ-SIDE from the committed declaration (explicit `backingSourceRef`, else the first
 *   real-path `evidenceRefs` entry). The impure sibling `detectOntologyStalenessGit` builds
 *   that signal from read-only `git log`. When the signal is ABSENT the core falls back to
 *   the unchanged raw-SHA path (full back-compat).
 *
 * OPEN #1 (DESIGN §8.1, CRITIQUE single-most-important-fix): NEITHER comparator closes this.
 *   raw-SHA fires on EVERY commit to a backing file; per-file-sha narrows the blast radius to
 *   the ONE primitive whose backing file moved but STILL fires on benign same-file edits
 *   (formatting, comment-only, an unrelated symbol in the same file). The full
 *   structural-fingerprint comparator that suppresses benign-structure commits is NOT in the
 *   grounding and remains OPEN #1, a FURTHER increment. Every result is tagged with the
 *   `comparator` actually used (`"raw-sha"` | `"per-file-sha"`) and carries the matching
 *   `noiseWarning` so a caller cannot mistake either for the calibrated, low-noise signal.
 *
 *   PROVENANCE-DEPENDENT (Pillar C #1, 2026-06-16): the structural-fingerprint comparator is
 *   feasible ONLY for a MECHANICALLY-EXTRACTED ontology — one whose structure is cheaply +
 *   deterministically re-derivable from code (e.g. pm's self-ontology, structure derivable
 *   from bridge tool signatures). For a MODEL-REASONED doc-corpus ontology (harness-upstream),
 *   the forward map artifact→structure was an LLM session, not a code function, so it is NOT
 *   cheaply feasible and remains a deferred FURTHER increment. There the structural judgment
 *   belongs in the GATED propose-step (per-file-sha + human/LLM judgment), NOT in this
 *   always-on pure comparator.
 */
// Domain: LEARN (prim-learn — BackwardProp drift evidence) + LOGIC (read-side fold)

import * as path from "path";
import { readEvents } from "./read";
import type { EventEnvelope } from "./types";
// execFile/promisify are consumed ONLY by the clearly-marked IMPURE section at the bottom
// of this file (detectOntologyStalenessGit). The pure core above never references them.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

/** The six registered-primitive kinds, mirroring the fold buckets. */
export type StalePrimitiveKind =
  | "objectType"
  | "actionType"
  | "function"
  | "role"
  | "property"
  | "linkType";

/** One registered primitive the detector inspected, with its elevated-atop SHA. */
export interface InspectedPrimitive {
  /** Registered rid (from the committing edit's `appliedEdits[].rid`). */
  rid: string;
  /** Which fold bucket the primitive lives in (from the edit's `primitiveKind` / edit kind). */
  kind: StalePrimitiveKind;
  /** The commit SHA the primitive was elevated atop (the committing event's `atopWhich`). */
  atopWhich: string;
  /**
   * The live-mapped backing artifact ref, when the committed declaration carried one
   * (`backingSourceRef` on an object edit's properties). Absent when the primitive was
   * registered without a backing pointer.
   */
  backingSourceRef?: string;
}

/** A primitive flagged stale: its `atopWhich` no longer equals the current HEAD SHA. */
export interface StalePrimitive extends InspectedPrimitive {
  /** Current backing SHA the primitive was compared against (HEAD, or a supplied override). */
  comparedAgainst: string;
}

export interface DetectOntologyStalenessArgs {
  /** Absolute path to the project root whose `.palantir-mini/session/events.jsonl` is read. */
  project: string;
  /**
   * The current backing SHA to compare each primitive's `atopWhich` against. When omitted,
   * the caller (e.g. a health view) is expected to pass the live HEAD; this module does NOT
   * shell out to git, keeping it side-effect free and testable. If absent AND no HEAD is
   * derivable, every primitive is reported as `indeterminate` (NOT stale) — fail-safe.
   *
   * IGNORED when `changedSinceAtop` is supplied (the per-file path does not compare a
   * repo-wide SHA), except that its presence/absence is still echoed on the report's
   * `comparedAgainst` field for caller display.
   */
  headSha?: string;
  /**
   * PER-FILE drift signal, keyed by the COMPOSITE `atopWhich + NUL + backingSourceRef`
   * (`String.fromCharCode(0)` join): `true` = that primitive's backing file/dir changed in
   * `(atopWhich, HEAD]`, `false` = unchanged. The composite key is load-bearing — two
   * primitives that share a backingRef but were elevated atop DIFFERENT `atopWhich` SHAs must
   * not collide on one entry. When supplied the core uses the PER-FILE comparator
   * (`comparator: "per-file-sha"`) instead of raw-SHA: a primitive is stale iff its composite
   * key maps to `true`; a primitive with NO derived backingRef, or whose composite key is
   * ABSENT from this record (fail-safe — e.g. an absolute / repo-escaping / unresolvable ref
   * the builder omitted), is `indeterminate`, never stale. When ABSENT the core falls back to
   * the unchanged raw-SHA path (full back-compat).
   */
  changedSinceAtop?: Record<string, boolean>;
}

export interface OntologyStalenessReport {
  /** Project whose event log was folded. */
  project: string;
  /** The SHA every primitive was compared against (echo of `headSha`), or null when absent. */
  comparedAgainst: string | null;
  /** Total registered primitives the detector found an `atopWhich` for. */
  inspectedCount: number;
  /** Primitives whose `atopWhich !== comparedAgainst` (raw-SHA drift). */
  stale: StalePrimitive[];
  /** Primitives that could not be compared (no `comparedAgainst` supplied). */
  indeterminate: InspectedPrimitive[];
  /**
   * HONESTY TAG — the comparison strategy actually used. `"raw-sha"` when the legacy
   * repo-wide `atopWhich !== headSha` path ran (no per-backingRef signal supplied);
   * `"per-file-sha"` when the per-primitive `changedSinceAtop` signal drove the decision.
   * Surfaced so a consumer cannot mistake either for a structurally-calibrated drift signal.
   */
  comparator: "raw-sha" | "per-file-sha";
  /**
   * HONESTY TAG — present whenever `stale` is non-empty. Warns that the comparator used
   * still fires on benign commits (OPEN #1): raw-sha on EVERY backing commit, per-file-sha
   * on benign same-file edits. A structural fingerprint is required before any stale entry
   * should drive a re-elevation proposal.
   */
  noiseWarning?: string;
}

const NOISE_WARNING =
  "raw-sha comparator: atopWhich!=HEAD fires on EVERY backing commit, including benign " +
  "ones where the governed structure is unchanged (DESIGN OPEN #1). Do NOT treat a stale " +
  "entry as a re-elevation trigger until a structural fingerprint suppresses benign noise.";

const PER_FILE_NOISE_WARNING =
  "per-file-sha comparator: a primitive is stale iff ITS OWN backing file changed in " +
  "(atopWhich, HEAD] — narrower than raw-sha, but STILL fires on benign same-file edits " +
  "(formatting, comment-only, an unrelated symbol in the same file). The full " +
  "structural-fingerprint comparator that suppresses benign-structure commits remains " +
  "OPEN #1, a FURTHER increment — this does NOT close it. Do NOT treat a stale entry as a " +
  "re-elevation trigger until a structural fingerprint suppresses benign noise.";

/**
 * Derive a primitive's backing artifact ref READ-SIDE from its committed declaration
 * properties: an explicit `backingSourceRef` wins; otherwise the FIRST `evidenceRefs`
 * entry that is a real path (skips `data:*` inline literals and any non-path marker).
 * Returns `undefined` when nothing real-path is present (→ indeterminate under per-file).
 */
function deriveBackingRef(props: Record<string, unknown> | undefined): string | undefined {
  const explicit = props?.backingSourceRef;
  if (typeof explicit === "string" && explicit.length > 0) return explicit;
  const evidenceRefs = props?.evidenceRefs;
  if (!Array.isArray(evidenceRefs)) return undefined;
  for (const ref of evidenceRefs) {
    if (typeof ref === "string" && ref.length > 0 && !ref.startsWith("data:")) return ref;
  }
  return undefined;
}

/**
 * Composite key for the per-file `changedSinceAtop` record: `atopWhich + NUL + backingRef`.
 * The NUL (`String.fromCharCode(0)`) join is unambiguous (neither a SHA nor a path contains
 * NUL) and disambiguates two primitives that share a backingRef but were elevated atop
 * DIFFERENT `atopWhich` SHAs — keying by backingRef alone would collide them onto one entry.
 */
function changedSinceAtopKey(atopWhich: string, backingRef: string): string {
  return atopWhich + String.fromCharCode(0) + backingRef;
}

interface AppliedEditLike {
  kind?: string;
  rid?: string;
  properties?: Record<string, unknown>;
}

/** Map an object edit's `primitiveKind` (or a link edit) to a StalePrimitiveKind. */
function editToKind(edit: AppliedEditLike): StalePrimitiveKind | undefined {
  if (edit.kind === "link") return "linkType";
  if (edit.kind !== "object") return undefined;
  const pk = edit.properties?.primitiveKind;
  switch (pk) {
    case "ObjectType": return "objectType";
    case "ActionType": return "actionType";
    case "Function":   return "function";
    case "Role":       return "role";
    case "Property":   return "property";
    default:           return undefined;
  }
}

/**
 * READ-ONLY ontology staleness detector. Folds the project's append-only event log,
 * joins each registered primitive to the `atopWhich` of the event that registered it,
 * and returns the primitives whose `atopWhich` no longer equals the current HEAD.
 *
 * Pure + side-effect free: reads only `events.jsonl` (append-only), writes nothing,
 * proposes nothing. Latest registration wins per rid (a re-elevation of the same rid
 * supersedes its earlier `atopWhich`), mirroring the fold's append-only idempotency.
 */
export function detectOntologyStaleness(
  args: DetectOntologyStalenessArgs,
): OntologyStalenessReport {
  if (!args || typeof args.project !== "string" || args.project.length === 0) {
    throw new Error("detectOntologyStaleness: `project` (absolute project root) is required");
  }
  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  const events: EventEnvelope[] = readEvents(eventsPath);

  // Join: rid -> latest InspectedPrimitive (latest committing event wins).
  const byRid = new Map<string, InspectedPrimitive>();
  for (const ev of events) {
    if (ev.type !== "edit_committed") continue;
    const atopWhich = typeof ev.atopWhich === "string" ? ev.atopWhich : undefined;
    if (!atopWhich) continue; // a committing event without a SHA cannot anchor staleness
    const appliedEdits = Array.isArray(ev.payload?.appliedEdits) ? ev.payload.appliedEdits : [];
    for (const raw of appliedEdits as AppliedEditLike[]) {
      const rid = typeof raw.rid === "string" ? raw.rid : undefined;
      if (!rid) continue;
      const kind = editToKind(raw);
      if (!kind) continue;
      // Backing artifact derived READ-SIDE: explicit backingSourceRef wins, else the first
      // real-path evidenceRefs entry (skip data:* literals). No re-elevate, no new field.
      const backingRef = deriveBackingRef(raw.properties);
      byRid.set(rid, {
        rid,
        kind,
        atopWhich,
        ...(backingRef !== undefined ? { backingSourceRef: backingRef } : {}),
      });
    }
  }

  const comparedAgainst = typeof args.headSha === "string" && args.headSha.length > 0
    ? args.headSha
    : null;

  // Per-file path is selected ONLY when the caller supplies the changedSinceAtop signal;
  // otherwise the legacy raw-sha path runs UNCHANGED (full back-compat).
  const perFile = args.changedSinceAtop;
  const usePerFile = perFile !== undefined && perFile !== null;

  const stale: StalePrimitive[] = [];
  const indeterminate: InspectedPrimitive[] = [];
  for (const prim of byRid.values()) {
    if (usePerFile) {
      // PER-FILE: stale iff THIS primitive's own backing file changed in (atopWhich, HEAD].
      // Keyed by the COMPOSITE (atopWhich, backingRef) so two primitives sharing a backingRef
      // but elevated atop different SHAs do not collide. No derived backingRef, or a composite
      // key the builder omitted (fail-safe: absolute / repo-escaping / unresolvable) →
      // indeterminate, never falsely stale.
      const ref = prim.backingSourceRef;
      const changed = ref !== undefined ? perFile[changedSinceAtopKey(prim.atopWhich, ref)] : undefined;
      if (changed === undefined) {
        indeterminate.push(prim);
      } else if (changed === true) {
        stale.push({ ...prim, comparedAgainst: comparedAgainst ?? "per-file-sha" });
      }
      // changed === false → not stale (clean), not pushed anywhere.
    } else if (comparedAgainst === null) {
      indeterminate.push(prim);
    } else if (prim.atopWhich !== comparedAgainst) {
      stale.push({ ...prim, comparedAgainst });
    }
  }

  const comparator: "raw-sha" | "per-file-sha" = usePerFile ? "per-file-sha" : "raw-sha";
  const warning = usePerFile ? PER_FILE_NOISE_WARNING : NOISE_WARNING;

  return {
    project: args.project,
    comparedAgainst,
    inspectedCount: byRid.size,
    stale,
    indeterminate,
    comparator,
    ...(stale.length > 0 ? { noiseWarning: warning } : {}),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// IMPURE SECTION — shells out to read-only `git log`. Everything ABOVE this line
// is pure + side-effect-free (it only reads events.jsonl). The pure core never
// references anything below. This wrapper builds the per-backingRef changedSinceAtop
// signal from git and delegates the decision to the pure core.
// ════════════════════════════════════════════════════════════════════════════

const execFileAsync = promisify(execFile);

export interface DetectOntologyStalenessGitArgs {
  /** Absolute project root (read for events.jsonl AND used as the git -C repo). */
  project: string;
  /** Repo root for the `git -C <repo>` invocation. Defaults to `project` when omitted. */
  repo?: string;
}

/**
 * IMPURE per-file staleness detector. Runs the pure core once to enumerate primitives and
 * their derived backing refs, builds a per-backingRef `changedSinceAtop` signal from
 * read-only `git log <atopWhich>..HEAD --oneline -- <backingRef>` (non-empty output ⇒ the
 * backing file moved in that range), then re-invokes the pure core WITH the signal so the
 * decision stays in one place.
 *
 * FAIL-SAFE: a backing ref that is absolute, escapes the repo (`..`), or whose git
 * invocation errors is OMITTED from `changedSinceAtop` — the pure core then marks that
 * primitive `indeterminate` (NOT stale), matching the module's fail-safe philosophy.
 *
 * READ-ONLY: only `git log` is invoked; nothing is written or mutated. NEVER throws on a
 * per-ref git failure (each ref is probed independently and a failure ⇒ omit).
 */
export async function detectOntologyStalenessGit(
  args: DetectOntologyStalenessGitArgs,
): Promise<OntologyStalenessReport> {
  if (!args || typeof args.project !== "string" || args.project.length === 0) {
    throw new Error("detectOntologyStalenessGit: `project` (absolute project root) is required");
  }
  const repo = typeof args.repo === "string" && args.repo.length > 0 ? args.repo : args.project;

  // (a) Enumerate primitives + their derived backing refs via the pure core (no signal yet).
  const enumerated = detectOntologyStaleness({ project: args.project });
  const primitives = [...enumerated.stale, ...enumerated.indeterminate];

  // (b) Probe each DISTINCT (atopWhich, backingRef) pair with read-only `git log`.
  const changedSinceAtop: Record<string, boolean> = {};
  const probed = new Set<string>();
  for (const prim of primitives) {
    const ref = prim.backingSourceRef;
    if (ref === undefined) continue; // no backing ref → pure core marks indeterminate
    // Fail-safe: never probe an absolute or repo-escaping ref — omit ⇒ indeterminate.
    if (path.isAbsolute(ref) || ref.split(/[\\/]/).includes("..")) continue;
    const pairKey = changedSinceAtopKey(prim.atopWhich, ref);
    if (probed.has(pairKey)) continue;
    probed.add(pairKey);
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["-C", repo, "log", `${prim.atopWhich}..HEAD`, "--oneline", "--", ref],
        { maxBuffer: 16 * 1024 * 1024, timeout: 30000 },
      );
      // Non-empty output ⇒ at least one commit in (atopWhich, HEAD] touched this ref. Keyed by
      // the COMPOSITE (atopWhich, backingRef) so the pure core's per-primitive lookup matches.
      changedSinceAtop[changedSinceAtopKey(prim.atopWhich, ref)] = stdout.trim().length > 0;
    } catch {
      // git errored (unresolvable ref / not a working tree / bad range) → OMIT ⇒ indeterminate.
    }
  }

  // (c) Re-invoke the pure core WITH the signal so the decision lives in ONE place.
  return detectOntologyStaleness({ project: args.project, changedSinceAtop });
}
