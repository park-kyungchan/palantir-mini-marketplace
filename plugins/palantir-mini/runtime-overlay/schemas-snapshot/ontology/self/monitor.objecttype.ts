/**
 * palantir-mini SELF-ONTOLOGY — Monitor as a registered ObjectType (Wave 2/4, harness
 * redesign self-model build). Mirrors the `skill.objecttype.ts` idiom: ONE `Monitor`
 * ObjectType (the type) seeded with the live event-stream watcher instances.
 *
 * pm's Automation-like event-stream watcher surface modeled AS ontology: each watcher
 * under `monitors/` is one Monitor identity (an event-stream watcher that emits advisory
 * signals, Automation-trigger equivalent). This file declares the type; the snapshot OWNS
 * the seed (no monitors-tree import).
 *
 * Count provenance (LIVE-verified): pm has NO first-class `monitors/` directory today —
 * the retired background-monitor subprocesses were removed (project memory: do not
 * reintroduce hook-spawned monitor subprocesses), so there are 0 Monitor instances to
 * seed. The TYPE registration is the deliverable: the noun exists in the self-model so the
 * graph (and any future watcher) has a home. Instances stay an empty seed until a live
 * `monitors/` source exists; the paired registration test asserts the type resolves from
 * the registry (no filesystem drift guard, since there is no source to drift against).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology Monitor ObjectType. */
export const MONITOR_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/monitor",
);

/**
 * Monitor modeled as a Palantir ObjectType. `monitorId` is the stable primary key; the
 * descriptor properties (`watchedStream`, `trigger`, `advisory`) mirror a watcher's
 * declaration but are carried on instances, of which there are currently none. The
 * PascalCase apiName mirrors the generated symbol.
 */
export const MONITOR_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: MONITOR_OBJECT_TYPE_RID,
  apiName: "Monitor",
  name: "Monitor",
  description:
    "palantir-mini event-stream watcher surface modeled as an ObjectType: one instance " +
    "per monitors/ watcher (Automation-trigger equivalent). monitorId identity plus " +
    "watchedStream, trigger, and advisory facts; no live monitors/ source today (retired " +
    "background-monitor subprocesses), so the seed is empty — the type registration is " +
    "the deliverable.",
  primaryKeyProperty: "monitorId",
  titleProperty: "monitorId",
  properties: [
    { name: "monitorId", type: "string" },
    { name: "watchedStream", type: "string", optional: true },
    { name: "trigger", type: "string", optional: true },
    { name: "advisory", type: "boolean", optional: true },
  ],
};

/** A registered Monitor instance — stable watcher identity plus its descriptor facts. */
export interface MonitorInstance {
  readonly monitorId: string;
  readonly watchedStream?: string;
  readonly trigger?: string;
  readonly advisory?: boolean;
}

/**
 * The Monitor instances — currently EMPTY (no first-class monitors/ source; retired
 * background-monitor subprocesses are not reintroduced). The type registration is the
 * deliverable; instances populate if/when a live monitors/ source exists.
 */
export const MONITOR_INSTANCES: readonly MonitorInstance[] = [];

// Register the Monitor ObjectType (the type). Instances are runtime-seeded (none today);
// the registration test asserts the type resolves from the registry.
OBJECT_TYPE_REGISTRY.register(MONITOR_OBJECT_TYPE);
