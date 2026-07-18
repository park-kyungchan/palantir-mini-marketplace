// Mutation-authority mint ledger (ledger row P430, ADR-005; encapsulation
// hardened P460 FIX 1 — see decisions/pm2-core-safety-correction.md).
//
// Records exactly what `commit-gate.ts`'s `issueMutationAuthority` minted
// for a given `nonce`, so `resolveMutationAuthority` can revalidate a
// caller-presented envelope — or a bare opaque handle — against what the
// gate itself actually issued, rather than trusting the caller's copy.
// This is the concrete mechanism behind AGENT-CONTRACT.md section 3's
// "opaque handle the single commit gate resolves and revalidates": a
// handle is just this ledger's key; a full envelope is checked byte-for-
// byte (via canonical fingerprint) against the record stored here.
//
// P460 FIX 1: `createMintLedger()` now returns an OPAQUE token
// (`MintLedgerToken`) with NO public write/lookup/consume method — the
// P460 adversarial verifier found that the previous `MintLedger` shape
// (`{ issue, lookup, markConsumed }`) was a public self-mint bypass: any
// caller holding a ledger (required to call `resolveMutationAuthority`)
// could call `ledger.issue(forgedEnvelope)` directly, defeating "single
// minting location, never caller-supplied". The actual record store now
// lives in a module-private `WeakMap<MintLedger, Map<string,
// MintedRecord>>` keyed by token identity, and can only be populated,
// read, or mutated through the governance-internal `mintIntoLedger` /
// `lookupInLedger` / `markConsumedInLedger` functions below — exported
// from this file for `commit-gate.ts` alone, and deliberately NOT
// re-exported by `src/governance/index.ts`'s public barrel. The existing
// `boundary:check` `governance-writer-import` rule already forbids any
// non-`src/governance/**` file from importing `./mint-ledger` directly, so
// the populate/read/mutate path stays governance-internal end-to-end.
//
// In-memory only. Durable persistence of issued/consumed authority across
// process restarts is Wave-5 storage territory (ADR-006, docs/
// architecture.md) — recording that scope boundary explicitly rather than
// silently assuming an in-memory ledger is production-durable. Every
// `commit-gate.ts` call in this wave's tests constructs its OWN ledger via
// `createMintLedger()` (never a process-global default) so tests never
// leak nonce state across cases.

import { fingerprintBody } from "../semantic-core/fingerprint";
import type { MutationAuthorityEnvelope } from "./types";

export interface MintedRecord {
  readonly envelope: MutationAuthorityEnvelope;
  readonly mintedFingerprint: string; // fingerprintBody(envelope minus `result`) at mint time
  consumed: boolean;
}

/**
 * An opaque mint-ledger handle. Deliberately exposes NO public method —
 * `typeof token.issue`, `typeof token.lookup`, `typeof token.markConsumed`
 * are all `"undefined"` for any value this module returns. The only way to
 * populate, read, or mutate the record a token identifies is through
 * `mintIntoLedger` / `lookupInLedger` / `markConsumedInLedger`, which key
 * off the token's own identity in the module-private `LEDGER_STORE`
 * WeakMap below — a caller cannot inject a record for a token it did not
 * receive from `createMintLedger()`, and cannot reach the store at all
 * without importing this file (which `boundary:check` restricts to
 * `src/governance/**`).
 */
export class MintLedger {
  // A nominal-typing anchor only (TypeScript structurally distinguishes
  // classes by their private members) — never read or assigned by anyone
  // outside this module.
  readonly #brand = "mint-ledger" as const;
}

const LEDGER_STORE = new WeakMap<MintLedger, Map<string, MintedRecord>>();

/** The canonical body a mint record is fingerprinted against: the envelope with `result` stripped (result is stamped only after resolution, never present at mint time). */
export function envelopeBodyFingerprint(envelope: MutationAuthorityEnvelope): string {
  const { result: _result, ...body } = envelope;
  return fingerprintBody(body as unknown as any);
}

export function createMintLedger(): MintLedger {
  const token = new MintLedger();
  LEDGER_STORE.set(token, new Map());
  return token;
}

function storeFor(ledger: MintLedger, callerName: string): Map<string, MintedRecord> {
  const store = LEDGER_STORE.get(ledger);
  if (store === undefined) {
    throw new Error(`${callerName}: unrecognized ledger (not created by createMintLedger())`);
  }
  return store;
}

/** Governance-internal: the ONLY populate path. Never exported outside `src/governance/**`. */
export function mintIntoLedger(ledger: MintLedger, envelope: MutationAuthorityEnvelope): void {
  storeFor(ledger, "mintIntoLedger").set(envelope.nonce, {
    envelope,
    mintedFingerprint: envelopeBodyFingerprint(envelope),
    consumed: false,
  });
}

/** Governance-internal: the ONLY read path. Never exported outside `src/governance/**`. */
export function lookupInLedger(ledger: MintLedger, nonce: string): MintedRecord | undefined {
  return storeFor(ledger, "lookupInLedger").get(nonce);
}

/** Governance-internal: the ONLY consume path. Never exported outside `src/governance/**`. */
export function markConsumedInLedger(ledger: MintLedger, nonce: string): void {
  const record = storeFor(ledger, "markConsumedInLedger").get(nonce);
  if (record) record.consumed = true;
}
