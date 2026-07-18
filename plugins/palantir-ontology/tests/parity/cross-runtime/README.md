# Cross-Runtime Parity Suite (A650)

Ledger row A650 (`docs/architecture.md` ADR-007, execution-plan DoD item 9:
"Claude, Codex, and Gemini consume identical semantic fixtures. Packaging
differences are adapter metadata only.").

`tests/parity/{codex,claude,gemini}/` (A620/A630/A640) each prove their own
runtime's `inventory-shape.fixture.json` is well-formed and traceable to
that runtime's committed binding. None of them compares across runtimes —
every one of those three README files says so explicitly and defers the
actual 3-way comparison to this row. `fixture.test.ts` in this directory is
that comparison: it imports all three committed bindings
(`CODEX_BINDING`/`CLAUDE_BINDING`/`GEMINI_BINDING`), all three mechanism-
classification maps, and `scripts/parity-check.ts`'s own exported
`checkAdapterParity`, and asserts:

1. **Generated inventories** — `capabilityAreas`, `toolNames`, and
   `toolInputSchemaConvention` are byte-identical (`toEqual`) across all
   three runtimes; `manifestFieldKeys`' shared core (every key besides a
   runtime's own optional `nativePackaging` field, which A640 documented as
   an allowed per-runtime metadata addition, not a shape mismatch) is also
   identical.
2. **Semantic decisions** — `{CODEX,CLAUDE,GEMINI}_MECHANISM_TO_CONTROL_PLANE_KIND`
   are deep-equal to each other and to the fixed literal
   `{ hooks: "hook", skillsCommands: "skill", subagents: "agent" }`: the
   `ControlPlaneNodeKind` a mechanism classifies under is a semantic
   decision, and it does not vary by runtime even though each runtime's
   native mechanism name does.
3. **Reason codes / mutation denials** — none of the three bindings' JSON
   text contains any `FORBIDDEN_SEMANTIC_FIELD_TERMS` entry (in particular
   `reasonCode` and `mutation-authority`/`mutationAuthority`), and none of
   the three tool-name sets contains any tool matching a mutation-verb
   pattern (`mutate|commit|write|propose|dryRun|approve|authorize|delete`).
   All three runtimes deny mutation identically, by the same mechanism:
   there is no mutation-capable tool to call and no reason-code field ever
   populated, in any of the three.
4. **File-path-set parity** — a direct call to `checkAdapterParity` against
   the real `src/adapters/` tree reports `populated = [codex, claude,
   gemini]` and `onlyInOneOrTwo = []`, i.e. the exact same computation
   `bun run parity:check` performs at its tier-3 (full 3-way) stage,
   reused unmodified from `scripts/parity-check.ts` (not re-implemented).

See `../negative/README.md` for the companion negative-fixture suite that
proves this same machinery actually detects divergence rather than
trivially passing on matching input.
