# Convex Cloud Authority

As of 2026-05-13, palantir-mini's data substrate is split:

| Layer | Authority | Used for |
|-------|-----------|----------|
| Source code | `/home/palantirkc/palantir-mini/` (canonical SSoT) | Plugin behavior, hooks, handlers, MCP server |
| Data substrate (T3+ / T4 mirror) | **Convex Cloud Dev deployment `effervescent-meerkat-169`** | T3+ valuable events (rule 26), T4 promotion candidates, eval suites + runs (PR 5.4a/b) |
| Data substrate (fallback) | local self-hosted `anonymous:anonymous-palantir-mini@127.0.0.1:3210` | Offline development, R2 STUB MODE, pre-cutover testing |

## Why split

- Plugin **source** is single-source-of-truth (rule 27, PR 6.1) so all runtimes consume identical code.
- Plugin **data** can mirror to Cloud for: durability + cross-host visibility + reactive subscriptions (PR 5.4b) + AIPCon-style governance.
- Local fallback preserves R1 (local-default) + R2 (STUB MODE) per handoff §E.2.

## R1 / R2 / R3 invariants

| Invariant | Status (2026-05-13) |
|-----------|---------------------|
| **R1**: local self-hosted Convex remains documented default | PRESERVED — `.env.local` still points at 127.0.0.1:3210 |
| **R2**: STUB MODE in `convex-client.ts` preserved when Cloud unavailable | PRESERVED — see PR 4.1c |
| **R3**: NO Convex Agent Component / RAG Component adoption | PRESERVED — only plain mutations + queries |

## How to switch the runtime

To use the Cloud deployment locally:
1. Copy `convex/.env.cloud.example` → `convex/.env.cloud` (PR 4.1a).
2. Fill in the deploy key (provided by the user; see `convex/.env.cloud.example` for format).
3. Start with `CONVEX_ENV=cloud bunx convex dev` from the plugin root.

To stay local:
- No action needed. `.env.local` is the default.

## Cross-refs

- PR 6.1 — source-SSoT marker (`.ssot-authority.json`).
- PR 4.1a — Cloud cutover authorization.
- PR 4.1b — 18-key schema extension.
- PR 4.1c — Cloud-aware convex-client.
- PR 4.1d — parity verification skill.
- PR 5.4a — eval suites/runs Cloud tables.
- Rule 27 — cross-runtime substrate.
- Canonical plan v2 §4 row 6.7.
