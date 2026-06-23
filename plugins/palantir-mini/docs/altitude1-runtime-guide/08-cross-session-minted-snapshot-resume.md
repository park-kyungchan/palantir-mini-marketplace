# Stage 08 — Cross-session minted-snapshot resume

**Resume class, not a forward step.** Stages 00–07 assume one continuous session
mints the approved SIC and rides it to dispatch. This slice covers the *other*
case: you `approve_sic` in one session, then **resume the flow in a DIFFERENT
session** (a fresh `start`, a new run, a different runtime adapter) and the gate
behaves as if no SIC was ever approved. The approved-SIC snapshot is still on
disk — it is just keyed where the active read can't see it. The runtime now
resolves it BY-REF (bd-011 / P0-2, landed 7.26.0); this slice tells you what that
means and when to expect it.

**Why the active read misses it.** The minted approved-SIC snapshot
(`approvedSemanticIntentContractSnapshot`) is persisted ONLY onto the **minting
session's** session-keyed state file. A fresh `start` in a non-minting session
writes a *snapshot-less* session file **and** overwrites `current.json`
(last-writer-wins) — so neither the active session-keyed read nor the
`current.json` fallback can see the snapshot the earlier session minted.

**What the runtime does (BY-REF resolve).** When the active workflow state lacks
the snapshot, `readPreviousWorkflowState` backfills it by scanning every persisted
workflow state under THIS `projectRoot` for one carrying a minted snapshot, then
returns the active state with that snapshot merged in. The downstream
`isApprovedSemanticIntentContract` gate STILL re-verifies the resolved snapshot
(unforgeable minted `approvalRef`) — the resolver only widens the READ scope; it
does **not** validate.

**Disambiguation (the failure modes you can hit).**
- **Single distinct minted SIC on disk** → resolved unambiguously; the resume
  proceeds. (Same `contractId` across several session files is still one concept,
  so still resolves.)
- **`preferContractId` match** — when the active state's `semanticIntentContractRef`
  matches a minted snapshot's `contractId`, that snapshot binds exactly, so the
  resume binds to the SIC the active workflow already references rather than an
  arbitrary prior one.
- **≥2 DISTINCT minted SICs and no matching ref** → **fail-closed** (resolver
  returns nothing): the caller's gate refuses rather than bind an arbitrary
  concept. Thread the intended `sessionId` (Stage 00) so the active state carries
  the right `semanticIntentContractRef`, which then matches its snapshot by ref.

**Common failure → fix.**
- Gate says `no SIC ref` / `contract_required` in a session that did NOT mint the
  SIC, even though `approve_sic` succeeded earlier → this resume class; the runtime
  already resolves a single minted snapshot by-ref. If it still refuses, you have
  ≥2 distinct minted SICs on disk (fail-closed ambiguity) — thread the intended
  `sessionId` so the active `semanticIntentContractRef` selects its snapshot.
- `current.json` shows a snapshot-less / wrong mission after a fresh `start` →
  expected (last-writer-wins poisons `current.json`); the by-ref scan, not
  `current.json`, is what recovers the minted snapshot. Do not "fix" `current.json`.

**Source.** `lib/ontology-engineering-workflow/store.ts` — grep
`resolveProjectMintedSicSnapshot` (the by-ref scan + fail-closed-on-ambiguity
logic). `bridge/handlers/pm-ontology-engineering-workflow.ts` — grep
`readPreviousWorkflowState` for the caller that backfills the snapshot and
`isApprovedSemanticIntentContract` for the fail-closed re-verification.
Behavior is pinned by
`tests/lib/ontology-engineering-workflow/cross-session-minted-sic-resolution.test.ts`.
