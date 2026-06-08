// Test: Wave-2 self-Ontology Monitor ObjectType — pm's event-stream watcher surface
// registered AS an ObjectType. Monitor instances are runtime-seeded (no first-class
// monitors/ source today; retired background-monitor subprocesses are not reintroduced),
// so the seed is EMPTY and the type registration is the deliverable. This is a
// registration-resolves test (no filesystem drift guard — there is no static source to
// drift against).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the instance module executes it → self-registration side effect.
import {
  MONITOR_OBJECT_TYPE,
  MONITOR_OBJECT_TYPE_RID,
  MONITOR_INSTANCES,
} from "#schemas/ontology/self/monitor.objecttype";

test("self Monitor ObjectType is registered with monitorId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(MONITOR_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(MONITOR_OBJECT_TYPE);
  expect(got!.apiName).toBe("Monitor");
  expect(got!.primaryKeyProperty).toBe("monitorId");
});

test("Monitor seed is empty (runtime-seeded; type registration is the deliverable)", () => {
  // No live monitors/ source today, so the build-time seed carries 0 instances. The type
  // registration above is the deliverable; instances populate if/when a live source exists.
  expect(MONITOR_INSTANCES.length).toBe(0);
});
