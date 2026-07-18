# Negative Parity Divergence Suite (A650)

Companion to `../cross-runtime/` — that directory proves the POSITIVE case
(one shared contract set through all three adapters yields byte-equivalent
decisions). This directory proves the NEGATIVE case: `parity:check`'s
detection machinery actually fails on real divergence rather than
trivially passing on matching input (execution-plan §9 row `A650`;
validation-contract item 2).

Both files here reuse the exact functions `scripts/parity-check.ts` itself
calls — never a reimplementation, and never an edit to that script (it is
outside this row's exact write set; `tests/parity/**` only).

## `hand-edited-artifact.test.ts` — tier-1: regeneration-identity drift

Reuses each runtime's own `check{Runtime}BindingArtifact` +
`generate{Runtime}BindingSource` + `HEADER` (imported unmodified from
`src/adapters/<runtime>/index.ts` — the same trio
`scripts/parity-check.ts`'s `introspectBinding()` calls per populated
runtime). Simulates "a stale/hand-edited single-adapter capability claim"
by flipping one verdict string in a freshly regenerated binding module
before writing it to a temp file, and proves `driftOk` flips to `false` —
the exact signal `scripts/parity-check.ts`'s tier-1 gate treats as a hard
`process.exit(1)` failure.

## `structural-divergence.test.ts` — tier-3: per-adapter file-path-set parity

Reuses `checkAdapterParity` (imported unmodified from
`scripts/parity-check.ts` — the same function `bun run parity:check`'s
`main()` calls at its full 3-way stage). Synthesizes a minimal 3-way
adapter-directory tree under a temp directory (not a checked-in copy of the
real 39-file `src/adapters/` tree, which would drift the moment any real
adapter's file count changes), adds a file to only one (or two) of the
three, and proves `onlyInOneOrTwo` becomes non-empty and names the exact
divergent path/presentIn/missingFrom triple.

This is the fixture-backed encoding of the standing propagation invariant
`decisions/w6-parity-backport-adjudication.md` ruling 3 mandates: "any row
that introduces a NEW per-adapter structural component must propagate it
to ALL populated adapter directories within that same row (or stop and
flag)... A650 parity fixtures must encode this as a structural invariant
so recurrence is caught by fixture, not by adjudication." That ruling
exists because this exact asymmetry happened for real once already (A630
introduced `mechanism-classification.ts` before A620/codex had it; the
gap was only caught when A640 populated the third directory and the first
full 3-way `parity:check` ran, then fixed by a correction worker). This
suite is what turns the NEXT such asymmetry into a fixture failure instead
of a live surprise at the next full-populated `parity:check` run.

## Why fixtures are synthesized at test time, not checked in

Both classes above build their divergent input programmatically inside
each test (a temp file, a temp directory tree) rather than committing a
static divergent copy of `binding.generated.ts` or `src/adapters/`. A
checked-in near-duplicate of generated content goes stale the moment the
generator or the real adapter tree changes; a function that builds the
divergence from the CURRENT real registry/tree at test time cannot drift
from what it is testing.
