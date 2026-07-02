# AIP Chatbot Studio Local Workbench

This document describes the PR7 local workbench and ledger fixture boundary. It
is source documentation only; it does not claim active runtime support.

## Scope

- Local debug/view analogue for Chatbot Studio style sessions.
- Compiles context, pins application variables, plans tool refs, records trace
  refs, and displays runtime gaps.
- Blocks protected actions until approval evidence exists.
- Records session and trace evidence in a local JSONL ledger.
- Source-complete is not active-runtime-complete.

## Semantic Boundary

The local workbench must keep two related layers separate:

- Context Engineering layer: `DATA`, `LOGIC`, `ACTION`, `GOVERNANCE`,
  `SECURITY`, `EVAL`, and `RUNTIME` describe how the local workbench gathers
  context, exposes tools, evaluates output, records approval boundaries, and
  reports runtime gaps.
- Ontology modeling layer: `ObjectType`, `LinkType`, `ActionType`, `Function`,
  `Interface`, `ObjectView`, `ObjectSet`, branch/proposal, and ontology-edit
  concepts describe semantic domain modeling and governed mutation surfaces.

These layers are related but not interchangeable. A Chatbot Studio action tool
is not an Ontology `ActionType`; application state and retrieval context are not
Ontology primitive declarations; provider/runtime identity is metadata, not
authority. Semantic implementation claims must cite local Palantir research SSoT
under `~/.claude/research/palantir-official/` before they are
promoted into contracts, schemas, docs, or handler descriptions.

## Callable Shape

Input:

- `conversation` is required by the local source callable.
- `userInput` is required.
- `sessionId` is optional.
- `variableInputs` is optional and carries caller-provided variable inputs.
- `ledgerPath` is optional and enables JSONL ledger append.

Output:

- `responseMarkdown` carries the local response.
- `sessionId` identifies the local session ledger entry.
- `variableUpdates` lists deterministic local variable updates.
- `traceRefs` lists trace evidence refs.
- `plannedToolSurfaceRefs`, `blockedActionSurfaceRefs`, `runtimeGaps`, and
  `publishAnalogue` provide debug visibility.
- `declaration.semanticBoundary` lists source-grounded Context Engineering and
  Ontology modeling refs plus non-interchangeability warnings.
- `declaration.retrievalContext.ontologyPrimitiveRefs` is the typed primitive
  bucket. `contextEngineeringRefs`, `issueRefs`, and `validationRefs` must not
  be treated as Ontology primitive refs.

## Ledger Boundary

The PR7 fixture uses a JSONL ledger shape for local session and trace evidence.
The ledger is append-only evidence, not source authority and not approval
authority. It must not write `~/.codex/plugins/cache/**` or any runtime payload.

## Publish Analogue Boundary

The publish analogue may record local publish intent for review. It must not
publish to Foundry, AIP Studio APIs, Marketplace distribution, or a running
runtime plugin payload.

## No-Reference / No-Confusion Gate

Regression tests must fail when generated workbench output or local tool
descriptions collapse Context Engineering labels into Ontology primitive names,
claim Foundry parity, or omit local Palantir research SSoT references for
semantic boundary claims. Public Codex MCP input schemas remain flat; conditional
requirements stay in handlers and tests, not in public `anyOf`, `oneOf`,
`allOf`, or `not` schema composition.

Fixture: `tests/evals/chatbot-studio-local-workbench-regression.json`.
