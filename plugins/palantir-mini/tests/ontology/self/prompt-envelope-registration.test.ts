// Tests: Wave-2 self-Ontology ObjectType — pm's prompt-front-door surface registered
// AS a PromptEnvelope ObjectType. Count = 0 (catalog §2 runtime-seeded): instances are
// minted per prompt at runtime, so this is a registration-RESOLVES check (the type
// resolves from the registry) plus an empty-seed assertion — NOT a filesystem drift
// guard (there is no static seed source to diff against).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the type module executes it → self-registration side effect.
import {
  PROMPT_ENVELOPE_OBJECT_TYPE,
  PROMPT_ENVELOPE_OBJECT_TYPE_RID,
  PROMPT_ENVELOPE_INSTANCES,
} from "#schemas/ontology/self/prompt-envelope.objecttype";

test("self PromptEnvelope ObjectType is registered with promptId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(PROMPT_ENVELOPE_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(PROMPT_ENVELOPE_OBJECT_TYPE);
  expect(got!.apiName).toBe("PromptEnvelope");
  expect(got!.primaryKeyProperty).toBe("promptId");
});

test("PromptEnvelope seed is empty by design (runtime-seeded, catalog count 0)", () => {
  expect(PROMPT_ENVELOPE_INSTANCES.length).toBe(0);
});
