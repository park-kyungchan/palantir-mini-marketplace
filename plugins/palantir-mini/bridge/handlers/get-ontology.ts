// palantir-mini v0 — MCP tool handler: get_ontology
// Domain: LOGIC (Reducer) + DATA (SnapshotManifest)
//
// Reads the derived ontology snapshot for a project. If atSequence is omitted,
// folds the full events.jsonl and returns the latest snapshot.

import * as path from "path";
import { readEvents, foldToSnapshot } from "../../lib/event-log/read";
import type { EventSnapshot, RegisteredPrimitiveEntry } from "../../lib/event-log/types";

type Domain = "data" | "logic" | "action" | "security" | "learn" | "all";

/** The six registeredPrimitives bucket names. */
type BucketName =
  | "objectTypes"
  | "linkTypes"
  | "actionTypes"
  | "functions"
  | "roles"
  | "properties";

interface GetOntologyArgs {
  project:    string;
  domain?:    Domain;
  /**
   * OUT-2 — optional single-bucket narrowing (bounds the result at the
   * registered-primitive-kind granularity). When set, only this bucket is
   * retained (intersected with the domain scope if `domain` also narrows).
   */
  kind?:      BucketName;
  atSequence?: number;
}

interface GetOntologyResult {
  project:        string;
  domain:         string;
  atSequence:     number;
  snapshot:       EventSnapshot;
  generatedAt:    string;
  /**
   * OUT-2 — flat top-level SCALAR counts. Kept flat (no nesting) so the
   * generic bounded-return summary surfaces them inline on overflow rather
   * than collapsing them to `{kind,keys:N}`. Counts reflect the domain/kind
   * scope applied to `snapshot.registeredPrimitives`.
   */
  counts:         GetOntologyCounts;
}

interface GetOntologyCounts {
  objectTypes:  number;
  linkTypes:    number;
  actionTypes:  number;
  functions:    number;
  roles:        number;
  properties:   number;
  totalEvents:  number;
  lastSequence: number;
}

/**
 * OUT-2 — D/L/A axis → registered-primitive buckets in that domain. Grounded
 * in the codebase's D/L/A taxonomy (e.g. lib/fde-ontology-engineering/
 * source-ingest.ts: ObjectType + Property are DATA; LinkType relates DATA
 * entities; Function is LOGIC; ActionType is ACTION; Role is the
 * principal→permission grant = SECURITY). LEARN is events/lineage — it
 * registers no primitive kind, so its bucket set is empty.
 */
const DOMAIN_BUCKETS: Record<Domain, ReadonlyArray<BucketName>> = {
  all:      ["objectTypes", "linkTypes", "actionTypes", "functions", "roles", "properties"],
  data:     ["objectTypes", "linkTypes", "properties"],
  logic:    ["functions"],
  action:   ["actionTypes"],
  security: ["roles"],
  learn:    [],
};

const ALL_BUCKETS: ReadonlyArray<BucketName> = DOMAIN_BUCKETS.all;

/**
 * Return the set of buckets the result should retain, intersecting the domain
 * scope with an optional single-kind narrowing.
 */
function scopedBuckets(domain: Domain, kind: BucketName | undefined): ReadonlyArray<BucketName> {
  const domainSet = DOMAIN_BUCKETS[domain] ?? ALL_BUCKETS;
  if (kind === undefined) return domainSet;
  return domainSet.includes(kind) ? [kind] : [];
}

/**
 * Build a registeredPrimitives object that keeps only the in-scope buckets;
 * out-of-scope buckets are emptied (NOT removed) so the shape is stable for
 * consumers that read all six bucket names.
 */
function scopeRegisteredPrimitives(
  source: EventSnapshot["registeredPrimitives"],
  keep: ReadonlyArray<BucketName>,
): EventSnapshot["registeredPrimitives"] {
  const empty: RegisteredPrimitiveEntry[] = [];
  const keepSet = new Set(keep);
  const pick = (b: BucketName): RegisteredPrimitiveEntry[] =>
    keepSet.has(b) ? (source?.[b] ?? []) : empty;
  return {
    objectTypes: pick("objectTypes"),
    linkTypes:   pick("linkTypes"),
    actionTypes: pick("actionTypes"),
    functions:   pick("functions"),
    roles:       pick("roles"),
    properties:  pick("properties"),
  };
}

export default async function getOntology(rawArgs: unknown): Promise<GetOntologyResult> {
  const args = (rawArgs ?? {}) as GetOntologyArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("get_ontology: `project` is required (absolute path to project root)");
  }

  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  let events = readEvents(eventsPath);

  if (typeof args.atSequence === "number") {
    events = events.filter((e) => e.sequence <= args.atSequence!);
  }

  const fullSnapshot = foldToSnapshot(events);

  // OUT-2 — `domain` (and optional `kind`) now REALLY narrow the result instead
  // of being echoed as a no-op. We scope the registeredPrimitives buckets to the
  // D/L/A axis (intersected with `kind` when present); the event counters in the
  // snapshot are domain-agnostic and pass through unchanged.
  const domain: Domain = args.domain ?? "all";
  const keep = scopedBuckets(domain, args.kind);
  const scopedReg = scopeRegisteredPrimitives(fullSnapshot.registeredPrimitives, keep);
  const snapshot: EventSnapshot = { ...fullSnapshot, registeredPrimitives: scopedReg };

  const counts: GetOntologyCounts = {
    objectTypes: scopedReg!.objectTypes.length,
    linkTypes:   scopedReg!.linkTypes.length,
    actionTypes: scopedReg!.actionTypes.length,
    functions:   scopedReg!.functions.length,
    roles:       scopedReg!.roles.length,
    properties:  scopedReg!.properties.length,
    totalEvents:  snapshot.totalEvents,
    lastSequence: snapshot.lastSequence,
  };

  return {
    project: args.project,
    domain,
    atSequence: args.atSequence ?? snapshot.lastSequence,
    snapshot,
    generatedAt: new Date().toISOString(),
    counts,
  };
}
