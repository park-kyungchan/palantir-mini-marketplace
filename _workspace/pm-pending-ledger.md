# pm-pending-ledger — the ONE canonical pm pending-work SSoT

> This file is **the ONE canonical pm pending-work SSoT**. Before any pm backlog session read
> **THIS file + memory `pm-current-state`**. Do **NOT** re-sweep `_workspace` dirs (consolidated
> here 2026-06-12 then deleted). Counts/SHAs/versions are **POINTERS** — verify live
> (`plugins/palantir-mini/.claude-plugin/plugin.json`, memory `pm-current-state`, `git`).

---

## STATE (pointer, not pin)

- **plugin version** → `plugins/palantir-mini/.claude-plugin/plugin.json` (was **v7.9.0** @ 2026-06-12)
- **backlog W1–W10** → **COMPLETE** (memory `pm-current-state`, 2026-06-11)
- **suite baseline** → **0-fail** (verify live; `bun test` from plugin root)
- **Codex runtime lane** → **HOLD** ("일단"; user directive 2026-06-10) — twins/tests untouchable
- **understand-heart (9-axis FDE → SIC)** → **SACRED**, never reduce

---

## OPEN  (live, actionable now — Claude + pm lane only; all LOW priority)

| id | title | summary | lane | acceptance | source |
|----|-------|---------|------|------------|--------|
| P1 | twin list-ish fields typed `string` | several self-ontology twins declare list-ish fields as `string`; **dataType normalization** is a twin SOURCE edit. Low priority. | pm-off | twin source fields normalized off `string` for list-ish props; registration test green | pm-current-state §Follow-up (a); tracking-dedup-plan §A-OPEN |
| P2 | doc-deprecation note on legacy forwardProp/backwardProp | once **uq-persist (SQLite lane) is formally killed or built**, add the deprecation note; the SQLite writer is `lib/impact-graph/sqlite-cache.deprecated.ts` (do not import live). | pm-off | deprecation note added; gated on uq-persist kill/build decision | pm-current-state §Follow-up (c); W1 settled-as-option-b |
| P3 | agent seeds declare `model:"sonnet"` vs opus-only policy | `seeds/agent-definitions.ts` seeds `implementer/hook-builder/plugin-maintainer/protocol-designer/project-implementer` as `model:"sonnet"`, but harness policy (MEMORY `subagent-model-policy-opus-only`) is **opus-only**. A policy-vs-seed **drift**, modernize candidate. **Deferred from B10-8** (not a removed-surface; do NOT bundle into a deletion PR). | pm-off | seed model fields aligned to opus-only policy; self-check advisory clean | b10-8 proposal SURFACE 2 / Agents |
| P4 | stale MANIFEST.json hash for `src/generated/rule-registry.ts` | trivial cosmetic — stale generated-manifest hash; ungated. | pm-off | MANIFEST.json hash re-synced for the file | tracking-dedup-plan §A (trivial/cosmetic) |

> NOTE: P1–P4 are all LOW. If the user considers any not-worth-tracking, that row may be
> dropped. Surface at do-time.

---

## GATED  (real work, blocked on a named condition)

| id | title | gate (the blocker) | unblocks-when | source |
|----|-------|--------------------|---------------|--------|
| G-CODEX-TWIN | Codex adapter twin build / parity | §0 **Codex HOLD** (user 2026-06-10) — Codex twins/tests untouchable | user lifts the Codex HOLD | backlog-completion §RESOLVED/DROPPED; altitude2 §4. **NOTE:** the 4 Codex Prompt-to-DTC e2e tests + golden CODEX-PARITY-GAP were **DELETED 2026-06-12** per user, so "un-skip" is no longer tracked. |
| G-B10-8-DELETE | ~13 removed-tool MCP handler `.ts` files + their `self/functions.ts` `FUNCTION_INSTANCES` seed rows + tests (set **B** in b10-8 proposal) | **DELETION_READINESS** — the whole plugin tree is a pm PROTECTED_SURFACE; the gate refuses all physical deletion while Codex runtime evidence is source-only | a **live-runtime** Codex reinstall/reload/restart smoke ref (non `tests/`) is recorded | b10-8 proposal SURFACE 1 / set B |
| G-A5 | `sqlite-cache.deprecated` → convex swap | **BLOCKED** — `convex-client` is stub-only (returns empty) | re-scope: **(a)** keep SQLite + rename off `.deprecated`, OR **(b)** un-stub convex then make registry-loader async + migrate 3 callers | tracking-dedup-plan / W1 SQLite lane |
| G-A6 | 11 orphan removed-tool handler `.ts` | **DELETION_READINESS** (same gate as G-B10-8-DELETE) | same as G-B10-8-DELETE (live-runtime Codex smoke ref) | b10-8 proposal SURFACE 1 |
| G-B10-9 | accumulated-data **CLEANUP** (quarantine 49k purge / outcome-pairs dedup / snapshot trim) | analysis is being **run now (read-only)**; substrate is actively written by other sessions | actual pruning deferred to a **confirmed pass** after analysis | tracking-dedup-plan / data-cleanup lane |

---

## DONE-ARCHIVE  (one-line closure pointers — NOT re-openable; detail in git history + rule-29 archive `reference/fable5-workflows/runs/`)

- **W1–W10 backlog** (typed-graph canonical lane, G12 137 Property prims, rule29 1.1.0, hook-coalesce no-op'd by user, W7 peerdep, F7 Korean-imperative lexicon) → DONE @ ~v7.6.0–7.7.0 (#153/#154).
- **Governed Q3 AI-derived-axes user-approval write-path** (confirm-draft) → BUILT @ v7.9.0 (#155/#156/#157).
- **M-SELF self-Ontology buildout** (30 ObjectType/33 LinkType/21 ActionType/76 Function/…) → COMPLETE, DoD **4/4** (#117–#125); FDE 0.844 PASS.
- **Altitude-2 acceptance (I-8)** + PR-I bindings → CLOSED (#145–#152).
- **Legacy-audit D3** (emit_event fan-out) / **D4** (dead-hook removal) → shipped **#144**.
- **Legacy-audit D1** (schema Phase-2) → partly **#143**.
- **Legacy-audit D5** (M-SELF reconcile) → **PR-F** shipped.
- **Legacy-audit D6** (ceremony/1b) → folded into PR-E/E2.
- **D2 (Chatbot Studio rename) → DROPPED ENTIRELY** — direction was BACKWARDS; pm's "Chatbot Studio" naming is already current ("Agent Studio" is the DEPRECATED name). Do NOT re-litigate.
- **2026-06-12 campaign:** Codex prompt-to-DTC deadweight removed; A-#3/#4 done; B10-8 schemas modernized (skill seed re-sync); tracking consolidated into THIS ledger.
