// Tests: Wave 1 self-Ontology ObjectType — pm's append-only Decision-Lineage substrate
// registered AS an EventEnvelope ObjectType + 84 discriminator instances (count updated
// by Sprint-cartography W1 vocabulary/union drift closure — 18 vocabulary-dead
// discriminators removed + 14 typed-but-unlisted variants added after an exhaustive
// emit-site audit restored exact set equality with the EventType union; then schemas
// v1.96 / P1 unification S2 added cartography_decision_mirrored: 84). Proves the
// self-model resolves from the registry and that the discriminator seed stays true to
// the LIVE lineage/event-types.ts EVENT_TYPE_NAMES array (drift guard) — a discriminator
// added/removed without updating the seed fails loud here.

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the barrel executes the instance module → self-registration side effect.
import {
  EVENT_ENVELOPE_OBJECT_TYPE,
  EVENT_ENVELOPE_OBJECT_TYPE_RID,
  EVENT_ENVELOPE_INSTANCES,
} from "#schemas/ontology/self";

const EXPECTED_EVENT_ENVELOPE_COUNT = 84;

test("self EventEnvelope ObjectType is registered with eventId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(EVENT_ENVELOPE_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(EVENT_ENVELOPE_OBJECT_TYPE);
  expect(got!.apiName).toBe("EventEnvelope");
  expect(got!.primaryKeyProperty).toBe("eventId");
});

test(`EventEnvelope seed has ${EXPECTED_EVENT_ENVELOPE_COUNT} unique discriminator instances`, () => {
  expect(EVENT_ENVELOPE_INSTANCES.length).toBe(EXPECTED_EVENT_ENVELOPE_COUNT);
  const names = EVENT_ENVELOPE_INSTANCES.map((i) => i.eventType);
  expect(new Set(names).size).toBe(EXPECTED_EVENT_ENVELOPE_COUNT); // no duplicates
});

test("EventEnvelope seed matches the LIVE event-types.ts EVENT_TYPE_NAMES surface (drift guard)", () => {
  // The snapshot OWNS the seed (no event-types array import as data); this guard reads
  // event-types.ts as TEXT and asserts the self-model's 84 names equal pm's actual event
  // discriminator surface, so adding or removing a discriminator fails loud until
  // event-envelope.objecttype.ts is updated. EVENT_TYPE_NAMES entries are quoted
  // snake_case strings at 2-space indent inside the `as const` array (grounding-verified;
  // the EVENT_TYPE_REGISTRY block below uses bare keys, not quoted strings, so the regex
  // matches the array entries exactly).
  const eventTypesPath = path.join(
    import.meta.dir,
    "../../../runtime-overlay/schemas-snapshot/ontology/lineage/event-types.ts",
  );
  const src = fs.readFileSync(eventTypesPath, "utf8");
  const liveNames = [...src.matchAll(/^ {2}"([a-z_]+)",$/gm)].map((m) => m[1]!);
  const liveSet = new Set(liveNames);
  const seedSet = new Set(EVENT_ENVELOPE_INSTANCES.map((i) => i.eventType));
  expect(liveSet.size).toBe(EXPECTED_EVENT_ENVELOPE_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});
