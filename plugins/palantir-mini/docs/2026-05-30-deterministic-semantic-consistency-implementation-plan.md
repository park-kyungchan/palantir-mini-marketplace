# Deterministic Semantic Consistency Implementation Plan

Date: 2026-05-30
Source repo: `/home/palantirkc/palantir-mini-marketplace`
Plugin source: `/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini`
Branch: `feat/semantic-consistency-control-plane`

Codex marketplace registration: `/home/palantirkc/palantir-mini-marketplace` for local development; `park-kyungchan/palantir-mini-marketplace --ref main` after merge
GitHub upstream provenance: `https://github.com/park-kyungchan/palantir-mini-marketplace`

## Goal

Implement deterministic semantic consistency in palantir-mini at the contract-promotion boundary.
LLM runtimes may propose wording or candidate mappings, but the palantir-mini
plugin layer must promote only structured, deterministic, approved canonical
vocabulary evidence into SIC/DTC/WorkContract routing and mutation gates.

## Required References

- Primary proposal: `/home/palantirkc/2026-05-29-final-palantir-mini-ontology-aip-semantic-consistency-proposal.md`
- Research routers: `/home/palantirkc/.claude/research/BROWSE.md`, `/home/palantirkc/.claude/research/INDEX.md`
- Official Palantir local evidence:
  - `/home/palantirkc/.claude/research/palantir-official/foundry/architecture-center/aip-architecture.md`
  - `/home/palantirkc/.claude/research/palantir-official/foundry/architecture-center/ontology-system.md`
  - `/home/palantirkc/.claude/research/palantir-official/foundry/chatbot-studio/retrieval-context.md`
  - `/home/palantirkc/.claude/research/palantir-official/foundry/chatbot-studio/application-state.md`
  - `/home/palantirkc/.claude/research/palantir-official/foundry/chatbot-studio/tools.md`
  - `/home/palantirkc/.claude/research/palantir-official/foundry/aip-evals/ontology-edits.md`

## Constraints

- Do not use palantir-mini MCP tools or palantir-mini skills as workflow authority for this self-improvement.
- Use `PALANTIR_MINI_MCP_FIRST_BYPASS=1` for local edit commands when the MCP-first hook would otherwise require palantir-mini self-analysis.
- Edit canonical marketplace source only.
- Do not edit runtime plugin caches under `.codex/plugins/cache/**`.
- Treat `/home/palantirkc/palantir-mini-marketplace` as the single local source checkout. Do not recreate
  source-looking Git checkouts under runtime homes such as
  `/home/palantirkc/.codex/.tmp/marketplaces/`. Push and merge through GitHub,
  then refresh consumer installs.
- Apply `docs/RUNTIME_LAYER_BOUNDARY.md` before every implementation slice: separate LLM/provider layer,
  native runtime adapter layer, GitHub marketplace source, marketplace checkout, and cache/install payload paths.
- Do not edit generated files directly.
- Keep new contract fields additive and absent-safe.
- Keep rollout advisory by default; blocking mode is opt-in after deterministic proof.

## Runtime Boundary Correction

Root cause found during implementation: the initial execution report named a `.claude/plugins/marketplaces/...`
path as the working source. Even though it was a GitHub-backed checkout, the path lived under a Claude runtime
home and therefore risked conflating Claude runtime locality with semantic ownership.

Correct boundary for the remainder of the work:

- Source authority: `/home/palantirkc/palantir-mini-marketplace`, upstream `https://github.com/park-kyungchan/palantir-mini-marketplace`, plugin root `plugins/palantir-mini/`.
Codex consumer: Codex plugin marketplace install from
`/home/palantirkc/palantir-mini-marketplace` during local development or from
GitHub after merge; cache payloads under `~/.codex/plugins/cache/**` are not
semantic authority.
- Deterministic invariant: resolver/contract/gate outputs must be identical for the same structured inputs regardless
  of the LLM/provider invoking the plugin.

## Final Gap

The plugin already has FDE sessions, SemanticConversationState, retrieval/application state, SIC/DTC,
WorkContract, RouterBinding, MCP capability metadata, ontology-DTC build readiness, workflow-family
contracts, and PreMutationImpactGate.

The missing layer is first-class deterministic vocabulary reconciliation:

- canonical/source-system term primitives,
- stable normalization and hashing,
- pure resolver output with conflicts and approved mappings,
- semantic consistency projection into conversation/retrieval/application state,
- additive SIC/DTC/WorkContract refs,
- ontology-DTC semantic readiness,
- router and pre-mutation diagnostics,
- repeatability evals and release self-check coverage.

## Implementation Slices

1. Add `lib/semantic-consistency/**` and focused tests.
   - `types.ts`
   - `normalize.ts`
   - `registry.ts`
   - `resolver.ts`
   - `fixtures.ts`
   - `tests/lib/semantic-consistency/*.test.ts`

2. Add additive state and contract integration.
   - `lib/chatbot-studio/semantic-conversation-state.ts`
   - `lib/chatbot-studio/retrieval-context.ts`
   - `lib/chatbot-studio/application-state.ts`
   - `lib/lead-intent/contracts.ts`
   - `lib/semantic-intent/ontology-dtc-build-sequence.ts`

3. Add route and mutation gate diagnostics.
   - `bridge/handlers/pm-semantic-intent-gate.ts`
   - `bridge/handlers/pm-intent-router.ts`
   - `lib/governance/pre-mutation-impact-gate.ts`
   - `lib/capability-registry/mcp-tool-capability.ts`

4. Add eval and release evidence.
   - `eval-suites/semantic-consistency-regression.json`
   - `tests/evals/semantic-consistency-regression.test.ts`
   - release/self-check coverage where existing self-check code supports extension.

## Determinism Rules

- Stable output must not depend on runtime, model, timestamps, random UUIDs, object insertion order, or prose.
- Normalization uses NFKC, trim, whitespace collapse, stable lowercasing, conservative punctuation rules, source namespace keying, sorted JSON hashing, and deterministic IDs from content hashes.
- LLM outputs are advisory evidence only. LLM text never auto-promotes to canonical terms or approved mappings.
- Resolver outputs compare structured deterministic fields only.

## Verification Commands

Run the narrowest passing sequence first, then the broader gates:

```bash
bun test tests/lib/semantic-consistency
bun test tests/lib/chatbot-studio
bun test tests/lib/lead-intent tests/lib/semantic-intent tests/lib/governance
bun test tests/bridge/handlers tests/evals
bun run typecheck
git diff --check
```

## Release Plan

1. Commit with explicit pathspecs.
2. Push `feat/semantic-consistency-control-plane`.
3. Open a PR against `main`.
4. Merge only after targeted tests, typecheck, and diffcheck pass.
5. Sync local `main` to `origin/main`.
6. Refresh Codex marketplace registration from `/home/palantirkc/palantir-mini-marketplace` for local validation or `park-kyungchan/palantir-mini-marketplace --ref main` after merge without editing Codex runtime cache payloads directly.
7. Confirm clean `git status --short --branch` for `/home/palantirkc/palantir-mini-marketplace` and document any consumer install drift.
