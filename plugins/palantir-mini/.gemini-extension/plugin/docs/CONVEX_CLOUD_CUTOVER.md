# Convex Cloud Cutover — Decision Record

**Date**: 2026-05-13
**Sprint**: sprint-100 PR 4.1a
**Canonical plan ref**: v2 §4 row 4.1a + handoff §E.2
**Status**: AUTHORIZED (user directive 2026-05-13)

---

## Decision

The palantir-mini Convex backend is authorized to switch from anonymous self-hosted
(local `bunx convex dev`) to the user-provisioned Convex Cloud Dev deployment.

**Deployment**: `effervescent-meerkat-169` (Dev tier, palantirKC org)
**Deployment URL**: `https://effervescent-meerkat-169.convex.cloud`
**Deploy key location**: `convex/.env.cloud` (gitignored — NEVER committed)
**Key format**: `dev:effervescent-meerkat-169|...` (Dev key; not a Prod key)

The `dev:` prefix differentiates this from:
- `local:` / `anonymous:` — self-hosted (R1 default)
- `prod:` — production deployment (future PR if needed)

---

## Invariants Preserved (handoff §E.2)

### R1 — Local default
The `convex/.env.local` file continues to point to the anonymous self-hosted
deployment (`anonymous:anonymous-palantir-mini`, `http://127.0.0.1:3210`).
Running `bunx convex dev` without specifying `--env-file convex/.env.cloud`
will continue to use the local deployment. Cloud is opt-in.

### R2 — STUB MODE retained
`lib/impact-graph/convex-client.ts` STUB MODE (all queries return empty arrays
when `CONVEX_URL` is absent or Convex dev is not running) is preserved by this PR.
Callers never crash on missing deployment. STUB MODE operates identically for
both local and Cloud deployments — if the network is unavailable, STUB MODE
engages regardless of which `.env.*` file is active.

### R3 — No Convex Agent / RAG component
This PR does NOT introduce Convex Agent or vector-search / RAG components.
The schema (`convex/schema.ts`) is unchanged — PR 4.1b (sprint-100) will
extend the schema if needed. The `convex-client.ts` is unchanged — PR 4.1c
will make the client Cloud-aware. R3 scope boundary is clean.

---

## How to Switch to Cloud

1. Confirm `convex/.env.cloud` exists and contains the real deploy key.
   (Copy `convex/.env.cloud.example` → `convex/.env.cloud`, fill key if absent.)

2. Deploy the schema to Cloud:
   ```bash
   cd plugins/palantir-mini/convex
   bunx convex deploy --env-file .env.cloud
   ```

3. Run the dev server pointing at Cloud:
   ```bash
   CONVEX_ENV=cloud bunx convex dev --env-file convex/.env.cloud
   ```

4. Verify the deployment URL resolves:
   ```bash
   curl -s https://effervescent-meerkat-169.convex.cloud/.well-known/convex-info | jq .
   ```

5. To revert to local, omit `--env-file convex/.env.cloud` — `convex/.env.local`
   is the implicit default.

---

## Security Note

The `convex/.env.cloud` file is gitignored by `.gitignore` (explicit entry:
`convex/.env.cloud`). NEVER commit this file. Verify before any push:

```bash
git ls-files palantir-mini/convex/.env.cloud
# must output NOTHING
```

---

## Future PR Roadmap (Phase 4)

| PR | Scope |
|----|-------|
| 4.1a (this) | Cloud cutover authorization + deploy-key infra |
| 4.1b | `convex/schema.ts` extension for `decisionEvents` parity verification |
| 4.1c | `lib/impact-graph/convex-client.ts` Cloud-aware URL detection |
| 4.1d | Cloud ↔ local parity verification test suite |

---

## Rationale

Running Convex on Cloud enables:
- Persistent impact-graph data across machine restarts (no more cold-start rebuild).
- Multi-project simultaneous writes without port conflicts.
- Eventual D2-canonical cross-runtime consensus (rule 26 §D2) once the Codex
  runtime also writes to the same Cloud deployment.

The Dev-tier deployment is acceptable for the substrate cutover goal. A Prod
deployment can be provisioned in a future PR if the Dev-tier becomes a
durability concern.
