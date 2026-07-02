# ADR 0001: Invert memory-reflect → pm-recap dependency via an injected RecapProvider

## Status

Accepted — 2026-07-02

## Context

`lib/runtime-overlay/memory-reflect.ts` (Sink-1 WRITE, session-end prior-digest
reflection) needed the structured session recap produced by the `pm_recap` MCP
tool handler at `bridge/handlers/pm-recap.ts`. Prior to this change it obtained
that recap with a dynamic import at call time:

```ts
const recapMod = await import("../../bridge/handlers/pm-recap");
const result = await recapMod.default({ project: projectRoot, skipMcpFirst: false });
```

wrapped in a `try/catch` that fell back to `buildMinimalDigest` (a plain
events.jsonl line count) if the import or call failed. The inline comment
justified this as avoiding "a circular dep at module load time" — but the
deeper problem was structural: `lib/` (the plugin's dependency-free core
library layer) was reaching into `bridge/` (the MCP handler / adapter layer)
at runtime. This is a `lib` → `bridge` dependency, the same violation class
tracked in `CARTOGRAPHY.md` (§import direction, "known violations pending
fix") (inward-only dependency
direction: `bridge` may depend on `lib`, never the reverse). This particular
edge was not previously listed there — it hid inside a dynamic
`import()` rather than a static one, so static dependency scans missed it.

### CI failure that surfaced the problem (PR #206, commit 6da9a64)

PR #206 CI failed with 4 test failures in
`tests/bridge/handlers/pm-recap.mcp-first-compliance.test.ts`
(approximately L306, L341, L349, L362). The proximate cause was
`tests/lib/runtime-overlay/memory-reflect.test.ts` calling Bun's
`mock.module()` to intercept the dynamic `bridge/handlers/pm-recap` import.
`mock.module()` in Bun is **process-global**, not scoped to the calling test
file, and its effect is **file-load-order dependent**: whichever test file
registers the mock first "wins" for the lifetime of the test process. Locally,
Bun's default file discovery happens to sort `bridge/**` before `lib/**`
alphabetically, so `pm-recap.mcp-first-compliance.test.ts` (under `bridge/`)
ran and passed before `memory-reflect.test.ts` (under `lib/`) ever installed
its mock — no collision. In CI, the file-load order differed, so
`memory-reflect.test.ts`'s `mock.module()` call intercepted the SAME
`bridge/handlers/pm-recap` module specifier that
`pm-recap.mcp-first-compliance.test.ts` needed unmocked, and the latter's
assertions failed against the fixed fake recap instead of the real handler
output.

This mock pollution was latent for a long time. It was activated by commit
`4c9ef37` (H6 path portability), which fixed a previously-broken mock
specifier in `memory-reflect.test.ts` — the specifier was derived at runtime
relative to `import.meta.dir` instead of a hardcoded, wrong absolute path.
Before that fix, the mock silently never intercepted anything (the long
suspected "memory-reflect mock bug" noted in the 7.38.0 changelog), so the
pollution mechanism existed but never fired. Fixing the specifier made the
mock actually work — and, on CI's file-load order, work against the wrong
consumer.

## Decision

Full inversion: `memory-reflect.ts` (`lib/`) never knows about `bridge/` —
neither statically nor dynamically. The capability it needs ("give me a
Recap for this project") is expressed as an injected `RecapProvider`
function type, defined in `lib/recap/types.ts`:

```ts
export type RecapProvider = (args: {
  project: string;
  skipMcpFirst?: boolean;
}) => Promise<PmRecapResult>;
```

`reflectMemoryToCache(projectRoot, opts?: { recapProvider?: RecapProvider })`
accepts the provider as an optional parameter. `buildSessionDigest` calls the
injected provider if one is supplied; if none is supplied, or the supplied
provider throws, it falls back to `buildMinimalDigest` — identical fallback
semantics to the previous import-failure catch, just triggered by a missing
or failing injected function instead of a missing or failing dynamic import.

Wiring is the responsibility of the boundary caller. The only production
caller today, `hooks/t4-promotion-trigger.ts`, statically imports the real
`pm_recap` handler (`bridge/handlers/pm-recap.ts`) and passes it in:

```ts
import pmRecap from "../bridge/handlers/pm-recap";
...
await reflectMemoryToCache(project, { recapProvider: pmRecap });
```

This import is legal: `hooks/` is a boundary/adapter layer (like `bridge/`),
so `hooks` → `bridge` is an allowed edge — the same precedent already
established by `hooks/session-start.ts` importing
`bridge/handlers/session_resume.ts` directly.

The file-local types `PmRecapArgs`, `PmRecapResult`, `SubstrateHealth`, and
`SprintSummary` moved out of `bridge/handlers/pm-recap.ts` into the new
`lib/recap/types.ts`, alongside the new `RecapProvider` type.
`bridge/handlers/pm-recap.ts` now imports them back
(`bridge` → `lib`, the legal direction) instead of declaring them inline.
`ClassificationAccuracySummary` stays where it already lived,
`lib/recap/classification-accuracy.ts` (the module that computes it);
`lib/recap/types.ts` imports it as a type reference on `PmRecapResult` rather
than redefining it.

### Alternatives considered

1. **Shallow DI, default dynamic import kept in `lib/`.** Give
   `reflectMemoryToCache` an optional `recapProvider` parameter but default it
   to the same `await import("../../bridge/handlers/pm-recap")` when omitted.
   Rejected: this keeps the exact lib→bridge edge that caused the CI failure;
   it only adds an escape hatch for tests, it does not remove the structural
   problem, and a future unwired caller would still trigger the dynamic
   import at runtime.

2. **Type-only import of `PmRecapResult` into `lib/`.** Leave the recap
   result type declared in `bridge/handlers/pm-recap.ts` and have
   `memory-reflect.ts` do `import type { PmRecapResult } from
   "../../bridge/handlers/pm-recap"`. Rejected: even a type-only import is a
   `lib` → `bridge` source dependency — exactly the layering-violation class
   (`CARTOGRAPHY.md` known-violations list) this ADR exists to close, just moved from runtime to compile time. It would
   also do nothing to remove the mock-pollution mechanism, since the runtime
   dynamic import would still be needed for the actual recap call.

3. **Full inversion via injected `RecapProvider` (chosen).** Described above.
   `lib/` depends only on a type it owns; `bridge/` depends on `lib/` for
   that same type (legal direction); the boundary layer (`hooks/`) is the
   only place that ever names both `lib/runtime-overlay/memory-reflect.ts`
   and `bridge/handlers/pm-recap.ts` in the same import block.

## Consequences

- **Module-boundary mocks are banned by construction in these tests.**
  `tests/lib/runtime-overlay/memory-reflect.test.ts` no longer calls
  `mock.module()` at all — fake recaps are passed as plain functions via
  `opts.recapProvider`. There is no process-global mock state to leak across
  test files, so the CI-vs-local file-load-order divergence that caused the
  PR #206 failures cannot recur for this test file, structurally.
- **The dynamic `lib` → `bridge` import is eliminated.** It was previously
  unlisted in `CARTOGRAPHY.md`'s known-violations list precisely because it was dynamic; after this
  change there is no import of any kind from `lib/runtime-overlay/memory-reflect.ts`
  into `bridge/`, static or dynamic.
- **Future callers must wire the provider or accept minimal digests.** Any
  new caller of `reflectMemoryToCache` that does not pass `opts.recapProvider`
  silently gets the pre-existing minimal-digest fallback (line count only,
  no substrate health / sprint summary / MCP-first compliance). This is the
  same degrade-gracefully behavior the old import-failure catch already
  provided; it is now reachable by omission as well as by provider failure.
- **`bridge/handlers/_deprecation-map.ts`** — the `pm-recap` entry's note
  updated to describe the new wiring (injected by
  `hooks/t4-promotion-trigger.ts`; live-imported by the session-start hook)
  instead of claiming a direct live import from `memory-reflect.ts`.

## Ubiquitous language

- **Recap** — a structured session summary derived from the event log
  (`events.jsonl`): substrate health (T0–T4 grade distribution), sprint
  summary, top events, and optional MCP-first-compliance /
  classification-accuracy sections. Produced by the `pm_recap` MCP tool
  handler (`bridge/handlers/pm-recap.ts`), typed as `PmRecapResult`.
- **Digest** — a compact text rendering of a Recap, built for cache
  injection into the pm-owned `.palantir-mini/cache/memory-prior.md` file.
  Produced by `buildSessionDigest` / `buildMinimalDigest` in
  `lib/runtime-overlay/memory-reflect.ts`.
- **Recap Provider** — a capability (`RecapProvider`, `lib/recap/types.ts`)
  that yields a Recap given `{ project, skipMcpFirst? }`. `lib/` code depends
  only on this capability's type; wiring an actual implementation (the real
  `pm_recap` handler, a test fake, or nothing at all) is always the
  responsibility of the boundary caller, never of `lib/` itself.
