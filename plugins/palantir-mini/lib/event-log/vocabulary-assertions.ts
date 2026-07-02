/**
 * palantir-mini — EventType ↔ EVENT_TYPE_NAMES single-source-of-truth guard
 * @owner palantirkc-plugin-events
 * @purpose Compile-time bidirectional assertion that the runtime EventEnvelope
 *          discriminated union and the schemas-snapshot canonical vocabulary
 *          list name EXACTLY the same set of event types.
 */
// Domain: DATA (prim-data-01 EventEnvelope) — Sprint-cartography W1
//
// WHY THIS FILE EXISTS (dependency-direction note):
// `EVENT_TYPE_NAMES` physically lives at
// `runtime-overlay/schemas-snapshot/ontology/lineage/event-types.ts` (imported
// here via the `#schemas/*` subpath-import alias — see package.json `imports`).
// schemas-snapshot is a versioned, read-only SNAPSHOT boundary: `lib` imports
// FROM it, one-way, and must never be imported BY it (that would invert the
// intended layering where bridge → lib → schemas-snapshot). Because of that
// one-way direction, the vocabulary array cannot be *derived* from the
// `EventType` union (deriving would require schemas-snapshot to import the
// union FROM lib, inverting the dependency). Instead, this file imports BOTH
// sides from within `lib` (which is allowed to depend on schemas-snapshot)
// and asserts set equality between them at compile time, so a real mismatch
// in EITHER direction fails `tsc --noEmit` (and therefore `bun run typecheck`)
// rather than silently drifting.
//
// This assertion is BIDIRECTIONAL:
//   1. Every `EventType` union member must appear in `EVENT_TYPE_NAMES`
//      (no envelope variant is missing its canonical vocabulary entry).
//   2. Every `EVENT_TYPE_NAMES` entry must appear in `EventType`
//      (no vocabulary entry lacks a typed payload — the mission this file
//      exists to enforce: "no event can exist without a typed payload").
//
// A runtime complement to this compile-time guard lives in
// `tests/lib/event-log/vocabulary-parity.test.ts` (same assertion, enforced
// at `bun test` time via Set equality, for environments that run tests
// without a full `tsc --noEmit` pass).

import type { EventType } from "./types";
import { EVENT_TYPE_NAMES } from "#schemas/ontology/lineage/event-types";

/**
 * `never` iff every `EventType` member is present in `EVENT_TYPE_NAMES`.
 * If a new envelope variant is added to the `EventEnvelope` union in
 * `types.ts` without also adding its type name to `EVENT_TYPE_NAMES`, this
 * type resolves to that missing member's literal type instead of `never`,
 * and the assertion below fails to compile.
 */
type _AssertNoMissingFromVocabulary =
  Exclude<EventType, (typeof EVENT_TYPE_NAMES)[number]> extends never ? true : never;

/**
 * `never` iff every `EVENT_TYPE_NAMES` entry is present in `EventType`.
 * If a new name is added to `EVENT_TYPE_NAMES` without a corresponding typed
 * `EventEnvelope` variant, this type resolves to that extra name's literal
 * type instead of `never`, and the assertion below fails to compile.
 */
type _AssertNoExtraInVocabulary =
  Exclude<(typeof EVENT_TYPE_NAMES)[number], EventType> extends never ? true : never;

// These two `const` assignments are the actual compile-time trip-wire: if
// either alias above resolves to anything other than `true` (i.e. the
// conditional falls through to `never`), TypeScript rejects assigning `true`
// to it and `tsc --noEmit` fails right here with a pinpoint error naming this
// file. Referenced by the runtime test below so `tsc --noEmit` and the test
// runner both exercise the same guard.
export const ASSERT_EVENT_TYPE_NOT_MISSING_FROM_VOCABULARY: _AssertNoMissingFromVocabulary = true;
export const ASSERT_EVENT_TYPE_NOT_EXTRA_IN_VOCABULARY: _AssertNoExtraInVocabulary = true;
