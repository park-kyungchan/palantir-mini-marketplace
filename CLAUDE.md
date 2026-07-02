# Repo bootstrap

1. Read `plugins/palantir-mini/CARTOGRAPHY.md` first — it is the entry map for
   every task intent (ontology work, MCP handlers, hooks, skills, agents,
   lineage/impact queries, second-brain, release work, research lookups).
2. Never glob or read `plugins/palantir-mini/runtime-overlay/research-library/`
   directly — enter only via its `research-root/{BROWSE,INDEX}.md`.
3. Subagents: spawn as `model: sonnet` with maximum reasoning effort; never pass
   `model` at spawn time (frontmatter in `agents/*.md` is authoritative); give
   each a clear, scoped brief.
4. Import direction is one-way: `bridge -> lib -> core`. Do not add new
   `lib/` -> `bridge/` imports (known violations are tracked, not condoned).
5. Before committing, run `bun run typecheck` from `plugins/palantir-mini/`.
