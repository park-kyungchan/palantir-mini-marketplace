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
 * OPEN #1 (DESIGN §8.1, CRITIQUE single-most-important-fix): the comparison implemented here
 *   is RAW-SHA (`atopWhich !== headSha`). A raw-SHA flag fires on EVERY commit to a backing
 *   file, including benign commits where the governed STRUCTURE is unchanged — i.e. it is
 *   NOISY by construction. The structural-fingerprint comparator that suppresses benign
 *   noise is NOT in the grounding and is deferred to the proposal-emitting increment. Every
 *   result is tagged `comparator: "raw-sha"` and carries `noiseWarning` so a caller cannot
 *   mistake this for the calibrated, low-noise signal.
 */
// Domain: LEARN (prim-learn — BackwardProp drift evidence) + LOGIC (read-side fold)

import * as path from "path";
import { readEvents } from "./read";
import type { EventEnvelope } from "./types";

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
   */
  headSha?: string;
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
   * HONESTY TAG — the comparison strategy actually used. Always "raw-sha" in this
   * increment. Surfaced so a consumer cannot mistake a noisy raw-SHA hit for a
   * structurally-calibrated drift signal.
   */
  comparator: "raw-sha";
  /**
   * HONESTY TAG — present whenever `stale` is non-empty. Warns that raw-SHA staleness
   * fires on benign commits (OPEN #1); a structural fingerprint is required before any
   * stale entry should drive a re-elevation proposal.
   */
  noiseWarning?: string;
}

const NOISE_WARNING =
  "raw-sha comparator: atopWhich!=HEAD fires on EVERY backing commit, including benign " +
  "ones where the governed structure is unchanged (DESIGN OPEN #1). Do NOT treat a stale " +
  "entry as a re-elevation trigger until a structural fingerprint suppresses benign noise.";

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
      const backingRef = raw.properties?.backingSourceRef;
      byRid.set(rid, {
        rid,
        kind,
        atopWhich,
        ...(typeof backingRef === "string" ? { backingSourceRef: backingRef } : {}),
      });
    }
  }

  const comparedAgainst = typeof args.headSha === "string" && args.headSha.length > 0
    ? args.headSha
    : null;

  const stale: StalePrimitive[] = [];
  const indeterminate: InspectedPrimitive[] = [];
  for (const prim of byRid.values()) {
    if (comparedAgainst === null) {
      indeterminate.push(prim);
    } else if (prim.atopWhich !== comparedAgainst) {
      stale.push({ ...prim, comparedAgainst });
    }
  }

  return {
    project: args.project,
    comparedAgainst,
    inspectedCount: byRid.size,
    stale,
    indeterminate,
    comparator: "raw-sha",
    ...(stale.length > 0 ? { noiseWarning: NOISE_WARNING } : {}),
  };
}
