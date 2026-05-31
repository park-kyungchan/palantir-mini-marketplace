# Chatbot Studio Local Workbench

This document describes the PR7 local workbench and ledger fixture boundary. It
is source documentation only; it does not claim active runtime support.

## Scope

- Local debug/view analogue for Chatbot Studio style sessions.
- Compiles context, pins application variables, plans tool refs, records trace
  refs, and displays runtime gaps.
- Blocks protected actions until approval evidence exists.
- Records session and trace evidence in a local JSONL ledger.
- Source-complete is not active-runtime-complete.

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

## Ledger Boundary

The PR7 fixture uses a JSONL ledger shape for local session and trace evidence.
The ledger is append-only evidence, not source authority and not approval
authority. It must not write `~/.codex/plugins/cache/**` or any runtime payload.

## Publish Analogue Boundary

The publish analogue may record local publish intent for review. It must not
publish to Foundry, AIP Studio APIs, Marketplace distribution, or a running
runtime plugin payload.

Fixture: `tests/evals/chatbot-studio-local-workbench-regression.json`.
