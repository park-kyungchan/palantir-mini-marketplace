// A concrete, real `GateEffects["writeExecutor"]` implementation
// (ledger row P430) that funnels through the ONE shared atomic-write
// utility (`./atomic-write`) — proof-by-construction that the gate's
// injected writer is not just an interface shape but has at least one real,
// fail-closed implementation exercising `atomicWriteFile`.
//
// This is a FACTORY, not the writer primitive itself: it is safe to
// re-export from `./index.ts` because every call still routes through
// `atomicWriteFile`'s fail-closed `allowedRoots` assertion — there is no
// way to obtain the raw, unchecked `atomicWriteFile`/
// `assertWithinAllowedRoots` functions through this module.
//
// Persists the committed envelope (never its `result`, which the gate
// stamps only after this executor returns) as
// `<outcomeDir>/<nonce>.committed.json`, canonically serialized. Real
// Ontology-target storage (writing an actual consumer object/property/link)
// is Wave-5/ADR-006 territory; this wave's protected write is the
// commit-outcome record itself.

import { canonicalize, type CanonicalizableValue } from "../semantic-core/canonical-json";
import { atomicWriteFile } from "./atomic-write";
import type { GateEffects, MutationAuthorityEnvelope } from "./types";

export function createFileWriteExecutor(
  outcomeDir: string,
  allowedRoots: readonly string[],
): GateEffects["writeExecutor"] {
  return (envelope: MutationAuthorityEnvelope): void => {
    const targetPath = `${outcomeDir}/${envelope.nonce}.committed.json`;
    atomicWriteFile(targetPath, canonicalize(envelope as unknown as CanonicalizableValue), allowedRoots);
  };
}
